/**
 * 下载全国 31 个省级行政区的区县级 GeoJSON 边界数据到本地。
 *
 * 数据来源：DataV.GeoAtlas 公开边界服务（阿里云）
 *   https://geo.datav.aliyun.com/areas_v3/bound/{code}_full.json
 *
 * 输出目录：src/views/homePage/map/{code}_full.json
 * 用法：node scripts/download-map-data.js
 * 幂等：文件已存在且非空时跳过，可重复执行做增量补齐。
 */
const https = require('https')
const fs = require('fs')
const path = require('path')

// 31 个省级行政区（与 src/views/homePage/overview/config.js 的 PROVINCE_LIST 保持一致）
const PROVINCES = [
  { code: '110000', name: '北京' },
  { code: '120000', name: '天津' },
  { code: '130000', name: '河北' },
  { code: '140000', name: '山西' },
  { code: '150000', name: '内蒙古' },
  { code: '210000', name: '辽宁' },
  { code: '220000', name: '吉林' },
  { code: '230000', name: '黑龙江' },
  { code: '310000', name: '上海' },
  { code: '320000', name: '江苏' },
  { code: '330000', name: '浙江' },
  { code: '340000', name: '安徽' },
  { code: '350000', name: '福建' },
  { code: '360000', name: '江西' },
  { code: '370000', name: '山东' },
  { code: '410000', name: '河南' },
  { code: '420000', name: '湖北' },
  { code: '430000', name: '湖南' },
  { code: '440000', name: '广东' },
  { code: '450000', name: '广西' },
  { code: '460000', name: '海南' },
  { code: '500000', name: '重庆' },
  { code: '510000', name: '四川' },
  { code: '520000', name: '贵州' },
  { code: '530000', name: '云南' },
  { code: '540000', name: '西藏' },
  { code: '610000', name: '陕西' },
  { code: '620000', name: '甘肃' },
  { code: '630000', name: '青海' },
  { code: '640000', name: '宁夏' },
  { code: '650000', name: '新疆' }
]

const OUT_DIR = path.resolve(__dirname, '../src/views/homePage/map')

function download(code, name) {
  return new Promise((resolve, reject) => {
    const file = path.join(OUT_DIR, `${code}_full.json`)
    // 已存在且非空则跳过
    if (fs.existsSync(file) && fs.statSync(file).size > 0) {
      console.log(`跳过（已存在）: ${name} ${code}`)
      resolve()
      return
    }
    const url = `https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`
    https.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`${name}(${code}) 下载失败: HTTP ${res.statusCode}`))
        res.resume()
        return
      }
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          JSON.parse(data) // 校验是合法 JSON 再落盘
          fs.writeFileSync(file, data)
          console.log(`完成: ${name} ${code} (${(data.length / 1024).toFixed(0)} KB)`)
          resolve()
        } catch (e) {
          reject(new Error(`${name}(${code}) 响应不是合法 JSON`))
        }
      })
    }).on('error', reject)
  })
}

// 生成 index.js 按需加载映射表
// 不能用「import('...' + code + '_full.json')」这类带变量的动态 import：
//   开发环境 babel.config.js 启用了 babel-plugin-dynamic-import-node，会把 import() 降级为 require()，
//   webpack 无法静态收集上级目录的表达式 require，运行时报 Cannot find module。
//   改成静态路径映射后，两种环境都能正确解析（生产构建生成独立的异步 chunk，按需加载）。
function generateIndex() {
  // 注释单独一行：避免行尾注释把 join 补的逗号一起注释掉
  const entries = PROVINCES.map(p => `  // ${p.name}\n  '${p.code}': () => import('./${p.code}_full.json')`)
  const content = `/**
 * 省级 GeoJSON 按需加载映射表
 *
 * 由 scripts/download-map-data.js 自动生成，请勿手动修改；新增/更新省份后重跑该脚本即可。
 * 组件用法：import provinceMapLoaders from '../map'；const geoJson = await provinceMapLoaders[code]()
 */
export default {
${entries.join(',\n')}
}
`
  const file = path.join(OUT_DIR, 'index.js')
  fs.writeFileSync(file, content)
  console.log(`\n已生成映射表: ${file}（${PROVINCES.length} 项）`)
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
  const failed = []
  // 串行下载，避免触发限流
  for (const p of PROVINCES) {
    try {
      await download(p.code, p.name)
    } catch (e) {
      console.error(e.message)
      failed.push(p)
    }
  }
  if (failed.length) {
    console.error(`\n${failed.length} 个失败，可重新执行本脚本补齐: ${failed.map(f => f.name).join('、')}`)
    process.exit(1)
  }
  generateIndex()
  console.log(`\n全部完成，共 ${PROVINCES.length} 个省份，输出目录: ${OUT_DIR}`)
}

main()
