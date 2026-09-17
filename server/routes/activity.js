const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const config = require('../config');
const { success, fail, BusinessError } = require('../utils/response');
const { authRequired } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { buildValidator } = require('../middleware/validate');

const router = express.Router();

/** 可选鉴权：从 token 解析当前用户是否为管理员（用于公开接口的越权数据防护） */
async function isAdminRequest(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  try {
    const payload = jwt.verify(header.slice(7), config.jwt.secret);
    const [users] = await pool.query('SELECT role, status FROM users WHERE id = ?', [payload.id]);
    return users.length > 0 && users[0].status === 1 && users[0].role === 'admin';
  } catch (e) {
    return false;
  }
}

const BASE_SELECT = `
  SELECT a.id, a.title, a.category_id, c.name AS category_name, a.cover, a.content,
         a.location, a.start_time, a.end_time, a.signup_deadline,
         a.capacity, a.booked_count, a.status, a.creator_id, a.created_at
    FROM activities a
    LEFT JOIN categories c ON c.id = a.category_id
`;

function mapActivity(r) {
  return {
    id: r.id,
    title: r.title,
    categoryId: r.category_id,
    categoryName: r.category_name || '未分类',
    cover: r.cover,
    content: r.content || '',
    location: r.location,
    startTime: r.start_time,
    endTime: r.end_time,
    signupDeadline: r.signup_deadline,
    capacity: r.capacity,
    bookedCount: r.booked_count,
    status: r.status,
    creatorId: r.creator_id,
    createdAt: r.created_at
  };
}

/** 活动时间逻辑校验：结束>开始，报名截止<=开始时间 */
function validateTimes(body) {
  const start = new Date(body.startTime);
  const end = new Date(body.endTime);
  const deadline = new Date(body.signupDeadline);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(deadline.getTime()))
    throw new BusinessError('活动时间格式不正确');
  if (end <= start) throw new BusinessError('结束时间必须晚于开始时间');
  if (deadline > start) throw new BusinessError('报名截止时间不能晚于活动开始时间');
}

// 活动列表（公开；前台只看 published，管理端可按 status 筛选）
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(50, Math.max(1, parseInt(req.query.size, 10) || 10));
    const { keyword = '', categoryId = '', status = '', scope = '' } = req.query;

    const where = [];
    const params = [];
    // scope=admin 必须服务端确认为管理员，否则强制只返回已发布活动（防越权）
    const adminView = scope === 'admin' && (await isAdminRequest(req));
    if (adminView) {
      if (status) {
        where.push('a.status = ?');
        params.push(status);
      }
    } else {
      where.push("a.status = 'published'");
    }
    if (keyword) {
      where.push('(a.title LIKE ? OR a.location LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (categoryId) {
      where.push('a.category_id = ?');
      params.push(categoryId);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM activities a ${whereSql}`,
      params
    );
    const [rows] = await pool.query(
      `${BASE_SELECT} ${whereSql} ORDER BY a.start_time DESC, a.id DESC LIMIT ? OFFSET ?`,
      [...params, size, (page - 1) * size]
    );

    return success(res, {
      list: rows.map(mapActivity),
      total: countRows[0].cnt,
      page,
      size
    });
  } catch (err) {
    next(err);
  }
});

// 活动详情（公开）；登录用户附带本人预约状态
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`${BASE_SELECT} WHERE a.id = ?`, [req.params.id]);
    if (rows.length === 0) throw new BusinessError('活动不存在', 404);
    const activity = mapActivity(rows[0]);

    // 未发布活动仅管理员可查看
    if (activity.status !== 'published' && !(await isAdminRequest(req))) {
      throw new BusinessError('活动不存在', 404);
    }

    const auth = req.headers.authorization;
    if (auth) {
      try {
        const payload = jwt.verify(auth.replace('Bearer ', ''), config.jwt.secret);
        const [mine] = await pool.query(
          "SELECT id, status FROM reservations WHERE activity_id = ? AND user_id = ? AND status = 'booked' LIMIT 1",
          [activity.id, payload.id]
        );
        activity.myReservation = mine[0] || null;
      } catch (e) {
        /* token 无效时按游客处理 */
      }
    }
    return success(res, activity);
  } catch (err) {
    next(err);
  }
});

// 创建活动（管理员）
router.post(
  '/',
  authRequired,
  requireAdmin,
  buildValidator({
    title: { required: true, max: 120, label: '活动标题' },
    categoryId: { required: true, type: 'int', min: 1, label: '活动分类' },
    location: { required: true, max: 120, label: '活动地点' },
    capacity: { required: true, type: 'int', min: 1, max: 99999, label: '人数上限' },
    cover: { max: 255, label: '封面图' },
    content: { max: 5000, label: '活动介绍' },
    status: { enum: ['draft', 'published', 'closed'] }
  }),
  async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
      const b = req.body;
      validateTimes(b);

      const [cats] = await conn.query('SELECT id FROM categories WHERE id = ?', [b.categoryId]);
      if (cats.length === 0) throw new BusinessError('所选分类不存在');

      const [result] = await conn.query(
        `INSERT INTO activities
         (title, category_id, cover, content, location, start_time, end_time, signup_deadline,
          capacity, booked_count, status, creator_id)
         VALUES (?,?,?,?,?,?,?,?,?,0,?,?)`,
        [
          b.title, b.categoryId, b.cover || '', b.content || '', b.location,
          b.startTime, b.endTime, b.signupDeadline, b.capacity,
          b.status || 'published', req.user.id
        ]
      );
      return success(res, { id: result.insertId }, '活动创建成功');
    } catch (err) {
      next(err);
    } finally {
      conn.release();
    }
  }
);

// 修改活动（管理员）
router.put(
  '/:id',
  authRequired,
  requireAdmin,
  buildValidator({
    title: { required: true, max: 120, label: '活动标题' },
    categoryId: { required: true, type: 'int', min: 1, label: '活动分类' },
    location: { required: true, max: 120, label: '活动地点' },
    capacity: { required: true, type: 'int', min: 1, max: 99999, label: '人数上限' },
    cover: { max: 255, label: '封面图' },
    content: { max: 5000, label: '活动介绍' },
    status: { enum: ['draft', 'published', 'closed'] }
  }),
  async (req, res, next) => {
    try {
      const b = req.body;
      validateTimes(b);

      const [acts] = await pool.query('SELECT * FROM activities WHERE id = ?', [req.params.id]);
      if (acts.length === 0) throw new BusinessError('活动不存在', 404);
      if (b.capacity < acts[0].booked_count)
        throw new BusinessError(`人数上限不能小于已预约人数（${acts[0].booked_count}人）`);

      await pool.query(
        `UPDATE activities SET
           title=?, category_id=?, cover=?, content=?, location=?,
           start_time=?, end_time=?, signup_deadline=?, capacity=?, status=?
         WHERE id=?`,
        [
          b.title, b.categoryId, b.cover || '', b.content || '', b.location,
          b.startTime, b.endTime, b.signupDeadline, b.capacity,
          b.status || 'published', req.params.id
        ]
      );
      return success(res, null, '活动已更新');
    } catch (err) {
      next(err);
    }
  }
);

// 删除活动（管理员；存在有效预约时拒绝）
router.delete('/:id', authRequired, requireAdmin, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [acts] = await conn.query('SELECT id FROM activities WHERE id = ?', [req.params.id]);
    if (acts.length === 0) throw new BusinessError('活动不存在', 404);

    const [booking] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM reservations WHERE activity_id = ? AND status IN ('booked','checked')",
      [req.params.id]
    );
    if (booking[0].cnt > 0) throw new BusinessError('该活动存在有效预约，无法删除');

    await conn.query('DELETE FROM activities WHERE id = ?', [req.params.id]);
    return success(res, null, '活动已删除');
  } catch (err) {
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
