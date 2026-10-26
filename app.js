const express = require('express');
const { HttpError } = require('./utils');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'FoundIt! API berjalan', version: '1.0.0' });
});

app.use('/users', require('./users'));
app.use('/categories', require('./categories'));
app.use('/locations', require('./locations'));
app.use('/reports', require('./reports'));
app.use('/claims', require('./claims'));

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Format JSON tidak valid' });

  switch (err.code) {
    case '23505':
      return res.status(409).json({ error: 'Data sudah ada (duplikat)' });
    case '23503':
      return /not present/.test(err.detail || '')
        ? res.status(400).json({ error: 'Data referensi (user/kategori/lokasi/laporan) tidak ditemukan' })
        : res.status(409).json({ error: 'Data masih dipakai oleh data lain sehingga tidak bisa dihapus' });
    case '23502':
      return res.status(400).json({ error: 'Ada field wajib yang kosong' });
    case '23514':
      return res.status(400).json({ error: 'Nilai salah satu field tidak valid' });
    case '22P02':
    case '22007':
    case '22008':
      return res.status(400).json({ error: 'Format data tidak valid' });
    default:
      console.error(err);
      return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
});

module.exports = app;
