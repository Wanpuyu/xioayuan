<template>
  <div class="page-container">
    <h2 class="page-title">活动管理</h2>

    <el-card>
      <div class="filter-bar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索活动标题/地点"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
        </el-input>
        <el-select v-model="query.status" placeholder="活动状态" clearable style="width: 140px">
          <el-option label="已发布" value="published" />
          <el-option label="未发布" value="draft" />
          <el-option label="已关闭" value="closed" />
        </el-select>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button type="success" class="btn-create" @click="$router.push('/admin/activities/new')">
          <el-icon><Plus /></el-icon>新建活动
        </el-button>
      </div>

      <ProTable :data="list" :columns="columns" :loading="loading">
        <template #cover="{ row }">
          <el-image
            v-if="row.cover"
            :src="row.cover"
            :preview-src-list="[row.cover]"
            preview-teleported
            fit="cover"
            class="cover-thumb"
          />
          <span v-else class="text-muted">无</span>
        </template>

        <template #time="{ row }">
          <div class="time-cell">
            <div>{{ formatTime(row.startTime) }}</div>
            <div class="text-muted">至 {{ formatTime(row.endTime) }}</div>
          </div>
        </template>

        <template #ratio="{ row }">
          <span :class="{ 'full': row.bookedCount >= row.capacity }">
            {{ row.bookedCount }}/{{ row.capacity }}
          </span>
        </template>

        <template #status="{ row }">
          <el-tag :type="ACTIVITY_STATUS[row.status]?.type">
            {{ ACTIVITY_STATUS[row.status]?.text }}
          </el-tag>
        </template>

        <template #actions="{ row }">
          <el-button type="primary" size="small" link @click="goEdit(row)">编辑</el-button>
          <el-button type="danger" size="small" link @click="handleDelete(row)">删除</el-button>
        </template>
      </ProTable>

      <Pagination
        :page="query.page"
        :size="query.size"
        :total="total"
        @change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import ProTable from '@/components/ProTable.vue';
import Pagination from '@/components/Pagination.vue';
import { getActivities, deleteActivity } from '@/api/activity';
import { ACTIVITY_STATUS, formatTime } from '@/utils/format';

const router = useRouter();
const loading = ref(false);
const list = ref([]);
const total = ref(0);
const query = reactive({ keyword: '', status: '', page: 1, size: 10, scope: 'admin' });

const columns = [
  { prop: 'cover', label: '封面', width: 90, slot: 'cover' },
  { prop: 'title', label: '标题', minWidth: 180 },
  { prop: 'categoryName', label: '分类', width: 100 },
  { prop: 'location', label: '地点', minWidth: 130 },
  { prop: 'time', label: '活动时间', minWidth: 200, slot: 'time' },
  { prop: 'ratio', label: '预约/名额', width: 100, slot: 'ratio' },
  { prop: 'status', label: '状态', width: 90, slot: 'status' },
  { prop: 'actions', label: '操作', width: 110, fixed: 'right', slot: 'actions' }
];

async function loadData() {
  loading.value = true;
  try {
    const data = await getActivities(query);
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

function handleReset() {
  query.keyword = '';
  query.status = '';
  query.page = 1;
  loadData();
}

function handlePageChange({ page, size }) {
  query.page = page;
  query.size = size;
  loadData();
}

function goEdit(row) {
  router.push(`/admin/activities/edit/${row.id}`);
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除活动「${row.title}」吗？此操作不可恢复。`, '删除活动', {
      type: 'warning'
    });
    await deleteActivity(row.id);
    ElMessage.success('活动已删除');
    loadData();
  } catch (e) {
    /* 取消 */
  }
}

onMounted(loadData);
</script>

<style scoped>
.btn-create {
  margin-left: auto;
}

.cover-thumb {
  width: 56px;
  height: 38px;
  border-radius: 4px;
}

.time-cell {
  line-height: 1.5;
  font-size: 13px;
}

.full {
  color: #f56c6c;
  font-weight: 600;
}
</style>
