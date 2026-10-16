---
name: fix-mouse-coord-tip
overview: "修复鼠标移动时跟随显示的经纬度提示未正常展示的问题：将提示元素从 #gps-map 内移到 document.body，避免被百度地图 canvas 层覆盖。"
todos:
  - id: fix-mouse-tip
    content: 将经纬度跟随提示从 Vue 模板改为原生 DOM 操作：移除模板元素、data 属性及事件回调逻辑重构
    status: completed
---

## 问题描述

鼠标在地图上移动时，经纬度跟随提示功能未正常展示。

## 根因分析

经纬度提示 `<div class="mouse-coord-tip">` 渲染在 `<div id="gps-map">` 容器内部。百度地图 WebGL 使用 canvas 层渲染地图内容，canvas 层会覆盖 DOM 元素的 z-index，导致即使设置 `z-index: 9999` 提示也不可见。

## 修复方案

将经纬度提示从 Vue 模板渲染改为原生 DOM 操作——创建一个固定定位的 div 并直接 append 到 `document.body`，使其完全脱离地图容器的 DOM 层级，不再被 canvas 层遮挡。

## 涉及文件

- `src/components/Breadcrumb/gpsLocalDialog.vue`（单文件修改，三处改动）

## 技术方案

### 实现策略

用原生 DOM 操作替代 Vue 模板渲染，将经纬度提示元素挂载到 `document.body`，避开百度地图 WebGL canvas 层遮挡。

### 核心改动

**1. 模板层**：移除 `<div v-if="showMouseTip" class="mouse-coord-tip">` 模板元素及其绑定。

**2. 数据层**：移除不再需要的 `showMouseTip`、`mouseTipPos` 两个 data 属性；保留 `mouseLngLat`（虽然不再由模板使用，但 handler 中仍需用其存储坐标值供直接 DOM 操作）。

**3. 方法层**：

- `bindMouseMoveTip()`：mousemove 回调中创建/更新一个原生 DOM 元素，设置其 `style.left` / `style.top` 为 `e.clientX + 12` / `e.clientY + 12`，`textContent` 为经纬度字符串，并 append 到 `document.body`。内部维护该 DOM 元素引用（如 `this._mouseCoordEl`）。
- `unbindMouseMoveTip()`：移除事件监听的同时，从 `document.body` 中移除 DOM 元素并置空引用。

**4. 样式层**：保留 `.mouse-coord-tip` CSS 规则，用于给动态创建的原生 DOM 元素设置 className。

### 关键细节

- DOM 元素需设置 `pointer-events: none`（已通过 CSS 类名处理），避免阻挡地图交互
- 鼠标离开地图容器时隐藏（当前逻辑已有，改为 `el.style.display = 'none'`）
- `beforeDestroy` 和 `handleClose` 都会调用 `unbindMouseMoveTip()`，需确保 DOM 清理逻辑健壮（判空处理）