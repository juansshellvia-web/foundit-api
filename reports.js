const router = require('express').Router();
const pool = require('../db');
const { HttpError, wrap, parseId, requireFields, REPORT_TYPES, REPORT_STATUSES, REPORT_SELECT } = require('../utils');

const statusError = () => new HttpError(400, `Status harus salah satu dari: ${REPORT_STATUSES.join(', ')}`);

const findReport = async (id) => {
  const { rows } = await pool.query(`${REPORT_SELECT} WHERE r.id = $1`, [id]);
  if (!rows.length) throw new HttpError(404, 'Laporan tidak ditemukan');
  return rows[0];
};

// tambahLaporanHilang() & tambahLaporanDitemukan()
const createReport = (type) =>
  wrap(async (req, res) => {
    const b = req.body;
    requireFields(b, ['user_id', 'category_id', 'location_id', 'item_name']);
    const status = type === 'hilang' ? 'masih_dicari' : 'sudah_ditemukan';
    const { rows } = await pool.query(
      `INSERT INTO reports (user_id, category_id, location_id, type, item_name, description, event_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()), $8) RETURNING *`,
      [b.user_id, b.category_id, b.location_id, type, b.item_name.trim(), b.description || null, b.event_time || null, status]
    );
    res.status(201).json({
      message: type === 'hilang' ? 'Laporan barang hilang berhasil ditambahkan' : 'Laporan barang ditemukan berhasil ditambahkan',
      data: rows[0],
    });
  });

router.post('/lost', createReport('hilang'));
router.post('/found', createReport('ditemukan'));

// getDataLaporan() + cariLaporanByKategori() lewat query string
router.get('/', wrap(async (req, res) => {
  const { type, status, category_id, location_id, user_id, q } = req.query;
  if (type && !REPORT_TYPES.includes(type)) throw new HttpError(400, `Nilai type harus salah satu dari: ${REPORT_TYPES.join(', ')}`);
  if (status && !REPORT_STATUSES.includes(status)) throw statusError();

  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const where = [];
  const params = [];
  const add = (cond, val) => {
    params.push(val);
    where.push(cond.replace(/\?/g, `$${params.length}`));
  };
  if (type) add('r.type = ?', type);
  if (status) add('r.status = ?', status);
  if (category_id) add('r.category_id = ?', parseId(category_id));
  if (location_id) add('r.location_id = ?', parseId(location_id));
  if (user_id) add('r.user_id = ?', parseId(user_id));
  if (q) add('(r.item_name ILIKE ? OR r.description ILIKE ?)', `%${q}%`);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = await pool.query(`SELECT COUNT(*)::int AS total FROM reports r ${whereSql}`, params);
  const { rows } = await pool.query(
    `${REPORT_SELECT} ${whereSql} ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  res.json({ data: rows, meta: { total: total.rows[0].total, limit, offset } });
}));

// getLaporanById()
router.get('/:id', wrap(async (req, res) => {
  res.json({ data: await findReport(parseId(req.params.id)) });
}));

// Ubah seluruh data laporan
router.put('/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const b = req.body;
  requireFields(b, ['category_id', 'location_id', 'item_name']);
  const { rows } = await pool.query(
    `UPDATE reports SET category_id = $1, location_id = $2, item_name = $3, description = $4,
            event_time = COALESCE($5::timestamptz, event_time), updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [b.category_id, b.location_id, b.item_name.trim(), b.description || null, b.event_time || null, id]
  );
  if (!rows.length) throw new HttpError(404, 'Laporan tidak ditemukan');
  res.json({ message: 'Laporan berhasil diperbarui', data: rows[0] });
}));

// updateStatusLaporan()
router.patch('/:id/status', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const { status } = req.body;
  if (!REPORT_STATUSES.includes(status)) throw statusError();
  const { rows } = await pool.query(
    'UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, id]
  );
  if (!rows.length) throw new HttpError(404, 'Laporan tidak ditemukan');
  res.json({ message: 'Status laporan berhasil diperbarui', data: rows[0] });
}));

// hapusLaporan()
router.delete('/:id', wrap(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM reports WHERE id = $1', [parseId(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Laporan tidak ditemukan');
  res.json({ message: 'Laporan berhasil dihapus' });
}));

// ---- Klaim atas laporan barang ditemukan ----
router.post('/:id/claims', wrap(async (req, res) => {
  const reportId = parseId(req.params.id);
  requireFields(req.body, ['claimer_id']);
  const report = await findReport(reportId);
  if (report.type !== 'ditemukan') throw new HttpError(400, 'Klaim hanya bisa diajukan untuk laporan barang yang ditemukan');
  if (Number(req.body.claimer_id) === report.user_id) throw new HttpError(400, 'Penemu barang tidak bisa mengklaim laporannya sendiri');
  try {
    const { rows } = await pool.query(
      'INSERT INTO claims (report_id, claimer_id, message) VALUES ($1, $2, $3) RETURNING *',
      [reportId, req.body.claimer_id, req.body.message || null]
    );
    res.status(201).json({ message: 'Klaim berhasil diajukan', data: rows[0] });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'Klaim untuk laporan ini sudah pernah diajukan oleh user tersebut');
    throw err;
  }
}));

router.get('/:id/claims', wrap(async (req, res) => {
  const reportId = parseId(req.params.id);
  await findReport(reportId);
  const { rows } = await pool.query(
    `SELECT cl.*, u.name AS claimer_name FROM claims cl JOIN users u ON u.id = cl.claimer_id
     WHERE cl.report_id = $1 ORDER BY cl.created_at`,
    [reportId]
  );
  res.json({ data: rows });
}));

module.exports = router;
