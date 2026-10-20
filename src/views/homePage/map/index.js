/**
 * 省级 GeoJSON 按需加载映射表
 *
 * 由 scripts/download-map-data.js 自动生成，请勿手动修改；新增/更新省份后重跑该脚本即可。
 * 组件用法：import provinceMapLoaders from '../map'；const geoJson = await provinceMapLoaders[code]()
 */
export default {
  // 北京
  '110000': () => import('./110000_full.json'),
  // 天津
  '120000': () => import('./120000_full.json'),
  // 河北
  '130000': () => import('./130000_full.json'),
  // 山西
  '140000': () => import('./140000_full.json'),
  // 内蒙古
  '150000': () => import('./150000_full.json'),
  // 辽宁
  '210000': () => import('./210000_full.json'),
  // 吉林
  '220000': () => import('./220000_full.json'),
  // 黑龙江
  '230000': () => import('./230000_full.json'),
  // 上海
  '310000': () => import('./310000_full.json'),
  // 江苏
  '320000': () => import('./320000_full.json'),
  // 浙江
  '330000': () => import('./330000_full.json'),
  // 安徽
  '340000': () => import('./340000_full.json'),
  // 福建
  '350000': () => import('./350000_full.json'),
  // 江西
  '360000': () => import('./360000_full.json'),
  // 山东
  '370000': () => import('./370000_full.json'),
  // 河南
  '410000': () => import('./410000_full.json'),
  // 湖北
  '420000': () => import('./420000_full.json'),
  // 湖南
  '430000': () => import('./430000_full.json'),
  // 广东
  '440000': () => import('./440000_full.json'),
  // 广西
  '450000': () => import('./450000_full.json'),
  // 海南
  '460000': () => import('./460000_full.json'),
  // 重庆
  '500000': () => import('./500000_full.json'),
  // 四川
  '510000': () => import('./510000_full.json'),
  // 贵州
  '520000': () => import('./520000_full.json'),
  // 云南
  '530000': () => import('./530000_full.json'),
  // 西藏
  '540000': () => import('./540000_full.json'),
  // 陕西
  '610000': () => import('./610000_full.json'),
  // 甘肃
  '620000': () => import('./620000_full.json'),
  // 青海
  '630000': () => import('./630000_full.json'),
  // 宁夏
  '640000': () => import('./640000_full.json'),
  // 新疆
  '650000': () => import('./650000_full.json')
}
