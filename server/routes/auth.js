const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const config = require('../config');
const { success, fail, BusinessError } = require('../utils/response');
const { authRequired } = require('../middleware/auth');
const { buildValidator } = require('../middleware/validate');

const router = express.Router();

/** 登录接口限流：15 分钟内最多 10 次，防爆破 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => fail(res, 429, '登录尝试过于频繁，请 15 分钟后再试')
});

/** 生成 JWT */
function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
}

/** 出参用户信息（不含密码） */
function publicUser(u) {
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

// 用户名是否可用（注册页异步校验）
router.get('/check-username', async (req, res, next) => {
  try {
    const username = (req.query.username || '').trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return success(res, { available: false });
    }
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    return success(res, { available: rows.length === 0 });
  } catch (err) {
    next(err);
  }
});

// 注册
router.post(
  '/register',
  buildValidator({
    username: { required: true, pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '用户名为3-20位字母、数字或下划线', label: '用户名' },
    password: { required: true, min: 6, max: 20, keepSpace: true, label: '密码' },
    realName: { required: true, max: 50, label: '姓名' },
    studentNo: { max: 30, label: '学号' },
    phone: { type: 'phone', label: '手机号' },
    email: { type: 'email', label: '邮箱' }
  }),
  async (req, res, next) => {
    try {
      const { username, password, realName, studentNo = '', phone = '', email = '' } = req.body;
      const [exists] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
      if (exists.length > 0) throw new BusinessError('用户名已被注册');

      const hash = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        'INSERT INTO users (username, password, real_name, student_no, phone, email) VALUES (?,?,?,?,?,?)',
        [username, hash, realName, studentNo || '', phone || '', email || '']
      );
      const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      const user = publicUser(users[0]);
      return success(res, { token: signToken(user), user }, '注册成功');
    } catch (err) {
      next(err);
    }
  }
);

// 登录
router.post(
  '/login',
  loginLimiter,
  buildValidator({
    username: { required: true, label: '用户名' },
    password: { required: true, keepSpace: true, label: '密码' }
  }),
  async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
      if (users.length === 0) return fail(res, 400, '用户名或密码错误');

      const userRow = users[0];
      const matched = await bcrypt.compare(password, userRow.password);
      if (!matched) return fail(res, 400, '用户名或密码错误');
      if (userRow.status !== 1) return fail(res, 403, '账号已被禁用，请联系管理员');

      const user = publicUser(userRow);
      return success(res, { token: signToken(user), user }, '登录成功');
    } catch (err) {
      next(err);
    }
  }
);

// 当前登录用户信息（用于刷新后重建角色/动态路由）
router.get('/profile', authRequired, (req, res) => {
  return success(res, publicUser(req.user));
});

// 更新个人资料 / 修改密码
router.put(
  '/profile',
  authRequired,
  buildValidator({
    realName: { required: true, max: 50, label: '姓名' },
    studentNo: { max: 30, label: '学号' },
    phone: { type: 'phone', label: '手机号' },
    email: { type: 'email', label: '邮箱' }
  }),
  async (req, res, next) => {
    try {
      const { realName, studentNo = '', phone = '', email = '', oldPassword, newPassword } = req.body;

      if (newPassword !== undefined && newPassword !== '') {
        if (newPassword.length < 6 || newPassword.length > 20)
          throw new BusinessError('新密码长度需为6-20位');
        const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        const ok = await bcrypt.compare(oldPassword || '', users[0].password);
        if (!ok) throw new BusinessError('原密码不正确');
        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query(
          'UPDATE users SET real_name=?, student_no=?, phone=?, email=?, password=? WHERE id=?',
          [realName, studentNo, phone, email, hash, req.user.id]
        );
      } else {
        await pool.query(
          'UPDATE users SET real_name=?, student_no=?, phone=?, email=? WHERE id=?',
          [realName, studentNo, phone, email, req.user.id]
        );
      }

      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
      return success(res, publicUser(rows[0]), '资料已更新');
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
