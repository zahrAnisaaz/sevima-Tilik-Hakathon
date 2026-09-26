async function loadSummary() {
  const res = await fetch('/api/summary');
  const data = await res.json();

  const select = document.getElementById('assessStudent');
  select.innerHTML = data.students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

  renderSubject('lit', data.summary.literasi, data.levels.literasi);
  renderSubject('num', data.summary.numerasi, data.levels.numerasi);
}

function renderSubject(prefix, summary, levelNames) {
  document.getElementById(prefix + 'Pct').textContent =
    summary.pct_at_target === null ? 'Belum ada data' : summary.pct_at_target + '%';

  const total = summary.tested_count || 1;
  const wrap = document.getElementById(prefix + 'Bars');
  let html = '';
  for (let lvl = 1; lvl <= 5; lvl++) {
    const names = summary.groups[lvl] || [];
    const pct = Math.round((names.length / total) * 100) || 0;
    html += `
      <div class="bar-wrap">
        <div class="bar-label">${lvl}. ${levelNames[lvl]}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="muted" style="width:40px; text-align:right">${names.length}</div>
      </div>`;
  }
  if (summary.not_assessed.length) {
    html += `<p class="muted">Belum dites: ${summary.not_assessed.join(', ')}</p>`;
  }
  wrap.innerHTML = html;
}

async function addStudent() {
  const input = document.getElementById('studentName');
  const name = input.value.trim();
  if (!name) return;
  await fetch('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  input.value = '';
  loadSummary();
}

async function saveAssessment() {
  const student_id = document.getElementById('assessStudent').value;
  const subject = document.getElementById('assessSubject').value;
  const level = Number(document.getElementById('assessLevel').value);
  const msg = document.getElementById('assessMsg');
  if (!student_id) { msg.textContent = 'Tambah siswa dulu.'; return; }

  const res = await fetch('/api/assessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id, subject, level })
  });
  if (res.ok) {
    msg.textContent = 'Tersimpan.';
    loadSummary();
  } else {
    msg.textContent = 'Gagal menyimpan.';
  }
}

loadSummary();