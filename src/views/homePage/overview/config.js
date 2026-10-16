/**
 * 首页总览配置中心
 * 所有与后端字段名、展示文案、配色相关的定义集中在此，
 * 后期接口字段变更 / 页面迁移只需改本文件，不动组件
 */

import totalProjectsIcon from '../totalProjects.png'
import monitorProjectsIcon from '../monitorProjects.png'
import listIcon1 from '../list-icon-1.svg'
import listIcon2 from '../list-icon-2.svg'
import listIcon3 from '../list-icon-3.svg'
import listIcon4 from '../list-icon-4.svg'
import listIcon5 from '../list-icon-5.svg'
import listIcon6 from '../list-icon-6.svg'
import listIcon7 from '../list-icon-7.svg'
import listIcon8 from '../list-icon-8.svg'

// 分类定义（id 与后端 category 字段一致；color 用于地图打点与图表）
export const CATEGORIES = [
  { id: 'power', name: '能源电力', color: '#0088ff' },
  { id: 'energy', name: '节能环保', color: '#67c23a' },
  { id: 'build', name: '智慧建造', color: '#e6a23c' },
  { id: 'traffic', name: '绿色交通', color: '#f56c6c' },
  { id: 'other', name: '其他', color: '#909399' }
]

// 分类 Tab 字段映射：组件按此读取字段，后端改名只改这里
export const CATEGORY_FIELD_MAP = { label: 'name', value: 'id', count: 'count' }

// 地区排名维度
export const RANK_TYPES = [
  { label: '建设个数', value: 'count', unit: '个' },
  { label: '达标率', value: 'standard', unit: '%' },
  // { label: '贡献值', value: 'contribution', unit: '万kWh' },
  { label: '利用小时数', value: 'hours', unit: 'h' }
]

// 排名列表字段映射
export const RANK_FIELD_MAP = { name: 'name', value: 'value', code: 'code' }

// 地图点位字段映射
export const POINT_FIELD_MAP = {
  id: 'id',
  name: 'name',
  lng: 'lng',
  lat: 'lat',
  category: 'category'
}

// 地图悬浮卡片展示字段（可自由增删）
export const HOVER_FIELDS = [
  { label: '项目类型', field: 'categoryName' },
  { label: '项目状态', field: 'status' },
  { label: '装机容量', field: 'capacity', unit: 'MW' },
  { label: '利用小时', field: 'outputHours', unit: 'h' }
]

// 项目卡片展示字段
export const PROJECT_CARD_FIELDS = [
  { label: '项目类型', field: 'categoryName' },
  { label: '装机容量', field: 'capacity', unit: 'MW' },
  { label: '利用小时', field: 'outputHours', unit: 'h' },
  { label: '平准收入', field: 'income', unit: '元/kW' }
]

// 项目卡片字段映射
export const PROJECT_FIELD_MAP = { id: 'id', name: 'name', tag: 'status' }

// 项目状态 → tag 类型
export const STATUS_TAG_TYPE = {
  在建: 'primary',
  运营: 'success',
  未按标准: 'warning'
}

// 能源类型 → 展示文案（项目情况卡片右上角切换：风电/光伏/非标）
export const ENERGY_LABELS = { wind: '风电', pv: '光伏', nonstandard: '非标' }

// 项目总览顶部指标（左栏卡片），field 对应 overview 接口返回字段；trend: up/down 显示趋势箭头
export const OVERVIEW_METRICS = [
  { label: '建设项目', field: 'totalProjects', unit: '个', icon: totalProjectsIcon, trend: 'up' },
  { label: '运营监测项目', field: 'monitorProjects', unit: '个', icon: monitorProjectsIcon, trend: 'up' }
]

// 项目总览玫瑰图字段映射
export const PIE_FIELD_MAP = { name: 'name', value: 'count' }

// 建设/运营管理项目图表配色（在建 / 运营 / 未结清项目折线）
export const MANAGE_COLORS = ['#08f', '#0fc98f', '#F56C6C']

// 风电
export const SUMMARY_ICONS_1 = {
  项目总数: listIcon1,
  装机容量: listIcon2,
  上网电量: listIcon3,
  利用小时数: listIcon4,
  结算电价: listIcon5,
  千瓦收入: listIcon6
}

// 光伏
export const SUMMARY_ICONS_2 = {
  项目总数: listIcon1,
  装机容量: listIcon2,
  上网电量: listIcon3,
  利用小时数: listIcon4,
  结算电价: listIcon5,
  千瓦收入: listIcon6
}

// 非标
export const SUMMARY_ICON_3 = {
  项目总数: listIcon1,
  填报收入: listIcon2,
  账户收入: listIcon7,
  达标率: listIcon8
}

// energyType → 图标映射（切换风电/光伏/非标时列表图标联动）
export const SUMMARY_ICONS_MAP = {
  wind: SUMMARY_ICONS_1,
  pv: SUMMARY_ICONS_2,
  nonstandard: SUMMARY_ICON_3
}

// 默认查询条件（energyType 一并纳入，由 query 深度监听统一触发重新请求）
export const DEFAULT_QUERY = {
  level: 'country', // country | province | city
  provinceCode: '',
  cityCode: '',
  provinceName: '',
  category: CATEGORIES.map(c => c.id), // 多选分类 id 数组，全选即"全部"
  month: '',
  rankType: 'count',
  energyType: 'wind' // 风电 / 光伏 / 非标
}

// 层级根节点
export const ROOT_LEVEL = { code: 'country', name: '全国' }
