---
name: gpsLocalDialog-围栏坐标与tooltip修复
overview: 修复 gpsLocalDialog.vue 中电子围栏的 3 个问题：①经纬度校验正则缺少逗号导致无法重绘与搜索报异常；②绘制完成后 hover tip 因 Label 未设置 position 而偏移。
todos:
  - id: fix-coord-regex
    content: 修正 COORD_REG 与 isValidCoord 正则以支持 lng,lat 逗号分隔格式
    status: completed
  - id: fix-tip-position
    content: 为 makeTipLabel 增加 position 参数并在 finishFenceDrawing 传入 ptA/ptB 修复 tip 偏移
    status: completed
    dependencies:
      - fix-coord-regex
  - id: verify-dialog
    content: 验证重绘、经纬度搜索与 tip 跟随三处交互无回归
    status: completed
    dependencies:
      - fix-coord-regex
      - fix-tip-position
---

## 用户需求

修复 `src/components/Breadcrumb/gpsLocalDialog.vue` 电子围栏弹窗中反馈的三个问题：

## 核心问题

- **问题一（tip 偏移）**：打点绘制围栏完成后，鼠标移动到围栏顶点 Marker 上，弹出的 tooltip 标签位置发生偏移，未跟随在 Markerr 上方。
- **问题二（无法重绘）**：点击"绘制围栏"时，弹窗提示当前已有经纬度数据、选择"是（使用现有坐标绘制围栏）"后，地图上无任何反应，围栏无法重绘。
- **问题三（经纬度异常）**：打点绘制围栏后，将生成的两个点经纬度（如 `116.123456,39.123456`）填入经纬度搜索框进行搜索，报错"经纬度格式不正确"。

## 技术栈

- 框架：Vue 2 + Element UI（el-dialog）
- 地图：百度地图 JavaScript GL API（BMapGL）
- 目标文件：`src/components/Breadcrumb/gpsLocalDialog.vue`（单文件组件，含 template / script / style）

## 根因分析（已逐行核对当前文件）

三个问题集中在同一文件，无需改动 `src/util/map` 或其他文件。

### 问题二、问题三根因：经纬度校验正则缺少逗号分隔符

- 第 34 行 `COORD_REG` 与第 216 行 `isValidCoord` 使用正则 `/^-?\d{1,3}\.\d{2,}-?\d{1,3}\.\d{2,}$/`，该正则**未包含经纬度之间的逗号**，只能匹配 `116.40-39.90` 这种无逗号形式。
- 实际围栏坐标格式为 `lng,lat`（如 `116.123456,39.123456`），因此 `isValidCoord()` 对合法坐标恒返回 `false`。
- 第 138-140 行 `renderFenceFromForm`：`if (!aValid || !bValid) return;` 因校验失败提前返回 → 问题二（选"是"后无绘制）。
- 第 264-269 行 `searchByCoord`：`if (!this.isValidCoord(coord))` 触发警告 → 问题三（搜索报格式不正确）。

### 问题一根因：tooltip Label 未设置定位 position

- 第 474-478 行 `makeTipLabel(text)` 创建 `BMapGL.Label` 时只传了 `offset`，未传 `position`，也未调用 `setPosition`。
- 第 439-452 行 `finishFenceDrawing` 用 `makeTipLabel` 生成 tip 后直接 `map.addOverlay(aLabel/bLabel)`。由于 Label 没有地理坐标，BMapGL 将其默认定位到容器原点（0,0）附近 → tip 显示位置偏移。
- 对照第 172-175 行 `drawMarkerWithTip` 与第 373-376 行打点过程中的 Label 均显式传入 `position: point`，因此这些 tip 位置正确，唯独 `makeTipLabel` 缺失。

## 实施方案

1. **修正经纬度正则**：将 `COORD_REG` 与 `isValidCoord` 的正则统一改为允许逗号（及逗号后可选空白）分隔，例如 `/^-?\d{1,3}\.\d{1,},\s*-?\d{1,3}\.\d{1,}$/`。同时保留对经纬度两段各至少一位整数、小数位数的合法性约束，修复问题二、问题三。
2. **修复 tooltip 定位**：将 `makeTipLabel(text, point)` 增加 `point` 参数，内部创建 Label 时传入 `position: point`（或调用 `label.setPosition(point)`）；在 `finishFenceDrawing` 第 439-440 行调用处分别传入 `ptA`、`ptB`，使 tip 精确跟随顶点 Marker，修复问题一。

## 实现要点

- 保持与现有 `drawMarkerWithTip` / `processFenceClick` 中 Label 的构建方式一致（position + offset 同时设置），避免引入新的不一致。
- `COORD_REG`（第 34 行）当前未被引用，一并修正以保持语义一致，避免后续误用。
- 不改动地图打点的原生 DOM 坐标计算逻辑（前序已修复的偏移问题保持不动）。
- 修复后 `isValidCoord` 需能正确识别打点生成的 6 位小数坐标（`116.123456,39.123456`）。

## 目录结构

```
src/components/Breadcrumb/
└── gpsLocalDialog.vue   # [MODIFY] 修正经纬度校验正则（第34、216行）；为 makeTipLabel 增加 position 参数并修复 finishFenceDrawing 中 tip 定位（第439-440、474-478行）
```