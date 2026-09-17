const { fail } = require('../utils/response');

/**
 * 轻量通用参数校验中间件
 * schema 形如:
 * {
 *   username: { required: true, type: 'string', min: 3, max: 20, pattern: /^[a-zA-Z0-9_]+$/, label: '用户名' },
 *   email:    { type: 'email', allowEmpty: true },
 *   role:     { enum: ['user', 'admin'] }
 * }
 * 校验来源：req.body（POST/PUT），也可通过第三个参数指定 query
 */
function buildValidator(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source] || {};
    for (const [field, rule] of Object.entries(schema)) {
      const label = rule.label || field;
      let value = data[field];

      const isEmpty =
        value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

      if (isEmpty) {
        if (rule.required) return fail(res, 400, `请填写${label}`);
        if (rule.default !== undefined) data[field] = rule.default;
        continue;
      }

      // 字符串先去首尾空格（密码除外，避免改变用户输入）
      if (typeof value === 'string' && !rule.keepSpace) value = value.trim();

      if (rule.type === 'string' || typeof value === 'string') {
        if (rule.min !== undefined && value.length < rule.min)
          return fail(res, 400, `${label}长度不能少于${rule.min}个字符`);
        if (rule.max !== undefined && value.length > rule.max)
          return fail(res, 400, `${label}长度不能超过${rule.max}个字符`);
      }

      if (rule.type === 'number' || rule.type === 'int') {
        const num = Number(value);
        if (Number.isNaN(num)) return fail(res, 400, `${label}必须是数字`);
        if (rule.type === 'int' && !Number.isInteger(num)) return fail(res, 400, `${label}必须是整数`);
        if (rule.min !== undefined && num < rule.min) return fail(res, 400, `${label}不能小于${rule.min}`);
        if (rule.max !== undefined && num > rule.max) return fail(res, 400, `${label}不能大于${rule.max}`);
        value = num;
      }

      if (rule.type === 'email' && !/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(value))
        return fail(res, 400, '邮箱格式不正确');

      if (rule.type === 'phone' && !/^1[3-9]\d{9}$/.test(value))
        return fail(res, 400, '手机号格式不正确');

      if (rule.pattern && !rule.pattern.test(value))
        return fail(res, 400, rule.message || `${label}格式不正确`);

      if (rule.enum && !rule.enum.includes(value))
        return fail(res, 400, `${label}取值不合法`);

      data[field] = value;
    }
    next();
  };
}

module.exports = { buildValidator };
