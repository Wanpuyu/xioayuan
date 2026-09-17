<template>
  <div class="pagination-wrap">
    <el-pagination
      :current-page="page"
      :page-size="size"
      :total="total"
      :page-sizes="pageSizes"
      background
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="handlePageChange"
      @size-change="handleSizeChange"
    />
  </div>
</template>

<script setup>
/**
 * 通用分页组件，统一后台所有列表的分页交互
 */
const props = defineProps({
  page: { type: Number, default: 1 },
  size: { type: Number, default: 10 },
  total: { type: Number, default: 0 },
  pageSizes: { type: Array, default: () => [10, 20, 50] }
});

const emit = defineEmits(['change']);

function handlePageChange(page) {
  emit('change', { page, size: props.size });
}

function handleSizeChange(size) {
  // 改变每页条数后回到第一页
  emit('change', { page: 1, size });
}
</script>
