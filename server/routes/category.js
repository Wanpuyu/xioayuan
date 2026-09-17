const express = require('express');
const pool = require('../db/pool');
const { success, BusinessError } = require('../utils/response');
const { authRequired } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { buildValidator } = require('../middleware/validate');

const router = express.Router();

// 分类列表（公开）
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.created_at,
              (SELECT COUNT(*) FROM activities a WHERE a.category_id = c.id) AS activity_count
         FROM categories c ORDER BY c.id ASC`
    );
    const list = rows.map((r) => ({
      id: r.id,
      name: r.name,
      activityCount: r.activity_count,
      createdAt: r.created_at
    }));
    return success(res, list);
  } catch (err) {
    next(err);
  }
});

// 新增分类（管理员）
router.post(
  '/',
  authRequired,
  requireAdmin,
  buildValidator({ name: { required: true, min: 1, max: 50, label: '分类名称' } }),
  async (req, res, next) => {
    try {
      const [exists] = await pool.query('SELECT id FROM categories WHERE name = ?', [req.body.name]);
      if (exists.length > 0) throw new BusinessError('分类名称已存在');
      const [result] = await pool.query('INSERT INTO categories (name) VALUES (?)', [req.body.name]);
      return success(res, { id: result.insertId }, '分类创建成功');
    } catch (err) {
      next(err);
    }
  }
);

// 修改分类（管理员）
router.put(
  '/:id',
  authRequired,
  requireAdmin,
  buildValidator({ name: { required: true, min: 1, max: 50, label: '分类名称' } }),
  async (req, res, next) => {
    try {
      const { name } = req.body;
      const [exists] = await pool.query(
        'SELECT id FROM categories WHERE name = ? AND id <> ?',
        [name, req.params.id]
      );
      if (exists.length > 0) throw new BusinessError('分类名称已存在');
      await pool.query('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);
      return success(res, null, '分类已更新');
    } catch (err) {
      next(err);
    }
  }
);

// 删除分类（管理员，存在活动关联时拒绝）
router.delete('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const [acts] = await pool.query('SELECT COUNT(*) AS cnt FROM activities WHERE category_id = ?', [
      req.params.id
    ]);
    if (acts[0].cnt > 0) throw new BusinessError('该分类下仍有活动，无法删除');
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    return success(res, null, '分类已删除');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
