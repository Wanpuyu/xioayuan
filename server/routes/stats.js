const express = require('express');
const pool = require('../db/pool');
const { success } = require('../utils/response');
const { authRequired } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const router = express.Router();

// 数据统计总览（管理员）
router.get('/overview', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const [[userCnt]] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM users WHERE role = 'user'"
    );
    const [[actCnt]] = await pool.query('SELECT COUNT(*) AS cnt FROM activities');
    const [[resCnt]] = await pool.query('SELECT COUNT(*) AS cnt FROM reservations');
    const [[bookedCnt]] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM reservations WHERE status = 'booked'"
    );
    const [[checkedCnt]] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM reservations WHERE status = 'checked'"
    );

    // 近 7 天预约趋势（含已取消，体现热度）
    // GROUP BY 与 SELECT 使用完全相同的表达式，兼容 only_full_group_by
    const [trendRows] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS count
         FROM reservations
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY date ASC`
    );
    // 补齐空日期
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const hit = trendRows.find((r) => r.date === key);
      trend.push({ date: key.slice(5), count: hit ? hit.count : 0 });
    }

    // 各分类预约分布
    const [categoryRows] = await pool.query(
      `SELECT c.name AS name, COUNT(r.id) AS count
         FROM categories c
         LEFT JOIN activities a ON a.category_id = c.id
         LEFT JOIN reservations r ON r.activity_id = a.id
        GROUP BY c.id
        ORDER BY count DESC`
    );

    // 预约热度 Top5 活动
    const [hotRows] = await pool.query(
      `SELECT a.title, a.booked_count AS bookedCount, a.capacity
         FROM activities a
        ORDER BY a.booked_count DESC, a.id DESC
        LIMIT 5`
    );

    return success(res, {
      cards: {
        userCount: userCnt.cnt,
        activityCount: actCnt.cnt,
        reservationCount: resCnt.cnt,
        bookedCount: bookedCnt.cnt,
        checkedCount: checkedCnt.cnt
      },
      trend,
      categoryDist: categoryRows,
      hotActivities: hotRows
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
