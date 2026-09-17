import axios from 'axios';
import { ElMessage } from 'element-plus';
import { storage } from '@/utils/storage';

const service = axios.create({
  baseURL: '/api',
  timeout: 15000
});

// 请求拦截器：自动注入 JWT
service.interceptors.request.use(
  (config) => {
    const auth = storage.get('auth');
    if (auth && auth.token) {
      config.headers.Authorization = `Bearer ${auth.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let redirecting = false;

// 响应拦截器：统一解包 + 分层处理「网络异常 / HTTP异常 / 业务异常」
service.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res && typeof res === 'object' && 'code' in res) {
      if (res.code === 200) return res.data;
      ElMessage.error(res.message || '请求失败');
      return Promise.reject(new Error(res.message || '业务异常'));
    }
    return res;
  },
  (error) => {
    // 无 response：网络层不可达（服务未启动/断网/超时）
    if (!error.response) {
      ElMessage.error('网络异常，请检查网络或稍后重试');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // 401：登录失效，清空本地凭证并跳转登录（避免并发请求重复跳转）
    if (status === 401) {
      storage.remove('auth');
      if (!redirecting && !location.pathname.startsWith('/login')) {
        redirecting = true;
        ElMessage.error(data?.message || '登录已过期，请重新登录');
        const redirect = encodeURIComponent(location.pathname + location.search);
        location.href = `/login?redirect=${redirect}`;
      }
      return Promise.reject(error);
    }

    ElMessage.error(data?.message || `请求错误（${status}）`);
    return Promise.reject(error);
  }
);

export default service;
