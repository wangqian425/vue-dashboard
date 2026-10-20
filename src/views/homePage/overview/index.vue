<template>
  <div class="home-overview">
    <div class="home-overview__body">
      <!-- 地图铺满底层 -->
      <div class="home-overview__map">
        <EchartsChinaMap
          :points="visiblePoints"
          :categories="pointCategories"
          :field-map="POINT_FIELD_MAP"
          :hover-fields="HOVER_FIELDS"
          :region-tooltip-fields="regionPriceFields"
          :region-tooltip-data="provincePriceMap"
          :capitals="capitals"
          :capital-icon="capitalIcon"
          :layers="layerOptions"
          :active-layers.sync="activeLayers"
          :build-options="buildOptions"
          :build-filter.sync="buildFilter"
          :subsidy-options="subsidyOptions"
          :subsidy-filter.sync="subsidyFilter"
          :subsidy-icons="subsidyIcons"
          :price-options="priceOptions"
          :price-type.sync="priceType"
          :province-data="provincePrices"
          :map-code="mapCode"
          :fullscreen-icons="fullscreenIcons"
          @region-click="handleRegionClick"
          @back="handleMapBack"
          @point-click="handlePointClick"
          @point-more="handlePointMore"
        />
      </div>

      <!-- 顶部悬浮工具条：左列行业 tabs（可换行）+ 右列月份选择（固定右上角） -->
      <div class="home-overview__toolbar">
        <div class="home-overview__toolbar-left">
          <CategoryTabs
            :items="categoryTabs"
            :field-map="CATEGORY_FIELD_MAP"
            :value="query.category"
            multiple
            @input="handleCategoryChange"
          />
        </div>
        <div class="home-overview__toolbar-right">
          <el-date-picker
            v-model="query.month"
            type="month"
            size="small"
            :clearable="false"
            value-format="yyyy-MM"
            placeholder="选择月份"
            style="width: 120px; background-color: rgba(96, 105, 127, 0.7); opacity: 0.5;"
          />
        </div>
      </div>

      <!-- 左侧浮层：项目总览 + 地区排名（内容区滚动）+ 底部备注（固定不遮挡） -->
      <div class="home-overview__col home-overview__col--left">
        <div class="home-overview__left-scroll">
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
              :tabs="rankTypeOptions"
              :active-tab="query.rankType"
              :field-map="RANK_FIELD_MAP"
              :unit="currentRankUnit"
              @update:activeTab="handleRankTypeChange"
              @row-click="handleRankClick"
            />
          </PanelCard>
        </div>

        <div class="home-overview__note">
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
                :type="operateEnergyType === key ? 'primary' : ''"
                @click="handleEnergyChange(key)"
              >
                {{ label }}
              </el-button>
            </el-button-group>
          </template>
          <MetricList :items="summaryMetrics" :columns="2" variant="card" value-color="#08f" />
          <ChartBarLine
            class="hours-chart"
            :x-data="operateChart.xAxis"
            :series="operateChart.series"
            :y-axis-names="operateChartYAxis"
            height="100%"
          />
        </PanelCard>
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
  queryProjectOverview,
  queryBuildandOperate,
  queryOperateDetail,
  queryNationalRanking,
  queryRegionRanking,
  queryMapDisplay,
  getProjectList
} from '@/api/homeOverview'

import {
  CATEGORIES,
  CATEGORY_FIELD_MAP,
  RANK_TYPES,
  REGION_RANK_TYPES,
  RANK_FIELD_MAP,
  POINT_FIELD_MAP,
  POINT_CATEGORIES,
  classifyProject,
  HOVER_FIELDS,
  REGION_PRICE_FIELDS,
  PROJECT_CARD_FIELDS,
  PROJECT_FIELD_MAP,
  STATUS_TAG_TYPE,
  ENERGY_LABELS,
  OVERVIEW_METRICS,
  PIE_FIELD_MAP,
  MANAGE_COLORS,
  MANAGE_TREND_FIELDS,
  SUMMARY_ICONS_MAP,
  OPERATE_TYPE_MAP,
  OPERATE_METRICS,
  OPERATE_CHART_FIELDS,
  DEFAULT_QUERY,
  ROOT_LEVEL,
  BUILD_FILTERS,
  SUBSIDY_FILTERS,
  PRICE_OPTIONS,
  STATUS_PARAM_MAP,
  INDUSTRY_ALL,
  provinceShortName,
  findProvince,
  PROVINCE_CAPITALS,
  station_type,
  fullscreenIcon
} from './config'
import provinceIcon from '../province.svg'

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
      // 地图浮动菜单配置
      buildOptions: BUILD_FILTERS,
      subsidyOptions: SUBSIDY_FILTERS,
      priceOptions: PRICE_OPTIONS,
      subsidyIcons: station_type,
      fullscreenIcons: fullscreenIcon,

      // 地图筛选状态（子组件 .sync 回写）
      buildFilter: ['在建', '运营'],
      subsidyFilter: ['无补贴', '有补贴', '合规清单'],
      priceType: 'wind',

      query: Object.assign({}, DEFAULT_QUERY),
      // 层级 Tab 数据
      levels: [Object.assign({}, ROOT_LEVEL)],

      overview: {},
      rankList: [],
      // 建设/运营管理项目报表原始数据（逐月数组，经 manageTrend 计算属性映射为图表结构）
      manageList: [],
      // 建设/运营管理项目报表的能源类型（报表标题展示，独立于运营项目情况的切换按钮）
      manageEnergyType: 'wind',
      // 运营项目情况的能源类型（风电/光伏/非标，卡片右上角按钮切换，独立状态不与上报表联动）
      operateEnergyType: 'wind',
      // 运营项目情况原始数据（queryOperateDetail 返回，指标与图表一体）
      operateDetail: {},
      projectList: [],
      activeLayers: [],
      // 地图展示原始数据（mapDisplay 返回：全国=省份数组，省份=单对象；归一化存为省份数组）
      provinceGroups: [],
      // 地图点位分类（补贴属性三分类：无补贴/有补贴/合规清单）
      pointCategories: POINT_CATEGORIES,
      // 省会标记点 + 图标
      capitals: PROVINCE_CAPITALS,
      capitalIcon: provinceIcon
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
    // 当前下钻省份的接口全称（山东省/内蒙古自治区），全国层级为空
    currentProvinceFullName() {
      if (this.query.level !== 'province') return ''
      const name = (this.levels[this.levels.length - 1] || {}).name || ''
      const hit = findProvince(name)
      return hit ? hit.full : name
    },
    // 全局报表请求参数（单一来源，所有报表接口共用这 4 个字段）
    // industry: 行业类型，多个逗号分隔（能源电力,节能环保,智慧能源,绿色交通,其他），空=全部
    // month: 查询月份 yyyy-MM
    // provinceName: 省份（下钻省份的接口全称），空=全国
    // status: 项目状态 1在建; 2运营; 3在建和运营; 4未选择
    reportParams() {
      return {
        industry: this.industryParam,
        month: this.query.month || '',
        provinceName: this.currentProvinceFullName,
        status: this.statusParam
      }
    },
    // 地区排名接口入参：全国 queryNationalRanking / 省内 queryRegionRanking 共用
    // rankingType 对应接口枚举（projectCount/rate/capacity/hour），随排名 tabs 切换
    rankParams() {
      return Object.assign({}, this.reportParams, {
        rankingType: this.query.rankType
      })
    },
    // 多选行业 → 接口 industry 参数：全选传 ''，单选传行业名，多选逗号分隔
    industryParam() {
      const ids = this.query.category
      if (!Array.isArray(ids)) return ids || ''
      const all = CATEGORIES.map(c => c.id)
      if (all.length > 0 && all.every(id => ids.includes(id))) return ''
      return ids.map(id => {
        const cat = CATEGORIES.find(c => c.id === id)
        return cat ? cat.name : id
      }).join(',')
    },
    // 地图状态筛选（在建/运营多选）→ 接口 status 枚举
    statusParam() {
      const key = [...this.buildFilter].sort().join(',')
      return STATUS_PARAM_MAP[key] || '4'
    },
    // 建设/运营管理项目报表标题的能源类型（独立于运营项目情况的切换按钮）
    energyLabel() {
      return ENERGY_LABELS[this.manageEnergyType] || '风电'
    },
    manageTitle() {
      return `建设/运营管理项目（${this.energyLabel}）`
    },
    regionTitle() {
      const names = this.levels.map(l => l.name).slice(1)
      return names.length ? names.join(' / ') : '全国'
    },
    // 行业 tabs：由 industryNum 派生，行业名反查 id 供筛选回写
    categoryTabs() {
      const list = this.overview.industryNum || []
      return list.map(item => {
        const cat = CATEGORIES.find(c => c.name === item.industry)
        return {
          id: item.industry === INDUSTRY_ALL ? 'all' : (cat ? cat.id : item.industry),
          name: item.industry,
          count: item.projectCount
        }
      })
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
      return (this.overview.industryNum || []).filter(item => item.industry !== INDUSTRY_ALL)
    },
    // 运营项目情况指标：按能源类型取对应指标项，字段取自 queryOperateDetail 返回，图标按 label 容错匹配
    summaryMetrics() {
      const conf = OPERATE_METRICS[this.operateEnergyType] || OPERATE_METRICS.wind
      const icons = SUMMARY_ICONS_MAP[this.operateEnergyType] || SUMMARY_ICONS_MAP.wind
      return conf.map(m => {
        const label = String(m.label || '').trim()
        // 精确匹配 → 去空白匹配 → 包含匹配（容忍图标 key 带前后缀）
        const key = Object.keys(icons).find(
          k => k === label || k.trim() === label || label.includes(k) || k.includes(label)
        )
        return {
          label: m.label,
          value: this.operateDetail[m.field],
          unit: m.unit,
          icon: icons[key] || 'el-icon-document'
        }
      })
    },
    // 运营项目情况图表：风电/光伏取 powerLineChart，非标取 nonPowerLineChart，按配置映射柱线系列
    operateChart() {
      const nonstandard = this.operateEnergyType === 'nonstandard'
      const list = (nonstandard ? this.operateDetail.nonPowerLineChart : this.operateDetail.powerLineChart) || []
      const fields = OPERATE_CHART_FIELDS[this.operateEnergyType] || OPERATE_CHART_FIELDS.wind
      return {
        xAxis: list.map(item => item.month),
        series: fields.map(f => ({
          name: f.label,
          type: f.type,
          yAxisIndex: f.type === 'line' ? 1 : 0,
          data: list.map(item => Number(item[f.field]) || 0)
        }))
      }
    },
    // 图表双 Y 轴名称（非标柱系列为度电收入）
    operateChartYAxis() {
      return this.operateEnergyType === 'nonstandard' ? ['元/kWh', '达标率(%)'] : ['小时', '达标率(%)']
    },
    // 饼图配色按行业名匹配，与数据顺序解耦
    pieColors() {
      return this.pieData.map(item => {
        const cat = CATEGORIES.find(c => c.name === item.industry)
        return cat ? cat.color : '#909399'
      })
    },
    // 玫瑰图中心数字：取接口 industryNum 中"全部"行的 projectCount（非扇区合计）
    pieCenter() {
      const all = (this.overview.industryNum || []).find(item => item.industry === INDUSTRY_ALL)
      return { label: '', value: all ? all.projectCount : '' }
    },
    // 建设/运营管理项目报表：逐月数组按 MANAGE_TREND_FIELDS 配置映射为柱线图结构
    manageTrend() {
      const list = this.manageList || []
      return {
        xAxis: list.map(item => item.month),
        series: MANAGE_TREND_FIELDS.map(f => ({
          name: f.label,
          type: f.type,
          data: list.map(item => Number(item[f.field]) || 0)
        }))
      }
    },
    // 排名维度 tabs：全国 4 项（含项目个数），省内 3 项（接口枚举不同）
    rankTypeOptions() {
      return this.query.level === 'country' ? RANK_TYPES : REGION_RANK_TYPES
    },
    currentRankUnit() {
      const target = this.rankTypeOptions.find(t => t.value === this.query.rankType)
      return target ? target.unit : ''
    },
    showProjectList() {
      return this.query.level !== 'country'
    },
    layerOptions() {
      return CATEGORIES.map(c => ({ key: c.id, label: c.name, color: c.color }))
    },
    // 地图点位：provinceGroups.projectList 平铺归一化
    // 分类按业务口径推导：无补贴 natProject=0/null；有补贴 natProject=1 && compCatalog!=1/null；合规 natProject=1 && compCatalog=1
    points() {
      const list = []
      this.provinceGroups.forEach(group => {
        (group.projectList || []).forEach(item => {
          const catId = classifyProject(item.natProject, item.compCatalog)
          const cat = POINT_CATEGORIES.find(c => c.id === catId) || POINT_CATEGORIES[0]
          list.push({
            id: item.projectCode,
            name: item.projectName,
            lng: item.longitude,
            lat: item.latitude,
            category: cat.id,
            categoryName: cat.name,
            // 补贴类型名与 station_type 图标 key 一致（无补贴/有补贴/合规清单）
            subsidy: cat.name,
            cityName: item.cityName,
            projectCode: item.projectCode,
            // 接口未返回项目状态，兜底默认保证右上角筛选不误过滤
            status: item.status || '在建'
          })
        })
      })
      return list
    },
    // 省份着色数据：按左下角选中的电价维度取各省汇总值
    // 未选中（priceType 为空）→ 返回空数组，地图不着色（纯白，交互7）
    provincePrices() {
      // 省份着色只在全国视图有意义：下钻到省后无省间对比，清空着色（地图纯白、图例隐藏）
      if (this.query.level !== 'country') return []
      const option = PRICE_OPTIONS.find(o => o.id === this.priceType)
      if (!option) return []
      return this.provinceGroups
        .map(group => {
          const first = (group.projectList || [])[0] || {}
          return {
            name: provinceShortName(first.provinceName || ''),
            value: Number(group[option.field]) || 0
          }
        })
        .filter(d => d.name)
    },
    // 地图点位：按右上角状态筛选 + 右下角补贴属性筛选（均为多选）
    visiblePoints() {
      return this.points.filter(p =>
        this.buildFilter.includes(p.status) && this.subsidyFilter.includes(p.categoryName)
      )
    },
    // 省份悬浮浮层展示字段（交互8）：与左下角选中的电价菜单一致，只显示该类型；未选时显示全部
    // 末尾附该省项目数（对齐原型 tooltip 的附加指标）
    regionPriceFields() {
      const option = PRICE_OPTIONS.find(o => o.id === this.priceType)
      const priceFields = option ? [{ label: option.label, field: option.field, unit: '元/kWh' }] : REGION_PRICE_FIELDS
      return priceFields.concat([{ label: '项目数', field: 'projectCount' }])
    },
    // 省份悬浮浮层数据（交互8）：省名 → 电价汇总 + 项目数
    provincePriceMap() {
      const map = {}
      this.provinceGroups.forEach(group => {
        const first = (group.projectList || [])[0] || {}
        const name = provinceShortName(first.provinceName || '')
        map[name] = Object.assign({ projectCount: (group.projectList || []).length }, group)
      })
      return map
    },
    // 地图当前区域：省级下钻时传省份 code，驱动地图切换为该省区县地图
    mapCode() {
      return this.query.level === 'province' ? (this.query.provinceCode || '') : ''
    }
  },
  watch: {
    query: {
      deep: true,
      handler() {
        this.fetchAll()
      }
    },
    // 地图状态筛选（在建/运营）联动项目总览报表 + 建设/运营管理项目报表
    buildFilter: {
      deep: true,
      handler() {
        this.fetchOverview()
        this.fetchManageTrend()
      }
    },
    // 运营项目情况能源类型切换（风电/光伏/非标）：只重新请求运营项目情况，不影响其它报表
    operateEnergyType() {
      this.fetchOperateDetail()
    },
    // 层级切换时校正排名维度：省内接口的 rankingType 枚举不含"项目个数"
    'query.level'(level) {
      const options = level === 'country' ? RANK_TYPES : REGION_RANK_TYPES
      if (!options.some(t => t.value === this.query.rankType)) {
        this.query.rankType = options[0].value
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
    // 项目总览报表：POST queryProjectOverview，入参 = 全局报表参数
    async fetchOverview() {
      const data = await this.safeRequest(() => queryProjectOverview(this.reportParams), {})
      this.overview = data || {}
    },
    // 建设/运营管理项目报表：POST queryBuildandOperate，入参 = 全局报表参数
    async fetchManageTrend() {
      const data = await this.safeRequest(() => queryBuildandOperate(this.reportParams), [])
      this.manageList = Array.isArray(data) ? data : []
    },
    // 地区排名：全国/省内双接口，返回 [{ nameType, value }] 全称数据
    // nameType（山东省）转为地图短名（山东）展示，并从配置字典反查 code 供地图下钻
    async fetchRank() {
      const isCountry = this.query.level === 'country'
      const api = isCountry ? queryNationalRanking : queryRegionRanking
      const data = await this.safeRequest(() => api(this.rankParams), [])
      const list = Array.isArray(data) ? data : []
      this.rankList = list.map(item => {
        const fullName = item.nameType || ''
        const name = isCountry ? provinceShortName(fullName) : fullName
        const province = isCountry ? findProvince(name) : null
        return {
          name,
          value: item.value,
          code: province ? province.code : ''
        }
      })
    },
    // 运营项目情况：POST queryOperateDetail，入参 = 全局报表参数 + operateType（随风电/光伏/非标切换联动）
    async fetchOperateDetail() {
      const params = Object.assign({}, this.reportParams, {
        operateType: OPERATE_TYPE_MAP[this.operateEnergyType] || '1'
      })
      const data = await this.safeRequest(() => queryOperateDetail(params), {})
      this.operateDetail = data || {}
    },
    // 项目列表（下钻后卡片）：GET getProjectList，入参沿用地图/点位接口的旧参数
    async fetchProjectList() {
      const data = await this.safeRequest(() => getProjectList(this.requestParams), { list: [] })
      this.projectList = (data && data.list) || []
    },
    async fetchAll() {
      // 前 5 个请求各自写回自己的 data，这里只做并发编排，不依赖返回值
      await Promise.all([
        this.fetchOverview(),
        this.fetchManageTrend(),
        this.fetchOperateDetail(),
        this.fetchRank(),
        this.fetchMapDisplay(),
        this.fetchProjectList()
      ])
    },
    // 地图展示：POST queryMapDisplay，入参 = 全局报表参数
    // 全国返回省份数组 / 省份返回单对象，统一归一化为省份数组 provinceGroups
    async fetchMapDisplay() {
      const data = await this.safeRequest(() => queryMapDisplay(this.reportParams), [])
      const groups = Array.isArray(data) ? data : (data ? [data] : [])
      this.provinceGroups = groups
    },
    handleCategoryChange(value) {
      this.query.category = value
    },
    // 运营项目情况卡片右上角能源类型切换（风电/光伏/非标）
    // 只改 operateEnergyType（独立状态），由其 watch 触发重新请求，不与建设/运营管理报表联动
    handleEnergyChange(type) {
      this.operateEnergyType = type
    },
    handleRankTypeChange(value) {
      this.query.rankType = value
    },
    // 点击排名：全国→省（省内接口不返回城市 code，省→市下钻暂不支持）
    handleRankClick(row) {
      if (this.query.level === 'country') {
        if (!row.code) return
        this.drillToProvince(row.code, row.name)
      }
    },
    drillToProvince(code, name) {
      this.query.level = 'province'
      this.query.provinceCode = code
      this.query.cityCode = ''
      this.levels = [Object.assign({}, ROOT_LEVEL), { code, name }]
    },
    // 地图点击：按省份名（地图短名）反查字典下钻
    handleRegionClick(payload) {
      const province = findProvince(payload.province)
      if (!province) return
      if (this.query.level === 'country') {
        this.drillToProvince(province.code, province.name)
      }
    },
    // 地图「返回」：回到全国视图
    handleMapBack() {
      this.query.level = 'country'
      this.query.provinceCode = ''
      this.query.cityCode = ''
      this.levels = [Object.assign({}, ROOT_LEVEL)]
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

  /* 顶部悬浮工具条：位于左右浮层之间，左右两列布局 */
  &__toolbar {
    position: absolute;
    top: 12px;
    /* 对齐加宽后的左右浮层（12 + 465 宽 + 12 间距） */
    left: 489px;
    right: 489px;
    z-index: 11;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    pointer-events: none;

    /* 工具条内的控件可点击，其余区域不拦截地图交互 */
    > * {
      pointer-events: auto;
    }

    /* 左列：行业 tabs，宽度不够时在列内换行，不挤压右侧控件 */
    &-left {
      flex: 1;
      min-width: 0;
    }

    /* 右列：月份选择器，固定右上角不换行 */
    &-right {
      flex-shrink: 0;
      display: flex;
      justify-content: flex-end;
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
      /* 左栏：内容区滚动，底部备注固定不被遮挡 */
      overflow: hidden;
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

  /* 左栏内容滚动区：项目总览 + 地区排名，超出时内部滚动 */
  &__left-scroll {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
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
  }

  /* 左栏底部备注：固定显示，不参与滚动、不被内容遮挡 */
  &__note {
    flex-shrink: 0;
    margin: 8px 8px 10px;
    padding: 6px 10px;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(230,162,60,1);
    font-size: 12px;
    text-align: left;
    font-family: PingFangSC-regular;
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
