<template>
  <div class="home-overview">
    <div class="home-overview__body">
      <!-- 地图铺满底层 -->
      <div class="home-overview__map">
        <EchartsChinaMap
          :points="points"
          :categories="CATEGORIES"
          :field-map="POINT_FIELD_MAP"
          :hover-fields="HOVER_FIELDS"
          :layers="layerOptions"
          :active-layers.sync="activeLayers"
          @region-click="handleRegionClick"
          @point-click="handlePointClick"
          @point-more="handlePointMore"
        />
      </div>

      <!-- 顶部悬浮工具条：分类 tabs + 月份选择 -->
      <div class="home-overview__toolbar">
        <CategoryTabs
          :items="categoryTabs"
          :field-map="CATEGORY_FIELD_MAP"
          :value="query.category"
          multiple
          @input="handleCategoryChange"
        />
        <el-date-picker
          v-model="query.month"
          type="month"
          size="small"
          value-format="yyyy-MM"
          placeholder="选择月份"
          style="width: 130px"
        />
      </div>

      <!-- 左侧浮层：项目总览 + 地区排名 -->
      <div class="home-overview__col home-overview__col--left">
        <PanelCard title="项目总览" :sub-title="regionTitle" class="panel-block">
          <MetricList :items="overviewMetrics" :columns="2" variant="stat" value-color="#08f" />
          <ChartPie
            :data="pieData"
            :field-map="PIE_FIELD_MAP"
            :colors="pieColors"
            :center-text="pieCenter"
            rose-type="area"
            height="190px"
            @item-click="handlePieClick"
          />
        </PanelCard>

        <PanelCard title="地区排名" :sub-title="regionTitle" class="panel-block panel-block--flex">
          <RankList
            :items="rankList"
            :tabs="RANK_TYPES"
            :active-tab="query.rankType"
            :field-map="RANK_FIELD_MAP"
            :unit="currentRankUnit"
            @update:activeTab="handleRankTypeChange"
            @row-click="handleRankClick"
          />
        </PanelCard>

        <div style="color: rgba(230,162,60,1); font-size: 12px;">
          备注：装机容量、利用小时数仅针对风电和光伏项目
        </div>

      </div>

      <!-- 右侧浮层：趋势图 + 指标 + 项目列表 -->
      <div class="home-overview__col home-overview__col--right">
        <PanelCard :title="manageTitle" :sub-title="regionTitle" class="panel-block">
          <ChartBarLine
            :x-data="manageTrend.xAxis"
            :series="manageTrend.series"
            :colors="MANAGE_COLORS"
            stack="total"
            unit="单位：个"
            height="300px"
          />
        </PanelCard>

        <PanelCard title="运营项目情况" :sub-title="regionTitle" class="panel-block panel-block--flex summary-card">
          <template slot="extra">
            <el-button-group class="energy-switch-group">
              <el-button
                v-for="(label, key) in energyLabels"
                :key="key"
                size="mini"
                :type="query.energyType === key ? 'primary' : ''"
                @click="handleEnergyChange(key)"
              >
                {{ label }}
              </el-button>
            </el-button-group>
          </template>
          <MetricList :items="summaryMetrics" :columns="2" variant="card" value-color="#08f" />
          <ChartBarLine
            class="hours-chart"
            :x-data="hoursTrend.xAxis"
            :series="hoursTrend.series"
            :y-axis-names="['小时', '达标率(%)']"
            height="100%"
          />
        </PanelCard>

        <!-- <PanelCard v-if="showProjectList" title="项目列表" class="panel-block panel-block--flex">
          <ProjectCardList
            :items="projectList"
            :fields="PROJECT_CARD_FIELDS"
            :field-map="PROJECT_FIELD_MAP"
            :tag-type-map="STATUS_TAG_TYPE"
            show-more
            @item-click="handlePointMore"
            @more="handleMore"
          />
        </PanelCard> -->
      </div>
    </div>
  </div>
</template>

<script>
import PanelCard from '../components/PanelCard'
import MetricList from '../components/MetricList'
import ChartPie from '../components/ChartPie'
import ChartBarLine from '../components/ChartBarLine'
import RankList from '../components/RankList'
import CategoryTabs from '../components/CategoryTabs'
import EchartsChinaMap from '../components/EchartsChinaMap'

import {
  getOverview,
  getRegionRank,
  getMapPoints,
  getManageTrend,
  getProjectSummary,
  getHoursTrend,
  getProjectList
} from '@/api/homeOverview'

import {
  CATEGORIES,
  CATEGORY_FIELD_MAP,
  RANK_TYPES,
  RANK_FIELD_MAP,
  POINT_FIELD_MAP,
  HOVER_FIELDS,
  PROJECT_CARD_FIELDS,
  PROJECT_FIELD_MAP,
  STATUS_TAG_TYPE,
  ENERGY_LABELS,
  OVERVIEW_METRICS,
  PIE_FIELD_MAP,
  MANAGE_COLORS,
  SUMMARY_ICONS_MAP,
  DEFAULT_QUERY,
  ROOT_LEVEL
} from './config'

/**
 * 首页总览容器
 * 唯一的数据请求入口：所有子组件只接收 props、抛出事件，不直接请求接口
 * 后期迁移：替换 api/homeOverview.js 与 config.js 即可
 */
export default {
  name: 'HomeOverview',
  components: {
    PanelCard,
    MetricList,
    ChartPie,
    ChartBarLine,
    RankList,
    CategoryTabs,
    EchartsChinaMap
  },
  data() {
    return {
      // 静态配置（模板中直接引用）
      CATEGORIES,
      CATEGORY_FIELD_MAP,
      RANK_TYPES,
      RANK_FIELD_MAP,
      POINT_FIELD_MAP,
      HOVER_FIELDS,
      PROJECT_CARD_FIELDS,
      PROJECT_FIELD_MAP,
      STATUS_TAG_TYPE,
      PIE_FIELD_MAP,
      MANAGE_COLORS,
      energyLabels: ENERGY_LABELS,

      query: Object.assign({}, DEFAULT_QUERY),
      // 层级 Tab 数据
      levels: [Object.assign({}, ROOT_LEVEL)],
      // 省份字典（用于地图点击下钻时匹配 code）
      provinceDict: {},

      overview: {},
      rankList: [],
      points: [],
      manageTrend: { xAxis: [], series: [] },
      summaryList: [],
      hoursTrend: { xAxis: [], series: [] },
      projectList: [],
      activeLayers: []
    }
  },
  computed: {
    // 多选分类 → 请求参数：全选传 'all'，部分选择传逗号分隔
    categoryParam() {
      const ids = this.query.category
      if (!Array.isArray(ids)) return ids
      const all = CATEGORIES.map(c => c.id)
      const isAll = all.length > 0 && all.every(id => ids.includes(id))
      return isAll ? 'all' : ids.join(',')
    },
    requestParams() {
      return {
        level: this.query.level,
        provinceCode: this.query.provinceCode,
        cityCode: this.query.cityCode,
        category: this.categoryParam,
        month: this.query.month,
        rankType: this.query.rankType,
        energyType: this.query.energyType
      }
    },
    energyLabel() {
      return ENERGY_LABELS[this.query.energyType] || '风电'
    },
    manageTitle() {
      return `建设/运营管理项目（${this.energyLabel}）`
    },
    regionTitle() {
      const names = this.levels.map(l => l.name).slice(1)
      return names.length ? names.join(' / ') : '全国'
    },
    categoryTabs() {
      return this.overview.categories || []
    },
    overviewMetrics() {
      return OVERVIEW_METRICS.map(m => ({
        label: m.label,
        value: this.overview[m.field],
        unit: m.unit,
        icon: m.icon,
        trend: m.trend
      }))
    },
    pieData() {
      return (this.overview.categories || []).filter(c => c.id !== 'all')
    },
    // 项目情况指标附加图标（按当前能源类型 + label 匹配，切换风电/光伏/非标联动）
    summaryMetrics() {
      const icons = SUMMARY_ICONS_MAP[this.query.energyType] || SUMMARY_ICONS_MAP.wind
      return this.summaryList.map(item => {
        const label = String(item.label || '').trim()
        // 精确匹配 → 去空白匹配 → 包含匹配（容忍后端 label 带前后缀，如"年利用小时数"）
        const key = Object.keys(icons).find(
          k => k === label || k.trim() === label || label.includes(k) || k.includes(label)
        )
        return Object.assign({}, item, {
          icon: icons[key] || 'el-icon-document'
        })
      })
    },
    pieColors() {
      return CATEGORIES.map(c => c.color)
    },
    pieCenter() {
      const total = this.pieData.reduce((sum, item) => sum + (Number(item.count) || 0), 0)
      return { label: '', value: total }
    },
    currentRankUnit() {
      const target = RANK_TYPES.find(t => t.value === this.query.rankType)
      return target ? target.unit : ''
    },
    showProjectList() {
      return this.query.level !== 'country'
    },
    layerOptions() {
      return CATEGORIES.map(c => ({ key: c.id, label: c.name, color: c.color }))
    }
  },
  watch: {
    query: {
      deep: true,
      handler() {
        this.fetchAll()
      }
    }
  },
  created() {
    this.fetchAll()
  },
  methods: {
    // 统一请求：单个接口失败不影响其他模块
    async safeRequest(fn, defaultValue) {
      try {
        const res = await fn()
        return res && res.code === 200 ? res.data : defaultValue
      } catch (error) {
        console.error('首页数据请求失败:', error)
        return defaultValue
      }
    },
    async fetchAll() {
      const params = this.requestParams
      const [overview, rank, points, manage, summary, hours, projects] = await Promise.all([
        this.safeRequest(() => getOverview(params), {}),
        this.safeRequest(() => getRegionRank(params), { list: [] }),
        this.safeRequest(() => getMapPoints(params), { list: [] }),
        this.safeRequest(() => getManageTrend(params), { xAxis: [], series: [] }),
        this.safeRequest(() => getProjectSummary(params), { list: [] }),
        this.safeRequest(() => getHoursTrend(params), { xAxis: [], series: [] }),
        this.safeRequest(() => getProjectList(params), { list: [] })
      ])

      this.overview = overview || {}
      this.rankList = rank.list || []
      this.points = points.list || []
      this.manageTrend = manage || { xAxis: [], series: [] }
      this.summaryList = summary.list || []
      this.hoursTrend = hours || { xAxis: [], series: [] }
      this.projectList = projects.list || []

      // 全国层级下缓存省份字典，供地图点击下钻匹配
      if (this.query.level === 'country') {
        const dict = {}
        this.rankList.forEach(item => {
          dict[item.name] = item.code
        })
        this.provinceDict = dict
      }
    },
    handleCategoryChange(value) {
      this.query.category = value
    },
    // 项目情况卡片右上角能源类型切换（风电/光伏/非标）
    // 直接改 query.energyType，由 query 深度监听统一触发重新请求
    handleEnergyChange(type) {
      this.query.energyType = type
    },
    handleRankTypeChange(value) {
      this.query.rankType = value
    },
    // 点击排名：全国→省，省→市
    handleRankClick(row) {
      if (this.query.level === 'country') {
        this.drillToProvince(row.code, row.name)
      } else if (this.query.level === 'province') {
        this.query.cityCode = row.code
        this.query.level = 'city'
        this.levels = this.levels.slice(0, 2).concat({ code: row.code, name: row.name })
      }
    },
    drillToProvince(code, name) {
      this.query.level = 'province'
      this.query.provinceCode = code
      this.query.cityCode = ''
      this.levels = [Object.assign({}, ROOT_LEVEL), { code, name }]
    },
    // 地图点击：按省份名下钻
    handleRegionClick(payload) {
      const code = this.provinceDict[payload.province]
      if (!code) return
      if (this.query.level === 'country') {
        this.drillToProvince(code, payload.province)
      }
    },
    handlePieClick(params) {
      const target = CATEGORIES.find(c => c.name === params.name)
      if (target) {
        this.query.category = [target.id]
      }
    },
    handlePointClick(point) {
      this.$message.info(`${point.name}（点击点位可跳转项目详情）`)
    },
    handlePointMore(point) {
      this.$message.info(`查看项目详情：${point.name}`)
    },
    handleMore() {
      this.$message.info('跳转项目清单页')
    }
  }
}
</script>

<style lang="scss" scoped>
.home-overview {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 84px);
  padding: 12px;
  background: #f0f2f5;
  box-sizing: border-box;
  overflow: hidden;

  &__body {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  /* 地图铺满底层 */
  &__map {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  /* 顶部悬浮工具条：位于左右浮层之间 */
  &__toolbar {
    position: absolute;
    top: 12px;
    /* 对齐加宽后的左右浮层（12 + 465 宽 + 12 间距） */
    left: 489px;
    right: 489px;
    z-index: 11;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    pointer-events: none;

    /* 工具条内的控件可点击，其余区域不拦截地图交互 */
    > * {
      pointer-events: auto;
    }
  }

  /* 左右统计面板浮在地图两侧 */
  &__col {
    position: absolute;
    top: 12px;
    bottom: 12px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;

    /* 滚动条默认不出现，hover 时显示细滚动条 */
    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: 2px;
    }

    &:hover::-webkit-scrollbar-thumb {
      background: rgba(144, 147, 153, 0.4);
    }

    &--left {
      left: 12px;
      width: 465px;
      border-radius: 12px;
      background-color: rgba(255,255,255,1);
      box-shadow: 0px 0px 16px 0px rgba(0,0,0,0.05);
      font-family: Arial-regular;
    }

    &--right {
      right: 12px;
      width: 465px;
      gap: 12px;
      .panel-card {
        border-radius: 12px;
        background-color: rgba(255,255,255,1);
        box-shadow: 0px 0px 16px 0px rgba(0,0,0,0.05);
        font-family: Arial-regular;
      }
    }
  }
}

/* 项目情况卡片右上角能源类型切换（el-button-group 分段样式） */
.energy-switch-group {
  display: inline-flex;

  .el-button {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
  }

  .el-button--primary {
    background: #08f;
    border-color: #08f;
  }
}

/* 运营项目情况：指标列表 + 图表纵向布局，图表自适应占满剩余高度 */
.summary-card {
  ::v-deep .panel-card__body {
    display: flex;
    flex-direction: column;
  }

  .hours-chart {
    flex: 1;
    min-height: 150px;
    margin-top: 8px;
  }
}

.panel-block {
  flex-shrink: 0;

  /* 自适应占满剩余高度，内容超出时由内部滚动 */
  &--flex {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* 列表换行撑高后，下方图表被压缩时的最小高度 */
  .chart-bar-line {
    min-height: 150px;
  }
}
</style>
