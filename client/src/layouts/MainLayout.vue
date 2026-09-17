<template>
  <div class="layout">
    <header class="layout-header">
      <div class="header-inner">
        <router-link to="/" class="logo">
          <el-icon :size="22"><School /></el-icon>
          <span class="logo-text">校园活动预约系统</span>
        </router-link>

        <el-menu
          :default-active="activeMenu"
          mode="horizontal"
          router
          class="nav-menu"
          :ellipsis="false"
        >
          <el-menu-item index="/">活动大厅</el-menu-item>
          <template v-if="userStore.isLoggedIn">
            <el-menu-item index="/my-reservations">我的预约</el-menu-item>
            <el-sub-menu v-if="userStore.isAdmin" index="admin">
              <template #title>后台管理</template>
              <el-menu-item index="/admin/activities">活动管理</el-menu-item>
              <el-menu-item index="/admin/reservations">预约管理</el-menu-item>
              <el-menu-item index="/admin/users">用户管理</el-menu-item>
              <el-menu-item index="/admin/categories">分类管理</el-menu-item>
              <el-menu-item index="/admin/stats">数据统计</el-menu-item>
            </el-sub-menu>
          </template>
        </el-menu>

        <div class="header-right">
          <template v-if="userStore.isLoggedIn">
            <el-dropdown @command="handleCommand">
              <span class="user-trigger">
                <el-icon><UserFilled /></el-icon>
                <span class="username">{{ userStore.displayName }}</span>
                <el-tag v-if="userStore.isAdmin" size="small" type="danger" effect="plain">
                  管理员
                </el-tag>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item v-if="userStore.isAdmin" command="admin">
                    进入后台
                  </el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <el-button text @click="$router.push('/login')">登录</el-button>
            <el-button type="primary" @click="$router.push('/register')">注册</el-button>
          </template>
        </div>
      </div>
    </header>

    <main class="layout-main">
      <router-view />
    </main>

    <footer class="layout-footer">
      <p>校园活动预约系统 · 让每一场校园活动都不错过</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox, ElMessage } from 'element-plus';
import { School, UserFilled, ArrowDown } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { clearAsyncRoutes } from '@/router';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const activeMenu = computed(() => {
  if (route.path.startsWith('/admin')) return route.path;
  if (route.path.startsWith('/my-reservations')) return '/my-reservations';
  if (route.path === '/') return '/';
  return '';
});

async function handleCommand(command) {
  if (command === 'profile') {
    router.push('/profile');
  } else if (command === 'admin') {
    router.push('/admin/activities');
  } else if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' });
      userStore.logout();
      clearAsyncRoutes();
      ElMessage.success('已退出登录');
      router.push('/login');
    } catch (e) {
      /* 取消 */
    }
  }
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409eff;
  font-weight: 700;
  font-size: 17px;
  white-space: nowrap;
}

.nav-menu {
  flex: 1;
  border-bottom: none !important;
  overflow-x: auto;
}

.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #303133;
  outline: none;
}

.username {
  font-size: 14px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layout-main {
  flex: 1;
  width: 100%;
}

.layout-footer {
  background: #fff;
  border-top: 1px solid #ebeef5;
  padding: 20px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.layout-footer p {
  margin: 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .header-inner {
    padding: 0 12px;
    gap: 12px;
  }
  .logo-text {
    display: none;
  }
  .username {
    max-width: 70px;
  }
}
</style>
