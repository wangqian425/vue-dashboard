<template>
  <div ref="wrap" class="echarts-china-map">
    <div ref="chart" class="echarts-china-map__canvas" />

    <!-- 全屏按钮 -->
    <div v-if="showFullscreen" class="echarts-china-map__fullscreen" @click="toggleFullscreen">
      <i :class="isFullscreen ? 'el-icon-aim' : 'el-icon-full-screen'" />
    </div>

    <div v-if="loading" class="echarts-china-map__loading">
      地图加载中...
    </div>
  </div>
</template>

<script>
import echarts from 'echarts'
import chinaJson from '@/assets/maps/china.json'
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
    showFullscreen: { type: Boolean, default: true }
  },
  data() {
    return {
      chart: null,
      loading: false,
      isFullscreen: false
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
    // 按分类分组为多个 scatter series，每个分类一种颜色（颜色圆点）
    buildSeries() {
      const groups = {}
      this.points.forEach(p => {
        const lng = Number(p[this.fieldMap.lng])
        const lat = Number(p[this.fieldMap.lat])
        if (isNaN(lng) || isNaN(lat)) return
        const cat = p[this.fieldMap.category]
        const arr = groups[cat] || (groups[cat] = [])
        arr.push({ name: p[this.fieldMap.name] || '--', value: [lng, lat], raw: p })
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
      return series
    },
    renderOption() {
      if (!this.chart) return
      const option = {
        tooltip: {
          trigger: 'item',
          confine: true,
          formatter: params => {
            if (params.seriesType === 'scatter') {
              const raw = params.data.raw || {}
              const rows = this.hoverFields
                .map(f => `${f.label}：${raw[f.field] === undefined ? '--' : raw[f.field]}${f.unit || ''}`)
                .join('<br/>')
              return `<b>${params.data.name}</b><br/>${rows}`
            }
            return params.name
          }
        },
        geo: {
          map: 'china',
          roam: true,
          zoom: 1.2,
          scaleLimit: { min: 1, max: 6 },
          label: {
            show: false,
            emphasis: { show: false }
          },
          itemStyle: {
            areaColor: '#eef3f8',
            borderColor: '#c5d4e3',
            borderWidth: 1
          },
          emphasis: {
            itemStyle: {
              areaColor: '#dbe7f3'
            },
            label: { show: false }
          }
        },
        legend: {
          type: 'scroll',
          orient: 'horizontal',
          bottom: 6,
          left: 'center',
          itemWidth: 10,
          itemHeight: 10,
          textStyle: { fontSize: 12, color: '#606266' },
          data: this.categories.map(c => c.name)
        },
        series: this.buildSeries()
      }
      this.chart.setOption(option, true)
    },
    handleClick(params) {
      if (params.seriesType === 'scatter') {
        const raw = params.data && params.data.raw
        if (raw) this.$emit('point-click', raw)
      } else if (params.componentType === 'geo' && params.name) {
        // 点击省份区域 → 下钻
        this.$emit('region-click', { province: params.name })
      }
    },
    toggleFullscreen() {
      const el = this.$refs.wrap
      if (!el) return
      if (this.isFullscreen) {
        document.exitFullscreen ? document.exitFullscreen() : null
      } else {
        el.requestFullscreen ? el.requestFullscreen() : null
      }
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
  background: #f5f7fa;

  &__canvas {
    width: 100%;
    height: 100%;
  }

  /* 全屏状态下铺满屏幕 */
  &:fullscreen {
    width: 100vw;
    height: 100vh;

    .echarts-china-map__canvas {
      width: 100%;
      height: 100%;
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
