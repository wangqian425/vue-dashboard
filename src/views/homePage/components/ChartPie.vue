<template>
  <div ref="chart" class="chart-pie" :style="{ height: height }" />
</template>

<script>
import * as echarts from 'echarts'
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
    // 最小可见占比：低于该比例的项抬到最小可见值渲染，避免极小类目（如"其他"）扇区看不见
    // tooltip / 图例始终显示真实数值与真实占比；传 0 可关闭
    minVisibleRatio: { type: Number, default: 0.03 },
    // 需要深度定制时传入，与默认 option 浅合并（优先级更高）
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
      const total = items.reduce((sum, i) => sum + i.value, 0)

      // 渲染数据：极小占比项抬到最小可见值保证扇区可见，rawValue 保存真实值
      const minVisible = total * this.minVisibleRatio
      const seriesData = items.map(item => ({
        name: item.name,
        value: item.value > 0 && item.value < minVisible ? minVisible : item.value,
        rawValue: item.value
      }))
      // 按真实值计算占比（与渲染值无关）
      const realPercent = value => (total > 0 ? Math.round((value / total) * 100) : 0)

      const option = {
        color: this.colors,
        tooltip: {
          trigger: 'item',
          // confine：tooltip 限制在图表内，避免溢出遮挡中心数字与相邻扇区
          confine: true,
          formatter: params => {
            const raw = params.data && params.data.rawValue !== undefined ? params.data.rawValue : params.value
            return `${params.name}: ${raw}${this.unit} (${realPercent(raw)}%)`
          }
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
              const target = seriesData.find(i => i.name === name)
              if (!target) return name
              return `{label|${name}：}{value|${target.rawValue}${this.unit}(${realPercent(target.rawValue)}%)}`
            }
          }
          : { show: false },
        series: [
          {
            type: 'pie',
            roseType: this.roseType || false,
            radius: this.donut ? ['25%', '68%'] : '55%',
            center: this.showLegend ? ['28%', '50%'] : ['50%', '50%'],
            // 扇区之间白色缝隙（原型效果）
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2
            },
            avoidLabelOverlap: true,
            label: this.centerText && this.centerText.value !== undefined
              ? {
                show: true,
                position: 'center',
                formatter: () => `${this.centerText.value}`,
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 26,
                color: '#303133'
              }
              : { show: false },
            emphasis: {
              label: { show: this.centerText && this.centerText.value !== undefined }
            },
            labelLine: { show: false },
            data: seriesData
          }
        ]
      }

      this.chart.setOption(this.mergeOption(option, this.extraOption), true)
    },
    // 浅层合并，extraOption 优先级更高（不能用 JSON 序列化，会丢失 formatter 函数）
    mergeOption(base, extra) {
      const result = Object.assign({}, base)
      if (!extra || typeof extra !== 'object') return result
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
