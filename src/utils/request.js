/**
 * 封装 axios 请求模块
 */
import axios from 'axios'
import jsonBig from 'json-bigint' // 导入处理js最大安全值范围
// 在非组件模块中获取 store 必须通过这种方式
// 这里单独加载 store，和在组件中 this.$store 一个东西
import store from '@/store'
import router from '@/router'

// axios.create 方法：复制一个 axios
// 创建一个新的axios实例，提供自己的单独配置  全新axios实例2个配置
const request = axios.create({
  baseURL: 'http://ttapi.research.itcast.cn/' // 基础路径
})

/**
 * 配置处理后端返回数据中超出 js 安全整数范围问题
 */
request.defaults.transformResponse = [
  function (data) {
    try {
      // 如果转换成功则返回转换的数据结果
      return jsonBig.parse(data)
    } catch (err) {
      // 如果转换失败，则包装为统一数据格式并返回
      return {}
    }
  }
]

// 请求拦截器
request.interceptors.request.use(function (config) {
  // const user = store.state.user
  const { user } = store.state
  // 如果用户已登录，统一给接口设置 token 信息
  if (user) {
    config.headers.Authorization = `Bearer ${user.token}`
  }
  // 处理完之后一定要把 config 返回，否则请求就会停在这里
  return config
}, function (error) {
  // Do something with request error
  return Promise.reject(error)
}
)

// 响应拦截器
request.interceptors.response.use(
  // 响应成功进入第1个函数
  // 该函数的参数是响应对象
  function (response) {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    return response
  },
  // 响应失败进入第2个函数，该函数的参数是错误对象
  async function (error) {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    // 如果响应码是 401 ，则请求获取新的 token

    // 响应拦截器中的 error 就是那个响应的错误对象
    console.dir(error)
    if (error.response && error.response.status === 401) {
      // 校验是否有 refresh_token
      const user = store.state.user

      if (!user || !user.refresh_token) {
        router.push('/login')

        // 代码不要往后执行了
        return
      }

      // 如果有refresh_token，则请求获取新的 token
      try {
        const res = await axios({
          method: 'PUT',
          url: 'http://ttapi.research.itcast.cn/app/v1_0/authorizations',
          headers: {
            Authorization: `Bearer ${user.refresh_token}`
          }
        })

        // 如果获取成功，则把新的 token 更新到容器中
        console.log('刷新 token  成功', res)
        store.commit('setUser', {
          token: res.data.data.token, // 最新获取的可用 token
          refresh_token: user.refresh_token // 还是原来的 refresh_token
        })

        // 把之前失败的用户请求继续发出去
        // config 是一个对象，其中包含本次失败请求相关的那些配置信息，例如 url、method 都有
        // return 把 request 的请求结果继续返回给发请求的具体位置
        return request(error.config)
      } catch (err) {
        // 如果获取失败，直接跳转 登录页
        console.log('请求刷线 token 失败', err)
        router.push('/login')
      }
    }

    return Promise.reject(error)
  }
)

export default request
