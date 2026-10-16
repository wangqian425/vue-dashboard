---
name: fix-fence-draw-offset
overview: 修复百度地图绘制围栏时点击坐标偏移问题，通过在 startDrawFence() 的点击事件处理中修正容器偏移量来解决
todos:
  - id: implement-start-draw-fence
    content: 完善 startDrawFence() 绘制模式切换与 BMapGL 原生 click 事件绑定
    status: completed
  - id: implement-click-handler
    content: 实现 handleMapClick 选点逻辑，含坐标偏移修正与双层坐标校验机制
    status: completed
    dependencies:
      - implement-start-draw-fence
  - id: implement-overlay-drawing
    content: 实现 addFenceMarker 和 drawFenceRectangle 围栏可视化绘制方法
    status: completed
    dependencies:
      - implement-click-handler
  - id: implement-cleanup-methods
    content: 实现 cancelDrawFence/resetMapState 清理方法与 handleClose 增强
    status: completed
    dependencies:
      - implement-start-draw-fence
---

## 产品概述

修复电子围栏对话框中，点击地图绘制围栏时选中的点往右下角偏移的问题。

## 核心功能需求

- 修复百度地图（BMapGL）绘制围栏时的坐标偏移 bug：点击地图选点时，标记点位置与实际点击位置存在向右下角的偏移
- 实现完整的围栏绘制功能：支持点击选择左上角和右下角两个点来绘制矩形围栏
- 偏移修复采用方案二：在绘制逻辑中修正坐标偏移量，不改变现有 CSS 布局结构

## 问题根因分析

1. `.top-box` 使用 `position: absolute; top: 40px; z-index: 10` 绝对定位覆盖在地图容器上方
2. 对话框使用 `v-dialogDrag` 指令支持拖拽，可能引入 CSS transform
3. 地图可视区域与地图容器的坐标系统不一致，导致像素坐标到地理坐标的转换产生偏移

## 技术栈

- **前端框架**: Vue 2.6.10 + Element UI 2.13.2
- **地图引擎**: BMapGL（百度地图 JavaScript GL 版）
- **构建工具**: Vue CLI 4.4.4（webpack）
- **样式方案**: SCSS（scoped）

## 技术架构

### 系统组件关系

```
homePage/index.vue (主页)
  └── gpsLocalDialog.vue (电子围栏对话框)
        ├── el-dialog (v-dialogDrag 可拖拽)
        │     ├── .top-box (绝对定位搜索/表单栏)
        │     └── #gps-map .map-box (BMapGL 地图容器)
        ├── startDrawFence() → 围栏绘制入口
        └── map click handler → 点击选点逻辑
```

### 核心修复策略

**偏移修正的核心原理**：
BMapGL 的原生 `click` 事件回调中的 `e.point` 已经是正确的地理坐标。但如果使用了自定义的 DOM 事件监听或手动像素转换，则需要修正偏移量。修复方案分两层：

**第一层（首选）**：使用 BMapGL 原生 `map.addEventListener('click', callback)` 获取 `e.point`，该值由地图内部自动计算，天然准确，无需额外修正。

**第二层（兜底）**：如果必须通过手动像素计算获取坐标（如某些自定义绘制场景），则需：

1. 通过 `map.getContainer().getBoundingClientRect()` 获取容器实际位置
2. 计算点击位置相对于容器的正确像素坐标（减去 `.top-box` 的视觉遮挡偏移）
3. 使用 `map.overlayPixelToPoint(new BMapGL.Pixel(x, y))` 转换为地理坐标
4. 如有 CSS transform（来自 v-dialogDrag），需用 `map.pointToOverlayPixel()` 反向校验

### 数据流

```
用户点击"绘制围栏" → startDrawFence()
  → 切换 isDrawing 状态 / 绑定 map click 事件
  → 首次点击: 记录为 topLeft → 添加 Marker → 更新 fenceForm.aPint
  → 二次点击: 记录为 bottomRight → 添加 Marker + 绘制矩形 Polygon → 更新 fenceForm.bPint
  → 完成绘制 / 支持重新开始
```

## 实现细节说明

### 目录结构

```
src/components/Breadcrumb/
├── index.vue                    # [EXISTING] 面包屑导航（无需修改）
└── gpsLocalDialog.vue           # [MODIFY] 电子围栏对话框（主要修改目标）
```

### 关键修改文件：gpsLocalDialog.vue

#### 修改区域 1：data() 补充字段

- 新增 `drawClickListener` 引用（用于存储事件监听器引用，便于移除）

#### 修改区域 2：startDrawFence() 方法实现

完整实现围栏绘制模式切换逻辑：

- 如果已在绘制状态：取消绘制，清理事件和临时标记
- 如果未在绘制状态：开启绘制模式，绑定地图点击事件
- 关键坐标修正代码位于点击回调内

#### 修改区域 3：新增辅助方法

- `handleMapClick(e)` — 处理地图点击选点，含坐标修正逻辑
- `addFenceMarker(point, label)` — 在指定坐标添加标记点
- `drawFenceRectangle()` — 根据 topLeft 和 bottomRight 绘制矩形围栏
- `cancelDrawFence()` — 取消绘制、清理状态
- `resetMapState()` — 重置所有围栏相关状态（补充实现）
- `validateCoordFormat` — 经纬度格式校验（补充实现）

#### 修改区域 4：handleClose 增强

关闭对话框时确保取消绘制模式、清理事件监听器

### 性能注意事项

- 事件监听器必须在组件销毁/关闭时移除，防止内存泄漏
- 使用 BMapGL 原生 Overlay API（Marker/Polygon），避免频繁创建/销毁 DOM
- 坐标计算仅在点击瞬间执行，无性能瓶颈