require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const TARGET_LEVEL = 5;
const LEVELS = {
  literasi: { 1: 'Pemula', 2: 'Huruf', 3: 'Kata', 4: 'Paragraf', 5: 'Cerita' },
  numerasi: { 1: 'Pemula', 2: 'Angka 1-9', 3: 'Angka 10-99', 4: 'Pengurangan', 5: 'Pembagian' }
};

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/students', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nama wajib diisi' });
  const { data, error } = await supabase
    .from('students')
    .insert({ name: name.trim() })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/assessments', async (req, res) => {
  const { student_id, subject, level } = req.body;
  if (!student_id || !['literasi', 'numerasi'].includes(subject) || !(level >= 1 && level <= 5)) {
    return res.status(400).json({ error: 'Data tidak lengkap atau tidak valid' });
  }
  const { data, error } = await supabase
    .from('assessments')
    .insert({ student_id, subject, level })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/summary', async (req, res) => {
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name')
    .order('created_at', { ascending: true });
  if (studentsError) return res.status(500).json({ error: studentsError.message });

  const { data: assessments, error: assessError } = await supabase
    .from('assessments')
    .select('student_id, subject, level, created_at')
    .order('created_at', { ascending: true });
  if (assessError) return res.status(500).json({ error: assessError.message });

  const result = {
    literasi: buildSubjectSummary(students, assessments, 'literasi'),
    numerasi: buildSubjectSummary(students, assessments, 'numerasi')
  };
  res.json({ students, levels: LEVELS, target: TARGET_LEVEL, summary: result });
});

function buildSubjectSummary(students, assessments, subject) {
  const groups = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  const notAssessed = [];
  let atTarget = 0;

  for (const s of students) {
    const history = assessments.filter((a) => a.student_id === s.id && a.subject === subject);
    if (history.length === 0) {
      notAssessed.push(s.name);
      continue;
    }
    const last = history[history.length - 1];
    groups[last.level].push(s.name);
    if (last.level >= 5) atTarget += 1;
  }

  const tested = students.length - notAssessed.length;
  const pctAtTarget = tested > 0 ? Math.round((atTarget / tested) * 100) : null;

  return { groups, not_assessed: notAssessed, pct_at_target: pctAtTarget, tested_count: tested };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Tilik jalan di http://localhost:${PORT}`));