/** 通用格式化与活动状态判断 */

export function formatTime(value, withSeconds = false) {
  if (!value) return '—';
  const d = new Date(String(value).replace(/-/g, '/'));
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n) => String(n).padStart(2, '0');
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getSeconds())}` : base;
}

/** 活动对外展示状态 */
export function activityStatus(activity) {
  const now = Date.now();
  if (activity.status === 'draft') return { key: 'draft', type: 'info', text: '未发布' };
  if (activity.status === 'closed' || now > new Date(String(activity.endTime).replace(/-/g, '/')).getTime())
    return { key: 'ended', type: 'danger', text: '已结束' };
  if (now > new Date(String(activity.signupDeadline).replace(/-/g, '/')).getTime())
    return { key: 'deadline', type: 'warning', text: '报名截止' };
  if (activity.bookedCount >= activity.capacity)
    return { key: 'full', type: 'warning', text: '名额已满' };
  return { key: 'open', type: 'success', text: '报名中' };
}

export const RESERVATION_STATUS = {
  booked: { type: 'primary', text: '待参加' },
  checked: { type: 'success', text: '已核销' },
  cancelled: { type: 'info', text: '已取消' }
};

export const ACTIVITY_STATUS = {
  draft: { type: 'info', text: '未发布' },
  published: { type: 'success', text: '已发布' },
  closed: { type: 'danger', text: '已关闭' }
};
