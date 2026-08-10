# AuraCard 版本说明（1.0.3 / 2026-08-10）

相对正式版 `v1.0.2-2026-08-09`。本轮以封面编辑体验与全局 UI 提示统一为主。不含密钥与大体量二进制。

---

## 一、封面文字图层与菜单

**相关文件：** `src/views/CoverPage.vue`、`src/components/CoverTextLayerBox.vue`、`src/composables/useCoverTextLayers.ts`

- 封面标题/署名支持独立文字图层编辑与定位。
- 封面文字菜单：字号、颜色等操作集中在浮动菜单中完成。

## 二、封面导出子菜单

**相关文件：** `src/composables/coverExport.ts`、`src/views/CoverPage.vue`

- 「导出封面」改为分辨率子菜单（含像素尺寸提示）。
- 导出按所选分辨率与画幅计算 PNG 尺寸；失败/超时有明确提示。

## 三、智能 Popover 定位

**相关文件：** `src/composables/useSmartPopover.ts`

- 统一浮动菜单定位：自动避开顶栏/侧栏，优先可见区域。
- 封面文字菜单与导出菜单共用该能力。

## 四、Hint UI 统一与首页导航

**相关文件：** `src/App_style.css`、`src/style.css`、`src/components/GlobalHeader.vue`、各面板组件

- 全局 `ui-hint` 样式统一说明文案层级。
- 非首页统一「返回主页」入口（图文 / 封面等模式共用）。

## 五、发布

- 版本：`1.0.3`；Tag：`v1.0.3-2026-08-10`
- Windows：`E:/cursor-agent/deliverables/AuraCard-desktop-1.0.3/`
- Mac：GitHub Actions `Build macOS` 产物挂到同一 Release
