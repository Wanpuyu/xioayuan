const express = require('express');
const pool = require('../db/pool');
const { success, BusinessError } = require('../utils/response');
const { authRequired } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { buildValidator } = require('../middleware/validate');

const router = express.Router();

function mapReservation(r) {
  return {
    id: r.id,
    activityId: r.activity_id,
    userId: r.user_id,
    activityTitle: r.activity_title,
    activityLocation: r.location,
    startTime: r.start_time,
    username: r.username,
    realName: r.real_name,
    studentNo: r.student_no,
    contactName: r.contact_name,
    contactPhone: r.contact_phone,
    remark: r.remark,
    status: r.status,
    createdAt: r.created_at
  };
}

/**
 * 创建预约（核心链路）
 * 事务 + SELECT ... FOR UPDATE 行锁防止并发超卖；
 * active_key 唯一索引作为重复预约的最后兜底
 */
router.post(
  '/',
  authRequired,
  buildValidator({
    activityId: { required: true, type: 'int', min: 1, label: '活动' },
    contactName: { required: true, max: 50, label: '联系人姓名' },
    contactPhone: { type: 'phone', label: '联系人手机号' },
    remark: { max: 255, label: '备注' }
  }),
  async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
      const { activityId, contactName, contactPhone = '', remark = '' } = req.body;
      await conn.beginTransaction();

      const [acts] = await conn.query(
        'SELECT * FROM activities WHERE id = ? FOR UPDATE',
        [activityId]
      );
      if (acts.length === 0) throw new BusinessError('活动不存在', 404);
      const activity = acts[0];

      if (activity.status !== 'published') throw new BusinessError('该活动当前不可预约');
      const now = Date.now();
      if (now > new Date(activity.signup_deadline).getTime())
        throw new BusinessError('该活动报名已截止');
      if (now > new Date(activity.end_time).getTime())
        throw new BusinessError('该活动已结束');
      if (activity.booked_count >= activity.capacity)
        throw new BusinessError('该活动名额已满');

      const [dup] = await conn.query(
        "SELECT id FROM reservations WHERE activity_id = ? AND user_id = ? AND status = 'booked' LIMIT 1",
        [activityId, req.user.id]
      );
      if (dup.length > 0) throw new BusinessError('您已预约该活动，请勿重复预约');

      const [result] = await conn.query(
        `INSERT INTO reservations
           (activity_id, user_id, contact_name, contact_phone, remark, status)
         VALUES (?,?,?,?,?,'booked')`,
        [activityId, req.user.id, contactName, contactPhone, remark]
      );
      await conn.query(
        'UPDATE activities SET booked_count = booked_count + 1 WHERE id = ?',
        [activityId]
      );

      await conn.commit();
      return success(res, { id: result.insertId, remaining: activity.capacity - activity.booked_count - 1 }, '预约成功');
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  }
);

// 我的预约
router.get('/mine', authRequired, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(50, Math.max(1, parseInt(req.query.size, 10) || 10));
    const status = req.query.status || '';
    const where = ['r.user_id = ?'];
    const params = [req.user.id];
    if (['booked', 'cancelled', 'checked'].includes(status)) {
      where.push('r.status = ?');
      params.push(status);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM reservations r WHERE ${where.join(' AND ')}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT r.id, r.activity_id, r.user_id, r.contact_name, r.contact_phone, r.remark,
              r.status, r.created_at,
              a.title AS activity_title, a.location, a.start_time
         FROM reservations r
         LEFT JOIN activities a ON a.id = r.activity_id
        WHERE ${where.join(' AND ')}
        ORDER BY r.id DESC LIMIT ? OFFSET ?`,
      [...params, size, (page - 1) * size]
    );

    return success(res, { list: rows.map(mapReservation), total: countRows[0].cnt, page, size });
  } catch (err) {
    next(err);
  }
});

// 用户取消本人预约
router.put('/:id/cancel', authRequired, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rs] = await conn.query(
      'SELECT * FROM reservations WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    if (rs.length === 0) throw new BusinessError('预约记录不存在', 404);
    if (rs[0].user_id !== req.user.id && req.user.role !== 'admin')
      throw new BusinessError('无权操作该预约', 403);
    if (rs[0].status !== 'booked') throw new BusinessError('当前状态不可取消');

    await conn.query("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    await conn.query(
      'UPDATE activities SET booked_count = GREATEST(booked_count - 1, 0) WHERE id = ?',
      [rs[0].activity_id]
    );
    await conn.commit();
    return success(res, null, '预约已取消');
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// ===== 管理员接口 =====

// 预约列表（管理员）
router.get('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(50, Math.max(1, parseInt(req.query.size, 10) || 10));
    const { keyword = '', status = '' } = req.query;

    const where = [];
    const params = [];
    if (['booked', 'cancelled', 'checked'].includes(status)) {
      where.push('r.status = ?');
      params.push(status);
    }
    if (keyword) {
      where.push('(a.title LIKE ? OR u.username LIKE ? OR u.real_name LIKE ? OR u.student_no LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS cnt
         FROM reservations r
         LEFT JOIN activities a ON a.id = r.activity_id
         LEFT JOIN users u ON u.id = r.user_id
         ${whereSql}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT r.id, r.activity_id, r.user_id, r.contact_name, r.contact_phone, r.remark,
              r.status, r.created_at,
              a.title AS activity_title, a.location, a.start_time,
              u.username, u.real_name, u.student_no
         FROM reservations r
         LEFT JOIN activities a ON a.id = r.activity_id
         LEFT JOIN users u ON u.id = r.user_id
         ${whereSql}
        ORDER BY r.id DESC LIMIT ? OFFSET ?`,
      [...params, size, (page - 1) * size]
    );
    return success(res, { list: rows.map(mapReservation), total: countRows[0].cnt, page, size });
  } catch (err) {
    next(err);
  }
});

// 管理员核销（签到）
router.put('/:id/check', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const [rs] = await pool.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    if (rs.length === 0) throw new BusinessError('预约记录不存在', 404);
    if (rs[0].status !== 'booked') throw new BusinessError('仅待参加状态的预约可以核销');
    await pool.query("UPDATE reservations SET status = 'checked' WHERE id = ?", [req.params.id]);
    return success(res, null, '核销成功');
  } catch (err) {
    next(err);
  }
});

// 管理员强制取消
router.put('/:id/force-cancel', authRequired, requireAdmin, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rs] = await conn.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [req.params.id]);
    if (rs.length === 0) throw new BusinessError('预约记录不存在', 404);
    if (rs[0].status !== 'booked') throw new BusinessError('仅待参加状态的预约可以取消');
    await conn.query("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    await conn.query(
      'UPDATE activities SET booked_count = GREATEST(booked_count - 1, 0) WHERE id = ?',
      [rs[0].activity_id]
    );
    await conn.commit();
    return success(res, null, '已强制取消该预约');
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
