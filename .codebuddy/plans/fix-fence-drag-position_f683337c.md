---
name: fix-fence-drag-position
overview: 将电子围栏 marker 拖拽从 BMapGL 内置 enableDragging 改为自定义 DOM 鼠标事件实现，解决 el-dialog transform 导致的首次拖拽坐标偏移和不实时更新问题
todos:
  - id: rewrite-drag-method
    content: 重写 bindFenceMarkerDrag() 方法：用原生 DOM 事件替代 BMapGL enableDragging()，基于 getBoundingClientRect + pixelToPoint 坐标转换模式实现可靠拖拽
    status: completed
  - id: update-cleanup
    content: 修改 clearFenceOverlays()：在清除围栏时同步清理 marker._dragHandlers 中存储的原生事件引用，防止内存泄漏
    status: completed
    dependencies:
      - rewrite-drag-method
  - id: simplify-init
    content: 简化 renderFenceFromForm() 初始化流程：移除不必要的 tilesloaded 等待延迟，原生事件方案无需等待 dialog 动画完成
    status: completed
    dependencies:
      - rewrite-drag-method
---

## Product Overview

修复电子围栏 marker 在初始化绘制后首次拖拽时位置偏移且不实时更新的问题。

## Core Features

- **首次拖拽位置修正**: 解决 el-dialog 的 CSS transform 导致 BMapGL 内部拖拽坐标计算错误，使得首次拖拽时 marker 跳转到错误位置
- **实时坐标更新**: 拖拽过程中实时更新另一个 marker 的 label 文本、fenceForm 坐标值、以及矩形覆盖物（polygon）的路径
- **事件清理**: 清除围栏时正确移除自定义拖拽事件监听，防止内存泄漏

## Tech Stack

- 前端框架: Vue 2 (Options API)
- 地图库: Baidu Maps GL (BMapGL)
- UI 组件库: Element UI (el-dialog)

## 根因分析

`bindFenceMarkerDrag()` (第292行) 当前使用 BMapGL 内置的 `marker.enableDragging()` + `dragging` 事件。但该组件嵌套在 `el-dialog` 中，dialog 使用了 CSS `transform` 进行居中和动画定位。BMapGL 的内部拖拽计算基于 `getBoundingClientRect()` 获取容器偏移量，**无法正确处理祖先元素的 transform**，导致：

1. 首次拖拽时坐标偏移量错误，marker 跳到错误位置
2. `dragging` 事件返回的 `getPosition()` 值不准确，造成"不实时更新"的表象

## 实现方案

**用原生 DOM 事件完全替代 BMapGL 内置拖拽机制**，复用已验证的 `bindMouseMoveTip()` 中的坐标转换模式：

1. **重写 `bindFenceMarkerDrag()`**: 移除 `$nextTick + setTimeout + enableDragging()`，改用原生 mousedown/mousemove/mouseup 事件链

- mousedown: 绑定到 marker DOM 元素上，设置 `isDragging=true`，阻止冒泡避免触发地图拖拽
- mousemove: 绑定到 document 上（防止鼠标移出 marker 范围时丢失事件），通过 `container.getBoundingClientRect()` 获取准确屏幕坐标，再用 `this.map.pixelToPoint()` 转换为地理坐标，调用 `marker.setPosition()` 更新位置
- mouseup: 绑定到 document 上，结束拖拽状态

2. **获取 Marker DOM 元素**: 使用 BMapGL 的 `marker.getElement()` 方法（BMapGL Marker 标准API），若不可用则回退到从地图容器中查找 overlay DOM 元素

3. **更新 `clearFenceOverlays()`**: 遍历 fenceMarkers 时，额外清理存储在 marker 实例上的 `_dragHandlers`（包含 onMove/onUp 引用）

4. **`renderFenceFromForm()` 同步简化**: 移除之前加的 tilesloaded 等待逻辑（原生事件方案不需要等待地图渲染完成）

## 关键实现细节

```
bindFenceMarkerDrag(marker, label, isTopLeft):
  ① 通过 marker.getElement() 或回退查找获取 DOM 元素
  ② DOM.addEventListener('mousedown', onDown) → isDragging=true, stopPropagation
  ③ document.addEventListener('mousemove', onMove) → pixelToPoint → setPosition + updateLabel + updateForm + updatePolygon  
  ④ document.addEventListener('mouseup', onUp) → isDragging=false
  ⑤ 将 {onMove, onUp} 存入 marker._dragHandlers 供 clearFenceOverlays 清理
```

## 修改文件

仅修改一个文件: `/Users/mac/dev/vue-element-admin/src/components/Breadcrumb/gpsLocalDialog.vue`