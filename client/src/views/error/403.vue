<template>
  <div class="error-page">
    <el-result icon="warning" title="403" sub-title="抱歉，你没有权限访问该页面">
      <template #extra>
        <el-button type="primary" @click="$router.push('/')">返回活动大厅</el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}
</style>
