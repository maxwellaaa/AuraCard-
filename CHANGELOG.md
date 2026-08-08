# AuraCard 版本修改说明（Changelog）

本文档汇总近期版本变更入口。详细按日说明见 `docs/CHANGELOG-*.md`。**仅记录已落地代码**，不含密钥与大体量二进制。

## 当前版本索引

| 日期 | 说明 | 详细文档 |
|------|------|----------|
| 2026-08-08 | Markdown 分栏、打包 ZIP 导出、AI 整理标准模块、卡片宽度缩放 | [CHANGELOG-2026-08-08.md](docs/CHANGELOG-2026-08-08.md) |
| 2026-08-07 | 选区字号/颜色/对齐、封面本地图、在线字体/贴纸/用户预设、Electron 桌面打包 | [CHANGELOG-2026-08-07.md](docs/CHANGELOG-2026-08-07.md) |

## 2026-08-08 摘要

- **Markdown 分栏**：`:::cols v|h N`（2–6 栏，栏间 `---`），编辑器可插入竖排/横排分栏；预览与导出渲染为 `md-cols`，分页测量纳入分栏样式。
- **打包下载全部**：按所选导出分辨率将全部预览页渲染为 PNG 并打成单一 ZIP；文件名含页序与分辨率；与逐张 PNG 共用渲染路径。
- **AI 整理标准模块**：`aiOrganize.ts` 统一 system prompt、解析与字段上限；兼容多段 `content` / `reasoning_content`；失败时本地摘要回退。
- **卡片宽度拖拽缩放**：全局 `cardScale`（约 0.7–1.55）；预览右侧手柄改宽；导出时隐藏手柄与贴纸选中态。
- **贴纸交互加固**：贴纸拖移/角点缩放与卡片宽度拖拽指针事件隔离。
- **发布**：Windows `npm run dist:win` → `E:/cursor-agent/deliverables/AuraCard-desktop-2026-08-08/`；Mac 需在 macOS/CI 执行 `npm run dist:mac`。

## 2026-08-07 摘要

- **选区样式**：标题/副标题/正文内联选区的字号、颜色、正文对齐仅作用于选中片段，不误伤未选中正文。
- **封面本地图片**：导入底图、更换/清除、暗角强度；可继续编辑标题与署名后导出 PNG。
- **在线字体 / 在线贴纸 / 用户预设**：二级菜单入口；字体清单可手动更新并缓存；贴纸支持拖动缩放与 Delete/Esc。
- **Electron 桌面端**：Windows NSIS 安装包 + portable；Mac 配置存在但需 macOS 构建。

## 能力总览

见 [docs/能力说明.md](docs/能力说明.md)。
