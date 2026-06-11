const express = require('express');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for frontend clients
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-api-key'
  );
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Root route: Beautiful dynamic glassmorphism documentation landing page
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sistem Jadwal API - REST API Documentation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f0c1b 0%, #15102a 50%, #06020f 100%);
      --accent-purple: #8b5cf6;
      --accent-pink: #d946ef;
      --accent-cyan: #06b6d4;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --glass-bg: rgba(255, 255, 255, 0.03);
      --glass-border: rgba(255, 255, 255, 0.06);
      --glass-glow: 0 8px 32px 0 rgba(139, 92, 246, 0.1);
      --font-heading: 'Outfit', sans-serif;
      --font-body: 'Plus Jakarta Sans', sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: var(--bg-gradient);
      color: var(--text-main);
      font-family: var(--font-body);
      min-height: 100vh;
      overflow-x: hidden;
      padding: 2rem 1rem;
      line-height: 1.6;
    }

    .glow-sphere {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      z-index: -1;
      opacity: 0.3;
    }
    .sphere-1 {
      top: -10%;
      left: -10%;
      width: 400px;
      height: 400px;
      background: var(--accent-purple);
    }
    .sphere-2 {
      bottom: -10%;
      right: -10%;
      width: 500px;
      height: 500px;
      background: var(--accent-pink);
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      position: relative;
    }

    header {
      text-align: center;
      margin-bottom: 3rem;
      animation: fadeInDown 0.8s ease-out;
    }

    h1 {
      font-family: var(--font-heading);
      font-size: 3rem;
      font-weight: 800;
      background: linear-gradient(to right, #ffffff, #c084fc, #f472b6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
      letter-spacing: -0.025em;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      background: rgba(139, 92, 246, 0.15);
      color: #c084fc;
      border: 1px solid rgba(139, 92, 246, 0.3);
      margin-bottom: 1.5rem;
    }

    .status-container {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin-top: 1rem;
      font-size: 0.9rem;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      padding: 0.5rem 1rem;
      border-radius: 12px;
      backdrop-filter: blur(8px);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
    }

    .card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      padding: 2.5rem;
      box-shadow: var(--glass-glow);
      margin-bottom: 2rem;
      transition: transform 0.3s ease, border-color 0.3s ease;
    }

    .card:hover {
      border-color: rgba(139, 92, 246, 0.3);
    }

    h2 {
      font-family: var(--font-heading);
      font-size: 1.75rem;
      margin-bottom: 1.5rem;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .endpoint-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 0.75rem;
      margin-top: 1rem;
    }

    .endpoint-row {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 12px;
      transition: background 0.2s ease, transform 0.2s ease;
    }

    .endpoint-row:hover {
      background: rgba(255, 255, 255, 0.04);
      transform: translateX(4px);
    }

    .endpoint-cell {
      padding: 1rem;
      border-top: 1px solid var(--glass-border);
      border-bottom: 1px solid var(--glass-border);
    }

    .endpoint-cell:first-child {
      border-left: 1px solid var(--glass-border);
      border-top-left-radius: 12px;
      border-bottom-left-radius: 12px;
      width: 120px;
    }

    .endpoint-cell:last-child {
      border-right: 1px solid var(--glass-border);
      border-top-right-radius: 12px;
      border-bottom-right-radius: 12px;
    }

    .method {
      display: inline-block;
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 0.8rem;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      text-transform: uppercase;
      text-align: center;
      min-width: 70px;
      letter-spacing: 0.05em;
    }

    .method.get { background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); border: 1px solid rgba(6, 182, 212, 0.3); }
    .method.post { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    .method.put { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .method.delete { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }

    .path {
      font-family: monospace;
      font-size: 1rem;
      color: #fff;
      font-weight: 600;
    }

    .desc {
      font-size: 0.9rem;
      color: var(--text-muted);
    }

    .auth-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      background: rgba(217, 70, 239, 0.15);
      color: #f472b6;
      border: 1px solid rgba(217, 70, 239, 0.3);
      font-weight: 500;
    }

    footer {
      text-align: center;
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid var(--glass-border);
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }
      h1 {
        font-size: 2.25rem;
      }
      .card {
        padding: 1.5rem;
      }
      .endpoint-table, .endpoint-row, .endpoint-cell {
        display: block;
      }
      .endpoint-cell {
        border: none !important;
        padding: 0.5rem 0;
      }
      .endpoint-cell:first-child {
        padding-top: 1rem;
      }
      .endpoint-cell:last-child {
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--glass-border) !important;
      }
    }
  </style>
</head>
<body>
  <div class="glow-sphere sphere-1"></div>
  <div class="glow-sphere sphere-2"></div>

  <div class="container">
    <header>
      <span class="badge">Node.js • Express • Vercel Serverless</span>
      <h1>Sistem Jadwal Pelajaran</h1>
      <p style="color: var(--text-muted); font-size: 1.1rem; max-width: 600px; margin: 0 auto 1.5rem;">
        REST API untuk mengelola jadwal pelajaran sekolah dengan dukungan integrasi file Excel.
      </p>
      
      <div class="status-container">
        <div class="status-item">
          <span class="status-indicator"></span>
          <span>API Status: Online</span>
        </div>
        <div class="status-item">
          <span class="status-indicator" style="background: #a855f7; box-shadow: 0 0 10px #a855f7;"></span>
          <span>Engine: Vercel Serverless</span>
        </div>
      </div>
    </header>

    <main>
      <div class="card">
        <h2>⚡ Dokumentasi Endpoint API</h2>
        <table class="endpoint-table">
          <tr class="endpoint-row">
            <td class="endpoint-cell"><span class="method get">GET</span></td>
            <td class="endpoint-cell"><span class="path">/schedules</span></td>
            <td class="endpoint-cell"><span class="desc">Mengambil daftar seluruh jadwal pelajaran. Filter query: <code>day</code>, <code>class_name</code>, <code>teacher</code></span></td>
          </tr>
          <tr class="endpoint-row">
            <td class="endpoint-cell"><span class="method get">GET</span></td>
            <td class="endpoint-cell"><span class="path">/schedules/:id</span></td>
            <td class="endpoint-cell"><span class="desc">Mengambil rincian detail satu jadwal pelajaran berdasarkan ID</span></td>
          </tr>
          <tr class="endpoint-row">
            <td class="endpoint-cell"><span class="method post">POST</span></td>
            <td class="endpoint-cell"><span class="path">/schedules</span> <span class="auth-badge">Auth</span></td>
            <td class="endpoint-cell"><span class="desc">Membuat data jadwal pelajaran baru</span></td>
          </tr>
          <tr class="endpoint-row">
            <td class="endpoint-cell"><span class="method put">PUT</span></td>
            <td class="endpoint-cell"><span class="path">/schedules/:id</span> <span class="auth-badge">Auth</span></td>
            <td class="endpoint-cell"><span class="desc">Mengubah data jadwal pelajaran yang ada</span></td>
          </tr>
          <tr class="endpoint-row">
            <td class="endpoint-cell"><span class="method delete">DELETE</span></td>
            <td class="endpoint-cell"><span class="path">/schedules/:id</span> <span class="auth-badge">Auth</span></td>
            <td class="endpoint-cell"><span class="desc">Menghapus jadwal pelajaran berdasarkan ID</span></td>
          </tr>
          <tr class="endpoint-row">
            <td class="endpoint-cell"><span class="method post">POST</span></td>
            <td class="endpoint-cell"><span class="path">/schedules/import</span> <span class="auth-badge">Auth</span></td>
            <td class="endpoint-cell"><span class="desc">Mengimpor daftar jadwal secara massal dari file Excel (.xlsx / .xls)</span></td>
          </tr>
          <tr class="endpoint-row">
            <td class="endpoint-cell"><span class="method get">GET</span></td>
            <td class="endpoint-cell"><span class="path">/schedules/export</span></td>
            <td class="endpoint-cell"><span class="desc">Mengekspor daftar jadwal ke file Excel siap unduh</span></td>
          </tr>
        </table>
      </div>

      <div class="card" style="margin-bottom: 0;">
        <h2>🔐 Keamanan & Autentikasi</h2>
        <p style="color: var(--text-muted); margin-bottom: 1rem;">
          Untuk mengakses endpoint bertanda <span class="auth-badge">Auth</span>, sertakan salah satu autentikasi berikut di dalam header request:
        </p>
        <div style="background: rgba(0,0,0,0.2); padding: 1.25rem; border-radius: 12px; font-family: monospace; font-size: 0.9rem; border: 1px solid var(--glass-border);">
          <div style="margin-bottom: 0.5rem; color: #fff;"><span style="color: var(--accent-pink);">// Opsi 1: API Key Header</span><br>x-api-key: <span style="color: #c084fc;">[API_KEY_ANDA]</span></div>
          <div style="color: #fff;"><span style="color: var(--accent-pink);">// Opsi 2: JWT Bearer Token</span><br>Authorization: Bearer <span style="color: #c084fc;">[TOKEN_JWT_ANDA]</span></div>
        </div>
      </div>
    </main>

    <footer>
      <p>&copy; 2026 Sistem Jadwal API. Built for modern scalability on Vercel Serverless.</p>
    </footer>
  </div>
</body>
</html>`);
});

// Import Router
const schedulesRouter = require('../routes/schedules');
app.use('/api/schedules', schedulesRouter);

// Global Error Handler — format konsisten: { "error": "...", "detail": "..." }
app.use((err, req, res, next) => {
  console.error('[System Error]:', err.stack || err.message);

  // Multer file upload errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: 'File upload error',
      detail: err.message
    });
  }

  // Custom errors dengan status code
  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    detail: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Local HTTP listener (only runs when executed locally outside of Vercel serverless context)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[Local Server] Running at: http://localhost:${PORT}`);
  });
}

module.exports = app;
