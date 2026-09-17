<template>
  <div class="page-container profile-page">
    <h2 class="page-title">个人中心</h2>

    <el-row :gutter="20">
      <!-- 基本资料 -->
      <el-col :xs="24" :md="14">
        <el-card>
          <template #header>
            <span>基本资料</span>
          </template>

          <ProForm
            ref="profileFormRef"
            v-model="profileForm"
            :fields="profileFields"
            label-width="92px"
            :show-footer="false"
          />
          <div class="form-actions">
            <el-button type="primary" :loading="saving" @click="handleSaveProfile">
              保存资料
            </el-button>
          </div>
        </el-card>
      </el-col>

      <!-- 账号信息 -->
      <el-col :xs="24" :md="10">
        <el-card class="account-card">
          <template #header>
            <span>账号信息</span>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="用户名">
              {{ userStore.userInfo?.username }}
            </el-descriptions-item>
            <el-descriptions-item label="角色">
              <el-tag :type="userStore.isAdmin ? 'danger' : 'primary'">
                {{ userStore.isAdmin ? '管理员' : '普通用户' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="注册时间">
              {{ formatTime(userStore.userInfo?.createdAt, true) }}
            </el-descriptions-item>
          </el-descriptions>

          <el-button type="warning" plain class="pwd-btn" @click="pwdDialogVisible = true">
            修改密码
          </el-button>
        </el-card>
      </el-col>
    </el-row>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdDialogVisible" title="修改密码" width="420px">
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="92px">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleChangePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import ProForm from '@/components/ProForm.vue';
import { updateProfile } from '@/api/auth';
import { useUserStore } from '@/stores/user';
import { formatTime } from '@/utils/format';
import {
  requiredRule,
  studentNoRule,
  phoneRule,
  emailRule,
  passwordRule,
  confirmPasswordRule
} from '@/utils/validators';

const userStore = useUserStore();

const profileFormRef = ref(null);
const saving = ref(false);
const profileForm = reactive({
  realName: '',
  studentNo: '',
  phone: '',
  email: ''
});

const profileFields = [
  { prop: 'realName', label: '真实姓名', rules: [requiredRule('真实姓名'), { max: 50, message: '不能超过50个字符', trigger: 'blur' }] },
  { prop: 'studentNo', label: '学号', rules: [studentNoRule()] },
  { prop: 'phone', label: '手机号', rules: [phoneRule(false)] },
  { prop: 'email', label: '邮箱', rules: [emailRule(false)], span: 24 }
];

const pwdDialogVisible = ref(false);
const pwdFormRef = ref(null);
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' });
const pwdRules = {
  oldPassword: [requiredRule('原密码')],
  newPassword: passwordRule,
  confirmPassword: confirmPasswordRule(() => pwdForm.newPassword)
};

async function handleSaveProfile() {
  await profileFormRef.value.validate();
  saving.value = true;
  try {
    const user = await updateProfile(profileForm);
    userStore.setUserInfo(user);
    ElMessage.success('资料保存成功');
  } finally {
    saving.value = false;
  }
}

async function handleChangePassword() {
  await pwdFormRef.value.validate();
  saving.value = true;
  try {
    const user = await updateProfile({ ...profileForm, ...pwdForm });
    userStore.setUserInfo(user);
    ElMessage.success('密码修改成功，下次登录请使用新密码');
    pwdDialogVisible.value = false;
    Object.assign(pwdForm, { oldPassword: '', newPassword: '', confirmPassword: '' });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  const info = userStore.userInfo;
  if (info) {
    Object.assign(profileForm, {
      realName: info.realName || '',
      studentNo: info.studentNo || '',
      phone: info.phone || '',
      email: info.email || ''
    });
  }
});
</script>

<style scoped>
.form-actions {
  text-align: center;
  margin-top: 8px;
}

.account-card {
  margin-bottom: 20px;
}

.pwd-btn {
  width: 100%;
  margin-top: 18px;
}
</style>
