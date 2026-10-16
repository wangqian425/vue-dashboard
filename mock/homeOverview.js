/**
 * 首页总览 mock 数据
 * 返回结构与真实后端保持一致：{ code: 200, msg: 'success', data: {...} }
 */

// 省份（含省会坐标，用于地图打点与排名）
const PROVINCES = [
  { code: '110000', name: '北京', lng: 116.407, lat: 39.904 },
  { code: '120000', name: '天津', lng: 117.201, lat: 39.084 },
  { code: '130000', name: '河北', lng: 114.502, lat: 38.045 },
  { code: '140000', name: '山西', lng: 112.549, lat: 37.857 },
  { code: '150000', name: '内蒙古', lng: 111.751, lat: 40.842 },
  { code: '210000', name: '辽宁', lng: 123.429, lat: 41.796 },
  { code: '220000', name: '吉林', lng: 125.323, lat: 43.817 },
  { code: '230000', name: '黑龙江', lng: 126.535, lat: 45.803 },
  { code: '310000', name: '上海', lng: 121.473, lat: 31.23 },
  { code: '320000', name: '江苏', lng: 118.797, lat: 32.06 },
  { code: '330000', name: '浙江', lng: 120.155, lat: 30.274 },
  { code: '340000', name: '安徽', lng: 117.283, lat: 31.861 },
  { code: '350000', name: '福建', lng: 119.306, lat: 26.075 },
  { code: '360000', name: '江西', lng: 115.892, lat: 28.676 },
  { code: '370000', name: '山东', lng: 117.121, lat: 36.651 },
  { code: '410000', name: '河南', lng: 113.625, lat: 34.746 },
  { code: '420000', name: '湖北', lng: 114.305, lat: 30.593 },
  { code: '430000', name: '湖南', lng: 112.939, lat: 28.675 },
  { code: '440000', name: '广东', lng: 113.264, lat: 23.129 },
  { code: '450000', name: '广西', lng: 108.32, lat: 22.824 },
  { code: '460000', name: '海南', lng: 110.199, lat: 20.044 },
  { code: '500000', name: '重庆', lng: 106.505, lat: 29.533 },
  { code: '510000', name: '四川', lng: 104.066, lat: 30.572 },
  { code: '520000', name: '贵州', lng: 106.63, lat: 26.647 },
  { code: '530000', name: '云南', lng: 102.833, lat: 24.88 },
  { code: '540000', name: '西藏', lng: 91.132, lat: 29.66 },
  { code: '610000', name: '陕西', lng: 108.948, lat: 34.263 },
  { code: '620000', name: '甘肃', lng: 103.823, lat: 36.058 },
  { code: '630000', name: '青海', lng: 101.778, lat: 36.617 },
  { code: '640000', name: '宁夏', lng: 106.278, lat: 38.467 },
  { code: '650000', name: '新疆', lng: 87.617, lat: 43.792 }
]

// 分类（颜色用于地图打点与图表）
const CATEGORIES = [
  { id: 'power', name: '能源电力', color: '#0088ff', count: 210 },
  { id: 'energy', name: '节能环保', color: '#67c23a', count: 151 },
  { id: 'build', name: '智慧建造', color: '#e6a23c', count: 186 },
  { id: 'traffic', name: '绿色交通', color: '#f56c6c', count: 188 },
  { id: 'other', name: '其他', color: '#909399', count: 99 }
]

// 排名维度
const RANK_TYPES = {
  count: { label: '建设个数', unit: '个', base: 260 },
  standard: { label: '达标率', unit: '%', base: 96 },
  contribution: { label: '贡献值', unit: '万kWh', base: 880 },
  hours: { label: '利用小时数', unit: 'h', base: 2600 }
}

function randomInt(min, max, seed) {
  const value = Math.sin(seed) * 10000
  return Math.floor(min + Math.abs(value - Math.floor(value)) * (max - min))
}

// 生成地区排名
function buildRank(level, rankType, provinceCode) {
  const conf = RANK_TYPES[rankType] || RANK_TYPES.count
  let list = PROVINCES.map((p, index) => ({
    code: p.code,
    name: p.name,
    value: randomInt(Math.floor(conf.base * 0.2), conf.base, index + 1)
  }))

  // 下钻到省：返回该省下的地市
  if (level === 'province' && provinceCode) {
    list = ['城区', '东区', '西区', '南区', '北区', '新区'].map((name, index) => ({
      code: `${provinceCode}_${index}`,
      name,
      value: randomInt(Math.floor(conf.base * 0.1), conf.base, index + 7)
    }))
  }

  return list.sort((a, b) => b.value - a.value).slice(0, 11)
}

// 生成地图点位
function buildPoints(level, category, provinceCode) {
  const source = level === 'province' && provinceCode
    ? PROVINCES.filter(p => p.code === provinceCode)
    : PROVINCES

  const points = []
  // 兼容多选：category 可为数组或逗号分隔字符串，'all' 表示全选
  const catList = Array.isArray(category) ? category : String(category || 'all').split(',')
  source.forEach((p, pi) => {
    CATEGORIES.forEach((c, ci) => {
      if (!catList.includes('all') && !catList.includes(c.id)) return
      points.push({
        id: `${p.code}_${c.id}`,
        name: `${p.name}${c.name}示范项目`,
        lng: p.lng + (ci - 2) * 0.35,
        lat: p.lat + (ci - 2) * 0.35,
        category: c.id,
        categoryName: c.name,
        status: ci % 3 === 0 ? '在建' : (ci % 3 === 1 ? '运营' : '未按标准'),
        capacity: randomInt(20, 300, pi + ci + 3),
        outputHours: randomInt(800, 3200, pi + ci + 11),
        income: randomInt(50, 900, pi + ci + 17)
      })
    })
  })
  return points
}

function buildMonths(count) {
  const months = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function ok(data) {
  return { code: 200, msg: 'success', data }
}

module.exports = [
  // 项目总览
  {
    url: '/regulatory_s/project/home/overview',
    type: 'get',
    response: config => {
      const { query } = config
      const level = query.level || 'country'
      // 下钻后数值按比例缩小，模拟联动
      const ratio = level === 'country' ? 1 : (level === 'province' ? 0.08 : 0.01)
      const categories = [
        { id: 'all', name: '全部', count: Math.round(814 * ratio) }
      ].concat(CATEGORIES.map(c => ({
        id: c.id,
        name: c.name,
        count: Math.round(c.count * ratio),
        color: c.color
      })))

      return ok({
        totalProjects: Math.round(6220 * ratio),
        monitorProjects: Math.round(220 * ratio),
        categories
      })
    }
  },

  // 地区排名
  {
    url: '/regulatory_s/project/home/regionRank',
    type: 'get',
    response: config => {
      const { query } = config
      const list = buildRank(query.level, query.rankType, query.provinceCode)
      return ok({ list })
    }
  },

  // 地图点位
  {
    url: '/regulatory_s/project/home/mapPoints',
    type: 'get',
    response: config => {
      const { query } = config
      const list = buildPoints(query.level, query.category, query.provinceCode)
      return ok({ list })
    }
  },

  // 建设/运营管理趋势
  {
    url: '/regulatory_s/project/home/manageTrend',
    type: 'get',
    response: () => {
      const months = buildMonths(12)
      return ok({
        xAxis: months,
        series: [
          { name: '在建项目', type: 'bar', data: months.map((m, i) => randomInt(60, 260, i + 2)) },
          { name: '运营项目', type: 'bar', data: months.map((m, i) => randomInt(40, 200, i + 5)) },
          { name: '未结清项目', type: 'line', data: months.map((m, i) => randomInt(120, 320, i + 9)) }
        ]
      })
    }
  },

  // 项目情况指标（按能源类型返回不同指标项：风电/光伏 vs 非标）
  {
    url: '/regulatory_s/project/home/projectSummary',
    type: 'get',
    response: config => {
      const { query } = config
      const ratio = query.level === 'country' ? 1 : 0.1
      const energy = query.energyType || 'wind'
      if (energy === 'nonstandard') {
        return ok({
          list: [
            { label: '项目总数', value: Math.round(96 * ratio), unit: '个' },
            { label: '填报收入', value: 56.8, unit: '万元' },
            { label: '账户收入', value: 43.2, unit: '万元' },
            { label: '达标率', value: 92.5, unit: '%' }
          ]
        })
      }
      return ok({
        list: [
          { label: '项目总数', value: Math.round(385 * ratio), unit: '个' },
          { label: '装机容量', value: Math.round(340 * ratio), unit: 'MW' },
          { label: '上网电量', value: Math.round(300 * ratio), unit: '万kWh' },
          { label: '利用小时数', value: Math.round(2800 / (ratio < 1 ? 2 : 1)), unit: 'h' },
          { label: '结算电价', value: 4112225, unit: '元/kWh' },
          { label: '千瓦收入', value: 16211, unit: '元/kW' }
        ]
      })
    }
  },

  // 发电利用小时数 / 达标率（柱系列名称随能源类型联动）
  {
    url: '/regulatory_s/project/home/hoursTrend',
    type: 'get',
    response: config => {
      const { query } = config
      const months = buildMonths(12)
      const energyNames = { wind: '风电', pv: '光伏', nonstandard: '非标' }
      const energyName = energyNames[query.energyType] || '风电'
      return ok({
        xAxis: months,
        series: [
          { name: `${energyName}发电利用小时数`, type: 'bar', data: months.map((m, i) => randomInt(900, 2600, i + 4)) },
          { name: '达标率', type: 'line', yAxisIndex: 1, data: months.map((m, i) => randomInt(70, 99, i + 13)) }
        ]
      })
    }
  },

  // 项目列表（下钻后卡片）
  {
    url: '/regulatory_s/project/home/projectList',
    type: 'get',
    response: config => {
      const { query } = config
      const points = buildPoints(query.level || 'country', query.category, query.provinceCode)
      const list = points.slice(0, 8).map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        categoryName: p.categoryName,
        capacity: p.capacity,
        outputHours: p.outputHours,
        income: p.income
      }))
      return ok({ list, total: points.length })
    }
  }
]
