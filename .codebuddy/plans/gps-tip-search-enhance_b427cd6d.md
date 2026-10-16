---
name: gps-tip-search-enhance
overview: 还原电子围栏弹窗原型样式与搜索功能：打点 tip 改为黑底白字；模糊搜索与经纬度搜索各自独立打点、互不干扰；经纬度打点增加合理性范围校验；模糊搜索 tip 展示 名称/地址/经纬度 换行。
todos:
  - id: unify-black-tip
    content: 统一黑底白字 tip 样式：新增 makeBlackTipLabel 并重构各打点调用、扩展 CSS
    status: completed
  - id: coord-range-check
    content: 扩展 isValidCoord 增加经纬度范围校验并完善搜索提示文案
    status: completed
    dependencies:
      - unify-black-tip
  - id: split-search-markers
    content: 拆分模糊/经纬度搜索 marker 槽位互不干扰，模糊搜索 tip 显示名称/地址/经纬度换行
    status: completed
    dependencies:
      - unify-black-tip
---

## 用户需求

在电子围栏弹窗（gpsLocalDialog.vue）中还原原型图的打点 tip 样式并优化搜索打点行为：

## 产品概述

针对地图打点提示气泡与搜索打点逻辑进行还原与增强，使所有地图打点 tip 统一为黑底白字原型风格，同时让「模糊搜索」与「经纬度搜索」两类打点相互独立、互不覆盖，并完善经纬度合理性校验与模糊搜索的 tip 信息展示。

## 核心功能

- 统一所有地图打点 tip 为黑色背景、白色文字（含原型图底部尖角箭头）。
- 模糊搜索与经纬度搜索分别维护独立的打点 marker，二者互不干扰、可同时展示。
- 经纬度搜索增加经纬度取值范围合理性校验（经度 [-180,180]、纬度 [-90,90]），不合法给出提示且不打点。
- 模糊搜索打点 tip 改为展示：地点名称、地址、经纬度，三行换行显示。

## 技术栈

- 框架：Vue 2 + Element UI（沿用 vue-element-admin 既有栈）
- 地图：百度地图 JS API GL（BMapGL）
- 语言：JavaScript（单文件组件）

## 实现方案

本任务为单组件内局部增强，集中在 `gpsLocalDialog.vue`，不改动对外 props/emit 契约，不影响父组件调用方式。核心策略：抽出统一的「黑底白字 tip」工厂函数消除重复 setStyle，借助已存在但未启用的 `.custom-black-tooltip` CSS 类统一控制气泡外观；将搜索打点的单一 `searchMarker/searchLabel` 槽位拆分为「模糊搜索」与「经纬度搜索」两套独立槽位实现互不干扰；扩展 `isValidCoord` 增加经纬度数值范围校验。

### 关键技术决策

1. **统一黑底白字 tip（样式集中化）**

- 现状：文件内 `drawMarkerWithTip`、`processFenceClick`（两处）、`addSearchMarker`、`makeTipLabel` 共 5 处重复 `setStyle`（白底彩边深字），DRY 违背且难以统一为原型黑底白字。
- 方案：复用文件末尾已定义的 `.custom-black-tooltip .BMapGL_Label`（含 `::after` 黑色底部尖角）样式，扩展其规则为黑底白字 + `white-space: pre-line`（支持 `\n` 换行）；在模板 `#gps-map` 容器追加 `custom-black-tooltip` class；新增 `makeBlackTipLabel(text, point)` 仅创建 Label 并设置 offset/position，**不再内联覆盖背景/颜色**，交由 CSS 统一控制。所有打点调用统一改为该函数。
- 理由：CSS 控制外观比内联 setStyle 更易维护、风格一致，且天然支持换行；契合用户「还原原型图」诉求。

2. **模糊搜索 / 经纬度搜索打点互不干扰（槽位拆分）**

- 现状：两类搜索共用 `searchMarker/searchLabel` 单一槽位，`clearSearchMarker` 会同时清空两者；两者同时有输入时还会直接警告「不能同时进行」，无法满足「分别打点、互不干扰」。
- 方案：data 中新增 `addressMarker/addressLabel`（模糊搜索）与 `coordMarker/coordLabel`（经纬度搜索）两套槽位；`searchByAddress` 仅清除自身 `addressMarker`，`searchByCoord` 仅清除自身 `coordMarker`；模板两个输入框的 `@clear` 分别绑定 `clearAddressMarker` / `clearCoordMarker`；保留 `clearSearchMarker()` 一次性清空两套（用于进入绘制围栏模式 `startDrawFence` 的场景）。
- 理由：独立槽位保证两类打点共存且不相互覆盖，符合需求「互不干扰」。

3. **经纬度合理性校验（范围增强）**

- 现状：`isValidCoord` 仅用正则 `COORD_REG` 校验「经度,纬度」格式，无数值范围判断（如 999,999 也能通过）。
- 方案：在 `isValidCoord` 通过正则后，解析 `lng/lat` 并校验 `lng ∈ [-180,180]`、`lat ∈ [-90,90]`，不合法返回 false；`searchByCoord` 中校验失败时提示文案区分「格式不正确」与「数值超出合理范围」。
- 理由：范围校验是经纬度合理性的必要判定，且不破坏 `renderFenceFromForm` 等既有调用（反而更正确）。

4. **模糊搜索 tip 多行信息**

- 现状：`searchByAddress` 仅取 `poi.title` 作为 tip 文本。
- 方案：在 `onSearchComplete` 中拼接 `poi.title`、`poi.address`、`poi.point`（经度,纬度）为三行文本（`\n` 连接），经统一黑底 tip 展示；对 `address` 缺失做兜底为空串。

### 性能与可靠性

- 计算属性与新增方法均为 O(1)，无 N+1 或重复遍历；地图覆盖物清除按槽位精确 `removeOverlay`，避免全图重绘。
- 标签样式走 CSS，不每帧 setStyle，开销可忽略。
- 向后兼容：`saveFence`/`isUnchanged` 逻辑与 `parentData` 契约不变；仅重构内部打点渲染细节。

## 实现细节

- 仅修改 `gpsLocalDialog.vue` 一个文件；不引入新依赖、新 API。
- 统一 tip 函数名建议 `makeBlackTipLabel`，保留原 `mouseover/mouseout` 显隐监听模式。
- 经纬度范围常量可内联，不必新增全局常量。
- 需注意 `BMapGL.Label` 默认可能带内联样式，统一方案下务必移除原调用处的 `setStyle` 背景覆盖，确保 CSS `.custom-black-tooltip` 生效。
- 模糊搜索 tip 换行依赖 CSS `white-space: pre-line`，文本以 `\n` 拼接即可，无需额外 DOM。

## 架构设计

本任务为单组件内样式与打点逻辑的局部重构，沿用现有 mixins/dialog、BMapGL 调用方式与 `fenceForm`/`parentData` 数据结构，不改动组件层级或对外接口。

## 目录结构

```
src/components/Breadcrumb/
└── gpsLocalDialog.vue   # [MODIFY]
    # 1) 模板：#gps-map 容器新增 custom-black-tooltip class；两搜索输入框 @clear 分别绑定 clearAddressMarker / clearCoordMarker。
    # 2) data：新增 addressMarker/addressLabel、coordMarker/coordLabel 两套打点槽位（保留 searchMarker/searchLabel 便于过渡或移除）。
    # 3) computed/样式：扩展 .custom-black-tooltip .BMapGL_Label 为黑底白字 + pre-line 换行，并保留底部黑色尖角箭头。
    # 4) methods：新增 makeBlackTipLabel(text, point) 统一黑底 tip；searchByAddress 改用 addAddressMarker 并拼接 名称/地址/经纬度 三行文本；searchByCoord 改用 addCoordMarker 并做范围校验提示；clearSearchMarker 清空两套槽位；新增 clearAddressMarker/clearCoordMarker；isValidCoord 增加经纬度范围判断；重构 drawMarkerWithTip/processFenceClick/finishFenceDrawing 使用统一黑底 tip。
```

## 关键代码结构

```js
// 统一黑底白字 tip 工厂（不再内联覆盖背景/颜色，交由 CSS .custom-black-tooltip 控制）
makeBlackTipLabel(text, point) {
  const label = new BMapGL.Label(text, {
    offset: new BMapGL.Size(10, -25),
    position: point,
  });
  if (point) label.setPosition(point);
  return label;
}

// 经纬度合理性校验：格式 + 取值范围
isValidCoord(str) {
  if (!str) return false;
  if (!COORD_REG.test(str.trim())) return false;
  const [lng, lat] = str.trim().split(',').map(Number);
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return false;
  return true;
}
```