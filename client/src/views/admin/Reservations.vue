<template>
  <div class="page-container">
    <h2 class="page-title">预约管理</h2>

    <el-card>
      <div class="filter-bar">
        <el-input
          v-model="query.keyword"
          placeholder="活动标题/用户名/姓名/学号"
          clearable
          style="width: 260px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-select v-model="query.status" placeholder="预约状态" clearable style="width: 140px">
          <el-option label="待参加" value="booked" />
          <el-option label="已核销" value="checked" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <ProTable :data="list" :columns="columns" :loading="loading">
        <template #status="{ row }">
          <el-tag :type="RESERVATION_STATUS[row.status]?.type">
            {{ RESERVATION_STATUS[row.status]?.text }}
          </el-tag>
        </template>

        <template #actions="{ row }">
          <template v-if="row.status === 'booked'">
            <el-button type="success" size="small" link @click="handleCheck(row)">核销</el-button>
            <el-button type="danger" size="small" link @click="handleForceCancel(row)">
              强制取消
            </el-button>
          </template>
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
import {
  getAllReservations,
  checkReservation,
  forceCancelReservation
} from '@/api/reservation';
import { RESERVATION_STATUS, formatTime } from '@/utils/format';

const loading = ref(false);
const list = ref([]);
const total = ref(0);
const query = reactive({ keyword: '', status: '', page: 1, size: 10 });

const columns = [
  { prop: 'activityTitle', label: '活动', minWidth: 170 },
  { prop: 'username', label: '用户名', width: 110 },
  { prop: 'realName', label: '姓名', width: 100 },
  { prop: 'studentNo', label: '学号', width: 120 },
  { prop: 'contactPhone', label: '联系手机', width: 130 },
  { prop: 'startTime', label: '活动时间', minWidth: 150, formatter: (row) => formatTime(row.startTime) },
  { prop: 'createdAt', label: '预约时间', minWidth: 150, formatter: (row) => formatTime(row.createdAt) },
  { prop: 'status', label: '状态', width: 90, slot: 'status' },
  { prop: 'actions', label: '操作', width: 150, fixed: 'right', slot: 'actions' }
];

async function loadData() {
  loading.value = true;
  try {
    const data = await getAllReservations(query);
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

async function handleCheck(row) {
  try {
    await ElMessageBox.confirm(`确认核销「${row.realName || row.username}」对该活动的预约吗？`, '预约核销', {
      type: 'info'
    });
    await checkReservation(row.id);
    ElMessage.success('核销成功');
    loadData();
  } catch (e) {
    /* 取消 */
  }
}

async function handleForceCancel(row) {
  try {
    await ElMessageBox.confirm('强制取消后将释放活动名额，确定执行吗？', '强制取消', {
      type: 'warning'
    });
    await forceCancelReservation(row.id);
    ElMessage.success('已强制取消');
    loadData();
  } catch (e) {
    /* 取消 */
  }
}

onMounted(loadData);
</script>
