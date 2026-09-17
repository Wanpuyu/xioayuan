/**
 * 全局配置（敏感信息通过环境变量覆盖，默认值便于本地开发）
 */
module.exports = {
  port: process.env.PORT || 3000,

  db: {
    // 本机 MySQL90 默认仅监听 IPv6，使用 ::1 最稳定；部署到其他环境可用 DB_HOST 覆盖
    host: process.env.DB_HOST || '::1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'mysql123',
    database: process.env.DB_NAME || 'campus_activity',
    connectionLimit: 10
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'campus_activity_jwt_secret_2026',
    expiresIn: '7d'
  },

  upload: {
    // 单文件大小上限 2MB
    fileSize: 2 * 1024 * 1024,
    // static/uploads 目录总容量上限 500MB
    dirQuota: 500 * 1024 * 1024,
    allowedMime: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExt: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  }
};
