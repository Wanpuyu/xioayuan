/**
 * v-lazy 图片懒加载指令
 * 用法：<img v-lazy="imgUrl" />
 * 基于 IntersectionObserver，进入视口前只加载占位图，减少首屏资源请求
 */

// 1x1 浅灰占位图（data URI，无网络开销）
const PLACEHOLDER =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="100%" height="100%" fill="#ebeef5"/><text x="50%" y="50%" font-size="16" fill="#c0c4cc" text-anchor="middle" dominant-baseline="middle">活动封面</text></svg>'
  );

const LOAD_FAILED =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="100%" height="100%" fill="#fef0f0"/><text x="50%" y="50%" font-size="16" fill="#f56c6c" text-anchor="middle" dominant-baseline="middle">图片加载失败</text></svg>'
  );

let observer = null;

function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const src = el.__lazySrc__;
          if (src) {
            el.src = src;
            el.addEventListener('error', () => {
              el.src = LOAD_FAILED;
            }, { once: true });
          }
          observer.unobserve(el);
        }
      });
    },
    { rootMargin: '200px 0px' } // 提前 200px 开始加载，滚动更顺滑
  );
  return observer;
}

export default {
  mounted(el, binding) {
    if (el.tagName !== 'IMG') return;
    el.__lazySrc__ = binding.value;
    el.src = PLACEHOLDER;
    if (binding.value) getObserver().observe(el);
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      el.__lazySrc__ = binding.value;
      if (binding.value) getObserver().observe(el);
      else el.src = PLACEHOLDER;
    }
  },
  beforeUnmount(el) {
    if (observer) observer.unobserve(el);
  }
};
