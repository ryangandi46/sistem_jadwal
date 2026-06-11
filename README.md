# Sistem Jadwal Pelajaran — REST API

REST API untuk mengelola jadwal pelajaran sekolah, dibangun dengan **Node.js + Express.js + PostgreSQL** dan dioptimasi untuk deployment **Vercel Serverless**.

---

## Daftar Endpoint

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `POST` | `/api/schedules` | Tambah jadwal baru (dengan deteksi bentrok) | ✅ |
| `GET` | `/api/schedules` | List jadwal (filter: `class_code`, `date`, `teacher_nik`) | ✅ |
| `PUT` | `/api/schedules/:id` | Update jadwal (dengan deteksi bentrok) | ✅ |
| `DELETE` | `/api/schedules/:id` | Hapus jadwal | ✅ |
| `POST` | `/api/schedules/upload` | Import jadwal dari Excel (.xlsx) | ✅ |
| `GET` | `/api/schedules/export` | Export rekap JP ke Excel | ✅ |
| `GET` | `/api/schedules/student` | Jadwal harian siswa | ✅ |
| `GET` | `/api/schedules/teacher` | Jadwal guru per periode | ✅ |
| `GET` | `/api/schedules/report/rekap-jp` | Rekap JP semua guru | ✅ |

**Autentikasi:** Semua endpoint memerlukan header `x-api-key: SECRET123`

---

## Setup Lokal

```bash
# 1. Clone / masuk ke folder project
cd sistem_jadwal

# 2. Install dependencies
npm install

# 3. Salin file environment
cp .env.example .env
# Edit .env sesuai konfigurasi database PostgreSQL lokal Anda

# 4. Buat tabel di PostgreSQL
psql -U postgres -d sistem_jadwal -f schema.sql

# 5. Jalankan server
npm run dev
# Server berjalan di http://localhost:3000
```

---

## Setup Database — Neon.tech (Gratis)

[Neon](https://neon.tech) menyediakan PostgreSQL serverless gratis yang cocok digunakan bersama Vercel.

### Langkah-langkah:

1. **Daftar** di [https://neon.tech](https://neon.tech) (bisa pakai akun GitHub)
2. **Buat project baru** — pilih region terdekat (misal: Singapore `ap-southeast-1`)
3. **Buat database** bernama `sistem_jadwal`
4. **Salin connection string** dari dashboard Neon:
   - Klik project → klik **Connection Details**
   - Pilih format **Node.js** / **Connection String**
5. Connection string formatnya:

```
postgres://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require
```

Contoh:
```
postgres://rayen:AbCdEf123456@ep-cool-sunset-123456.ap-southeast-1.aws.neon.tech/sistem_jadwal?sslmode=require
```

6. **Jalankan schema.sql** melalui Neon SQL Editor:
   - Buka dashboard Neon → klik **SQL Editor**
   - Copy-paste isi file `schema.sql` → klik **Run**

---

## Deploy ke Vercel

### Prasyarat
- Akun [Vercel](https://vercel.com)
- [Vercel CLI](https://vercel.com/docs/cli) terinstall: `npm i -g vercel`

### Langkah Deploy

```bash
# 1. Login ke Vercel (pertama kali saja)
vercel login

# 2. Deploy ke production
vercel --prod
```

### Set Environment Variables di Vercel Dashboard

Buka **Vercel Dashboard → Project → Settings → Environment Variables**, lalu tambahkan:

| Variable | Value | Contoh |
|----------|-------|--------|
| `DATABASE_URL` | Connection string Neon | `postgres://user:pass@host/db?sslmode=require` |
| `API_KEY` | API key untuk autentikasi | `SECRET123` |
| `NODE_ENV` | Environment | `production` |

### Verifikasi `vercel.json`

File `vercel.json` sudah dikonfigurasi untuk me-route semua request ke Express entry point:

```json
{
  "version": 2,
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "api/index.js" }
  ]
}
```

---

## Postman Collection

File `postman_collection.json` sudah tersedia di root project.

### Cara Import:
1. Buka **Postman** → klik **Import**
2. Pilih file `postman_collection.json`
3. Ubah variable `base_url` sesuai URL Vercel Anda (misal: `https://sistem-jadwal.vercel.app`)
4. Variable `api_key` default: `SECRET123`

Header `x-api-key` otomatis di-set melalui **pre-request script** di collection level.

---

## Struktur Project

```
sistem_jadwal/
├── api/
│   └── index.js              ← Express entry point (Vercel serverless)
├── middleware/
│   └── auth.js               ← Middleware autentikasi x-api-key
├── routes/
│   └── schedules.js          ← Semua endpoint CRUD + Excel + View
├── services/
│   ├── scheduleService.js    ← Fungsi checkConflict (deteksi bentrok)
│   └── excelService.js       ← (reserved)
├── db.js                     ← Pool koneksi PostgreSQL
├── schema.sql                ← SQL pembuatan tabel
├── vercel.json               ← Konfigurasi routing Vercel
├── package.json              ← Dependencies & scripts
├── .env                      ← Variabel environment lokal
├── .env.example              ← Template variabel environment
├── postman_collection.json   ← Postman Collection (siap import)
└── README.md                 ← Dokumentasi ini
```
