class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Bungkus handler async agar error otomatis diteruskan ke error handler
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const parseId = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new HttpError(400, 'ID harus berupa bilangan bulat positif');
  }
  return n;
};

const requireFields = (body, fields) => {
  const missing = fields.filter(
    (f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === ''
  );
  if (missing.length) {
    throw new HttpError(400, `Field ${missing.join(', ')} wajib diisi`);
  }
};

const REPORT_TYPES = ['hilang', 'ditemukan'];
const REPORT_STATUSES = ['masih_dicari', 'sudah_ditemukan', 'sudah_dikembalikan'];

// Query dasar laporan lengkap dengan nama user, kategori, dan lokasi
const REPORT_SELECT = `
  SELECT r.*, u.name AS user_name, c.name AS category_name, l.name AS location_name
  FROM reports r
  JOIN users u ON u.id = r.user_id
  JOIN categories c ON c.id = r.category_id
  JOIN locations l ON l.id = r.location_id`;

module.exports = { HttpError, wrap, parseId, requireFields, REPORT_TYPES, REPORT_STATUSES, REPORT_SELECT };
