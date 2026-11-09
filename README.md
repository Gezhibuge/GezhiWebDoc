# UE5 文档库

doc.gezhibuge.com 的**备用仓库**：专门存放旧版文章与格式特殊的文档，页面保持各自的原始排版。
新的文档与更新都发布在主站，本仓库基本不再更新。

## 站点结构

```
index.html            首页（「UE5 文档库」）
assets/
  site.css            首页样式：纸张 / 石板两套主题，深色主题色与三份文档一致
  site.js             首页脚本：主题切换、移动端菜单
  favicon.svg         站点图标
  font/misans/        小米 MiSans 字体（可变字重，按 unicode-range 分片，本地离线可用）
  theme-license.txt   Black & White 主题的 GPLv3 许可证与来源说明
UDS/                   Ultra Dynamic Sky 中文文档（18 页）
SF/                    Story Framework 中文文档（36 页）
EDU/                   Easy Game UI 中文文档（23 页）
LICENSE                MIT
```

三份文档的 HTML、样式与截图**未作任何修改**，首页只是链接到各自的 `index.html`。
如果文档里出现「← 返回文档首页」，指向的就是本站首页。

## 首页说明

- 左上角标识为 **UE5 文档库**，右侧导航为 **首页 / 博客 / 关于**，后两项分别指向
  `https://doc.gezhibuge.com/blog` 与 `https://doc.gezhibuge.com/about`；没有「联系方式」，站点不提供任何联系方式或社交平台入口。
- 文章列表最上方的公告框：该网站基本不再更新，并引导前往 [gezhibuge.com](https://doc.gezhibuge.com)。
- 深浅主题与三份文档共用 `doc-theme` 这个 localStorage 键，在任意一篇文档里切换过主题，回到首页也会一致。
- 正文字体为小米 **MiSans**（小米官方免费商用字体，SIL OFL 1.1 授权分发），已完整本地化，不依赖网络。

## 本地预览

直接双击 `index.html` 即可，无需服务器、无需联网（文中的外部视频与链接需要联网）。

## 版权

- 站点与整理内容：MIT（见 `LICENSE`）。
- 首页版式取自 Black & White 主题（ThemeWagon，GPLv3），许可证见 `assets/theme-license.txt`。
- MiSans 字体版权归小米所有，按 SIL OFL 1.1 免费商用分发。
- 三份文档的原文、截图与视频版权归各自的资产作者所有，本仓库仅提供非官方中文译本。
