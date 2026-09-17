const { fail } = require('../utils/response');

/**
 * 角色校验中间件，需在 authRequired 之后使用
 * 用法：router.post('/x', authRequired, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 401, '未登录');
    if (!roles.includes(req.user.role)) {
      return fail(res, 403, '无权限访问该资源');
    }
    next();
  };
}

module.exports = { requireRole: requireRole, requireAdmin: requireRole('admin') };
