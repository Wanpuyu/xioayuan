<template>
  <div class="page-container">
    <el-page-header
      @back="$router.push('/admin/activities')"
      :content="isEdit ? '编辑活动' : '新建活动'"
      class="back-bar"
    />

    <el-card v-loading="loading">
      <ProForm
        ref="formRef"
        v-model="form"
        :fields="fields"
        label-width="100px"
        :show-footer="false"
      >
        <!-- 封面图通过插槽接入通用上传组件 -->
        <template #cover>
          <ImageUpload v-model="form.cover" />
        </template>
      </ProForm>

      <div class="form-actions">
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存活动</el-button>
        <el-button @click="$router.push('/admin/activities')">返回列表</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import ProForm from '@/components/ProForm.vue';
import ImageUpload from '@/components/ImageUpload.vue';
import { getActivityDetail, createActivity, updateActivity } from '@/api/activity';
import { useActivityStore } from '@/stores/activity';
import {
  requiredRule,
  requiredSelectRule,
  numberRangeRule,
  dateRequiredRule,
  dateLaterThanRule,
  dateEarlierThanRule,
  lengthRule
} from '@/utils/validators';

const route = useRoute();
const router = useRouter();
const activityStore = useActivityStore();

const isEdit = !!route.params.id;
const loading = ref(false);
const saving = ref(false);
const formRef = ref(null);

const form = reactive({
  title: '',
  categoryId: '',
  location: '',
  capacity: 50,
  startTime: '',
  endTime: '',
  signupDeadline: '',
  cover: '',
  content: '',
  status: 'published'
});

const fields = computed(() => [
  { prop: 'title', label: '活动标题', maxlength: 120, rules: [requiredRule('活动标题')] },
  {
    prop: 'categoryId',
    label: '活动分类',
    type: 'select',
    options: activityStore.categories.map((c) => ({ label: c.name, value: c.id })),
    rules: [requiredSelectRule('活动分类')]
  },
  { prop: 'location', label: '活动地点', maxlength: 120, rules: [requiredRule('活动地点')] },
  {
    prop: 'capacity',
    label: '人数上限',
    type: 'number',
    min: 1,
    max: 99999,
    rules: [numberRangeRule('人数上限', 1, 99999)]
  },
  { prop: 'startTime', label: '开始时间', type: 'datetime', rules: [dateRequiredRule('开始时间')] },
  {
    prop: 'endTime',
    label: '结束时间',
    type: 'datetime',
    rules: [
      dateRequiredRule('结束时间'),
      dateLaterThanRule(() => form.startTime, '结束时间', '开始时间')
    ]
  },
  {
    prop: 'signupDeadline',
    label: '报名截止',
    type: 'datetime',
    rules: [
      dateRequiredRule('报名截止时间'),
      dateEarlierThanRule(() => form.startTime, '报名截止时间', '活动开始时间')
    ]
  },
  {
    prop: 'status',
    label: '发布状态',
    type: 'select',
    options: [
      { label: '已发布', value: 'published' },
      { label: '草稿', value: 'draft' },
      { label: '已关闭', value: 'closed' }
    ],
    rules: [requiredSelectRule('发布状态')]
  },
  { prop: 'cover', label: '封面图', type: 'slot', slot: 'cover', span: 24 },
  {
    prop: 'content',
    label: '活动介绍',
    type: 'textarea',
    rows: 6,
    maxlength: 5000,
    rules: [lengthRule('活动介绍', 0, 5000)]
  }
]);

async function handleSubmit() {
  await formRef.value.validate();
  saving.value = true;
  try {
    const payload = { ...form, categoryId: Number(form.categoryId), capacity: Number(form.capacity) };
    if (isEdit) {
      await updateActivity(route.params.id, payload);
      ElMessage.success('活动已更新');
    } else {
      await createActivity(payload);
      ElMessage.success('活动创建成功');
    }
    router.push('/admin/activities');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await activityStore.loadCategories();
  if (isEdit) {
    loading.value = true;
    try {
      const data = await getActivityDetail(route.params.id);
      Object.assign(form, {
        title: data.title,
        categoryId: data.categoryId,
        location: data.location,
        capacity: data.capacity,
        startTime: data.startTime,
        endTime: data.endTime,
        signupDeadline: data.signupDeadline,
        cover: data.cover || '',
        content: data.content || '',
        status: data.status
      });
    } finally {
      loading.value = false;
    }
  }
});
</script>

<style scoped>
.back-bar {
  margin-bottom: 16px;
}

.form-actions {
  text-align: center;
  margin-top: 8px;
}
</style>
