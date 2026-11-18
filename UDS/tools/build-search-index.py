# -*- coding: utf-8 -*-
"""Generate assets/search-data.js from the HTML pages.

Usage:  python tools/build-search-index.py
Run from anywhere; paths are resolved relative to the UDS site root.

Each page becomes one entry:
    {"u": "page.html", "t": "页面标题", "h": [heading, ...]}
and each heading:
    {"i": "anchor", "t": "标题", "s": "摘要", "x": "用于匹配的正文"}

Keeping this generated instead of hand-maintained means the search box never
shows text that is no longer on the page, and anchors always exist.
"""
import json
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'search-data.js')

SKIP_TAGS = {'script', 'style', 'svg', 'nav', 'header', 'footer', 'button'}
BLOCK_TAGS = {'p', 'li', 'td', 'th', 'div', 'section', 'blockquote', 'figcaption',
              'pre', 'h1', 'h2', 'h3', 'h4', 'dt', 'dd'}
MAX_BODY = 1200   # 每节最多保留多少字用于匹配
SNIPPET = 110     # 摘要长度


class SectionParser(HTMLParser):
    """Collect article text and split it into h2 / h3 sections."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_article = False
        self.skip = 0
        self.sections = []      # [{level, id, title, intro, text, subs}]
        self.h2 = None          # current level-2 section
        self.h3 = None          # current level-3 section
        self.heading = None     # [level, id, [text]]
        self.page_intro = []

    # -- text sinks ------------------------------------------------------
    def _add_text(self, text):
        if self.heading is not None:
            self.heading[2].append(text)
            return
        if self.h3 is not None:
            self.h3['text'].append(text)
        elif self.h2 is not None:
            self.h2['text'].append(text)
        else:
            self.page_intro.append(text)

    # -- HTMLParser hooks ------------------------------------------------
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'article' and 'md-typeset' in (attrs.get('class') or ''):
            self.in_article = True
            return
        if not self.in_article:
            return
        if tag in SKIP_TAGS:
            self.skip += 1
            return
        if tag in ('h2', 'h3'):
            self._finish_heading()
            self.heading = [int(tag[1]), attrs.get('id', ''), []]
            return
        if tag == 'br':
            self._add_text(' ')

    def handle_startendtag(self, tag, attrs):
        if tag == 'br':
            self._add_text(' ')

    def handle_endtag(self, tag):
        if not self.in_article:
            return
        if tag in SKIP_TAGS and self.skip:
            self.skip -= 1
            return
        if tag in ('h2', 'h3'):
            self._finish_heading()
            return
        if tag == 'article':
            self.in_article = False
            return
        if tag in BLOCK_TAGS:
            self._add_text(' ')

    def handle_data(self, data):
        if not self.in_article or self.skip:
            return
        self._add_text(data)

    def _finish_heading(self):
        if self.heading is None:
            return
        level, anchor, buf = self.heading
        self.heading = None
        sec = {'level': level, 'id': anchor, 'title': clean(''.join(buf)),
               'intro': [], 'text': [], 'subs': []}
        self.sections.append(sec)
        if level == 2:
            self.h2 = sec
            self.h3 = None
        else:
            self.h3 = sec
            if self.h2 is not None:
                self.h2['subs'].append(sec['title'])
        # 标题本身就计入本节正文，标题词也能被检索到
        sec['intro'].append(sec['title'])


def clean(s):
    s = s.replace('\u00a0', ' ').replace('\u3000', ' ')
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'\s+([，。；：、！？）》」』])', r'\1', s)
    s = re.sub(r'([（《「『])\s+', r'\1', s)
    return s.strip()


def cut(s, n):
    """Cut at n chars, preferring a sentence boundary near the end."""
    if len(s) <= n:
        return s
    window = s[:n + 20]
    m = max(window.rfind('。'), window.rfind('；'), window.rfind('！'), window.rfind('？'))
    if m >= n // 2:
        return window[:m + 1]
    return s[:n].rstrip() + '…'


def meta_description(raw):
    m = re.search(r'<meta name="description" content="([^"]*)"', raw)
    return clean(m.group(1)) if m else ''


def page_title(raw):
    m = re.search(r'<title>(.*?)</title>', raw, re.S)
    if not m:
        return ''
    return clean(re.sub(r'\s*[-—]\s*UDS 中文文档\s*$', '', m.group(1)))


def build_page(path):
    raw = open(path, encoding='utf-8').read()
    p = SectionParser()
    p.feed(raw)
    p.close()
    p._finish_heading()

    name = os.path.basename(path)
    entries = []

    intro = clean(''.join(p.page_intro))
    desc = meta_description(raw)
    if desc or intro:
        entries.append({'i': '', 't': page_title(raw) or name,
                        's': cut(desc or intro, SNIPPET),
                        'x': cut(' '.join(x for x in (desc, intro) if x), MAX_BODY)})

    for sec in p.sections:
        if not sec['id']:
            sys.stderr.write('WARN %s: heading without id: %s\n' % (name, sec['title']))
        intro_text = clean(''.join(sec['intro']))
        own_text = clean(''.join(sec['text']))
        # 正文开头常常重复一遍标题，摘要里去掉，免得搜索结果两行字一模一样。
        # 只在标题后面紧跟边界（空格/标点）时才去掉，避免把“风”从“风向”里切掉。
        title = sec['title']
        if own_text.startswith(title) and len(own_text) > len(title):
            nxt = own_text[len(title)]
            if nxt.isspace() or nxt in '：:，,。、；;':
                rest = own_text[len(title):].lstrip(' ：:，,。、；;')
                if len(rest) >= 20:
                    own_text = rest
        if sec['level'] == 2:
            # 二级小节的正文 = 标题 + 引言；三级小节的内容单独成条，避免重复命中
            body = ' '.join(x for x in (intro_text, own_text, ' '.join(sec['subs'])) if x)
            # 只有三级小节、自己没有引言的二级标题，摘要里列出下属小节名
            snip = own_text or ('、'.join(sec['subs']) if sec['subs'] else '')
        else:
            body = ' '.join(x for x in (intro_text, own_text) if x)
            snip = own_text
        entries.append({
            'i': sec['id'],
            't': sec['title'],
            's': cut(snip, SNIPPET),
            'x': cut(body, MAX_BODY),
        })

    return {'u': name, 't': page_title(raw) or name, 'h': entries}


def main():
    pages = sorted(f for f in os.listdir(ROOT)
                   if f.endswith('.html') and not f.startswith('__'))
    data = [build_page(os.path.join(ROOT, f)) for f in pages]
    js = 'window.DOC_SEARCH = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(js)
    print('wrote %s (%d pages, %d entries, %.1f KB)'
          % (os.path.relpath(OUT, ROOT), len(data),
             sum(len(p['h']) for p in data), len(js.encode('utf-8')) / 1024))


if __name__ == '__main__':
    main()
