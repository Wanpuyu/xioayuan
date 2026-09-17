const express = require('express');
const { success } = require('../utils/response');
const { authRequired } = require('../middleware/auth');
const { uploader, quotaGuard, UPLOAD_ROOT, getDirSize } = require('../middleware/upload');
const config = require('../config');

const router = express.Router();

/**
 * 图片上传
 * 前端字段名 file；落盘 static/uploads/yyyyMM/，返回可访问 URL
 * quotaGuard 做目录总容量校验，multer limits 做单文件 2MB 硬限制，fileFilter 做格式白名单
 */
router.post('/image', authRequired, quotaGuard, (req, res, next) => {
  uploader.single('file')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return next(Object.assign(new Error('请选择要上传的图片'), { uploadReject: true }));

    const url = `/static/uploads/${req.file.uploadDir}/${req.file.filename}`;
    return success(res, {
      url,
      filename: req.file.filename,
      size: req.file.size
    }, '上传成功');
  });
});

// 存储占用情况（管理员）
router.get('/usage', authRequired, (req, res, next) => {
  try {
    const used = getDirSize(UPLOAD_ROOT);
    return success(res, {
      used,
      quota: config.upload.dirQuota,
      usedText: `${(used / 1024 / 1024).toFixed(1)} MB`,
      quotaText: `${(config.upload.dirQuota / 1024 / 1024).toFixed(0)} MB`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
