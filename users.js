const router = require('express').Router();
const pool = require('../db');
const { HttpError, wrap, parseId, requireFields, REPORT_SELECT } = require('../utils');

const findUser = async (id) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (!rows.length) throw new HttpError(404, 'User tidak ditemukan');
  return rows[0];
};

router.post('/', wrap(async (req, res) => {
  requireFields(req.body, ['name', 'email']);
  const { name, email, phone } = req.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Format email tidak valid');
  const { rows } = await pool.query(
    'INSERT INTO users (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
    [name.trim(), email.trim().toLowerCase(), phone || null]
  );
  res.status(201).json({ message: 'User berhasil ditambahkan', data: rows[0] });
}));

router.get('/', wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY id');
  res.json({ data: rows });
}));

router.get('/:id', wrap(async (req, res) => {
  res.json({ data: await findUser(parseId(req.params.id)) });
}));

// getLaporanByUser()
router.get('/:id/reports', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  await findUser(id);
  const { rows } = await pool.query(`${REPORT_SELECT} WHERE r.user_id = $1 ORDER BY r.created_at DESC`, [id]);
  res.json({ data: rows });
}));

module.exports = router;
