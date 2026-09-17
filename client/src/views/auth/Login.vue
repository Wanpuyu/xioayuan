<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <el-icon :size="40"><School /></el-icon>
        <h2>校园活动预约系统</h2>
        <p>发现精彩校园活动，一键预约不错过</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleLogin"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            size="large"
            placeholder="请输入用户名"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            size="large"
            type="password"
            show-password
            placeholder="请输入密码"
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          class="submit-btn"
          :loading="loading"
          @click="handleLogin"
        >
          登 录
        </el-button>
      </el-form>

      <div class="auth-footer">
        还没有账号？<router-link to="/register" class="link">立即注册</router-link>
      </div>

      <el-alert
        title="演示账号：管理员 admin / admin123"
        type="info"
        :closable="false"
        class="demo-tip"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock, School } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const formRef = ref(null);
const loading = ref(false);
const form = reactive({ username: '', password: '' });

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

async function handleLogin() {
  await formRef.value.validate();
  loading.value = true;
  try {
    await userStore.login(form);
    ElMessage.success('登录成功');
    // 登录后按角色落地：管理员进后台，普通用户去活动大厅/回跳页
    const redirect = route.query.redirect;
    if (redirect) {
      router.push(redirect);
    } else if (userStore.isAdmin) {
      router.push('/admin/activities');
    } else {
      router.push('/');
    }
  } catch (e) {
    // 校验失败或登录失败（拦截器已提示）
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
  padding: 20px;
  background: linear-gradient(135deg, #4e89ff 0%, #6f7bf7 50%, #9a6bf5 100%);
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 36px 32px 28px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}

.auth-brand {
  text-align: center;
  margin-bottom: 24px;
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

.demo-tip {
  margin-top: 16px;
}
</style>
