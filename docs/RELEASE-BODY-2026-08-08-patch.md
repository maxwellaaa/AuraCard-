# AuraCard v1.0.1（2026-08-08 补丁）

## 版本修改说明

# AuraCard 补丁说明（1.0.1 / 2026-08-08）

相对 `v1.0.0-2026-08-08` 的桌面端稳定性补丁。不含密钥与大体量二进制。

---

## 一、Mac「打包下载全部」卡住

**相关文件：** 导出 / Electron 下载路径相关改动（见提交 `31d64f7`、`40aa19f`）

- 修复 macOS 上「打包下载全部」ZIP 无法完成或界面假死的问题。
- 下载流程可取消，避免长时间无响应。

## 二、API Key 持久化

- 修复密钥输入后未可靠自动保存的问题，重启应用后仍可读取已保存配置。

## 三、项目与正文保存

- 修复保存项目 / 正文时偶发未落盘的问题，保证编辑内容可稳定写回。

## 四、发布与打包

- 版本号 bump 至 **1.0.1**。
- Windows / macOS 产物文件名统一为 `AuraCard-1.0.1-*`（ASCII），便于 Release 资源命名。


---

## 本轮完整变更（含 1.0.0 日更）

# AuraCard 本轮调整说明（2026-08-08）

相对上一轮桌面发布基线（`4c735b6` / `docs/CHANGELOG-2026-08-07.md`）的增量改动。不含密钥与大体量二进制。

---

## 一、Markdown 分栏（竖排 / 横排）

**相关文件：** `src/store/mdColumns.ts`、`src/store/utils.ts`、`src/store/split.ts`、`src/components/CenterPanel.vue`、`src/components/CardPreview.vue`

- 新增 `:::cols v|h N` 语法（2–6 栏，栏间 `---`），编辑器可一键插入竖排/横排分栏块。
- 预览与导出渲染为 `md-cols` 网格；测量分页时纳入分栏样式，避免高度估算偏差。

---

## 二、打包下载全部（ZIP）

**相关文件：** `src/store/export.ts`、`src/components/CenterPanel.vue`

- 新增「打包下载全部」：将当前全部预览页按所选导出分辨率渲染为 PNG，打成单一 ZIP。
- 文件名含页序与分辨率标签；重名自动去重后缀。
- 逐张 PNG 下载逻辑抽公共渲染路径，行为与 ZIP 一致。

---

## 三、AI 整理标准化

**相关文件：** `src/store/aiOrganize.ts`、`src/store/ai.ts`、`scripts/verify-ai-organize.mjs`

- 「AI 整理」抽到独立模块：统一原版 system prompt、解析与字段上限；各 Provider 共用同一路径。
- 兼容多段 `content` 数组与 `reasoning_content`（如 deepseek-reasoner）。
- 整理成功后交回分页/分节流程；失败时本地摘要回退保留。

---

## 四、卡片宽度拖拽缩放

**相关文件：** `src/store/state.ts`、`src/components/CardPreview.vue`、`src/components/CenterPanel.vue`

- 全局 `cardScale`（约 0.7–1.55）驱动宽高；预览右侧宽度手柄可拖拽改宽（保持当前比例）。
- 导出时隐藏宽度手柄与贴纸选中态，避免进图。

---

## 五、贴纸与预览交互加固

**相关文件：** `src/components/CardPreview.vue`、`src/store/presets.ts` 等

- 贴纸拖移 / 角点缩放与卡片宽度拖拽指针事件隔离，减少误触。
- 预设快照继续携带贴纸与布局相关字段（与本轮 scale/分栏联动处有小幅整理）。

---

## 六、工程与发布

- Windows：`npm run dist:win`（NSIS + portable），产物目录  
  `E:\cursor-agent\deliverables\AuraCard-desktop-2026-08-08\`
- Mac：在 Windows 主机上通常无法交叉打包；需 macOS 本机或 CI `macos-*` runner 执行 `npm run dist:mac`。
- **勿提交** `.env.local` 及任何 API Key。

---

## 变更文件一览（摘要）

**新增：** `src/store/aiOrganize.ts`、`src/store/mdColumns.ts`、`docs/CHANGELOG-2026-08-08.md`、`scripts/verify-ai-organize.mjs`（及可选发布辅助脚本）

**修改：** `src/store/{ai,export,index,state,utils,split,presets,sections}.ts`、`src/components/{CardPreview,CenterPanel,RightPanel}.vue`、`electron-builder.yml`（输出目录日期）等


---

## 能力说明（摘要）

# AuraCard 能力说明

光语（AuraCard）是面向图文卡片与封面视觉的桌面/Web 应用。下列能力均以当前仓库代码为准。

## 内容整理与排版

| 能力 | 说明 |
|------|------|
| **AI 整理** | 将用户原文整理为标题 / 副标题 / 正文 / 水印；统一标准模块（`src/store/aiOrganize.ts`），各兼容 OpenAI Chat Completions 的 Provider 共用同一 prompt 与解析；失败时本地启发式摘要回退。 |
| **直接排版** | 默认按原文排版生成卡片；勾选「重新整理」后才走 AI 整理路径。 |
| **生成卡片** | 基于当前正文/整理结果拆分分页并生成多页预览卡片。 |
| **导入 MD** | 支持导入 Markdown 文件进入长文编辑。 |

## Markdown 与版式

| 能力 | 说明 |
|------|------|
| **MD 表格** | 正文支持 Markdown 表格渲染。 |
| **MD 分栏** | 语法 `:::cols v|h N`（2–6 栏，栏间 `---`）；可一键插入竖排（左右列）或横排（上下行）分栏块；预览与导出为 `md-cols` 网格。 |
| **长文分页** | 按卡片高度测量拆分多页；分栏样式参与高度估算。 |
| **添加页面** | 可在末尾新增一页可编辑卡片；支持重置等编辑操作。 |

## 视觉与交互

| 能力 | 说明 |
|------|------|
| **模板切换** | 多套卡片/封面模板。 |
| **选区样式** | 在标题/副标题/正文中选中文字后，可局部调整字号、颜色、正文对齐；不污染未选中正文。 |
| **在线字体** | 内置多款中英文字体；支持从清单/URL 手动更新并缓存。 |
| **在线贴纸** | 贴纸可拖动、角点缩放；Delete/Esc 删除或取消选中；与卡片宽度拖拽事件隔离。 |
| **用户预设** | 保存/应用用户预设快照（含贴纸与布局相关字段）。 |
| **卡片宽度缩放** | 预览右侧手柄拖拽调整卡片显示宽度（`cardScale`）。 |
| **封面本地图** | 导入本地图片作封面底图，支持更换/清除与暗角强度，可编辑标题与署名后导出。 |

## 导出与下载

| 能力 | 说明 |
|------|------|
| **导出分辨率** | 可选导出分辨率后再出图。 |
| **逐张下载 PNG** | 按页依次导出 PNG。 |
| **打包下载全部（ZIP）** | 将全部预览页按当前分辨率渲染为 PNG 并打成单一 ZIP。 |

## AI 与接口

| 能力 | 说明 |
|------|------|
| **多模型聊天接口** | 兼容 OpenAI Chat Completions；支持多 Provider 配置（需本地/环境密钥，**勿提交** `.env.local`）。 |
| **AI 图文/封面相关流程** | 仓库保留图文卡片、封面、系列与排版相关视图与 store 逻辑（见 README 与 `src/store/ai.ts` 等）。 |

## 桌面端（Electron）

| 能力 | 说明 |
|------|------|
| **Windows** | `npm run dist:win`：NSIS 安装包 + portable；产物目录见 `electron-builder.yml`（当前为 `E:/cursor-agent/deliverables/AuraCard-desktop-2026-08-08/`）。 |
| **macOS** | `npm run dist:mac`：需在 macOS 本机或 CI `macos-*` runner 上执行；Windows 主机通常无法可靠交叉编译 Mac 安装包。 |
| **开发启动** | `npm run electron:dev`：构建前端后启动 Electron。 |

## 相关文档

- [版本修改说明（汇总）](../CHANGELOG.md)
- [2026-08-08 详细变更](./CHANGELOG-2026-08-08.md)
- [2026-08-07 详细变更](./CHANGELOG-2026-08-07.md)


---

## 下载

- **Windows**：`AuraCard-1.0.1-x64-setup.exe`（安装包）、`AuraCard-1.0.1-x64-portable.exe`（便携版）

- **macOS**：`AuraCard-1.0.1-mac-arm64.dmg` / `.zip`，`AuraCard-1.0.1-mac-x64.dmg` / `.zip`（CI 未签名，若无法打开请右键 → 打开）


仓库文档：`CHANGELOG.md`、`docs/能力说明.md`
