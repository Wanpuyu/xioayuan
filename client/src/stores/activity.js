import { defineStore } from 'pinia';
import { getCategories } from '@/api/category';
import { getActivities } from '@/api/activity';
import { storage } from '@/utils/storage';

/**
 * 活动全局状态：分类缓存（localStorage 持久化 10 分钟）+ 列表查询条件
 */
const cachedCategories = storage.get('categories_cache');

export const useActivityStore = defineStore('activity', {
  state: () => ({
    categories: cachedCategories?.data || [],
    categoriesLoadedAt: cachedCategories?.ts || 0,
    // 活动大厅的查询条件跨页面返回时保留
    listQuery: {
      keyword: '',
      categoryId: '',
      page: 1,
      size: 12
    },
    lastList: { list: [], total: 0 }
  }),

  getters: {
    categoryName: (state) => (id) =>
      state.categories.find((c) => c.id === id)?.name || '未分类'
  },

  actions: {
    async loadCategories(force = false) {
      const fresh = Date.now() - this.categoriesLoadedAt < 10 * 60 * 1000;
      if (!force && fresh && this.categories.length) return this.categories;
      const list = await getCategories();
      this.categories = list;
      this.categoriesLoadedAt = Date.now();
      storage.set('categories_cache', { data: list, ts: this.categoriesLoadedAt });
      return list;
    },

    async fetchList(extraQuery = {}) {
      Object.assign(this.listQuery, extraQuery);
      const data = await getActivities(this.listQuery);
      this.lastList = data;
      return data;
    }
  }
});
