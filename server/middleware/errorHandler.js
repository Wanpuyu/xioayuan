const { fail } = require('../utils/response');

/** 404 兜底 */
function notFound(req, res) {
  return fail(res, 404, `接口不存在: ${req.method} ${req.path}`);
}

/** 全局错误处理中间件（统一错误出口，向前端隐藏堆栈细节） */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Multer 文件超限/格式错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return fail(res, 400, '上传文件超过 2MB 大小限制');
  }
  if (err.name === 'MulterError') {
    return fail(res, 400, `文件上传失败: ${err.message}`);
  }
  if (err.uploadReject) {
    return fail(res, 400, err.message);
  }

  // 业务错误
  if (err.business) {
    return fail(res, err.code || 400, err.message);
  }

  // MySQL 唯一键冲突等
  if (err.code === 'ER_DUP_ENTRY') {
    return fail(res, 400, '数据重复，请勿重复提交');
  }

  console.error('[未处理异常]', err);
  return fail(res, 500, '服务器开小差了，请稍后再试');
}

module.exports = { notFound, errorHandler };
