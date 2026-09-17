const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');

const UPLOAD_ROOT = path.join(__dirname, '..', 'static', 'uploads');

/** 确保目录存在 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** 递归计算目录总占用，实现存储容量上限治理 */
function getDirSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += getDirSize(full);
    else total += fs.statSync(full).size;
  }
  return total;
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    // 按年月分子目录，避免单目录文件过多（Windows 下统一用 path.join）
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dir = path.join(UPLOAD_ROOT, ym);
    ensureDir(dir);
    file.uploadDir = ym;
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = config.upload.allowedMime.includes(file.mimetype);
  const extOk = config.upload.allowedExt.includes(ext);
  if (!mimeOk || !extOk) {
    const err = new Error('仅支持 jpg/jpeg/png/gif/webp 格式的图片');
    err.uploadReject = true;
    return cb(err);
  }
  cb(null, true);
}

const uploader = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.fileSize, files: 1 }
});

/**
 * 上传前置：磁盘总配额校验
 * 超过目录总容量(500MB)时拒绝写入，防止存储溢出
 */
function quotaGuard(req, res, next) {
  try {
    if (getDirSize(UPLOAD_ROOT) >= config.upload.dirQuota) {
      return res.status(400).json({
        code: 400,
        message: '服务器图片存储空间已满，请联系管理员清理后再上传'
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { uploader, quotaGuard, UPLOAD_ROOT, getDirSize };
