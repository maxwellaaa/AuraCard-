# AuraCard 版本说明（1.0.2 / 2026-08-09）

相对 GitHub 最新正式版 `v1.0.0-2026-08-08b`。含此前已合入但未打 Release 的 1.0.1 稳定性补丁，以及本轮功能/UI。不含密钥与大体量二进制。

---

## 一、中栏工具条紧凑排版

**相关文件：** `src/components/CenterPanel.vue`、`src/App_style.css`

- 内容工具条改为单行紧凑分组：`编辑长内容 / 添加页面 | 保存文字 / 保存项目 / 重置 | 下载卡片▾`。
- 去掉中间大块 spacer；缩小 padding/gap，按钮高度对齐；窄屏换行时不再出现大片空白。
- 下载中「取消下载」仍落在下载组内，不破坏紧凑布局；下拉导出菜单行为不变。

## 二、表格列宽 / 对齐

**相关文件：** `src/store/tables.ts`、`src/components/LeftPanel.vue`、`src/components/CardPreview.vue`、`src/components/CenterPanel.vue`

- 卡片内点击表格单元格后，左侧可调列对齐（左/中/右）、列宽百分比、列顺序。
- 长内容编辑器支持插入「对齐表格」；导出保留对齐与列宽。

## 三、导出：按页选择下载

**相关文件：** `src/components/CenterPanel.vue`、`src/store/export.ts`

- 下载菜单新增「选择页面下载」：可勾选页码后导出所选 PNG 或打包 ZIP。
- 保留「下载当前页」「打包全部」；导出中可取消。

## 四、AI 整理草稿 + 一键排版

**相关文件：** `src/components/AiOrganizeDraft.vue`、`src/store/aiOrganize.ts`、`src/store/state.ts`、`src/components/RightPanel.vue`

- AI 整理成功后进入可编辑草稿面板（标题/副标题/正文/水印）。
- 用户确认后「一键排版」写入卡片（不再二次调用 AI）；支持复制草稿。

## 五、保存入口统一（中栏）

**相关文件：** `src/components/CenterPanel.vue`、`src/components/LeftPanel.vue`

- 中栏统一「保存文字」「保存项目」「重置」与下载主操作同排，样式与 `btn--sm` 一致。

## 六、承接 1.0.1 稳定性（此前未打 GH Release）

- Mac「打包下载全部」卡住修复；下载可取消。
- API Key 输入后自动持久化。
- 项目 / 正文保存落盘更可靠。

## 七、发布与打包

- 版本号 **1.0.2**；标签建议 `v1.0.2-2026-08-09`。
- Windows 产物：`E:/cursor-agent/deliverables/AuraCard-desktop-1.0.2/`。
- macOS：GitHub Actions `Build macOS` 构建并挂到同标签 Release。
