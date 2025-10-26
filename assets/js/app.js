// /assets/js/app.js
/* Minimal docs for future you:
   - Data persisted in localStorage under KEY.
   - Import replaces all; Export includes metadata.
   - Editing disabled after lock-in to honor "cannot pick twice".
*/
const KEY = 'positionsTracker.v1';

const seedEntries = [
  // Seed your provided history (YYYY-MM-DD)
  { date: '2025-10-19', number: 213 },
  { date: '2025-10-20', number: 112 },
  { date: '2025-10-21', number: 189 },
  { date: '2025-10-22', number: 26  },
  { date: '2025-10-23', number: 333 },
  { date: '2025-10-24', number: 188 },
  { date: '2025-10-25', number: 222 },
];

const state = {
  entries: [],
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(), // 0-11
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    state.entries = seedEntries.slice();
    save(); // initialize
  } else {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.entries)) throw new Error('Bad shape');
      state.entries = parsed.entries;
    } catch {
      state.entries = seedEntries.slice();
      save();
    }
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify({ entries: state.entries }));
}

function fmtDate(d) {
  return d.toISOString().slice(0,10);
}
function todayLocalISO() {
  const d = new Date();
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  const local = new Date(d - tzOffsetMs);
  return local.toISOString().slice(0,10);
}
function monthLabel(year, monthIdx) {
  return new Date(year, monthIdx, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
}
function daysInMonth(year, monthIdx) {
  return new Date(year, monthIdx + 1, 0).getDate();
}
function usedNumbersMap() {
  const map = new Map();
  for (const e of state.entries) map.set(e.number, e.date);
  return map;
}
function dateToEntryMap() {
  const map = new Map();
  for (const e of state.entries) map.set(e.date, e.number);
  return map;
}
function isValidNumber(n) {
  return Number.isInteger(n) && n >= 1 && n <= 365;
}

function renderHeader() {
  $('#monthLabel').textContent = monthLabel(state.viewYear, state.viewMonth);
  const todayISO = todayLocalISO();
  const now = new Date();
  $('#todayChip').textContent = `Today: ${todayISO} (${now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})`;
  // Prefill form with today
  $('#dateInput').value = todayISO;
}

function renderCalendar() {
  const grid = $('#calendarGrid');
  grid.innerHTML = '';

  const firstDay = new Date(state.viewYear, state.viewMonth, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Mon=0 ... Sun=6
  // For simplicity keep Sun-first UI; using startWeekday = firstDay.getDay();

  const days = daysInMonth(state.viewYear, state.viewMonth);
  const dateMap = dateToEntryMap();
  const todayISO = todayLocalISO();

  // Weekday header
  const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  for (const wd of weekdays) {
    const head = document.createElement('div');
    head.className = 'calendar-cell disabled';
    head.style.minHeight = 'auto';
    head.innerHTML = `<div class="date" style="font-weight:600">${wd}</div>`;
    grid.appendChild(head);
  }

  // Leading blanks
  for (let i=0;i<firstDay.getDay();i++){
    const blank = document.createElement('div');
    blank.className = 'calendar-cell disabled';
    grid.appendChild(blank);
  }

  for (let day=1; day<=days; day++) {
    const dateISO = `${state.viewYear}-${String(state.viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const number = dateMap.get(dateISO);
    const isToday = dateISO === todayISO;

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-cell ' + (number ? 'picked' : 'available');
    if (isToday) cell.classList.add('today');
    cell.setAttribute('aria-label', number ? `Day ${day}, picked ${number}` : `Day ${day}, available`);
    cell.innerHTML = `
      <div class="date">${day}</div>
      ${number ? `<div class="badge">#${number}</div>` : ''}
    `;
    cell.addEventListener('click', () => {
      // Focus that date in the form; prevent editing if already picked
      $('#dateInput').value = dateISO;
      if (!number) $('#numberInput').focus();
    });
    grid.appendChild(cell);
  }
}

function renderProgress() {
  const used = usedNumbersMap();
  $('#picksCount').textContent = used.size;
  $('#remainingCount').textContent = 365 - used.size;

  if (state.entries.length) {
    const last = [...state.entries].sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
    $('#lastPicked').textContent = `${last.date} → #${last.number}`;
  } else {
    $('#lastPicked').textContent = '—';
  }

  // Used numbers list
  const sorted = [...state.entries].sort((a,b)=>a.number-b.number);
  const container = $('#usedNumbers');
  container.innerHTML = sorted.length
    ? sorted.map(e => `<code>#${String(e.number).padStart(3,'0')}</code> <small>(${e.date})</small>`).join('<br/>')
    : '<small>No picks yet.</small>';
}

function showDuplicateHint(n) {
  const hint = $('#duplicateHint');
  const used = usedNumbersMap();
  if (!n) { hint.textContent = ''; hint.className = 'hint'; return; }
  if (!isValidNumber(n)) { hint.textContent = 'Enter a number between 1 and 365.'; hint.className = 'hint error'; return; }
  if (used.has(n)) {
    hint.textContent = `#${n} already used on ${used.get(n)}. Pick a different number.`;
    hint.className = 'hint error';
  } else {
    hint.textContent = `#${n} is available.`;
    hint.className = 'hint ok';
  }
}

function bindEvents() {
  $('#prevMonthBtn').addEventListener('click', () => {
    const m = state.viewMonth - 1;
    if (m < 0) { state.viewMonth = 11; state.viewYear -= 1; } else state.viewMonth = m;
    renderCalendar();
  });
  $('#nextMonthBtn').addEventListener('click', () => {
    const m = state.viewMonth + 1;
    if (m > 11) { state.viewMonth = 0; state.viewYear += 1; } else state.viewMonth = m;
    renderCalendar();
  });
  $('#goTodayBtn').addEventListener('click', () => {
    const now = new Date();
    state.viewYear = now.getFullYear();
    state.viewMonth = now.getMonth();
    $('#dateInput').value = todayLocalISO();
    renderHeader(); renderCalendar();
  });

  $('#numberInput').addEventListener('input', (e) => {
    const n = parseInt(e.target.value, 10);
    showDuplicateHint(n);
  });

  $('#pickForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = $('#dateInput').value;
    const n = parseInt($('#numberInput').value, 10);

    // Guard rails
    if (!date) return alert('Select a date.');
    if (!isValidNumber(n)) return alert('Enter a valid number (1–365).');

    const used = usedNumbersMap();
    if (used.has(n)) return alert(`#${n} already used on ${used.get(n)}.`);

    const dateMap = dateToEntryMap();
    if (dateMap.has(date)) return alert(`This date (${date}) already has a pick (#${dateMap.get(date)}).`);

    const ok = confirm(`Lock in #${n} for ${date}? This cannot be edited later.`);
    if (!ok) return;

    state.entries.push({ date, number: n });
    save();
    // Clear number but keep date for next action
    $('#numberInput').value = '';
    showDuplicateHint(undefined);

    // Jump calendar to month of selected date for visual feedback
    const d = new Date(date);
    state.viewYear = d.getFullYear();
    state.viewMonth = d.getMonth();

    renderHeader(); renderCalendar(); renderProgress();
  });

  $('#exportBtn').addEventListener('click', () => {
    const payload = {
      meta: { exportedAt: new Date().toISOString(), app: '365-positions-tracker', version: 1 },
      entries: state.entries,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'positions-tracker-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#importInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json?.entries)) throw new Error('Invalid file: missing entries[]');

      // Validate shape and uniqueness
      const seenNums = new Set();
      const seenDates = new Set();
      for (const it of json.entries) {
        if (typeof it?.date !== 'string' || typeof it?.number !== 'number') throw new Error('Invalid item shape');
        if (!isValidNumber(it.number)) throw new Error(`Invalid number ${it.number}`);
        if (seenNums.has(it.number)) throw new Error(`Duplicate number in import: ${it.number}`);
        if (seenDates.has(it.date)) throw new Error(`Duplicate date in import: ${it.date}`);
        seenNums.add(it.number); seenDates.add(it.date);
      }

      const ok = confirm('Import will replace all existing data. Continue?');
      if (!ok) return;

      state.entries = json.entries;
      save();
      renderHeader(); renderCalendar(); renderProgress();
      alert('Import successful.');
    } catch (err) {
      alert(`Import failed: ${(err && err.message) || err}`);
    } finally {
      e.target.value = '';
    }
  });

  $('#resetBtn').addEventListener('click', () => {
    const ok = confirm('Reset ALL data to empty? This cannot be undone.');
    if (!ok) return;
    state.entries = [];
    save();
    renderHeader(); renderCalendar(); renderProgress();
  });
}

function initViewMonthToToday() {
  const now = new Date();
  state.viewYear = now.getFullYear();
  state.viewMonth = now.getMonth();
}

function boot() {
  load();
  initViewMonthToToday();
  renderHeader();
  renderCalendar();
  renderProgress();
  bindEvents();
  // Initial hint
  showDuplicateHint(undefined);
}

document.addEventListener('DOMContentLoaded', boot);
