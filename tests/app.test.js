// Set VERCEL environment variable to prevent app.listen from starting the HTTP server
process.env.VERCEL = 'true';

const request = require('supertest');
const app = require('../api/index');
const db = require('../db');
const xlsx = require('xlsx');

// Mock db module
jest.mock('../db', () => {
  const mockQuery = jest.fn();
  const mockGetClient = jest.fn();
  return {
    query: mockQuery,
    getClient: mockGetClient,
    pool: {
      query: mockQuery,
    }
  };
});

// Mock xlsx module
jest.mock('xlsx', () => {
  const mockSheetToJson = jest.fn();
  const mockJsonToSheet = jest.fn();
  const mockBookNew = jest.fn();
  const mockBookAppendSheet = jest.fn();
  const mockWrite = jest.fn();
  const mockRead = jest.fn();

  return {
    read: mockRead,
    utils: {
      sheet_to_json: mockSheetToJson,
      json_to_sheet: mockJsonToSheet,
      book_new: mockBookNew,
      book_append_sheet: mockBookAppendSheet,
    },
    write: mockWrite,
  };
});

describe('Sistem Jadwal API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return 200 OK and HTML documentation landing page', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Sistem Jadwal Pelajaran');
    });
  });

  describe('Authentication Middleware', () => {
    it('should return 401 Unauthorized if x-api-key header is missing', async () => {
      const res = await request(app).get('/api/schedules');
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 Unauthorized if x-api-key header is incorrect', async () => {
      const res = await request(app)
        .get('/api/schedules')
        .set('x-api-key', 'WRONG_KEY');
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('should proceed if x-api-key header is correct', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const res = await request(app)
        .get('/api/schedules')
        .set('x-api-key', 'SECRET123');
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/schedules (Create Schedule)', () => {
    const validPayload = {
      class_code: 'XI-IPA1',
      class_name: 'XI IPA 1',
      subject_code: 'MTK',
      teacher_nik: '19820310',
      teacher_name: 'Drs. Hermawan',
      date: '2026-06-15',
      jam_ke: 2,
      time_start: '07:45:00',
      time_end: '08:30:00'
    };

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .set('x-api-key', 'SECRET123')
        .send({ class_code: 'XI-IPA1' }); // Missing other fields

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Semua field wajib diisi');
    });

    it('should return 409 if there is a class schedule conflict', async () => {
      // Mock class conflict check (first query returning rows)
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'existing-id-1',
          class_code: 'XI-IPA1',
          class_name: 'XI IPA 1',
          teacher_name: 'Drs. Hermawan',
          subject_code: 'MTK'
        }]
      });

      const res = await request(app)
        .post('/api/schedules')
        .set('x-api-key', 'SECRET123')
        .send(validPayload);

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe('Jadwal bentrok');
      expect(res.body.detail).toContain('sudah memiliki jadwal');
    });

    it('should return 409 if there is a teacher schedule conflict', async () => {
      // Mock class conflict check (first query empty, second query returning rows)
      db.query
        .mockResolvedValueOnce({ rows: [] }) // Class check
        .mockResolvedValueOnce({
          rows: [{
            id: 'existing-id-2',
            class_code: 'XI-IPA2',
            class_name: 'XI IPA 2',
            subject_code: 'MTK'
          }]
        }); // Teacher check

      const res = await request(app)
        .post('/api/schedules')
        .set('x-api-key', 'SECRET123')
        .send(validPayload);

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe('Jadwal bentrok');
      expect(res.body.detail).toContain('sudah mengajar');
    });

    it('should create schedule successfully and return 201', async () => {
      // Mock no conflict (both checks return empty)
      db.query
        .mockResolvedValueOnce({ rows: [] }) // Class check
        .mockResolvedValueOnce({ rows: [] }) // Teacher check
        .mockResolvedValueOnce({ rows: [{ id: 'new-uuid-123', ...validPayload }] }); // Insert query

      const res = await request(app)
        .post('/api/schedules')
        .set('x-api-key', 'SECRET123')
        .send(validPayload);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('new-uuid-123');
      expect(res.body.message).toBe('Jadwal berhasil ditambahkan');
    });
  });

  describe('GET /api/schedules (Retrieve Schedules)', () => {
    it('should retrieve schedules with optional query filters', async () => {
      const mockRows = [
        { id: '1', class_code: 'XI-IPA1', date: '2026-06-15', teacher_nik: '19820310' }
      ];
      db.query.mockResolvedValue({ rows: mockRows });

      const res = await request(app)
        .get('/api/schedules')
        .set('x-api-key', 'SECRET123')
        .query({ class_code: 'XI-IPA1', date: '2026-06-15', teacher_nik: '19820310' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data).toEqual(mockRows);

      // Verify db.query parameters
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('AND class_code = $1 AND date = $2 AND teacher_nik = $3'),
        ['XI-IPA1', '2026-06-15', '19820310']
      );
    });
  });

  describe('POST /api/schedules/upload (Upload/Import Excel)', () => {
    it('should return 400 if file is missing', async () => {
      const res = await request(app)
        .post('/api/schedules/upload')
        .set('x-api-key', 'SECRET123');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('File Excel (.xlsx) wajib dilampirkan');
    });

    it('should return 400 if file is empty', async () => {
      xlsx.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
      });
      xlsx.utils.sheet_to_json.mockReturnValue([]);

      const res = await request(app)
        .post('/api/schedules/upload')
        .set('x-api-key', 'SECRET123')
        .attach('file', Buffer.from('fake xlsx content'), 'test.xlsx');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('File Excel kosong');
    });

    it('should bulk insert schedules successfully', async () => {
      xlsx.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
      });
      xlsx.utils.sheet_to_json.mockReturnValue([
        {
          class_code: 'XI-IPA1',
          class_name: 'XI IPA 1',
          subject_code: 'MTK',
          teacher_nik: '19820310',
          teacher_name: 'Drs. Hermawan',
          date: '2026-06-15',
          jam_ke: 1,
          time_start: '07:00:00',
          time_end: '07:45:00'
        }
      ]);

      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      db.getClient.mockResolvedValue(mockClient);

      const res = await request(app)
        .post('/api/schedules/upload')
        .set('x-api-key', 'SECRET123')
        .attach('file', Buffer.from('fake xlsx content'), 'test.xlsx');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Upload sukses, 1 baris data ditambahkan');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO schedules'), expect.any(Array));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on insertion error', async () => {
      xlsx.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
      });
      xlsx.utils.sheet_to_json.mockReturnValue([{ class_code: 'XI-IPA1' }]);

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockRejectedValueOnce(new Error('Db write failed')), // INSERT
        release: jest.fn(),
      };
      db.getClient.mockResolvedValue(mockClient);

      const res = await request(app)
        .post('/api/schedules/upload')
        .set('x-api-key', 'SECRET123')
        .attach('file', Buffer.from('fake xlsx content'), 'test.xlsx');

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Gagal upload dan import data Excel');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('GET /api/schedules/export (Export Excel)', () => {
    it('should return 400 if start_date or end_date is missing', async () => {
      const res = await request(app)
        .get('/api/schedules/export')
        .set('x-api-key', 'SECRET123')
        .query({ start_date: '2026-06-15' }); // Missing end_date

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should export schedules to xlsx successfully', async () => {
      db.query.mockResolvedValue({
        rows: [
          {
            teacher_nik: '19820310',
            teacher_name: 'Drs. Hermawan',
            class_name: 'XI IPA 1',
            date: '2026-06-15', // 15th = week 3
            jam_ke: 1
          }
        ]
      });

      xlsx.write.mockReturnValue(Buffer.from('exported xlsx content'));

      const res = await request(app)
        .get('/api/schedules/export')
        .set('x-api-key', 'SECRET123')
        .query({ start_date: '2026-06-01', end_date: '2026-06-30' })
        .buffer(true)
        .parse((res, callback) => {
          let data = [];
          res.on('data', (chunk) => data.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(data)));
        });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('attachment; filename="rekap_jp.xlsx"');
      expect(res.body).toEqual(Buffer.from('exported xlsx content'));
    });
  });

  describe('GET /api/schedules/student (Student Schedule)', () => {
    it('should return 400 if class_code or date is missing', async () => {
      const res = await request(app)
        .get('/api/schedules/student')
        .set('x-api-key', 'SECRET123')
        .query({ class_code: 'XI-IPA1' }); // Missing date

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return student daily schedule successfully', async () => {
      db.query.mockResolvedValue({
        rows: [
          {
            class_name: 'XI IPA 1',
            subject_code: 'MTK',
            teacher_name: 'Drs. Hermawan',
            jam_ke: 1,
            time_start: '07:00:00',
            time_end: '07:45:00'
          }
        ]
      });

      const res = await request(app)
        .get('/api/schedules/student')
        .set('x-api-key', 'SECRET123')
        .query({ class_code: 'XI-IPA1', date: '2026-06-15' });

      expect(res.statusCode).toBe(200);
      expect(res.body.class_name).toBe('XI IPA 1');
      expect(res.body.date).toBe('2026-06-15');
      expect(res.body.jadwal.length).toBe(1);
      expect(res.body.jadwal[0].subject_code).toBe('MTK');
    });
  });

  describe('GET /api/schedules/teacher (Teacher Schedule)', () => {
    it('should return 400 if teacher_nik is missing', async () => {
      const res = await request(app)
        .get('/api/schedules/teacher')
        .set('x-api-key', 'SECRET123');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return teacher schedule successfully', async () => {
      db.query.mockResolvedValue({
        rows: [
          {
            date: '2026-06-15T00:00:00.000Z',
            class_name: 'XI IPA 1',
            subject_code: 'MTK',
            jam_ke: 1,
            time_start: '07:00:00',
            time_end: '07:45:00',
            teacher_name: 'Drs. Hermawan'
          }
        ]
      });

      const res = await request(app)
        .get('/api/schedules/teacher')
        .set('x-api-key', 'SECRET123')
        .query({ teacher_nik: '19820310', start_date: '2026-06-10', end_date: '2026-06-20' });

      expect(res.statusCode).toBe(200);
      expect(res.body.teacher_name).toBe('Drs. Hermawan');
      expect(res.body.total_jp).toBe(1);
      expect(res.body.jadwal.length).toBe(1);
    });
  });

  describe('GET /api/schedules/report/rekap-jp (JP Recap Report)', () => {
    it('should return 400 if start_date or end_date is missing', async () => {
      const res = await request(app)
        .get('/api/schedules/report/rekap-jp')
        .set('x-api-key', 'SECRET123');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return JP recap successfully', async () => {
      db.query.mockResolvedValue({
        rows: [
          {
            teacher_nik: '19820310',
            teacher_name: 'Drs. Hermawan',
            class_name: 'XI IPA 1',
            jumlah_jp: '5'
          }
        ]
      });

      const res = await request(app)
        .get('/api/schedules/report/rekap-jp')
        .set('x-api-key', 'SECRET123')
        .query({ start_date: '2026-06-01', end_date: '2026-06-30' });

      expect(res.statusCode).toBe(200);
      expect(res.body.total_pengajar).toBe(1);
      expect(res.body.rekap[0].teacher_name).toBe('Drs. Hermawan');
      expect(res.body.rekap[0].total_jp).toBe(5);
    });
  });

  describe('PUT /api/schedules/:id (Update Schedule)', () => {
    const validUpdatePayload = {
      class_code: 'XI-IPA1',
      class_name: 'XI IPA 1',
      subject_code: 'MTK',
      teacher_nik: '19820310',
      teacher_name: 'Drs. Hermawan',
      date: '2026-06-15',
      jam_ke: 2,
      time_start: '07:45:00',
      time_end: '08:30:00'
    };

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .put('/api/schedules/test-uuid-id')
        .set('x-api-key', 'SECRET123')
        .send({ class_code: 'XI-IPA1' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 409 if schedule conflict occurs', async () => {
      // Mock class conflict check (first query returning rows)
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'existing-id-1',
          class_code: 'XI-IPA1',
          class_name: 'XI IPA 1',
          teacher_name: 'Drs. Hermawan',
          subject_code: 'MTK'
        }]
      });

      const res = await request(app)
        .put('/api/schedules/test-uuid-id')
        .set('x-api-key', 'SECRET123')
        .send(validUpdatePayload);

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe('Jadwal bentrok');
    });

    it('should return 404 if schedule not found', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] }) // Class check
        .mockResolvedValueOnce({ rows: [] }) // Teacher check
        .mockResolvedValueOnce({ rows: [] }); // Update query returns empty rows

      const res = await request(app)
        .put('/api/schedules/non-existent-id')
        .set('x-api-key', 'SECRET123')
        .send(validUpdatePayload);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Jadwal tidak ditemukan');
    });

    it('should update schedule successfully', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] }) // Class check
        .mockResolvedValueOnce({ rows: [] }) // Teacher check
        .mockResolvedValueOnce({ rows: [{ id: 'test-uuid-id', ...validUpdatePayload }] }); // Update query returns updated schedule

      const res = await request(app)
        .put('/api/schedules/test-uuid-id')
        .set('x-api-key', 'SECRET123')
        .send(validUpdatePayload);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('test-uuid-id');
      expect(res.body.message).toBe('Jadwal berhasil diperbarui');
    });
  });

  describe('DELETE /api/schedules/:id (Delete Schedule)', () => {
    it('should return 404 if schedule not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .delete('/api/schedules/non-existent-id')
        .set('x-api-key', 'SECRET123');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Jadwal tidak ditemukan');
    });

    it('should delete schedule successfully', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'test-uuid-id' }] });

      const res = await request(app)
        .delete('/api/schedules/test-uuid-id')
        .set('x-api-key', 'SECRET123');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Jadwal berhasil dihapus');
    });
  });
});
