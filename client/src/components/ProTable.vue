<template>
  <el-table
    v-loading="loading"
    :data="data"
    :border="border"
    :stripe="stripe"
    style="width: 100%"
    row-key="id"
  >
    <el-table-column v-if="selection" type="selection" width="44" align="center" />

    <el-table-column
      v-for="col in columns"
      :key="col.prop || col.slot"
      :prop="col.prop"
      :label="col.label"
      :width="col.width"
      :min-width="col.minWidth || 100"
      :align="col.align || 'left'"
      :fixed="col.fixed"
      :show-overflow-tooltip="col.tooltip !== false"
    >
      <template #default="scope">
        <!-- 具名插槽：状态标签、操作按钮等自定义内容 -->
        <slot
          v-if="col.slot"
          :name="col.slot"
          :row="scope.row"
          :index="scope.$index"
        />
        <span v-else-if="col.formatter">{{ col.formatter(scope.row, scope.$index) }}</span>
        <span v-else>{{ scope.row[col.prop] ?? '—' }}</span>
      </template>
    </el-table-column>

    <template #empty>
      <el-empty :description="emptyText" :image-size="80" />
    </template>
  </el-table>
</template>

<script setup>
/**
 * 通用表格组件：columns 配置驱动
 * { prop, label, width, minWidth, align, fixed, formatter, slot }
 * 自定义列内容通过同名插槽实现：<template #status="{ row }">
 */
defineProps({
  data: { type: Array, default: () => [] },
  columns: { type: Array, required: true },
  loading: Boolean,
  border: { type: Boolean, default: true },
  stripe: { type: Boolean, default: true },
  selection: { type: Boolean, default: false },
  emptyText: { type: String, default: '暂无数据' }
});
</script>
