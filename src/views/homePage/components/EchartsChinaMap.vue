<template>
  <div ref="wrap" class="echarts-china-map">
    <div ref="chart" class="echarts-china-map__canvas" />

    <!-- 右上角：显示状态筛选（多选，时间控件下方） -->
    <div class="echarts-china-map__panel echarts-china-map__panel--build">
      <div
        v-for="item in buildOptions"
        :key="item.id"
        class="echarts-china-map__check"
        :class="{ 'is-active': buildFilter.includes(item.id) }"
        @click="toggleBuild(item.id)"
      >
        <span class="echarts-china-map__checkbox" />{{ item.label }}
      </div>
    </div>

    <!-- 右下角：补贴属性筛选（多选） -->
    <div class="echarts-china-map__panel echarts-china-map__panel--subsidy">
      <div
        v-for="label in subsidyOptions"
        :key="label"
        class="echarts-china-map__check"
        :class="{ 'is-active': subsidyFilter.includes(label) }"
        @click="toggleSubsidy(label)"
      >
        <img v-if="subsidyIcons[label]" class="echarts-china-map__check-icon" :src="subsidyIcons[label]" alt="">
        {{ label }}
      </div>
    </div>

    <!-- 左下角：颜色图例由 echarts visualMap 在画布内渲染；此处只保留结算电价菜单（单选，check/uncheck 图标） -->
    <div class="echarts-china-map__panel echarts-china-map__panel--legend">
      <div class="echarts-china-map__price">
        <div
          v-for="item in priceOptions"
          :key="item.id"
          class="echarts-china-map__price-item"
          :class="{ 'is-active': priceType === item.id }"
          @click="$emit('update:priceType', priceType === item.id ? '' : item.id)"
        >
          <span class="echarts-china-map__price-dot" />{{ item.label }}
        </div>
      </div>
    </div>

    <!-- 底部中间：返回（下钻省份时显示） + 全屏/退出全屏（同一时刻只展示一个） -->
    <div class="echarts-china-map__fs-bar">
      <div v-if="mapCode" class="echarts-china-map__fs-btn" @click="$emit('back')">
        <i class="el-icon-refresh-left" />返回
      </div>
      <div v-if="isFullscreen" class="echarts-china-map__fs-btn" @click="setFullscreen(false)">
        <img v-if="fullscreenIcons && fullscreenIcons[2]" :src="fullscreenIcons[2]" alt="">
        <i v-else class="el-icon-close" />退出
      </div>
      <div v-else class="echarts-china-map__fs-btn" @click="setFullscreen(true)">
        <img v-if="fullscreenIcons && fullscreenIcons[1]" :src="fullscreenIcons[1]" alt="">
        <i v-else class="el-icon-full-screen" />全屏
      </div>
    </div>

    <div v-if="loading" class="echarts-china-map__loading">
      地图加载中...
    </div>
  </div>
</template>

<script>
import echarts from 'echarts'
import chinaJson from '@/assets/maps/china.json'
import * as provinceMapLoaders from '../map'
import resize from '@/components/Charts/mixins/resize'

// 注册中国地图（模块级只注册一次）
echarts.registerMap('china', chinaJson)

const DEFAULT_COLOR = '#0088ff'

/**
 * 通用 echarts 2D 中国地图（打点 / 悬浮卡片 / 分类图例显隐 / 全屏）
 * 纯展示：点位、分类配色、悬浮字段全部由 props 传入，不含任何业务请求
 * 对外事件：point-click（点击点位）/ region-click（点击省份区域，用于下钻）
 */
export default {
  name: 'EchartsChinaMap',
  mixins: [resize],
  props: {
    // 点位数据：[{ id, name, lng, lat, category, ... }]
    points: { type: Array, default: () => [] },
    // 字段映射，后端字段改名只需改这里
    fieldMap: {
      type: Object,
      default: () => ({ id: 'id', name: 'name', lng: 'lng', lat: 'lat', category: 'category' })
    },
    // 分类配色：[{ id, name, color }]
    categories: { type: Array, default: () => [] },
    // 悬浮卡片展示字段：[{ label, field, unit }]
    hoverFields: { type: Array, default: () => [] },
    defaultColor: { type: String, default: DEFAULT_COLOR },
    // 兼容旧接口：图层与已激活图层（此处用 echarts legend 控制显隐，prop 保留以便迁移）
    layers: { type: Array, default: () => [] },
    activeLayers: { type: Array, default: () => [] },
    showFullscreen: { type: Boolean, default: false },
    // 右上角状态筛选：可选项 + 已选中集合（.sync 双向，多选）
    buildOptions: { type: Array, default: () => [] },
    buildFilter: { type: Array, default: () => [] },
    // 右下角补贴属性筛选：可选项 + 已选中集合（.sync 双向，多选）
    subsidyOptions: { type: Array, default: () => [] },
    subsidyFilter: { type: Array, default: () => [] },
    // 补贴属性 → 图标 URL（点位按此渲染 station 图标）
    subsidyIcons: { type: Object, default: () => ({}) },
    // 左下角估算电价（单选，.sync 双向）
    priceOptions: { type: Array, default: () => [] },
    priceType: { type: String, default: '' },
    // 各省着色数据：[{ name, value }]，由 visualMap 按 value 渐变着色（如电价）
    provinceData: { type: Array, default: () => [] },
    // 省会标记点：[{ name, city, lng, lat }]（仅在有省会图标时渲染）
    capitals: { type: Array, default: () => [] },
    // 省会图标 URL（svg/png）
    capitalIcon: { type: String, default: '' },
    // 省会图标尺寸
    capitalSize: { type: Number, default: 16 },
    // 省份悬浮浮层展示字段（交互8）：[{ label, field, unit }]
    regionTooltipFields: { type: Array, default: () => [] },
    // 省份悬浮浮层数据：{ 省名: { field: value } }，移入省份区域弹出对应数据
    regionTooltipData: {
      type: Object,
      default: () => ({})
    },
    // 当前地图区域：'' = 全国地图；省份行政 code = 下钻到该省区县地图
    mapCode: { type: String, default: '' },
    // 全屏按钮图标 { 1: 全屏, 2: 退出 }
    fullscreenIcons: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      chart: null,
      loading: false,
      isFullscreen: false,
      // 已加载过的省份地图缓存 { code: true }
      mapCache: {}
    }
  },
  watch: {
    points: {
      deep: true,
      handler() {
        this.renderOption()
      }
    },
    categories: {
      deep: true,
      handler() {
        this.renderOption()
      }
    },
    // 着色数据（电价维度切换 / 下钻换省）变化 → 重绘，visualMap 随数据更新
    provinceData: {
      deep: true,
      handler() {
        this.renderOption()
      }
    },
    // 省份下钻 / 返回：切换注册对应省市区县地图
    mapCode() {
      this.loadRegionMap()
    },
    // 全屏切换：图例位置需复位到贴边
    isFullscreen() {
      this.renderOption()
    }
  },
  mounted() {
    this.initChart()
  },
  beforeDestroy() {
    this.unbindFullscreen()
    if (this.chart) {
      this.chart.dispose()
      this.chart = null
    }
  },
  methods: {
    initChart() {
      this.chart = echarts.init(this.$refs.chart)
      this.renderOption()
      this.chart.on('click', this.handleClick)
      this.bindFullscreen()
    },
    // 加载并注册省市区县边界 GeoJSON（本地文件，webpack 动态 import 按需加载异步 chunk），成功后重绘
    async loadRegionMap() {
      const code = this.mapCode
      if (!code) {
        // 返回全国
        this.renderOption()
        return
      }
      if (this.mapCache[code]) {
        this.renderOption()
        return
      }
      this.loading = true
      try {
        // 本地 GeoJSON 位于 views/homePage/map/{code}_full.json（scripts/download-map-data.js 下载）
        // 走静态映射表（map/index.js）：
        //   开发环境 babel-plugin-dynamic-import-node 会把「带变量的 import()」降级为 require 表达式，
        //   webpack 无法静态收集上级目录模块，运行时报 Cannot find module，因此这里不能用 import(`../map/${code}_full.json`)
        //   静态路径映射两种环境都能解析，生产构建会拆成独立的异步 chunk，按需加载不占首屏体积
        // 兼容不同编译环境的模块互操作（default 导出可能被 interop 包一层）
        const loaders = provinceMapLoaders.default || provinceMapLoaders
        const loader = loaders[code]
        if (!loader) throw new Error(`缺少省份地图文件: ${code}_full.json`)
        const geoJsonModule = await loader()
        const geoJson = (geoJsonModule && geoJsonModule.default) || geoJsonModule
        echarts.registerMap(code, geoJson)
        this.mapCache[code] = true
        this.renderOption()
      } catch (error) {
        console.error('省份地图加载失败:', error)
        this.$message.error('省份地图加载失败')
      } finally {
        this.loading = false
      }
    },
    // 按分类分组为多个 scatter series，每个分类一种颜色（颜色圆点）
    // 点位若带补贴属性图标（subsidyIcons），用对应 station 图片作为 symbol
    buildSeries() {
      const groups = {}
      this.points.forEach(p => {
        const lng = Number(p[this.fieldMap.lng])
        const lat = Number(p[this.fieldMap.lat])
        if (isNaN(lng) || isNaN(lat)) return
        const cat = p[this.fieldMap.category]
        const arr = groups[cat] || (groups[cat] = [])
        const icon = this.subsidyIcons[p.subsidy]
        arr.push(Object.assign(
          { name: p[this.fieldMap.name] || '--', value: [lng, lat], raw: p },
          icon ? { symbol: `image://${icon}`, symbolSize: 22 } : {}
        ))
      })

      const known = new Set(this.categories.map(c => c.id))
      const series = this.categories.map(c => ({
        name: c.name,
        type: 'scatter',
        coordinateSystem: 'geo',
        symbolSize: 10,
        itemStyle: { color: c.color },
        emphasis: {
          scale: true,
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1
          }
        },
        data: groups[c.id] || []
      }))

      // 兜底：分类不在 categories 中的点位
      const others = []
      Object.keys(groups).forEach(k => { if (!known.has(k)) others.push(...groups[k]) })
      if (others.length) {
        series.push({
          name: '其他',
          type: 'scatter',
          coordinateSystem: 'geo',
          symbolSize: 10,
          itemStyle: { color: this.defaultColor },
          data: others
        })
      }

      // 省会标记（仅全国视图：下钻到省后显示的是地市，不再标省会）
      if (this.capitalIcon && this.capitals.length && !this.mapCode) {
        series.push({
          name: '省会',
          type: 'scatter',
          coordinateSystem: 'geo',
          symbol: `image://${this.capitalIcon}`,
          symbolSize: this.capitalSize,
          // 不响应鼠标：避免遮挡省份悬浮高亮与点击下钻
          silent: true,
          // 底图与点位的绘制层级
          z: 6,
          data: this.capitals.map(c => ({
            name: c.name,
            value: [c.lng, c.lat],
            city: c.city
          }))
        })
      }
      return series
    },
    // 底图系列：区域绘制 + 电价着色（visualMap 作用其上），与 geo 共享坐标系，保证缩放平移时散点同步
    buildMapSeries(mapName, hasColor) {
      return {
        name: '省份电价',
        type: 'map',
        map: mapName,
        // 与索引 0 的 geo 组件共享坐标系（roam 由 geo 驱动，底图与散点随之同步）
        geoIndex: 0,
        // 显示省份名称（点击省份可下钻）
        label: {
          show: true,
          color: '#303133',
          fontSize: 12
        },
        itemStyle: {
          // 有电价数据时颜色由 visualMap 接管；下钻到省后无省级着色、全国未选电价时也用灰白底
          // 仅「全国视图 + 未选电价」保持纯白无热力（交互7）
          areaColor: hasColor || this.mapCode ? '#f0f2f5' : '#ffffff',
          // 全国与各省边框：灰色轮廓（整体加粗，最显眼的全国外轮廓随之加大）
          borderColor: '#9aa7b5',
          borderWidth: 3
        },
        emphasis: {
          itemStyle: {
            // 悬浮：省份填充透明绿、边框变绿并加粗
            areaColor: 'rgba(0, 200, 0, 0.18)',
            borderColor: '#00c800',
            borderWidth: 2.5
          },
          // 悬浮时省份名保持显示（透明绿底上深色文字）
          label: { show: true, color: '#1a5c1a', fontWeight: 600 }
        },
        data: hasColor ? this.provinceData : []
      }
    },
    renderOption() {
      if (!this.chart) return
      // GeoJSON 异步加载未完成时（省地图尚未注册）先渲染全国，避免 setOption 使用未注册的 map 名报错
      const mapName = this.mapCode && this.mapCache[this.mapCode] ? this.mapCode : 'china'
      const values = (this.provinceData || []).map(d => Number(d.value) || 0)
      // 未选电价维度 → 无着色数据：地图纯白、隐藏图例（交互7）
      const hasColor = values.length > 0
      const min = hasColor ? Math.min(...values) : 0
      const max = hasColor ? Math.max(...values) : 0
      // 全屏时左右浮层消失，图例贴边；否则对齐左侧浮层右缘（12 + 465 + 12）
      const legendLeft = this.isFullscreen ? 12 : 489

      const option = {
        tooltip: {
          trigger: 'item',
          confine: true,
          // 深色胶囊样式由 formatter 内联实现（原型效果），外层容器置透明
          backgroundColor: 'transparent',
          borderWidth: 0,
          padding: 0,
          extraCssText: 'box-shadow: none;',
          formatter: params => {
            if (params.seriesType === 'scatter') {
              const raw = params.data.raw || {}
              const rows = this.hoverFields
                .map(f => {
                  const v = raw[f.field]
                  const empty = v === undefined || v === null || v === ''
                  return `${f.label}：${empty ? '--' : v}${empty ? '' : (f.unit || '')}`
                })
                .join('<br/>')
              return this.wrapTooltip(`<b>${params.data.name}</b><br/>${rows}`)
            }
            // 省份区域悬浮（交互8）：弹出当前选中电价类型的省份数据，无值显示 --
            if (params.seriesType === 'map' && this.regionTooltipFields.length) {
              const data = this.regionTooltipData[params.name]
              if (data) {
                const rows = this.regionTooltipFields
                  .map(f => {
                    const v = data[f.field]
                    const empty = v === undefined || v === null || v === ''
                    const text = empty ? '--' : v
                    // 电价数值加粗突出（原型：icon + 电价 + 附加指标）
                    const valueHtml = empty ? '<b>--</b>' : `<b>${text}</b>${f.unit || ''}`
                    return `${f.label}：${valueHtml}`
                  })
                  .join('<br/>')
                return this.wrapTooltip(`<b>${params.name}</b><br/>${rows}`)
              }
              return this.wrapTooltip(`<b>${params.name}</b>`)
            }
            return ''
          }
        },
        // geo 只作为坐标系（散点定位 + 缩放平移），不绘制、不提示，避免与底图系列重叠
        geo: {
          // 全国地图 / 下钻后的省市区县地图（mapCode 为空时回全国）
          map: mapName,
          roam: true,
          zoom: 0.8,
          scaleLimit: { min: 0.4, max: 2 },
          label: { show: false },
          itemStyle: { areaColor: 'transparent', borderColor: 'transparent' },
          emphasis: { disabled: true },
          tooltip: { show: false }
        },
        // 左下角颜色图例：改用 echarts visualMap（连续型），与地图着色同源
        visualMap: hasColor
          ? {
            type: 'continuous',
            // 作用于底图系列（series 中第 0 项）
            seriesIndex: 0,
            min,
            // 最小=最大时给微量跨度，避免 echarts 区间退化
            max: max === min ? min + 0.01 : max,
            orient: 'vertical',
            left: legendLeft,
            bottom: 12,
            itemWidth: 16,
            itemHeight: 160,
            // 纯图例，不显示可拖动手柄
            calculable: false,
            // 条上端「高」、下端「低」
            text: ['高', '低'],
            textStyle: { color: '#303133', fontSize: 12 },
            // 色阶：浅蓝 → 深蓝（与地图着色一致）
            inRange: { color: ['#d6e8ff', '#7db9ff', '#0088ff'] }
          }
          : { show: false },
        // 分类筛选已由顶部 CategoryTabs 承担，且底部中间需留给全屏按钮，故关闭内置图例
        legend: { show: false },
        series: [this.buildMapSeries(mapName, hasColor)].concat(this.buildSeries())
      }
      this.chart.setOption(option, true)
    },
    // tooltip 深色胶囊外壳（原型效果）：所有系列统一包裹
    wrapTooltip(html) {
      return `<div style="background: rgba(23, 35, 54, 0.9); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 12px; line-height: 1.7; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); white-space: nowrap;">${html}</div>`
    },
    handleClick(params) {
      if (params.seriesType === 'scatter') {
        const raw = params.data && params.data.raw
        if (raw) this.$emit('point-click', raw)
      } else if (params.seriesType === 'map' && params.name) {
        // 点击省份区域 → 下钻
        this.$emit('region-click', { province: params.name })
      }
    },
    toggleFullscreen() {
      this.setFullscreen(!this.isFullscreen)
    },
    setFullscreen(flag) {
      const el = this.$refs.wrap
      if (!el) return
      if (flag) {
        el.requestFullscreen ? el.requestFullscreen() : null
      } else {
        document.exitFullscreen ? document.exitFullscreen() : null
      }
    },
    // 状态筛选（多选 toggle），集合由父级持有（.sync）
    toggleBuild(id) {
      const next = this.buildFilter.includes(id)
        ? this.buildFilter.filter(v => v !== id)
        : this.buildFilter.concat(id)
      this.$emit('update:buildFilter', next)
    },
    toggleSubsidy(label) {
      const next = this.subsidyFilter.includes(label)
        ? this.subsidyFilter.filter(v => v !== label)
        : this.subsidyFilter.concat(label)
      this.$emit('update:subsidyFilter', next)
    },
    bindFullscreen() {
      this._onFsChange = () => {
        this.isFullscreen = !!document.fullscreenElement
        this.$nextTick(() => { if (this.chart) this.chart.resize() })
      }
      document.addEventListener('fullscreenchange', this._onFsChange)
    },
    unbindFullscreen() {
      if (this._onFsChange) {
        document.removeEventListener('fullscreenchange', this._onFsChange)
        this._onFsChange = null
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.echarts-china-map {
  position: relative;
  width: 100%;
  height: 100%;
  /* 地图背景图（bg.png，位于 views/homePage 同级） */
  background: #f5f7fa url('../bg.png') center / cover no-repeat;

  &__canvas {
    width: 100%;
    height: 100%;
  }

  /* 全屏状态下铺满屏幕；父级左右浮层不再存在，浮层偏移复位到贴边 */
  &:fullscreen {
    width: 100vw;
    height: 100vh;

    .echarts-china-map__canvas {
      width: 100%;
      height: 100%;
    }

    .echarts-china-map__panel--build {
      top: 60px;
      right: 12px;
    }

    .echarts-china-map__panel--subsidy {
      right: 12px;
      border-radius: 8px;
    }

    /* 全屏时 visualMap 复位到 left:12，电价菜单排在其右侧 */
    .echarts-china-map__panel--legend {
      left: 68px;
      border-radius: 8px;
    }
  }

  &__fullscreen {
    position: absolute;
    right: 12px;
    top: 12px;
    z-index: 10;
    width: 28px;
    height: 28px;
    line-height: 28px;
    text-align: center;
    background: rgba(255, 255, 255, 0.92);
    border-radius: 4px;
    cursor: pointer;
    color: #606266;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);

    &:hover {
      color: #0088ff;
    }
  }

  /* 通用浮动面板 */
  &__panel {
    position: absolute;
    z-index: 10;
    padding: 8px;
    border-radius: 8px;
    border-radius: 8px;
    background-color: rgba(96,105,127,0.5);
    box-shadow: 0px 2px 6px 0px rgba(96,105,127,0.4);
    color: #fff;
  }

  /* 浮层避开父级左右悬浮栏（各 465px + 12 边距 + 12 间距 = 489px），对齐原型位置 */
  &__panel--build {
    /* 时间控件（工具条右缘 489px）正下方 */
    top: 60px;
    right: 489px;
  }

  &__panel--subsidy {
    right: 489px;
    bottom: 12px;
  }

  /* 颜色图例由 echarts visualMap 绘制在画布左下角（left: 489px / 全屏 12px） */
  &__panel--legend {
    /* 电价菜单排在 visualMap 右侧（489 + 图例约 48 宽 + 8 间距） */
    left: 545px;
    bottom: 12px;
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    /* 原型无卡片底：直接铺在地图上 */
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  /* 多选行：勾选框 / 图标 + 文案 */
  &__check {
    display: flex;
    align-items: center;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 13px;
    color: #303133;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;

    &:hover {
      background: #f5f7fa;
    }

    &.is-active {
      color: #0088ff;
      font-weight: 600;
    }
  }

  &__checkbox {
    width: 12px;
    height: 12px;
    margin-right: 6px;
    border: 1px solid #dcdfe6;
    border-radius: 2px;
    background: #fff;
    position: relative;
    flex-shrink: 0;

    .is-active > & {
      background: #0088ff;
      border-color: #0088ff;

      &::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 0px;
        width: 4px;
        height: 8px;
        border: solid #fff;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }
  }

  &__check-icon {
    width: 16px;
    height: 16px;
    margin-right: 6px;
    object-fit: contain;
    flex-shrink: 0;
  }

  /* 结算电价（单选）：选中蓝色胶囊白字，未选中半透明灰底白字（蓝湖标注 rgba(96,105,127,0.3)） */
  &__price {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__price-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    border-radius: 4px;
    background-color: rgba(96, 105, 127, 0.3);
    color: rgba(255, 255, 255, 1);
    font-size: 12px;
    text-align: left;
    font-family: Arial-regular;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;

    &.is-active {
      background-color: rgba(0, 136, 255, 1);
    }
  }

  /* radio 控件：白色圆环 + 中心圆点，选中/未选中样式一致，选中态靠胶囊底色区分 */
  &__price-dot {
    position: relative;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 1);
    background: transparent;
    box-sizing: border-box;
    flex-shrink: 0;

    /* 中心圆点 */
    &::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 1);
      transform: translate(-50%, -50%);
    }
  }

  /* 底部中间：全屏 / 退出全屏 */
  &__fs-bar {
    position: absolute;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    gap:12px;
  }

  &__fs-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 14px;
    font-size: 13px;
    color: #fff;
    cursor: pointer;
    user-select: none;
    border-radius: 80px;
    background-color: rgba(96,105,127,0.5);
    box-shadow: 0px 2px 6px 0px rgba(96,105,127,0.4);
    img {
      width: 14px;
      height: 14px;
      object-fit: contain;
    }
  }

  &__loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fa;
    color: #909399;
    font-size: 13px;
  }
}
</style>
