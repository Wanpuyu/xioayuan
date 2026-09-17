<template>
  <div class="page-container">
    <h2 class="page-title">分类管理</h2>

    <el-card>
      <div class="filter-bar">
        <span class="text-muted">用于活动发布时选择分类</span>
        <el-button type="success" class="btn-create" @click="openCreate">
          <el-icon><Plus /></el-icon>新增分类
        </el-button>
      </div>

      <ProTable :data="list" :columns="columns" :loading="loading">
        <template #actions="{ row }">
          <el-button type="primary" size="small" link @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" size="small" link @click="handleDelete(row)">删除</el-button>
        </template>
      </ProTable>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editId ? '编辑分类' : '新增分类'" width="380px">
      <el-form @submit.prevent>
        <el-form-item label="分类名称" required>
          <el-input v-model="formName" maxlength="50" show-word-limit placeholder="请输入分类名称" />
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
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import ProTable from '@/components/ProTable.vue';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '@/api/category';
import { useActivityStore } from '@/stores/activity';
import { formatTime } from '@/utils/format';

const activityStore = useActivityStore();

const loading = ref(false);
const saving = ref(false);
const list = ref([]);
const dialogVisible = ref(false);
const editId = ref(null);
const formName = ref('');

const columns = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'name', label: '分类名称', minWidth: 160 },
  { prop: 'activityCount', label: '关联活动数', width: 110 },
  { prop: 'createdAt', label: '创建时间', minWidth: 160, formatter: (row) => formatTime(row.createdAt) },
  { prop: 'actions', label: '操作', width: 120, slot: 'actions' }
];

async function loadData() {
  loading.value = true;
  try {
    list.value = await getCategories();
    await activityStore.loadCategories(true);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editId.value = null;
  formName.value = '';
  dialogVisible.value = true;
}

function openEdit(row) {
  editId.value = row.id;
  formName.value = row.name;
  dialogVisible.value = true;
}

async function handleSave() {
  const name = formName.value.trim();
  if (!name) return ElMessage.warning('请输入分类名称');
  saving.value = true;
  try {
    if (editId.value) {
      await updateCategory(editId.value, name);
      ElMessage.success('分类已更新');
    } else {
      await createCategory(name);
      ElMessage.success('分类创建成功');
    }
    dialogVisible.value = false;
    loadData();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${row.name}」吗？`, '删除分类', { type: 'warning' });
    await deleteCategory(row.id);
    ElMessage.success('分类已删除');
    loadData();
  } catch (e) {
    /* 取消或后端拦截（有关联活动） */
  }
}

onMounted(loadData);
</script>

<style scoped>
.btn-create {
  margin-left: auto;
}
</style>
