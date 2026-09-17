import { defineStore } from 'pinia';
import { login as loginApi, register as registerApi, getProfile } from '@/api/auth';
import { storage } from '@/utils/storage';

/**
 * 用户全局状态：token + 用户资料
 * 唯一数据源——初始化时从 localStorage 读入，之后只经 action 修改，
 * $subscribe 统一写回，页面/组件一律不直接读写 localStorage
 */
const persisted = storage.get('auth') || {};

export const useUserStore = defineStore('user', {
  state: () => ({
    token: persisted.token || '',
    userInfo: persisted.userInfo || null
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    role: (state) => state.userInfo?.role || '',
    isAdmin: (state) => state.userInfo?.role === 'admin',
    username: (state) => state.userInfo?.username || '',
    displayName: (state) => state.userInfo?.realName || state.userInfo?.username || ''
  },

  actions: {
    async login(payload) {
      const data = await loginApi(payload);
      this.token = data.token;
      this.userInfo = data.user;
      return data;
    },

    async register(payload) {
      const data = await registerApi(payload);
      this.token = data.token;
      this.userInfo = data.user;
      return data;
    },

    /** 刷新页面后用 token 拉取资料，重建角色信息 */
    async fetchProfile() {
      const user = await getProfile();
      this.userInfo = user;
      return user;
    },

    setUserInfo(user) {
      this.userInfo = user;
    },

    logout() {
      this.token = '';
      this.userInfo = null;
      storage.remove('auth');
    }
  }
});

/**
 * 持久化订阅：状态变更后统一写回 localStorage
 * 在 main.js 中 pinia 注册后调用
 */
export function persistUserStore() {
  const store = useUserStore();
  store.$subscribe((mutation, state) => {
    if (!state.token) {
      storage.remove('auth');
    } else {
      storage.set('auth', { token: state.token, userInfo: state.userInfo });
    }
  });
}
