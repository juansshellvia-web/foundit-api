const router = require('express').Router();
const pool = require('./db');
const { HttpError, wrap, parseId } = require('./utils');

// Setujui / tolak klaim. Jika disetujui, status laporan otomatis menjadi "sudah_dikembalikan".
router.patch('/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    throw new HttpError(400, "Field status harus 'approved' atau 'rejected'");
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('UPDATE claims SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    if (!rows.length) throw new HttpError(404, 'Klaim tidak ditemukan');
    if (status === 'approved') {
      await client.query(
        "UPDATE reports SET status = 'sudah_dikembalikan', updated_at = NOW() WHERE id = $1",
        [rows[0].report_id]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Status klaim berhasil diperbarui', data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
