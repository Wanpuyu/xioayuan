const jwt = require('jsonwebtoken');
const config = require('../config');
const pool = require('../db/pool');
const { fail } = require('../utils/response');

/**
 * 登录态校验中间件
 * 解析 Authorization: Bearer <token>，并回查用户状态（禁用账号立即失效）
 */
async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return fail(res, 401, '未登录或登录已过期');

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (e) {
      return fail(res, 401, '登录凭证无效或已过期，请重新登录');
    }

    const [users] = await pool.query(
      'SELECT id, username, real_name, student_no, phone, email, role, status FROM users WHERE id = ?',
      [payload.id]
    );
    if (users.length === 0) return fail(res, 401, '用户不存在');
    if (users[0].status !== 1) return fail(res, 403, '账号已被禁用，请联系管理员');

    req.user = users[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authRequired };
