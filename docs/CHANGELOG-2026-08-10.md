# AuraCard 版本说明（1.0.3 / 2026-08-10）

相对 `v1.0.2-2026-08-09`。封面文字层、导出子菜单、智能浮层与提示文案统一，以及首页导航回主页。不含密钥与大体量二进制。

---

## 一、封面文字菜单与图层

**相关文件：** `src/views/CoverPage.vue`、`src/components/CoverTextLayerBox.vue`、`src/composables/useCoverTextLayers.ts`

- 封面文字独立菜单：图层选择、字号/字体/颜色等编辑入口。
- 文字层可拖动定位；导出时按图层渲染。

## 二、导出子菜单与分辨率

**相关文件：** `src/views/CoverPage.vue`、`src/composables/coverExport.ts`

- 封面导出设置独立 popover（标准高清 / 4K 等）。
- 导出流程与超时提示更清晰。

## 三、智能浮层（Smart Popover）

**相关文件：** `src/composables/useSmartPopover.ts`、封面/设置等菜单挂载点

- 统一避让顶栏与侧栏；按可用空间自动放置（上/下/左/右）。
- 封面文字菜单、导出菜单、AI 设置等共用同一套定位逻辑。

## 四、提示 UI 统一（ui-hint）

**相关文件：** `src/App_style.css`、`src/style.css`、各面板组件

- 提示文案统一 `ui-hint` 样式；中栏 / 侧栏 / AI / 封面说明一致。

## 五、首页导航

**相关文件：** `src/components/GlobalHeader.vue`

- 非首页（图文 / 封面等）统一显示「返回主页」。

## 六、发布与打包

- 版本号 **1.0.3**；标签 `v1.0.3-2026-08-10`。
- Windows 产物：`E:/cursor-agent/deliverables/AuraCard-desktop-1.0.3/`。
- macOS：GitHub Actions 构建并挂到同标签 Release。
