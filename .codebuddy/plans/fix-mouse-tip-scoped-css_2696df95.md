---
name: fix-mouse-tip-scoped-css
overview: 修复经纬度跟随提示仍不显示的问题：根因是 .mouse-coord-tip 写在 scoped 样式块中，动态创建并挂到 body 的元素没有 data-v 属性导致样式不生效。改为给动态 DOM 元素直接设置内联样式。
todos:
  - id: fix-inline-style
    content: 在 bindMouseMoveTip 创建元素处设置全部内联样式，并移除 scoped 中 .mouse-coord-tip 规则
    status: completed
---

## 用户需求

鼠标在地图上移动（非单击）时，箭头右上方需实时跟随显示当前经纬度，且数据随鼠标位置变化。

## 核心问题

前一次修复已将提示元素从 `#gps-map` 容器内移到 `document.body`（原生 DOM 操作），但提示仍然不显示。

## 根因

`.mouse-coord-tip` 样式定义在 `<style lang="scss" scoped">` 中。Vue scoped 样式在编译后会变成 `.mouse-coord-tip[data-v-xxx]` 属性选择器；而 `bindMouseMoveTip()` 用 `document.createElement('div')` 创建并 append 到 `document.body` 的元素没有该 `data-v-xxx` 属性，导致 scoped 样式完全不匹配。

结果：`position: fixed`、`background`、`z-index` 等关键样式全部失效，元素退化为无样式的纯文本出现在文档流底部，用户几乎看不到。

## 修复目标

让经纬度跟随提示正常显示并跟随鼠标。

## 技术栈

- 框架：Vue 2 + Element-UI（单文件组件 .vue）
- 地图：百度地图 WebGL（BMapGL）
- 样式：scoped SCSS

## 实现方案

沿用「动态 DOM 挂载到 document.body」的正确思路（已能避开地图 canvas 层级遮挡和 el-dialog 的 transform 居中影响），仅修复样式不生效的问题：

**关键改动**：在 `bindMouseMoveTip()` 创建元素时，直接给 `this._mouseCoordEl.style` 设置全部内联样式，使样式不依赖 scoped 样式表。内联样式优先级最高，能确保 `position: fixed`、黑色半透明背景、白色文字、高 z-index、跟随定位等全部生效。

### 关键细节

- 内联设置：`position: fixed; zIndex: 9999; pointerEvents: none; background: rgba(0,0,0,0.75); color: #fff; fontSize: 12px; padding: 4px 8px; borderRadius: 4px; whiteSpace: nowrap; lineHeight: 1.5;`
- `left/top` 仍由 mousemove 回调内联赋值（基于 `e.clientX/clientY`），保持跟随
- 鼠标移出地图容器时 `display: none` 隐藏
- 移除 scoped 中无用的 `.mouse-coord-tip` 规则，避免死代码（改为内联样式驱动）
- `beforeDestroy` / `handleClose` 已调用 `unbindMouseMoveTip()`，会移除 body 上的元素，无需额外改动

## 涉及文件

- `src/components/Breadcrumb/gpsLocalDialog.vue`（仅 2 处：创建元素处增加内联样式 + 移除 scoped 中 `.mouse-coord-tip` 规则）

## 目录结构

```
src/components/Breadcrumb/
└── gpsLocalDialog.vue   # [MODIFY] 在 bindMouseMoveTip 创建元素处设置内联样式；移除 scoped 内 .mouse-coord-tip 规则
```