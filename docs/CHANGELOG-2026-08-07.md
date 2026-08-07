# AuraCard 本轮调整说明（2026-08-07）

本文档汇总相对仓库初始导入提交（`d09261b`）的本轮功能与工程改动，依据当前工作区代码整理，不包含未落地的能力。

---

## 一、选中文字：字号 / 颜色（且不污染未选中正文）

**相关文件：** `src/store/selection.ts`、`src/components/LeftPanel.vue`、`src/components/CardPreview.vue`

- 新增内联选区模块：跟踪标题 / 副标题 / 正文中的有效选区，并用克隆 `Range` 在点击左侧控件时保留选区（避免浏览器失焦清空选区）。
- `preserveInlineSelection`：操作字号/颜色前保存选区；按钮 `preventDefault` 防止抢焦点。
- `applyStyleToCurrentSelection`：仅对选中范围包一层 `span`（字号/颜色）或块级容器（对齐），**不再把样式应用到整段未选中正文**。
- 左侧 `patchActiveStyle`：存在有效内联选区时，字号 / 颜色 / 正文对齐只走选区路径；失败也不回退为整页样式，避免「一点就改整卡」的问题。
- `suppressBodyBlur`：在左侧调字号/颜色期间短暂忽略正文 blur，减少编辑态被误退出。

---

## 二、选中文字对齐

- 选区存在时，正文对齐（左 / 中 / 右）同样只作用于选中片段（块级 `div` + `textAlign`）。
- 无选区时行为不变：仍更新整卡 `contentTextAlignment` 或对应分节样式。
- 标题对齐仍走整卡/分节路径（不与正文选区混用）。

---

## 三、封面：导入图片排版

**相关文件：** `src/views/CoverPage.vue`

- 新增「导入排版」模板入口：本地选择图片作为封面底图。
- 支持更换图片、清除图片、暗角强度滑杆（0–100%）。
- 导入后仍可直接编辑封面标题与署名，再导出 PNG。

---

## 四、在线字体（二级菜单 + 手动更新）

**相关文件：** `src/store/fonts.ts`、`public/fonts-catalog.json`、`src/components/LeftPanel.vue`

- 内置多款 Google Fonts 风格中英文字体（思源黑/宋、站酷系列、手写体等）及系统默认。
- 支持从 `/fonts-catalog.json`（或指定 URL）**手动更新**字体清单，并缓存到 `localStorage`。
- 支持添加自定义字体（名称、family、CSS URL）。
- 选中字体后加载对应 stylesheet，应用到卡片预览。
- UI 位于左侧「在线字体」二级面板，风格与主侧栏分段控件一致。

---

## 五、在线贴纸

**相关文件：** `src/store/stickers.ts`、`src/components/OnlineStickersPanel.vue`、`src/components/CardPreview.vue`、`src/components/CenterPanel.vue`、`public/stickers-catalog.json`

- 素材为开源 Unicode emoji + 简易 SVG path（**非 Canva CDN**），分类参考常见设计工具：表情、线条、可爱、贴纸、3D立体、图标、文字设计、人物、动物。
- 支持分类筛选、搜索、手动更新目录。
- 点击添加至当前卡片；选中后可拖动、角点缩放；双击删除。
- 快捷键：`Delete` / `Backspace` 删除选中贴纸，`Esc` 取消选中（输入框聚焦时会优先避让，选中贴纸时会移出输入焦点）。
- 导出下载时隐藏选中描边与缩放手柄，避免进图。

---

## 六、用户预设

**相关文件：** `src/store/presets.ts`、`src/components/LeftPanel.vue`

- 可将当前布局快照保存为用户预设（模板、比例、文案、背景、字体、贴纸、分节等）。
- 本地 `localStorage` 持久化；支持应用、覆盖更新、删除。
- UI 位于左侧「用户预设」二级面板。

---

## 七、三按钮入口 → 二级菜单

**相关文件：** `src/components/LeftPanel.vue`

左侧主面板增加一行三按钮：

| 按钮 | 打开面板 |
|------|----------|
| 在线字体 | 字体列表 / 手动更新 / 自定义字体 |
| 在线贴纸 | `OnlineStickersPanel` |
| 用户预设 | 保存 / 应用预设 |

- 再次点击同一按钮可收起；二级面板带返回标题栏，与主编辑区同屏切换。

---

## 八、UI 与浅色主题一致性

**相关文件：** `src/style.css`、`src/App_style.css`、`LeftPanel` / `OnlineStickersPanel` 内样式

- 扩展工具入口、贴纸网格、预设列表等使用现有 `--primary`、分段按钮、`btn--outline`、浅色背景与边框半径，贴近 AuraCard 默认 light 主题，避免另起一套深色/高对比控件。

---

## 九、Electron 桌面端打包

**相关文件：** `electron/main.cjs`、`electron/preload.cjs`、`electron/server.cjs`、`electron-builder.yml`、`package.json`

- Electron 启动后在本地起静态服务（默认端口偏好 `17831`），加载打包后的 `dist`，并内置与 Vite 类似的 AI 代理转发（DeepSeek / OpenAI / OpenRouter / DashScope）。
- `electron-builder`：Windows `nsis` 安装包 + `portable` 便携版；产物目录可配置到交付盘路径。
- 脚本：`electron:dev`、`dist:win`、`dist:dir`、`dist:mac`（Mac 在 Windows 上多为尽力构建，通常需 macOS/CI）。

---

## 十、其他相关改动

- **Vite 开发代理**：新增 `/deepseek-proxy`、`/openai-proxy`、`/openrouter-proxy`；DashScope 代理补充 `secure: false`；`server.host` 固定 `127.0.0.1`。
- **Store 拆分增强**：`sections`、`selection`、`fonts`、`stickers`、`presets` 等模块接入；导出、AI、样式、分节等有小幅联动修改。
- **API Key**：仍由用户在界面填写，不入库；请勿提交 `.env.local` 等密钥文件。

---

## 十一、已知限制 / 构建说明

1. **Mac 安装包**：本轮在 Windows 上执行 `electron-builder --mac` 直接失败（官方仅支持在 macOS 上打 Mac 包）。需在 macOS 主机或 GitHub Actions `macos-*` runner 上执行 `npm run dist:mac`。配置已预留 `mac` 目标（dmg/zip、x64+arm64、`identity: null` 跳过签名）。
2. **Windows 产物（本轮已生成）**：输出目录 `E:\cursor-agent\deliverables\AuraCard-desktop-2026-08-07\`  
   - `光语AuraCard-1.0.0-x64-setup.exe`（NSIS 安装包）  
   - `光语AuraCard-1.0.0-x64-portable.exe`（便携版）  
   - `win-unpacked\`（未打包目录）  
   图标改为 `electron/build/icon.ico`（由 png-to-ico 生成），避免大 PNG 转 ICO 导致 NSIS `can't open file`。
3. **AI 能力**：桌面端依赖用户配置的 Key；无 Key 时相关生成会提示错误，不影响纯编辑与导出。
4. **贴纸版权**：内置为 emoji/自绘 SVG 示意包，非第三方商用贴纸库镜像。
5. **GitHub 推送**：本机 Git 凭据用户为 `maxwellaaa`，对 `oniontang/AuraCard` 无写权限（403）；应推送到当前登录用户的个人仓库。

---

## 变更文件一览（摘要）

**修改：** `package.json`、`vite.config.ts`、多处 `src/components/*`、`src/store/*`、`src/views/CoverPage.vue`、`src/style.css` 等  

**新增：** `electron/*`、`electron-builder.yml`、`public/fonts-catalog.json`、`public/stickers-catalog.json`、`src/store/{fonts,presets,sections,selection,stickers}.ts`、`src/components/OnlineStickersPanel.vue`、`docs/CHANGELOG-2026-08-07.md`
