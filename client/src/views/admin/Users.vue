<template>
  <div class="page-container">
    <h2 class="page-title">用户管理</h2>

    <el-card>
      <div class="filter-bar">
        <el-input
          v-model="query.keyword"
          placeholder="用户名/姓名/学号/手机号"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-select v-model="query.role" placeholder="角色" clearable style="width: 130px">
          <el-option label="普通用户" value="user" />
          <el-option label="管理员" value="admin" />
        </el-select>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <ProTable :data="list" :columns="columns" :loading="loading">
        <template #role="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'">
            {{ row.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </template>

        <template #status="{ row }">
          <el-switch
            :model-value="row.status === 1"
            :disabled="row.id === userStore.userInfo?.id"
            active-text="正常"
            inactive-text="禁用"
            inline-prompt
            @change="(val) => handleToggleStatus(row, val)"
          />
        </template>

        <template #actions="{ row }">
          <el-button type="primary" size="small" link @click="openEdit(row)">编辑</el-button>
        </template>
      </ProTable>

      <Pagination
        :page="query.page"
        :size="query.size"
        :total="total"
        @change="handlePageChange"
      />
    </el-card>

    <!-- 编辑角色/状态 -->
    <el-dialog v-model="dialogVisible" title="编辑用户" width="400px">
      <el-form label-width="90px" v-if="editRow">
        <el-form-item label="用户名">
          <span>{{ editRow.username }}</span>
        </el-form-item>
        <el-form-item label="姓名">
          <span>{{ editRow.realName || '—' }}</span>
        </el-form-item>
        <el-form-item label="角色">
          <el-radio-group v-model="editRow.role">
            <el-radio value="user">普通用户</el-radio>
            <el-radio value="admin">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="账号状态">
          <el-switch
            v-model="editRow.statusBool"
            active-text="正常"
            inactive-text="禁用"
            inline-prompt
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ProTable from '@/components/ProTable.vue';
import Pagination from '@/components/Pagination.vue';
import { getUsers, updateUser } from '@/api/user';
import { useUserStore } from '@/stores/user';
import { formatTime } from '@/utils/format';

const userStore = useUserStore();

const loading = ref(false);
const saving = ref(false);
const list = ref([]);
const total = ref(0);
const query = reactive({ keyword: '', role: '', page: 1, size: 10 });

const dialogVisible = ref(false);
const editRow = ref(null);

const columns = [
  { prop: 'id', label: 'ID', width: 70 },
  { prop: 'username', label: '用户名', minWidth: 120 },
  { prop: 'realName', label: '姓名', width: 110 },
  { prop: 'studentNo', label: '学号', width: 130 },
  { prop: 'phone', label: '手机号', width: 130 },
  { prop: 'email', label: '邮箱', minWidth: 160 },
  { prop: 'role', label: '角色', width: 100, slot: 'role' },
  { prop: 'status', label: '状态', width: 100, slot: 'status' },
  {
    prop: 'createdAt',
    label: '注册时间',
    minWidth: 150,
    formatter: (row) => formatTime(row.createdAt)
  },
  { prop: 'actions', label: '操作', width: 80, fixed: 'right', slot: 'actions' }
];

async function loadData() {
  loading.value = true;
  try {
    const data = await getUsers(query);
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
  query.role = '';
  query.page = 1;
  loadData();
}

function handlePageChange({ page, size }) {
  query.page = page;
  query.size = size;
  loadData();
}

function openEdit(row) {
  editRow.value = { ...row, statusBool: row.status === 1 };
  dialogVisible.value = true;
}

async function handleSave() {
  saving.value = true;
  try {
    await updateUser(editRow.value.id, {
      role: editRow.value.role,
      status: editRow.value.statusBool ? 1 : 0
    });
    ElMessage.success('用户信息已更新');
    dialogVisible.value = false;
    loadData();
  } finally {
    saving.value = false;
  }
}

async function handleToggleStatus(row, enabled) {
  const status = enabled ? 1 : 0;
  try {
    await ElMessageBox.confirm(
      `确定${enabled ? '启用' : '禁用'}用户「${row.username}」吗？`,
      '账号状态',
      { type: 'warning' }
    );
    await updateUser(row.id, { role: row.role, status });
    ElMessage.success('状态已更新');
    loadData();
  } catch (e) {
    // 用户取消：开关为单向绑定，model-value 未变更会自动回弹
  }
}

onMounted(loadData);
</script>
