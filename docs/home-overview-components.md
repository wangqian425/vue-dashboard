# 首页总览（HomeOverview）组件代码梳理

> 路由：`src/router/index.js` → `path: 'homePage'` → 子路由 `HomeOverview`，懒加载 `@/views/homePage/overview/index`
> 页面文件：`src/views/homePage/overview/index.vue`
> 配套配置：`src/views/homePage/overview/config.js`
> 接口层：`src/api/homeOverview.js`
> 通用组件：`src/components/Dashboard/*`

---

## 一、整体架构

首页总览采用**「单一数据入口容器 + 通用展示组件」**的设计：

```
HomeOverview（容器）
  ├─ config.js          ← 配置中心（字段映射/文案/配色/默认查询）
  ├─ api/homeOverview   ← 接口层（7 个 GET 请求）
  └─ components/Dashboard
        ├─ PanelCard       容器卡片（标题 + 插槽）
        ├─ MetricList      指标列表（stat / card / default 三种形态）
        ├─ ChartPie        环形/玫瑰图
        ├─ ChartBarLine    柱线混合图（双 Y 轴）
        ├─ RankList        地区排名列表
        ├─ CategoryTabs    分类筛选 Tab（支持单选/多选）
        ├─ ProjectCardList 项目卡片列表
        └─ EchartsChinaMap 中国地图（打点/悬浮/下钻/全屏）
```

**核心约定（迁移关键点）**：
- 容器是**唯一请求入口**，所有子组件只收 props、抛事件，不直接发请求。
- 后端字段名、展示文案、配色全部集中在 `config.js`，后端改字段只需改这一处。
- 子组件统一走 `fieldMap` 字段映射，业务零耦合，可复用到其他页面。

---

## 二、数据流转

### 1. 配置中心 `config.js`
| 导出 | 用途 |
|------|------|
| `CATEGORIES` | 分类定义（id/name/color），驱动地图打点、图表配色 |
| `CATEGORY_FIELD_MAP` | 分类 Tab 字段映射 |
| `RANK_TYPES` | 地区排名维度（个数/达标率/贡献值/小时数） |
| `RANK_FIELD_MAP` | 排名列表字段映射 |
| `POINT_FIELD_MAP` / `HOVER_FIELDS` | 地图点位字段 + 悬浮卡片字段 |
| `PROJECT_CARD_FIELDS` / `PROJECT_FIELD_MAP` / `STATUS_TAG_TYPE` | 项目卡片字段 + 状态→tag 类型 |
| `ENERGY_LABELS` | 能源类型文案（风电/光伏/非标） |
| `OVERVIEW_METRICS` | 项目总览顶部指标 |
| `PIE_FIELD_MAP` / `MANAGE_COLORS` / `SUMMARY_ICONS` | 玫瑰图/趋势图配色/指标图标 |
| `DEFAULT_QUERY` | 默认查询条件（level=country，全部分类，energyType=wind） |
| `ROOT_LEVEL` | 层级根节点 `{ code:'country', name:'全国' }` |

### 2. 接口层 `api/homeOverview.js`
统一封装 axios（带 token），由调用方按 `code===200` 判定成功，7 个接口：

| 函数 | 接口 | 返回 |
|------|------|------|
| `getOverview` | `/project/home/overview` | 总览（项目数、分类统计） |
| `getRegionRank` | `/project/home/regionRank` | 地区排名 `{ list }` |
| `getMapPoints` | `/project/home/mapPoints` | 地图点位 `{ list }` |
| `getManageTrend` | `/project/home/manageTrend` | 建设/运营趋势 `{ xAxis, series }` |
| `getProjectSummary` | `/project/home/projectSummary` | 项目情况指标 `{ list }` |
| `getHoursTrend` | `/project/home/hoursTrend` | 利用小时/达标率 `{ xAxis, series }` |
| `getProjectList` | `/project/home/projectList` | 下钻项目列表 `{ list }` |

### 3. 容器请求逻辑（`fetchAll`）
- `query` 深度监听 → 变化时统一触发 `fetchAll`。
- `Promise.all` 并发 7 个请求，每个走 `safeRequest` 容错（单接口失败不影响其他模块）。
- 计算属性 `categoryParam`：全选时传 `'all'`，部分选择传逗号分隔字符串。
- `requestParams` 组装：`level / provinceCode / cityCode / category / month / rankType / energyType`。

---

## 三、容器组件 `overview/index.vue`

### 布局（三层浮层，地图铺底）
- `home-overview__map`：底层中国地图（绝对定位铺满）。
- `home-overview__toolbar`：顶部悬浮条——分类 Tab + 月份选择（位于左右浮层中间）。
- `home-overview__col--left`（左侧 320px）：项目总览（指标 + 玫瑰图）、地区排名。
- `home-overview__col--right`（右侧 340px）：建设/运营趋势、项目情况（能源切换）、利用小时数、项目列表。

### 关键计算属性
| 名称 | 说明 |
|------|------|
| `categoryParam` | 全选→'all'，否则逗号拼接 |
| `requestParams` | 组装请求参数 |
| `regionTitle` | 层级面包屑（全国 / 省 / 市） |
| `manageTitle` | 趋势图标题（含能源类型） |
| `overviewMetrics` / `pieData` | 左栏指标 + 玫瑰图数据 |
| `summaryMetrics` | 项目情况指标（按 label 补图标） |
| `currentRankUnit` | 当前排名维度单位 |
| `showProjectList` | 非 country 层级才显示项目列表 |
| `layerOptions` | 地图图例（来自 CATEGORIES） |

### 交互方法
| 方法 | 触发 | 作用 |
|------|------|------|
| `handleCategoryChange` | 分类 Tab | 改 `query.category` |
| `handleEnergyChange` | 能源切换 | 改 `query.energyType` |
| `handleRankTypeChange` | 排名维度 | 改 `query.rankType` |
| `handleRankClick` | 点击排名行 | 全国→省下钻 / 省→市下钻 |
| `drillToProvince` | 工具方法 | 维护 `levels` 与 `query` |
| `handleRegionClick` | 地图省份点击 | 用 `provinceDict` 匹配 code 下钻 |
| `handlePieClick` | 玫瑰图扇区 | 按分类名筛选 |
| `handlePointClick / handlePointMore / handleMore` | 点位/更多 | 占位（toast 提示） |

### 下钻逻辑（三级：country → province → city）
- 全国层级下，`fetchAll` 缓存 `provinceDict`（省名→code），供地图点击匹配。
- 排名点击 / 地图点击均走 `drillToProvince`；省层级再点排名为市层级。
- 层级面包屑由 `levels` 数组渲染。

---

## 四、通用组件清单（props / events 速查）

### PanelCard（容器卡片）
- props：`title / subTitle / icon / bodyStyle`
- 特性：标题前蓝色竖条；`subTitle` 自动包括号；`extra` 插槽。

### MetricList（指标列表）
- props：`items / fieldMap / columns / valueColor / variant(default|stat|card) / formatter`
- 通过 `fieldMap` 读 label/value/unit/icon/trend，支持趋势箭头。

### ChartPie（环形/玫瑰图）
- props：`data / fieldMap / colors / height / centerText / donut / roseType / unit / showLegend / extraOption`
- 事件：`item-click`；点击触发扇区筛选。

### ChartBarLine（柱线混合图）
- props：`xData / series / yAxisNames / height / colors / showLegend / stack / unit / extraOption`
- 特性：自动双 Y 轴；柱可堆叠，折线不参与堆叠；折线默认白心圆点。

### RankList（地区排名）
- props：`items / tabs / activeTab / fieldMap / unit / barColor / max / formatter`
- 事件：`update:activeTab`、`tab-change`、`row-click`
- 样式：前三名红/橙/黄，其余蓝灰进度条。

### CategoryTabs（分类筛选）
- props：`value / items / fieldMap / activeColor / multiple / allValue`
- 事件：`input`、`change`
- 多选模式：点「全部」全选；逐个取消；全取消自动回到全选。

### ProjectCardList（项目卡片）
- props：`items / title / fields / fieldMap / tagTypeMap / showMore`
- 事件：`item-click`、`more`

### EchartsChinaMap（中国地图）
- props：`points / fieldMap / categories / hoverFields / defaultColor / layers / activeLayers / showFullscreen`
- 事件：`point-click`、`region-click`（省份下钻）
- 特性：模块级注册 `china.json`；按分类分组 scatter 系列；全屏 + resize 自适应。

---

## 五、已清理的遗留组件（2026-10-14）

以下两个组件经核查无任何 import/引用，已删除：

- `components/Dashboard/MapViewer.vue` —— 百度 `BMapGL` 地图查看器，与 `EchartsChinaMap` 功能重叠，首页总览实际用 ECharts 版本。
- `components/Dashboard/LevelTabs.vue` —— 层级下钻 Tab，下钻面包屑在容器里用 `levels` 数组实现。

> 注：二者依赖的 `@/util/map` 仍被 `components/Breadcrumb/gpsLocalDialog.vue` 使用，已保留。

---

## 六、迁移 / 维护清单
1. 改后端字段名 → 改 `config.js` 的 `fieldMap` / `PROJECT_FIELD_MAP` 等，组件不动。
2. 改接口路径或新增接口 → 改 `api/homeOverview.js`。
3. 换数据源 → 替换 `api` 层与 `config` 即可，容器与展示组件可复用。
4. 子组件均为纯展示 + `fieldMap` 解耦，可整体搬运到其他页面。
