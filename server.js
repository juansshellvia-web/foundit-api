// Entry point untuk menjalankan secara lokal. Di Vercel dipakai api/index.js
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FoundIt! API berjalan di http://localhost:${PORT}`));
