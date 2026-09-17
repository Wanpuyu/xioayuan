<template>
  <div class="page-container">
    <h2 class="page-title">我的预约</h2>

    <el-card>
      <el-tabs v-model="query.status" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="" />
        <el-tab-pane label="待参加" name="booked" />
        <el-tab-pane label="已核销" name="checked" />
        <el-tab-pane label="已取消" name="cancelled" />
      </el-tabs>

      <ProTable :data="list" :columns="columns" :loading="loading">
        <template #activity="{ row }">
          <router-link :to="`/activity/${row.activityId}`" class="link">
            {{ row.activityTitle || '活动已删除' }}
          </router-link>
        </template>

        <template #status="{ row }">
          <el-tag :type="RESERVATION_STATUS[row.status]?.type">
            {{ RESERVATION_STATUS[row.status]?.text }}
          </el-tag>
        </template>

        <template #createdAt="{ row }">{{ formatTime(row.createdAt, true) }}</template>

        <template #actions="{ row }">
          <el-button
            v-if="row.status === 'booked'"
            type="danger"
            size="small"
            link
            @click="handleCancel(row)"
          >
            取消预约
          </el-button>
          <span v-else class="text-muted">—</span>
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
import { ElMessage, ElMessageBox } from 'element-plus';
import ProTable from '@/components/ProTable.vue';
import Pagination from '@/components/Pagination.vue';
import { getMyReservations, cancelMine } from '@/api/reservation';
import { RESERVATION_STATUS, formatTime } from '@/utils/format';

const loading = ref(false);
const list = ref([]);
const total = ref(0);
const query = reactive({ status: '', page: 1, size: 10 });

const columns = [
  { prop: 'activityTitle', label: '活动', minWidth: 180, slot: 'activity' },
  { prop: 'activityLocation', label: '地点', minWidth: 140 },
  { prop: 'startTime', label: '活动时间', minWidth: 150, formatter: (row) => formatTime(row.startTime) },
  { prop: 'contactName', label: '联系人', width: 100 },
  { prop: 'contactPhone', label: '手机号', width: 130 },
  { prop: 'createdAt', label: '预约时间', minWidth: 160, slot: 'createdAt' },
  { prop: 'status', label: '状态', width: 90, slot: 'status' },
  { prop: 'actions', label: '操作', width: 100, fixed: 'right', slot: 'actions' }
];

async function loadData() {
  loading.value = true;
  try {
    const data = await getMyReservations(query);
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function handleTabChange() {
  query.page = 1;
  loadData();
}

function handlePageChange({ page, size }) {
  query.page = page;
  query.size = size;
  loadData();
}

async function handleCancel(row) {
  try {
    await ElMessageBox.confirm('确定取消该活动的预约吗？名额将被释放。', '取消预约', {
      type: 'warning'
    });
    await cancelMine(row.id);
    ElMessage.success('预约已取消');
    loadData();
  } catch (e) {
    /* 取消操作 */
  }
}

onMounted(loadData);
</script>

<style scoped>
.link {
  color: #409eff;
}
:deep(.el-tabs) {
  margin-bottom: 6px;
}
</style>
