<template>
  <div ref="chart" class="chart-pie" :style="{ height: height }" />
</template>

<script>
import echarts from 'echarts'
import resize from '@/components/Charts/mixins/resize'

/**
 * 通用环形/饼图 / 南丁格尔玫瑰图（纯展示，不含业务）
 * 字段名通过 fieldMap 自定义：{ name, value }
 * 需要深度定制时传 extraOption，会与默认配置合并
 */
export default {
  name: 'ChartPie',
  mixins: [resize],
  props: {
    data: { type: Array, default: () => [] },
    fieldMap: {
      type: Object,
      default: () => ({ name: 'name', value: 'value' })
    },
    colors: {
      type: Array,
      default: () => ['#0088ff', '#67c23a', '#e6a23c', '#f56c6c', '#909399']
    },
    height: { type: String, default: '220px' },
    // 环心文案：{ label, value }
    centerText: { type: Object, default: () => ({}) },
    donut: { type: Boolean, default: true },
    // 南丁格尔玫瑰图：'radius' 半径映射值 / 'area' 圆心角相等（经典玫瑰）/ false 普通饼图
    roseType: { type: [String, Boolean], default: false },
    unit: { type: String, default: '个' },
    showLegend: { type: Boolean, default: true },
    extraOption: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      chart: null
    }
  },
  watch: {
    data: {
      deep: true,
      handler() {
        this.renderChart()
      }
    },
    extraOption: {
      deep: true,
      handler() {
        this.renderChart()
      }
    }
  },
  mounted() {
    this.initChart()
  },
  beforeDestroy() {
    if (!this.chart) return
    this.chart.dispose()
    this.chart = null
  },
  methods: {
    initChart() {
      this.chart = echarts.init(this.$refs.chart)
      this.renderChart()
      this.chart.on('click', params => {
        this.$emit('item-click', params)
      })
    },
    renderChart() {
      if (!this.chart) return
      const items = this.data.map(item => ({
        name: item[this.fieldMap.name],
        value: Number(item[this.fieldMap.value]) || 0
      }))

      const option = {
        color: this.colors,
        tooltip: {
          trigger: 'item',
          formatter: params => `${params.name}: ${params.value}${this.unit} (${params.percent}%)`
        },
        legend: this.showLegend
          ? {
            type: 'scroll',
            orient: 'vertical',
            right: 0,
            top: 'middle',
            itemWidth: 10,
            itemHeight: 10,
            itemGap: 10,
            textStyle: {
              fontSize: 12,
              color: '#606266',
              // 图例两列排版：label 深色固定宽度对齐，value 蓝色（数值+占比）
              rich: {
                label: { color: '#303133', fontSize: 12, width: 70, align: 'left' },
                value: { color: '#1890ff', fontSize: 12, fontWeight: 600, align: 'left' }
              }
            },
            formatter: name => {
              const target = items.find(i => i.name === name)
              if (!target) return name
              const total = items.reduce((sum, i) => sum + i.value, 0)
              const pct = total > 0 ? Math.round((target.value / total) * 100) : 0
              return `{label|${name}}{value|${target.value}${this.unit}(${pct}%)}`
            }
          }
          : { show: false },
        series: [
          {
            type: 'pie',
            roseType: this.roseType || false,
            radius: this.donut ? ['25%', '68%'] : '55%',
            center: this.showLegend ? ['28%', '50%'] : ['50%', '50%'],
            // radius: [25, '95%'],
            // center: ['50%', '38%'],
            avoidLabelOverlap: true,
            label: this.centerText && this.centerText.value !== undefined
              ? {
                show: true,
                position: 'center',
                formatter: () => `${this.centerText.value}`,
                fontSize: 14,
                lineHeight: 22,
                color: '#303133'
              }
              : { show: false },
            emphasis: {
              label: { show: this.centerText && this.centerText.value !== undefined }
            },
            labelLine: { show: false },
            data: items
          }
        ]
      }

      this.chart.setOption(this.mergeOption(option, this.extraOption), true)
    },
    // 浅层合并，extraOption 优先级更高（不能用 JSON 序列化，会丢失 formatter 函数）
    mergeOption(base, extra) {
      const result = Object.assign({}, base)
      Object.keys(extra).forEach(key => {
        const value = extra[key]
        const isPlainObject = obj => obj && typeof obj === 'object' && !Array.isArray(obj)
        if (isPlainObject(value) && isPlainObject(result[key])) {
          result[key] = Object.assign({}, result[key], value)
        } else {
          result[key] = value
        }
      })
      return result
    }
  }
}
</script>

<style lang="scss" scoped>
.chart-pie {
  width: 100%;
}
</style>
