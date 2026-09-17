import { createRouter, createWebHistory } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';

/**
 * 常量路由：无需权限，首屏即可访问
 * 所有页面组件使用动态 import，Vite 自动按路由分包（按需引入）
 */
export const constantRoutes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/Register.vue'),
    meta: { title: '注册', public: true }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '活动大厅' }
      },
      {
        path: 'activity/:id',
        name: 'ActivityDetail',
        component: () => import('@/views/ActivityDetail.vue'),
        meta: { title: '活动详情' }
      }
    ]
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无访问权限', public: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在' }
  }
];

/** 未登录可直接访问的白名单路径（动态路由未挂载前 /admin 等路径会先匹配 404，不能依赖 meta） */
const WHITE_LIST = ['/login', '/register', '/403'];

/**
 * 异步路由：按角色动态挂载到 MainLayout 下
 * meta.roles 声明可访问角色，实现普通用户 / 管理员页面隔离
 */
export const asyncRoutes = [
  {
    path: 'my-reservations',
    name: 'MyReservations',
    component: () => import('@/views/user/MyReservations.vue'),
    meta: { title: '我的预约', roles: ['user', 'admin'] }
  },
  {
    path: 'profile',
    name: 'Profile',
    component: () => import('@/views/user/Profile.vue'),
    meta: { title: '个人中心', roles: ['user', 'admin'] }
  },
  {
    path: 'admin/activities',
    name: 'AdminActivities',
    component: () => import('@/views/admin/Activities.vue'),
    meta: { title: '活动管理', roles: ['admin'] }
  },
  {
    path: 'admin/activities/new',
    name: 'AdminActivityNew',
    component: () => import('@/views/admin/ActivityEdit.vue'),
    meta: { title: '新建活动', roles: ['admin'], hidden: true }
  },
  {
    path: 'admin/activities/edit/:id',
    name: 'AdminActivityEdit',
    component: () => import('@/views/admin/ActivityEdit.vue'),
    meta: { title: '编辑活动', roles: ['admin'], hidden: true }
  },
  {
    path: 'admin/reservations',
    name: 'AdminReservations',
    component: () => import('@/views/admin/Reservations.vue'),
    meta: { title: '预约管理', roles: ['admin'] }
  },
  {
    path: 'admin/users',
    name: 'AdminUsers',
    component: () => import('@/views/admin/Users.vue'),
    meta: { title: '用户管理', roles: ['admin'] }
  },
  {
    path: 'admin/categories',
    name: 'AdminCategories',
    component: () => import('@/views/admin/Categories.vue'),
    meta: { title: '分类管理', roles: ['admin'] }
  },
  {
    path: 'admin/stats',
    name: 'AdminStats',
    component: () => import('@/views/admin/Stats.vue'),
    meta: { title: '数据统计', roles: ['admin'] }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
  scrollBehavior: () => ({ top: 0 })
});

let dynamicAdded = false;

/** 判断给定路径是否属于某条异步路由（支持 :param 及可选参数） */
function matchAsyncPath(pattern, path) {
  const exp =
    '^/' +
    pattern
      .split('/')
      .map((seg) => {
        if (seg.startsWith(':')) return seg.endsWith('?') ? '[^/]*' : '[^/]+';
        return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/') +
    '$';
  return new RegExp(exp).test(path);
}

/** 按角色过滤并挂载异步路由 */
export function addAccessibleRoutes(role) {
  asyncRoutes.forEach((route) => {
    if (route.meta.roles.includes(role)) {
      router.addRoute('Layout', { ...route, path: `/${route.path}` });
    }
  });
  dynamicAdded = true;
}

/** 退出登录时移除动态路由 */
export function clearAsyncRoutes() {
  asyncRoutes.forEach((route) => {
    if (router.hasRoute(route.name)) router.removeRoute(route.name);
  });
  dynamicAdded = false;
}

// 全局前置守卫：登录态 + 角色隔离
router.beforeEach(async (to) => {
  const userStore = useUserStore();

  // 设置页面标题
  if (to.meta.title) document.title = `${to.meta.title} - 校园活动预约系统`;

  if (userStore.isLoggedIn) {
    if (to.path === '/login') return { path: '/' };

    // 刷新后 userInfo 丢失：用 token 重建资料并挂载动态路由
    if (!userStore.userInfo) {
      try {
        await userStore.fetchProfile();
        addAccessibleRoutes(userStore.role);
        // 只按完整路径重导航（不能展开 to，否则其 name 仍指向 NotFound 会锁死 404）
        return { path: to.fullPath, replace: true };
      } catch (e) {
        userStore.logout();
        clearAsyncRoutes();
        return { path: '/login', query: { redirect: to.fullPath } };
      }
    }

    // 首次导航时挂载动态路由；addRoute 后必须重新导航才能按新路由表重新匹配
    if (!dynamicAdded) {
      addAccessibleRoutes(userStore.role);
      return { path: to.fullPath, replace: true };
    }


    // 未挂载到当前角色的受限路径（命中 404 兜底）→ 403，实现角色页面隔离
    if (to.name === 'NotFound') {
      const owned = asyncRoutes.find((r) => matchAsyncPath(r.path, to.path));
      if (owned && !owned.meta.roles.includes(userStore.role)) {
        ElMessage.warning('无权访问该页面');
        return { path: '/403' };
      }
    }

    // 角色不匹配 → 403
    if (to.meta.roles && !to.meta.roles.includes(userStore.role)) {
      ElMessage.warning('无权访问该页面');
      return { path: '/403' };
    }
    return true;
  }

  // 未登录：白名单路径放行，其余（含尚未挂载的动态路由）跳登录页并记录回跳地址
  if (WHITE_LIST.includes(to.path)) return true;
  return { path: '/login', query: { redirect: to.fullPath } };
});

export default router;
