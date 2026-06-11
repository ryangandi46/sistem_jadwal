const db = require('../db');

/**
 * Deteksi bentrok jadwal.
 * Cek apakah ada konflik kelas atau guru di tanggal & jam_ke yang sama.
 *
 * @param {string} class_code - Kode kelas
 * @param {string} teacher_nik - NIK guru
 * @param {string} date - Tanggal (YYYY-MM-DD)
 * @param {number} jam_ke - Jam pelajaran ke-
 * @param {string|null} excludeId - UUID jadwal yang dikecualikan (untuk update)
 * @returns {Promise<{conflict: boolean, detail: string|null}>}
 */
async function checkConflict(class_code, teacher_nik, date, jam_ke, excludeId = null) {
  // 1. Cek bentrok kelas: apakah kelas yang sama sudah punya jadwal di tanggal & jam_ke yang sama
  let classQuery = `
    SELECT id, class_code, class_name, teacher_name, subject_code
    FROM schedules
    WHERE class_code = $1 AND date = $2 AND jam_ke = $3
  `;
  const classParams = [class_code, date, jam_ke];

  if (excludeId) {
    classQuery += ` AND id != $4`;
    classParams.push(excludeId);
  }

  const classResult = await db.query(classQuery, classParams);

  if (classResult.rows.length > 0) {
    const existing = classResult.rows[0];
    return {
      conflict: true,
      detail: `Kelas ${class_code} sudah memiliki jadwal pada tanggal ${date} jam ke-${jam_ke} (${existing.subject_code} oleh ${existing.teacher_name})`
    };
  }

  // 2. Cek bentrok guru: apakah guru yang sama sudah mengajar di jam_ke & tanggal yang sama (di kelas manapun)
  let teacherQuery = `
    SELECT id, class_code, class_name, subject_code
    FROM schedules
    WHERE teacher_nik = $1 AND date = $2 AND jam_ke = $3
  `;
  const teacherParams = [teacher_nik, date, jam_ke];

  if (excludeId) {
    teacherQuery += ` AND id != $4`;
    teacherParams.push(excludeId);
  }

  const teacherResult = await db.query(teacherQuery, teacherParams);

  if (teacherResult.rows.length > 0) {
    const existing = teacherResult.rows[0];
    return {
      conflict: true,
      detail: `Guru (NIK: ${teacher_nik}) sudah mengajar di kelas ${existing.class_name} (${existing.class_code}) pada tanggal ${date} jam ke-${jam_ke}`
    };
  }

  return { conflict: false, detail: null };
}

module.exports = { checkConflict };
