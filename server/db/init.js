const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('../config');
const pool = require('./pool');

/**
 * 启动初始化：建库 -> 建表 -> 写入种子数据
 * 统一在服务启动时执行，避免散落的一次性脚本造成环境不一致
 */
async function initDatabase() {
  // 1) 连接 MySQL（不指定库），确保数据库存在
  const rootConn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password
  });
  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await rootConn.end();

  // 2) 建表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL,
      password VARCHAR(100) NOT NULL,
      real_name VARCHAR(50) NOT NULL DEFAULT '',
      student_no VARCHAR(30) NOT NULL DEFAULT '',
      phone VARCHAR(20) NOT NULL DEFAULT '',
      email VARCHAR(100) NOT NULL DEFAULT '',
      role ENUM('user','admin') NOT NULL DEFAULT 'user',
      status TINYINT NOT NULL DEFAULT 1 COMMENT '1正常 0禁用',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表'
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(50) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动分类表'
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activities (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(120) NOT NULL,
      category_id INT UNSIGNED NOT NULL DEFAULT 0,
      cover VARCHAR(255) NOT NULL DEFAULT '',
      content TEXT,
      location VARCHAR(120) NOT NULL DEFAULT '',
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      signup_deadline DATETIME NOT NULL,
      capacity INT UNSIGNED NOT NULL DEFAULT 0,
      booked_count INT UNSIGNED NOT NULL DEFAULT 0,
      status ENUM('draft','published','closed') NOT NULL DEFAULT 'published',
      creator_id INT UNSIGNED NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_category (category_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动表'
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      activity_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      contact_name VARCHAR(50) NOT NULL DEFAULT '',
      contact_phone VARCHAR(20) NOT NULL DEFAULT '',
      remark VARCHAR(255) NOT NULL DEFAULT '',
      status ENUM('booked','cancelled','checked') NOT NULL DEFAULT 'booked',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_activity (activity_id),
      KEY idx_user (user_id),
      KEY idx_status (status),
      active_key VARCHAR(60) GENERATED ALWAYS AS
        (CASE WHEN status = 'booked' THEN CONCAT(activity_id, '-', user_id) ELSE NULL END) VIRTUAL,
      UNIQUE KEY uk_active (active_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预约表（active_key 唯一约束防止同一用户重复占名额）'
  `);

  // 3) 种子数据：管理员账号 admin/admin123 + 默认分类
  const [admins] = await pool.query('SELECT id FROM users WHERE username = ?', ['admin']);
  if (admins.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO users (username, password, real_name, role) VALUES (?, ?, ?, ?)',
      ['admin', hash, '系统管理员', 'admin']
    );
  }

  const [cats] = await pool.query('SELECT COUNT(*) AS cnt FROM categories');
  if (cats[0].cnt === 0) {
    await pool.query('INSERT INTO categories (name) VALUES ?', [
      [['学术讲座'], ['文体活动'], ['志愿服务'], ['社团招新'], ['竞赛比赛']]
    ]);
  }
}

module.exports = initDatabase;
