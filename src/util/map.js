export default {
  init
}

export function init(isHttps) {
  const AK = 'pIEEgYph9pvzXX3IAVecgh75PuTV2vmC' // "Vecco...": "bqV9WHAbidIf3E7u7T8E9LrOmWH2kr"//;
  var BMap_URL = ''
  if (isHttps) {
    BMap_URL =
      'https://api.map.baidu.com/api?v=1.0&type=webgl&ak=' +
      AK +
      '&callback=onBMapCallback'
  } else {
    BMap_URL =
      'http://api.map.baidu.com/api?v=1.0&type=webgl&ak=' +
      AK +
      '&callback=onBMapCallback'
  }

  // BMap_URL = "https://api.map.baidu.com/api?v=1.0&type=webgl&ak=" + AK + "&callback=onBMapCallback"
  // console.log("BMap_URL",BMap_URL)

  return new Promise((resolve, reject) => {
    // 如果已加载直接返回
    if (typeof BMapGL !== 'undefined') {
      resolve(BMapGL)
      return true
    }
    if (window.allmap === 'function') { // "allmap": Unknown word.
    }

    // 百度地图异步加载回调处理
    window.onBMapCallback = function() {
      resolve(BMapGL)
    }

    // 插入script脚本
    const scriptNode = document.createElement('script')
    scriptNode.setAttribute('type', 'text/javascript')
    scriptNode.setAttribute('src', BMap_URL)
    document.body.appendChild(scriptNode)
  })
}
