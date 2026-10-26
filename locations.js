const router = require('express').Router();
const pool = require('./db');
const { wrap, requireFields } = require('./utils');

router.get('/', wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM locations ORDER BY name');
  res.json({ data: rows });
}));

router.post('/', wrap(async (req, res) => {
  requireFields(req.body, ['name']);
  const { rows } = await pool.query('INSERT INTO locations (name) VALUES ($1) RETURNING *', [req.body.name.trim()]);
  res.status(201).json({ message: 'Lokasi berhasil ditambahkan', data: rows[0] });
}));

module.exports = router;
