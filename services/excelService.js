const xlsx = require('xlsx');

/**
 * Service to handle Excel import and export operations using the 'xlsx' library.
 */
class ExcelService {
  /**
   * Parse Excel file buffer to JSON array of schedule objects.
   * @param {Buffer} buffer - File buffer from multer
   * @returns {Array<Object>} List of schedule objects parsed from the sheet
   */
  parseScheduleExcel(buffer) {
    // Read the workbook from binary buffer
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    // Get the first sheet name
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert sheet rows to JSON
    // header: 1 returns array of arrays, default returns array of objects with keys mapped to column titles
    const rawData = xlsx.utils.sheet_to_json(worksheet);
    
    // Normalize properties mapping (e.g. lowercase, remove spaces)
    return rawData.map(row => ({
      class_name: row['Class'] || row['class_name'] || row['Kelas'] || null,
      subject: row['Subject'] || row['subject'] || row['Mata Pelajaran'] || null,
      teacher: row['Teacher'] || row['teacher'] || row['Guru'] || null,
      day: row['Day'] || row['day'] || row['Hari'] || null,
      start_time: row['Start Time'] || row['start_time'] || row['Jam Mulai'] || null,
      end_time: row['End Time'] || row['end_time'] || row['Jam Selesai'] || null,
      room: row['Room'] || row['room'] || row['Ruangan'] || null,
    }));
  }

  /**
   * Generate Excel buffer from schedules database rows.
   * @param {Array<Object>} schedules - Array of schedule objects
   * @returns {Buffer} Output xlsx binary buffer
   */
  generateScheduleExcel(schedules) {
    // Format db rows to readable column headers
    const formattedData = schedules.map((s, index) => ({
      'No': index + 1,
      'Class': s.class_name,
      'Subject': s.subject,
      'Teacher': s.teacher,
      'Day': s.day,
      'Start Time': s.start_time,
      'End Time': s.end_time,
      'Room': s.room || '-',
    }));

    // Create worksheet
    const worksheet = xlsx.utils.json_to_sheet(formattedData);
    
    // Create new workbook and append sheet
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Jadwal Pelajaran');
    
    // Write buffer options
    const excelBuffer = xlsx.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true
    });
    
    return excelBuffer;
  }
}

module.exports = new ExcelService();
