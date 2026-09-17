<template>
  <div class="page-container" v-loading="loading">
    <template v-if="activity">
      <el-page-header @back="$router.back()" class="back-bar" content="活动详情" />

      <el-row :gutter="20" class="detail-wrap">
        <!-- 左侧：封面与介绍 -->
        <el-col :xs="24" :md="16">
          <el-card>
            <div class="cover-box">
              <img v-if="activity.cover" :src="activity.cover" :alt="activity.title" />
              <div v-else class="cover-placeholder">
                <el-icon :size="48"><Picture /></el-icon>
                <p>暂无封面</p>
              </div>
            </div>
            <h2 class="title">{{ activity.title }}</h2>
            <el-divider />
            <h3>活动介绍</h3>
            <div class="content">{{ activity.content || '暂无活动介绍' }}</div>
          </el-card>
        </el-col>

        <!-- 右侧：信息与预约操作 -->
        <el-col :xs="24" :md="8">
          <el-card class="info-card">
            <div class="status-line">
              <el-tag :type="status.type" effect="dark">{{ status.text }}</el-tag>
              <el-tag type="info" effect="plain">{{ activity.categoryName }}</el-tag>
            </div>

            <el-descriptions :column="1" border class="desc">
              <el-descriptions-item label="活动地点">
                {{ activity.location }}
              </el-descriptions-item>
              <el-descriptions-item label="开始时间">
                {{ formatTime(activity.startTime, true) }}
              </el-descriptions-item>
              <el-descriptions-item label="结束时间">
                {{ formatTime(activity.endTime, true) }}
              </el-descriptions-item>
              <el-descriptions-item label="报名截止">
                {{ formatTime(activity.signupDeadline, true) }}
              </el-descriptions-item>
            </el-descriptions>

            <div class="capacity">
              <div class="capacity-text">
                已预约 <b>{{ activity.bookedCount }}</b> / {{ activity.capacity }} 人
              </div>
              <el-progress
                :percentage="percent"
                :status="percent >= 100 ? 'exception' : 'success'"
                :stroke-width="10"
              />
            </div>

            <!-- 预约操作区 -->
            <div class="action-area">
              <template v-if="activity.myReservation">
                <el-alert
                  title="你已成功预约该活动"
                  type="success"
                  :closable="false"
                  show-icon
                  class="booked-tip"
                />
                <el-button type="danger" class="action-btn" @click="handleCancelMine">
                  取消我的预约
                </el-button>
              </template>
              <template v-else>
                <el-button
                  v-if="!userStore.isLoggedIn"
                  type="primary"
                  size="large"
                  class="action-btn"
                  @click="$router.push(`/login?redirect=${$route.fullPath}`)"
                >
                  登录后预约
                </el-button>
                <el-button
                  v-else
                  type="primary"
                  size="large"
                  class="action-btn"
                  :disabled="status.key !== 'open'"
                  @click="openReserve"
                >
                  {{ status.key === 'open' ? '立即预约' : status.text }}
                </el-button>
              </template>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- 预约表单弹窗 -->
    <el-dialog v-model="dialogVisible" title="填写预约信息" width="460px">
      <ProForm
        ref="formRef"
        v-model="reserveForm"
        :fields="reserveFields"
        label-width="92px"
        :show-footer="false"
      />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleReserve">
          确认预约
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Picture } from '@element-plus/icons-vue';
import { getActivityDetail } from '@/api/activity';
import { createReservation, cancelMine } from '@/api/reservation';
import { useUserStore } from '@/stores/user';
import { activityStatus, formatTime } from '@/utils/format';
import { requiredRule, phoneRule, lengthRule } from '@/utils/validators';
import ProForm from '@/components/ProForm.vue';

const route = useRoute();
const userStore = useUserStore();

const loading = ref(false);
const activity = ref(null);
const dialogVisible = ref(false);
const submitting = ref(false);
const formRef = ref(null);

const reserveForm = reactive({ contactName: '', contactPhone: '', remark: '' });

const reserveFields = computed(() => [
  { prop: 'contactName', label: '联系人', rules: [requiredRule('联系人姓名')] },
  { prop: 'contactPhone', label: '手机号', rules: [phoneRule(true)] },
  {
    prop: 'remark',
    label: '备注',
    type: 'textarea',
    rows: 3,
    maxlength: 255,
    rules: [lengthRule('备注', 0, 255)]
  }
]);

const status = computed(() =>
  activity.value ? activityStatus(activity.value) : { type: 'info', text: '', key: '' }
);

const percent = computed(() => {
  if (!activity.value || !activity.value.capacity) return 0;
  return Math.min(100, Math.round((activity.value.bookedCount / activity.value.capacity) * 100));
});

async function loadDetail() {
  loading.value = true;
  try {
    activity.value = await getActivityDetail(route.params.id);
  } finally {
    loading.value = false;
  }
}

function openReserve() {
  reserveForm.contactName = userStore.userInfo?.realName || userStore.username || '';
  reserveForm.contactPhone = userStore.userInfo?.phone || '';
  reserveForm.remark = '';
  dialogVisible.value = true;
}

async function handleReserve() {
  await formRef.value.validate();
  submitting.value = true;
  try {
    await createReservation({ activityId: Number(route.params.id), ...reserveForm });
    ElMessage.success('预约成功，可在“我的预约”中查看');
    dialogVisible.value = false;
    loadDetail();
  } catch (e) {
    /* 拦截器已提示 */
  } finally {
    submitting.value = false;
  }
}

async function handleCancelMine() {
  try {
    await ElMessageBox.confirm('取消后名额将释放给其他同学，确定取消预约吗？', '取消预约', {
      type: 'warning'
    });
    await cancelMine(activity.value.myReservation.id);
    ElMessage.success('预约已取消');
    loadDetail();
  } catch (e) {
    /* 用户取消 */
  }
}

onMounted(loadDetail);
</script>

<style scoped>
.back-bar {
  margin-bottom: 16px;
}

.cover-box {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f7fa;
}

.cover-box img {
  width: 100%;
  max-height: 380px;
  object-fit: cover;
  display: block;
}

.cover-placeholder {
  height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  gap: 8px;
}

.title {
  margin: 18px 0 0;
  font-size: 24px;
}

.content {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #303133;
}

.info-card {
  position: sticky;
  top: 80px;
}

.status-line {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.desc {
  margin-bottom: 16px;
}

.capacity-text {
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.action-area {
  margin-top: 18px;
}

.action-btn {
  width: 100%;
  margin-top: 12px;
}

.booked-tip {
  margin-bottom: 4px;
}
</style>
