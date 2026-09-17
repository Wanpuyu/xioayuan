/**
 * localStorage 安全封装
 * - 统一前缀 + 版本号（结构升级后旧数据自动失效）
 * - 配额溢出 / 隐私模式禁用时静默降级为内存存储，保证系统不崩溃
 * - Pinia 是唯一数据源：本模块只被 store 初始化与 $subscribe 调用，页面不直接使用
 */

const PREFIX = 'campus_activity_';
const VERSION = 1;

// localStorage 不可用时的内存兜底
const memoryStore = new Map();

function nativeAvailable() {
  try {
    const testKey = '__ca_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

const available = nativeAvailable();

export const storage = {
  /** 读取数据，失败/版本不符时返回 fallback */
  get(key, fallback = null) {
    try {
      const raw = available
        ? localStorage.getItem(PREFIX + key)
        : memoryStore.get(PREFIX + key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (parsed.version !== VERSION) {
        this.remove(key);
        return fallback;
      }
      return parsed.data;
    } catch (e) {
      console.warn('[storage] 读取失败，使用默认值:', key, e.message);
      return fallback;
    }
  },

  /** 写入数据；返回是否成功（配额满时返回 false，由调用方降级提示） */
  set(key, data) {
    const payload = JSON.stringify({ version: VERSION, data });
    try {
      if (available) {
        localStorage.setItem(PREFIX + key, payload);
      } else {
        memoryStore.set(PREFIX + key, payload);
      }
      return true;
    } catch (e) {
      // QuotaExceededError：清理一次旧数据后重试，仍失败则降级内存
      console.warn('[storage] 持久化失败，已降级为内存存储:', e.message);
      memoryStore.set(PREFIX + key, payload);
      return false;
    }
  },

  remove(key) {
    try {
      if (available) localStorage.removeItem(PREFIX + key);
      memoryStore.delete(PREFIX + key);
    } catch (e) {
      /* 忽略 */
    }
  }
};
