const express = require('express');
const pool = require('../db/pool');
const { success, BusinessError } = require('../utils/response');
const { authRequired } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { buildValidator } = require('../middleware/validate');

const router = express.Router();

function mapUser(u) {
  return {
    id: u.id,
    username: u.username,
    realName: u.real_name,
    studentNo: u.student_no,
    phone: u.phone,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.created_at
  };
}

// 用户列表（管理员）
router.get('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(50, Math.max(1, parseInt(req.query.size, 10) || 10));
    const { keyword = '', role = '' } = req.query;

    const where = [];
    const params = [];
    if (keyword) {
      where.push('(username LIKE ? OR real_name LIKE ? OR student_no LIKE ? OR phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (['user', 'admin'].includes(role)) {
      where.push('role = ?');
      params.push(role);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRows] = await pool.query(`SELECT COUNT(*) AS cnt FROM users ${whereSql}`, params);
    const [rows] = await pool.query(
      `SELECT id, username, real_name, student_no, phone, email, role, status, created_at
         FROM users ${whereSql}
        ORDER BY id ASC LIMIT ? OFFSET ?`,
      [...params, size, (page - 1) * size]
    );
    return success(res, { list: rows.map(mapUser), total: countRows[0].cnt, page, size });
  } catch (err) {
    next(err);
  }
});

// 修改用户角色/状态（管理员）
router.put(
  '/:id',
  authRequired,
  requireAdmin,
  buildValidator({
    role: { required: true, enum: ['user', 'admin'], label: '角色' },
    status: { required: true, type: 'int', min: 0, max: 1, label: '状态' }
  }),
  async (req, res, next) => {
    try {
      const targetId = parseInt(req.params.id, 10);
      if (targetId === req.user.id && req.body.role !== 'admin')
        throw new BusinessError('不能取消自己的管理员角色');
      if (targetId === req.user.id && req.body.status === 0)
        throw new BusinessError('不能禁用当前登录账号');

      const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [targetId]);
      if (users.length === 0) throw new BusinessError('用户不存在', 404);

      await pool.query('UPDATE users SET role = ?, status = ? WHERE id = ?', [
        req.body.role,
        req.body.status,
        targetId
      ]);
      return success(res, null, '用户信息已更新');
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
