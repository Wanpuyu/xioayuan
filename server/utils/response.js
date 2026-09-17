/**
 * 统一响应体：{ code, message, data }
 * code === 200 表示业务成功，其余为各类失败
 */
function success(res, data = null, message = '操作成功') {
  return res.json({ code: 200, message, data });
}

function fail(res, code = 400, message = '操作失败', data = null) {
  return res.status(code >= 100 && code < 600 ? code : 400).json({ code, message, data });
}

/** 可抛出的业务错误，被全局错误中间件捕获 */
class BusinessError extends Error {
  constructor(message, code = 400) {
    super(message);
    this.code = code;
    this.business = true;
  }
}

module.exports = { success, fail, BusinessError };
