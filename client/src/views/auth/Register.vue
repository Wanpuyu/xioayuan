<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <el-icon :size="36"><School /></el-icon>
        <h2>注册新账号</h2>
        <p>填写以下信息，开启校园活动之旅</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="3-20位字母、数字或下划线" clearable />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="6-20位，需包含字母和数字"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入密码"
          />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入真实姓名" clearable />
        </el-form-item>
        <el-form-item label="学号（选填）" prop="studentNo">
          <el-input v-model="form.studentNo" placeholder="4-20位数字或字母" clearable />
        </el-form-item>
        <el-form-item label="手机号（选填）" prop="phone">
          <el-input v-model="form.phone" placeholder="用于预约联系方式" maxlength="11" clearable />
        </el-form-item>
        <el-form-item label="邮箱（选填）" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" clearable />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="submit-btn"
          :loading="loading"
          @click="handleRegister"
        >
          注 册
        </el-button>
      </el-form>

      <div class="auth-footer">
        已有账号？<router-link to="/login" class="link">返回登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { School } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import {
  usernameAsyncRule,
  passwordRule,
  confirmPasswordRule,
  requiredRule,
  studentNoRule,
  phoneRule,
  emailRule
} from '@/utils/validators';

const router = useRouter();
const userStore = useUserStore();

const formRef = ref(null);
const loading = ref(false);
const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  realName: '',
  studentNo: '',
  phone: '',
  email: ''
});

const rules = {
  username: usernameAsyncRule(),
  password: passwordRule,
  confirmPassword: confirmPasswordRule(() => form.password),
  realName: [requiredRule('真实姓名'), { max: 50, message: '姓名不能超过50个字符', trigger: 'blur' }],
  studentNo: studentNoRule(),
  phone: phoneRule(false),
  email: emailRule(false)
};

async function handleRegister() {
  await formRef.value.validate();
  loading.value = true;
  try {
    await userStore.register({
      username: form.username,
      password: form.password,
      realName: form.realName,
      studentNo: form.studentNo,
      phone: form.phone,
      email: form.email
    });
    ElMessage.success('注册成功，已自动登录');
    router.push('/');
  } catch (e) {
    /* 拦截器已提示错误 */
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: linear-gradient(135deg, #4e89ff 0%, #6f7bf7 50%, #9a6bf5 100%);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}

.auth-brand {
  text-align: center;
  margin-bottom: 20px;
  color: #409eff;
}

.auth-brand h2 {
  margin: 10px 0 6px;
  color: #1f2d3d;
  font-size: 22px;
}

.auth-brand p {
  margin: 0;
  color: #909399;
  font-size: 13px;
}

.submit-btn {
  width: 100%;
  margin-top: 4px;
}

.auth-footer {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: #606266;
}

.link {
  color: #409eff;
}
</style>
