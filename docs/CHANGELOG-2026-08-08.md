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
