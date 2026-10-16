import axios from 'axios'
import { getToken } from '@/utils/auth'

/**
 * 首页总览接口层
 * 所有请求集中在此，页面/组件不直接发请求，后期迁移只需替换本文件的实现
 * 响应不做统一 code 判定（后端以 code===200 为成功），由调用方处理
 */
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 10000
})

service.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers['X-Token'] = token
  }
  return config
})

function request(url, params) {
  return service.get(url, { params }).then(res => res.data)
}

// 项目总览：建设项目数 / 监测项目数 / 分类统计
export function getOverview(params) {
  return request('/regulatory_s/project/home/overview', params)
}

// 地区排名
export function getRegionRank(params) {
  return request('/regulatory_s/project/home/regionRank', params)
}

// 地图点位
export function getMapPoints(params) {
  return request('/regulatory_s/project/home/mapPoints', params)
}

// 建设/运营管理趋势（柱线混合）
export function getManageTrend(params) {
  return request('/regulatory_s/project/home/manageTrend', params)
}

// 项目情况指标
export function getProjectSummary(params) {
  return request('/regulatory_s/project/home/projectSummary', params)
}

// 发电利用小时数 / 达标率趋势
export function getHoursTrend(params) {
  return request('/regulatory_s/project/home/hoursTrend', params)
}

// 下钻后的项目列表（卡片）
export function getProjectList(params) {
  return request('/regulatory_s/project/home/projectList', params)
}
