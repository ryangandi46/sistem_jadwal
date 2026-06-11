-- =====================================================
-- SQL Schema: Sistem Jadwal Pelajaran (PostgreSQL)
-- =====================================================

CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_code VARCHAR(10),
    class_name VARCHAR(10),
    subject_code VARCHAR(10),
    teacher_nik VARCHAR(20),
    teacher_name VARCHAR(100),
    date DATE,
    jam_ke INTEGER,
    time_start TIME,
    time_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk filter query yang sering dipakai
CREATE INDEX IF NOT EXISTS idx_schedules_class_code ON schedules(class_code);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher_nik ON schedules(teacher_nik);
