<template>
  <div class="page-container">
    <h2 class="page-title">数据统计</h2>

    <!-- 指标卡片 -->
    <el-row :gutter="16" v-loading="loading">
      <el-col :xs="12" :sm="8" :md="4" v-for="card in cards" :key="card.label">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-num" :style="{ color: card.color }">{{ card.value }}</div>
          <div class="stat-label">{{ card.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :md="14">
        <el-card>
          <template #header>近 7 天预约趋势</template>
          <div ref="trendRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="10">
        <el-card>
          <template #header>各分类预约分布</template>
          <div ref="categoryRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :span="24">
        <el-card>
          <template #header>预约热度 Top5 活动</template>
          <div ref="hotRef" class="chart chart-wide"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts';
import { getStatsOverview } from '@/api/stats';

const loading = ref(false);
const trendRef = ref(null);
const categoryRef = ref(null);
const hotRef = ref(null);

const cards = ref([
  { label: '注册用户', value: 0, color: '#409eff' },
  { label: '活动总数', value: 0, color: '#67c23a' },
  { label: '预约总数', value: 0, color: '#e6a23c' },
  { label: '待参加', value: 0, color: '#909399' },
  { label: '已核销', value: 0, color: '#9b59b6' },
  { label: '核销完成率', value: '0%', color: '#f56c6c' }
]);

let trendChart = null;
let categoryChart = null;
let hotChart = null;

function renderTrend(data) {
  trendChart = echarts.init(trendRef.value);
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: data.map((d) => d.date), boundaryGap: false },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '预约量',
        type: 'line',
        smooth: true,
        data: data.map((d) => d.count),
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: '#409eff' }
      }
    ]
  });
}

function renderCategory(data) {
  categoryChart = echarts.init(categoryRef.value);
  categoryChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '45%'],
        data: data.map((d) => ({ name: d.name, value: d.count })),
        label: { formatter: '{b}\n{c} 次' }
      }
    ]
  });
}

function renderHot(data) {
  hotChart = echarts.init(hotRef.value);
  const rows = [...data].reverse(); // 横向柱图自下而上，最大值在顶部
  hotChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter(params) {
        const p = params[0];
        const item = rows[p.dataIndex];
        return `${item.title}<br/>已预约：${item.bookedCount} / 名额：${item.capacity}`;
      }
    },
    grid: { left: 160, right: 40, top: 20, bottom: 30 },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: rows.map((d) => d.title), axisLabel: { width: 150, overflow: 'truncate' } },
    series: [
      {
        name: '已预约',
        type: 'bar',
        data: rows.map((d) => d.bookedCount),
        barMaxWidth: 22,
        itemStyle: { color: '#67c23a', borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right' }
      }
    ]
  });
}

function handleResize() {
  trendChart?.resize();
  categoryChart?.resize();
  hotChart?.resize();
}

onMounted(async () => {
  loading.value = true;
  try {
    const data = await getStatsOverview();
    cards.value = [
      { label: '注册用户', value: data.cards.userCount, color: '#409eff' },
      { label: '活动总数', value: data.cards.activityCount, color: '#67c23a' },
      { label: '预约总数', value: data.cards.reservationCount, color: '#e6a23c' },
      { label: '待参加', value: data.cards.bookedCount, color: '#909399' },
      { label: '已核销', value: data.cards.checkedCount, color: '#9b59b6' },
      { label: '完成率', value: data.cards.reservationCount ? `${Math.round((data.cards.checkedCount / data.cards.reservationCount) * 100)}%` : '0%', color: '#f56c6c' }
    ];
    await nextTick();
    renderTrend(data.trend);
    renderCategory(data.categoryDist);
    renderHot(data.hotActivities);
    window.addEventListener('resize', handleResize);
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  trendChart?.dispose();
  categoryChart?.dispose();
  hotChart?.dispose();
});
</script>

<style scoped>
.stat-card {
  margin-bottom: 16px;
  text-align: center;
}

.stat-num {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  color: #909399;
  font-size: 13px;
  margin-top: 6px;
}

.chart-row {
  margin-top: 0;
}

.chart {
  height: 320px;
}

.chart-wide {
  height: 300px;
}

@media (max-width: 768px) {
  .stat-num {
    font-size: 22px;
  }
}
</style>
