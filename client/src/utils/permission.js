import { useUserStore } from '@/stores/user';

/** 按钮级权限判断：v-if="hasRole('admin')" */
export function hasRole(...roles) {
  const userStore = useUserStore();
  return roles.includes(userStore.role);
}
