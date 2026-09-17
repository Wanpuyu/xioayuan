const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const initDatabase = require('./db/init');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// 基础中间件
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 静态资源：上传图片目录
app.use('/static', express.static(path.join(__dirname, 'static'), {
  maxAge: '7d',
  index: false
}));

// 健康检查
app.get('/api/health', (req, res) => res.json({ code: 200, message: 'ok', data: { ts: Date.now() } }));

// 业务路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/category'));
app.use('/api/activities', require('./routes/activity'));
app.use('/api/reservations', require('./routes/reservation'));
app.use('/api/users', require('./routes/user'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/stats', require('./routes/stats'));

// 异常兜底（顺序不能变）
app.use('/api', notFound);
app.use(errorHandler);

// 带重试的初始化：兼容 MySQL 服务冷启动 / IPv6 解析延迟等情况
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function bootstrap(retries = 6) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await initDatabase();
      app.listen(config.port, () => {
        console.log(`[campus-activity] 服务已启动: http://localhost:${config.port}`);
      });
      return;
    } catch (err) {
      const retryable = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ER_BAD_DB_ERROR', 'PROTOCOL_CONNECTION_LOST'];
      console.error(`[campus-activity] 第 ${attempt}/${retries} 次连接数据库失败 [${err.code || 'UNKNOWN'}]: ${err.message || ''}`);
      if (attempt === retries || !retryable.includes(err.code)) {
        console.error('请检查 MySQL 是否启动、端口/账号密码是否正确。');
        process.exit(1);
      }
      await sleep(2000);
    }
  }
}

bootstrap();
