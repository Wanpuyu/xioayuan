<template>
  <div class="page-container">
    <!-- 顶部横幅 -->
    <div class="hero">
      <h1>发现校园精彩活动</h1>
      <p>学术讲座 · 文体活动 · 志愿服务 · 社团招新，在线预约免排队</p>
      <div class="hero-search">
        <el-input
          v-model="query.keyword"
          size="large"
          placeholder="搜索活动标题或地点"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #append>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 分类筛选 -->
    <div class="category-tabs">
      <el-radio-group v-model="query.categoryId" @change="handleCategoryChange">
        <el-radio-button :value="''">全部</el-radio-button>
        <el-radio-button
          v-for="cat in activityStore.categories"
          :key="cat.id"
          :value="cat.id"
        >
          {{ cat.name }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 活动卡片网格 -->
    <div v-loading="loading">
      <el-row v-if="list.length" :gutter="20">
        <el-col v-for="item in list" :key="item.id" :xs="24" :sm="12" :md="8" :lg="6">
          <el-card class="activity-card" shadow="hover" :body-style="{ padding: '0' }">
            <router-link :to="`/activity/${item.id}`" class="card-link">
              <div class="cover-wrap">
                <img v-lazy="item.cover || ''" class="cover" :alt="item.title" />
                <el-tag
                  class="status-tag"
                  :type="statusOf(item).type"
                  effect="dark"
                  size="small"
                >
                  {{ statusOf(item).text }}
                </el-tag>
              </div>
              <div class="card-body">
                <div class="card-title">{{ item.title }}</div>
                <div class="card-meta">
                  <el-icon><CollectionTag /></el-icon>
                  <span>{{ item.categoryName }}</span>
                </div>
                <div class="card-meta">
                  <el-icon><Location /></el-icon>
                  <span>{{ item.location }}</span>
                </div>
                <div class="card-meta">
                  <el-icon><Clock /></el-icon>
                  <span>{{ formatTime(item.startTime) }}</span>
                </div>
                <el-progress
                  :percentage="percent(item)"
                  :status="percent(item) >= 100 ? 'exception' : ''"
                  :stroke-width="6"
                />
                <div class="card-footer">
                  <span class="text-muted">{{ item.bookedCount }}/{{ item.capacity }} 人已预约</span>
                  <el-button type="primary" size="small">查看详情</el-button>
                </div>
              </div>
            </router-link>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-else-if="!loading" description="暂无符合条件的活动" />

      <Pagination
        class="pager"
        :page="query.page"
        :size="query.size"
        :total="total"
        :page-sizes="[12, 24, 48]"
        @change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { CollectionTag, Location, Clock } from '@element-plus/icons-vue';
import { useActivityStore } from '@/stores/activity';
import { activityStatus, formatTime } from '@/utils/format';
import Pagination from '@/components/Pagination.vue';

const activityStore = useActivityStore();

const loading = ref(false);
const list = ref([]);
const total = ref(0);
const query = reactive({ keyword: '', categoryId: '', page: 1, size: 12 });

function statusOf(row) {
  return activityStatus(row);
}

function percent(row) {
  if (!row.capacity) return 0;
  return Math.min(100, Math.round((row.bookedCount / row.capacity) * 100));
}

async function loadData() {
  loading.value = true;
  try {
    const data = await activityStore.fetchList({ ...query });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  query.page = 1;
  loadData();
}

function handleCategoryChange() {
  query.page = 1;
  loadData();
}

function handlePageChange({ page, size }) {
  query.page = page;
  query.size = size;
  loadData();
}

onMounted(async () => {
  await activityStore.loadCategories();
  loadData();
});
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, #4e89ff 0%, #7a6bf5 100%);
  border-radius: 12px;
  padding: 36px 28px;
  color: #fff;
  margin-bottom: 20px;
  text-align: center;
}

.hero h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.hero p {
  margin: 0 0 20px;
  opacity: 0.9;
  font-size: 14px;
}

.hero-search {
  max-width: 520px;
  margin: 0 auto;
}

.category-tabs {
  margin-bottom: 18px;
  overflow-x: auto;
  white-space: nowrap;
}

.activity-card {
  margin-bottom: 20px;
  overflow: hidden;
}

.card-link {
  display: block;
  color: inherit;
}

.cover-wrap {
  position: relative;
  width: 100%;
  height: 160px;
  background: #ebeef5;
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.status-tag {
  position: absolute;
  top: 10px;
  right: 10px;
}

.card-body {
  padding: 14px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
  font-size: 13px;
  margin-bottom: 6px;
}

.card-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.pager {
  margin-top: 8px;
}

@media (max-width: 768px) {
  .hero {
    padding: 24px 16px;
  }
  .hero h1 {
    font-size: 22px;
  }
}
</style>
