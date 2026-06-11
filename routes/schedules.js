const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { checkConflict } = require('../services/scheduleService');

// Multer: memory storage (Vercel filesystem is read-only)
const upload = multer({ storage: multer.memoryStorage() });

// Semua endpoint pakai middleware auth
router.use(authMiddleware);

/**
 * POST /api/schedules
 * Tambah jadwal baru. Validasi field wajib.
 */
router.post('/', async (req, res) => {
  try {
    const {
      class_code, class_name, subject_code,
      teacher_nik, teacher_name, date,
      jam_ke, time_start, time_end
    } = req.body;

    // Validasi field wajib
    if (!class_code || !class_name || !subject_code || !teacher_nik || !teacher_name || !date || !jam_ke || !time_start || !time_end) {
      return res.status(400).json({
        success: false,
        message: 'Semua field wajib diisi: class_code, class_name, subject_code, teacher_nik, teacher_name, date, jam_ke, time_start, time_end'
      });
    }

    // Deteksi bentrok jadwal
    const conflict = await checkConflict(class_code, teacher_nik, date, jam_ke);
    if (conflict.conflict) {
      return res.status(409).json({
        error: 'Jadwal bentrok',
        detail: conflict.detail
      });
    }

    const queryText = `
      INSERT INTO schedules (class_code, class_name, subject_code, teacher_nik, teacher_name, date, jam_ke, time_start, time_end)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const params = [class_code, class_name, subject_code, teacher_nik, teacher_name, date, jam_ke, time_start, time_end];

    const { rows } = await db.query(queryText, params);

    res.status(201).json({
      success: true,
      message: 'Jadwal berhasil ditambahkan',
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan jadwal',
      error: error.message
    });
  }
});

/**
 * GET /api/schedules
 * Ambil semua jadwal. Support query param: class_code, date, teacher_nik
 */
router.get('/', async (req, res) => {
  try {
    const { class_code, date, teacher_nik } = req.query;

    let queryText = 'SELECT * FROM schedules WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (class_code) {
      queryText += ` AND class_code = $${paramIndex}`;
      params.push(class_code);
      paramIndex++;
    }

    if (date) {
      queryText += ` AND date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    if (teacher_nik) {
      queryText += ` AND teacher_nik = $${paramIndex}`;
      params.push(teacher_nik);
      paramIndex++;
    }

    queryText += ' ORDER BY date ASC, jam_ke ASC';

    const { rows } = await db.query(queryText, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data jadwal',
      error: error.message
    });
  }
});

/**
 * POST /api/schedules/upload
 * Upload file Excel .xlsx, parse, dan bulk insert ke database.
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File Excel (.xlsx) wajib dilampirkan pada field "file"'
      });
    }

    // Parse Excel buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File Excel kosong atau format tidak sesuai'
      });
    }

    // Bulk insert menggunakan parameterized query
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO schedules (class_code, class_name, subject_code, teacher_nik, teacher_name, date, jam_ke, time_start, time_end)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      for (const row of rows) {
        await client.query(insertQuery, [
          row.class_code,
          row.class_name,
          row.subject_code,
          row.teacher_nik,
          row.teacher_name,
          row.date,
          row.jam_ke,
          row.time_start,
          row.time_end
        ]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: `Upload sukses, ${rows.length} baris data ditambahkan.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal upload dan import data Excel',
      error: error.message
    });
  }
});

/**
 * GET /api/schedules/export
 * Export rekap JP per guru per pekan ke file Excel.
 * Query param: start_date, end_date (format YYYY-MM-DD)
 */
router.get('/export', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter start_date dan end_date wajib diisi (format YYYY-MM-DD)'
      });
    }

    // Ambil semua data dalam range tanggal
    const queryText = `
      SELECT * FROM schedules
      WHERE date >= $1 AND date <= $2
      ORDER BY teacher_nik ASC, date ASC, jam_ke ASC
    `;
    const { rows } = await db.query(queryText, [start_date, end_date]);

    // Group by teacher_nik
    const teacherMap = {};
    for (const row of rows) {
      const nik = row.teacher_nik;
      if (!teacherMap[nik]) {
        teacherMap[nik] = {
          teacher_nik: nik,
          teacher_name: row.teacher_name,
          classes: new Set(),
          weeks: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      teacherMap[nik].classes.add(row.class_name);

      // Hitung pekan berdasarkan tanggal dalam bulan
      // Pekan 1 = tgl 1-7, Pekan 2 = tgl 8-14, dst.
      const dayOfMonth = new Date(row.date).getDate();
      const weekNumber = Math.min(Math.ceil(dayOfMonth / 7), 5);
      teacherMap[nik].weeks[weekNumber] += 1; // 1 JP per baris jadwal
    }

    // Bangun data untuk sheet Excel
    const excelData = [];
    let no = 1;
    for (const nik of Object.keys(teacherMap)) {
      const t = teacherMap[nik];
      const totalJP = t.weeks[1] + t.weeks[2] + t.weeks[3] + t.weeks[4] + t.weeks[5];
      excelData.push({
        'No': no++,
        'NIK': t.teacher_nik,
        'Nama Pengajar': t.teacher_name,
        'Kelas yg Diajar': Array.from(t.classes).join(', '),
        'Pekan 1': t.weeks[1],
        'Pekan 2': t.weeks[2],
        'Pekan 3': t.weeks[3],
        'Pekan 4': t.weeks[4],
        'Pekan 5': t.weeks[5],
        'Total JP': totalJP
      });
    }

    // Generate Excel buffer (tanpa fs.writeFile)
    const ws = xlsx.utils.json_to_sheet(excelData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Rekap JP');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Kirim langsung sebagai response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="rekap_jp.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengekspor rekap JP',
      error: error.message
    });
  }
});

/**
 * GET /api/schedules/student
 * Jadwal harian untuk siswa berdasarkan kelas.
 * Query params: class_code (wajib), date (wajib, YYYY-MM-DD)
 */
router.get('/student', async (req, res) => {
  try {
    const { class_code, date } = req.query;

    if (!class_code || !date) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter class_code dan date wajib diisi'
      });
    }

    const queryText = `
      SELECT class_name, subject_code, teacher_name, jam_ke, time_start, time_end
      FROM schedules
      WHERE class_code = $1 AND date = $2
      ORDER BY jam_ke ASC
    `;
    const { rows } = await db.query(queryText, [class_code, date]);

    // Ambil class_name dari baris pertama (semua baris class_code sama)
    const className = rows.length > 0 ? rows[0].class_name : null;

    const jadwal = rows.map(r => ({
      jam_ke: r.jam_ke,
      subject_code: r.subject_code,
      teacher_name: r.teacher_name,
      time_start: r.time_start,
      time_end: r.time_end
    }));

    res.json({
      class_name: className,
      date: date,
      jadwal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil jadwal siswa',
      error: error.message
    });
  }
});

/**
 * GET /api/schedules/teacher
 * Jadwal mengajar guru dalam periode tertentu.
 * Query params: teacher_nik (wajib), start_date, end_date
 */
router.get('/teacher', async (req, res) => {
  try {
    const { teacher_nik, start_date, end_date } = req.query;

    if (!teacher_nik) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter teacher_nik wajib diisi'
      });
    }

    let queryText = `
      SELECT date, class_name, subject_code, jam_ke, time_start, time_end, teacher_name
      FROM schedules
      WHERE teacher_nik = $1
    `;
    const params = [teacher_nik];
    let paramIndex = 2;

    if (start_date) {
      queryText += ` AND date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      queryText += ` AND date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    queryText += ' ORDER BY date ASC, jam_ke ASC';

    const { rows } = await db.query(queryText, params);

    const teacherName = rows.length > 0 ? rows[0].teacher_name : null;

    const jadwal = rows.map(r => ({
      date: r.date,
      class_name: r.class_name,
      subject_code: r.subject_code,
      jam_ke: r.jam_ke,
      time_start: r.time_start,
      time_end: r.time_end
    }));

    res.json({
      teacher_name: teacherName,
      periode: {
        start_date: start_date || null,
        end_date: end_date || null
      },
      total_jp: rows.length,
      jadwal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil jadwal guru',
      error: error.message
    });
  }
});

/**
 * GET /api/schedules/report/rekap-jp
 * Rekap JP semua pengajar dalam periode tertentu, grouped by teacher.
 * Query params: start_date, end_date
 */
router.get('/report/rekap-jp', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter start_date dan end_date wajib diisi (format YYYY-MM-DD)'
      });
    }

    const queryText = `
      SELECT teacher_nik, teacher_name, class_name, COUNT(*) AS jumlah_jp
      FROM schedules
      WHERE date >= $1 AND date <= $2
      GROUP BY teacher_nik, teacher_name, class_name
      ORDER BY teacher_nik, class_name
    `;
    const { rows } = await db.query(queryText, [start_date, end_date]);

    // Group by teacher_nik
    const teacherMap = {};
    for (const row of rows) {
      const nik = row.teacher_nik;
      if (!teacherMap[nik]) {
        teacherMap[nik] = {
          teacher_nik: nik,
          teacher_name: row.teacher_name,
          total_jp: 0,
          detail: []
        };
      }
      const jp = parseInt(row.jumlah_jp, 10);
      teacherMap[nik].total_jp += jp;
      teacherMap[nik].detail.push({
        class_name: row.class_name,
        jumlah_jp: jp
      });
    }

    // Convert to array dan hitung total_kelas, sort by total_jp DESC
    const rekap = Object.values(teacherMap)
      .map(t => ({
        teacher_nik: t.teacher_nik,
        teacher_name: t.teacher_name,
        total_jp: t.total_jp,
        total_kelas: t.detail.length,
        detail: t.detail
      }))
      .sort((a, b) => b.total_jp - a.total_jp);

    res.json({
      periode: { start_date, end_date },
      total_pengajar: rekap.length,
      rekap
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil rekap JP',
      error: error.message
    });
  }
});

/**
 * PUT /api/schedules/:id
 * Update jadwal by UUID
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      class_code, class_name, subject_code,
      teacher_nik, teacher_name, date,
      jam_ke, time_start, time_end
    } = req.body;

    if (!class_code || !class_name || !subject_code || !teacher_nik || !teacher_name || !date || !jam_ke || !time_start || !time_end) {
      return res.status(400).json({
        success: false,
        message: 'Semua field wajib diisi untuk update'
      });
    }

    // Deteksi bentrok jadwal (excludeId = id yang sedang diupdate)
    const conflict = await checkConflict(class_code, teacher_nik, date, jam_ke, id);
    if (conflict.conflict) {
      return res.status(409).json({
        error: 'Jadwal bentrok',
        detail: conflict.detail
      });
    }

    const queryText = `
      UPDATE schedules
      SET class_code = $1, class_name = $2, subject_code = $3,
          teacher_nik = $4, teacher_name = $5, date = $6,
          jam_ke = $7, time_start = $8, time_end = $9,
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `;
    const params = [class_code, class_name, subject_code, teacher_nik, teacher_name, date, jam_ke, time_start, time_end, id];

    const { rows } = await db.query(queryText, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Jadwal tidak ditemukan'
      });
    }

    res.json({
      success: true,
      message: 'Jadwal berhasil diperbarui',
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui jadwal',
      error: error.message
    });
  }
});

/**
 * DELETE /api/schedules/:id
 * Hapus jadwal by UUID
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const queryText = 'DELETE FROM schedules WHERE id = $1 RETURNING id';
    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Jadwal tidak ditemukan'
      });
    }

    res.json({
      success: true,
      message: 'Jadwal berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus jadwal',
      error: error.message
    });
  }
});

module.exports = router;
