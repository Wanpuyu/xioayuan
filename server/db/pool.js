const mysql = require('mysql2/promise');
const config = require('../config');

/** mysql2 连接池（数据库由 init.js 保证已创建） */
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true
});

module.exports = pool;
