'use strict';

/* ================= 数据层 ================= */
const STORE_KEY = 'zhengqi_v1';

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* 数据损坏则重置 */ }
  return { records: {} };
}
function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}
const store = loadStore();

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function todayKey() { return dateKey(new Date()); }
function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/* ================= 统计计算 ================= */
function latestRelapseKey() {
  let latest = null;
  for (const k in store.records) {
    if (store.records[k].type === 'relapse' && (!latest || k > latest)) latest = k;
  }
  return latest;
}

function streakStartDate() {
  const lr = latestRelapseKey();
  if (lr) return addDays(parseKey(lr), 1);
  const keys = Object.keys(store.records).sort();
  if (keys.length) return parseKey(keys[0]);
  return new Date();
}

function currentStreak() {
  if (!Object.keys(store.records).length) return 0;
  const todayK = todayKey();
  let n = 0;
  let d = streakStartDate();
  while (dateKey(d) <= todayK) {
    const r = store.records[dateKey(d)];
    if (r && r.type === 'relapse') break;
    n++;
    d = addDays(d, 1);
  }
  return n;
}

function longestStreak() {
  const keys = Object.keys(store.records).sort();
  let best = currentStreak();
  let run = 0;
  let prev = null;
  for (const k of keys) {
    const d = parseKey(k);
    if (prev && (d - prev) === 86400000) {
      // 连续日期
    } else {
      run = 0;
    }
    if (store.records[k].type === 'relapse') {
      run = 0;
    } else {
      run++;
      if (run > best) best = run;
    }
    prev = d;
  }
  return best;
}

function successCount() {
  let n = 0;
  for (const k in store.records) if (store.records[k].type === 'success') n++;
  return n;
}
function relapseCount() {
  let n = 0;
  for (const k in store.records) if (store.records[k].type === 'relapse') n++;
  return n;
}
function zhengqiScore() {
  return (currentStreak() * 1.2 + successCount() * 0.3).toFixed(1);
}

/* ================= 良言 ================= */
const QUOTES = [
  ['膏火自煎，人欲自耗。', '《庄子·人间世》'],
  ['嗜欲深者，天机浅。', '《庄子·大宗师》'],
  ['胜人者有力，自胜者强。', '《道德经》'],
  ['五色令人目盲，五音令人耳聋。', '《道德经》'],
  ['清心为治本，直道是身谋。', '包拯'],
  ['一念之欲不能制，而祸流于滔天。', '《格言联璧》'],
  ['无欲速，无见小利。欲速则不达，见小利则大事不成。', '《论语》'],
  ['养心莫善于寡欲。', '《孟子》'],
  ['非淡泊无以明志，非宁静无以致远。', '诸葛亮'],
  ['戒之在色，斗之在得。', '《论语·季氏》'],
  ['业精于勤，荒于嬉；行成于思，毁于随。', '韩愈'],
  ['天行健，君子以自强不息。', '《周易》'],
  ['千淘万漉虽辛苦，吹尽狂沙始到金。', '刘禹锡'],
  ['宝剑锋从磨砺出，梅花香自苦寒来。', '《警世贤文》'],
  ['你自律的程度，决定你人生的高度。', '佚名'],
  ['真正的自由，不是随心所欲，而是自我主宰。', '佚名'],
  ['每一次克制，都是在为未来的自己储蓄力量。', '佚名'],
  ['欲望像盐水，越喝越渴。', '佚名'],
  ['所谓强者，是能和欲望谈判的人。', '佚名'],
  ['把时间还给真实生活。', '佚名'],
  ['身体的能量有限，用在值得的地方。', '佚名'],
  ['今天的坚持，是明天的底气。', '佚名'],
  ['戒，不是压抑，而是把精力交还给梦想。', '佚名'],
  ['熬过最想放弃的时刻，就是新生。', '佚名'],
  ['清净的心，才有力量看清方向。', '佚名'],
  ['你战胜的不是欲望，而是过去的自己。', '佚名'],
  ['破戒不可怕，可怕的是不再站起来。', '佚名'],
  ['跌倒一次，总结一次，站起来就是成长。', '佚名'],
  ['自律者出众，放纵者出局。', '佚名'],
  ['日拱一卒，功不唐捐。', '佚名'],
  ['苟日新，日日新，又日新。', '《礼记·大学》'],
];

function renderQuote() {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const idx = dayOfYear % QUOTES.length;
  document.getElementById('quote-text').textContent = QUOTES[idx][0];
  document.getElementById('quote-from').textContent = '—— ' + QUOTES[idx][1];
}

/* ================= 树动画 ================= */
function treeSVG(days) {
  // 阶段：0 种子土堆 / 1-6 发芽 / 7-29 小苗 / 30-99 小树 / 100+ 开花大树
  const s = 'stroke="#4a948a" stroke-width="3.5" stroke-linecap="round" fill="none"';
  let body = '';
  if (days <= 0) {
    body = `
      <ellipse cx="75" cy="128" rx="30" ry="8" fill="#c9a876"/>
      <ellipse cx="75" cy="122" rx="9" ry="6" fill="#8a6b45"/>`;
  } else if (days < 7) {
    body = `
      <ellipse cx="75" cy="128" rx="30" ry="8" fill="#c9a876"/>
      <path d="M75 122 Q75 105 75 98" ${s}/>
      <path d="M75 106 Q64 100 60 90" ${s}/>
      <path d="M75 106 Q86 100 90 90" ${s}/>
      <ellipse cx="59" cy="88" rx="7" ry="4" fill="#7cbc6b" transform="rotate(-35 59 88)"/>
      <ellipse cx="91" cy="88" rx="7" ry="4" fill="#7cbc6b" transform="rotate(35 91 88)"/>`;
  } else if (days < 30) {
    body = `
      <ellipse cx="75" cy="130" rx="34" ry="8" fill="#c9a876"/>
      <path d="M75 130 Q74 105 75 78" ${s}/>
      <path d="M75 100 Q60 94 54 80" ${s}/>
      <path d="M75 96 Q90 90 96 76" ${s}/>
      <ellipse cx="52" cy="76" rx="10" ry="6" fill="#6bb362" transform="rotate(-40 52 76)"/>
      <ellipse cx="98" cy="72" rx="10" ry="6" fill="#6bb362" transform="rotate(40 98 72)"/>
      <ellipse cx="75" cy="70" rx="9" ry="6" fill="#7cbc6b"/>`;
  } else if (days < 100) {
    body = `
      <ellipse cx="75" cy="132" rx="36" ry="8" fill="#c9a876"/>
      <path d="M75 132 L75 88" stroke="#8a6b45" stroke-width="5" stroke-linecap="round"/>
      <path d="M75 104 L60 90 M75 100 L90 86" stroke="#8a6b45" stroke-width="4" stroke-linecap="round"/>
      <circle cx="60" cy="74" r="16" fill="#6bb362"/>
      <circle cx="90" cy="70" r="16" fill="#6bb362"/>
      <circle cx="75" cy="56" r="18" fill="#7cbc6b"/>`;
  } else {
    body = `
      <ellipse cx="75" cy="132" rx="38" ry="8" fill="#c9a876"/>
      <path d="M75 132 L75 86" stroke="#8a6b45" stroke-width="6" stroke-linecap="round"/>
      <path d="M75 104 L58 88 M75 100 L92 84" stroke="#8a6b45" stroke-width="4.5" stroke-linecap="round"/>
      <circle cx="56" cy="72" r="17" fill="#6bb362"/>
      <circle cx="94" cy="68" r="17" fill="#6bb362"/>
      <circle cx="75" cy="52" r="20" fill="#7cbc6b"/>
      <circle cx="50" cy="60" r="4" fill="#f2a0b5"/>
      <circle cx="98" cy="56" r="4" fill="#f2a0b5"/>
      <circle cx="75" cy="38" r="4.5" fill="#f2a0b5"/>
      <circle cx="64" cy="44" r="3.5" fill="#f7bcc9"/>
      <circle cx="88" cy="42" r="3.5" fill="#f7bcc9"/>`;
  }
  return `<svg viewBox="0 0 150 150" width="150" height="150">${body}</svg>`;
}

/* ================= 渲染 ================= */
function render() {
  const streak = currentStreak();
  document.getElementById('streak-days').textContent = streak;
  document.getElementById('zq-score').textContent = zhengqiScore();
  document.getElementById('ms-streak').textContent = streak;
  document.getElementById('ms-best').textContent = longestStreak();
  document.getElementById('ms-total').textContent = successCount();
  document.getElementById('tree-wrap').innerHTML = treeSVG(streak);

  const btn = document.getElementById('btn-checkin');
  const txt = document.getElementById('btn-checkin-text');
  const sub = document.getElementById('btn-checkin-sub');
  const todayRec = store.records[todayKey()];
  if (todayRec && todayRec.type === 'success') {
    btn.classList.add('done');
    txt.textContent = '今日已打卡 ✓';
    sub.textContent = '点击可修改今天的心得';
  } else if (todayRec && todayRec.type === 'relapse') {
    btn.classList.add('done');
    txt.textContent = '今天已记录';
    sub.textContent = '点击可修改今天的记录';
  } else {
    btn.classList.remove('done');
    txt.textContent = '今日打卡';
    sub.textContent = '守住一天，便是一天的胜利';
  }

  renderStats();
  renderLessons();
}

/* ================= 月历 ================= */
let calCursor = new Date();

function renderCalendar() {
  const y = calCursor.getFullYear();
  const m = calCursor.getMonth();
  document.getElementById('cal-title').textContent = `${y} 年 ${m + 1} 月`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const tk = todayKey();

  for (let i = 0; i < first.getDay(); i++) {
    const c = document.createElement('div');
    c.className = 'cal-cell empty';
    grid.appendChild(c);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(new Date(y, m, d));
    const rec = store.records[key];
    const c = document.createElement('button');
    c.className = 'cal-cell' + (key === tk ? ' today' : '');
    let inner = `<span>${d}</span>`;
    if (rec) {
      inner += rec.type === 'success'
        ? '<span class="mark ok">✓</span>'
        : '<span class="mark bad">破</span>';
    }
    c.innerHTML = inner;
    c.addEventListener('click', () => openDayModal(key));
    grid.appendChild(c);
  }
}

document.getElementById('cal-prev').addEventListener('click', () => {
  calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1);
  renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
  calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1);
  renderCalendar();
});

/* ================= 底部导航 ================= */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.page).classList.add('active');
    if (tab.dataset.page === 'page-calendar') renderCalendar();
    if (tab.dataset.page === 'page-me') { renderStats(); renderLessons(); }
  });
});

/* ================= 打卡弹窗 ================= */
const modalCheckin = document.getElementById('modal-checkin');
const stepChoose = document.getElementById('step-choose');
const stepNote = document.getElementById('step-note');
const noteInput = document.getElementById('note-input');
let checkinType = null;   // 'success' | 'relapse'
let editingKey = null;    // 正在编辑的日期（默认今天）

function openCheckin(key) {
  editingKey = key || todayKey();
  const rec = store.records[editingKey];
  stepChoose.hidden = false;
  stepNote.hidden = true;
  document.getElementById('checkin-title').textContent =
    editingKey === todayKey() ? '今天过得怎么样？' : `${editingKey} 的记录`;
  if (rec) prefillNote(rec.type, rec.note || '');
  modalCheckin.hidden = false;
}
function closeCheckin() { modalCheckin.hidden = true; }

function prefillNote(type, note) {
  checkinType = type;
  stepChoose.hidden = true;
  stepNote.hidden = false;
  setupNoteStep(type);
  noteInput.value = note;
  updateCount();
}

function setupNoteStep(type) {
  const title = document.getElementById('note-title');
  const hint = document.getElementById('note-hint');
  const submit = document.getElementById('note-submit');
  if (type === 'success') {
    title.textContent = '写点心得体会（可留空）';
    hint.textContent = '记录今天的状态、方法或感悟，帮未来的自己走得更远';
    hint.classList.remove('required');
    noteInput.placeholder = '今天是怎么守住的？有什么感悟？';
    submit.textContent = '完成打卡';
    submit.classList.remove('bad');
  } else {
    title.textContent = '写下破戒教训（必填）';
    hint.textContent = '直面问题才能重新出发：是什么触发的？下次如何避免？';
    hint.classList.add('required');
    noteInput.placeholder = '这次破戒的原因是什么？下次怎么避免？（必填）';
    submit.textContent = '记录教训，重新出发';
    submit.classList.add('bad');
  }
}

function updateCount() {
  document.getElementById('note-count').textContent = noteInput.value.length;
}
noteInput.addEventListener('input', updateCount);

document.getElementById('btn-checkin').addEventListener('click', () => openCheckin());

document.getElementById('choice-success').addEventListener('click', () => {
  checkinType = 'success';
  const rec = store.records[editingKey];
  prefillNote('success', rec && rec.type === 'success' ? rec.note || '' : '');
});
document.getElementById('choice-relapse').addEventListener('click', () => {
  checkinType = 'relapse';
  const rec = store.records[editingKey];
  prefillNote('relapse', rec && rec.type === 'relapse' ? rec.note || '' : '');
});
document.getElementById('checkin-cancel').addEventListener('click', closeCheckin);
document.getElementById('note-back').addEventListener('click', () => {
  stepNote.hidden = true;
  stepChoose.hidden = false;
});

document.getElementById('note-submit').addEventListener('click', () => {
  const note = noteInput.value.trim();
  if (checkinType === 'relapse' && !note) {
    noteInput.classList.remove('shake');
    void noteInput.offsetWidth;
    noteInput.classList.add('shake');
    noteInput.focus();
    showToast('破戒必须写下教训，才能重新出发');
    return;
  }
  store.records[editingKey] = {
    type: checkinType,
    note: note,
    ts: Date.now(),
  };
  saveStore();
  closeCheckin();
  render();
  renderCalendar();
  if (checkinType === 'success') {
    showToast(`打卡成功！已坚持 ${currentStreak()} 天`);
  } else {
    showToast('教训已记下，明天重新开始');
  }
});

/* ================= 某日详情 ================= */
const modalDay = document.getElementById('modal-day');
let dayKey = null;

function openDayModal(key) {
  dayKey = key;
  const rec = store.records[key];
  document.getElementById('day-title').textContent =
    key === todayKey() ? `${key}（今天）` : key;
  const body = document.getElementById('day-body');
  const delBtn = document.getElementById('day-delete');
  if (rec) {
    const isOk = rec.type === 'success';
    const label = isOk ? '心得体会' : '破戒教训';
    body.innerHTML = `
      <div class="day-record ${isOk ? 'ok' : 'bad'}">
        <div class="dr-type">${isOk ? '✓ 守住了' : '✗ 破戒了'}</div>
        ${rec.note ? `<div class="dr-label">${label}</div><div class="dr-note">${escapeHTML(rec.note)}</div>` : '<div class="dr-label">未填写' + label + '</div>'}
      </div>`;
    delBtn.hidden = false;
  } else {
    body.innerHTML = '<div class="day-empty">这一天还没有记录</div>';
    delBtn.hidden = true;
  }
  modalDay.hidden = false;
}

function escapeHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.getElementById('day-close').addEventListener('click', () => { modalDay.hidden = true; });
document.getElementById('day-edit').addEventListener('click', () => {
  modalDay.hidden = true;
  openCheckin(dayKey);
});
document.getElementById('day-delete').addEventListener('click', () => {
  delete store.records[dayKey];
  saveStore();
  modalDay.hidden = true;
  render();
  renderCalendar();
  showToast('已删除该日记录');
});

/* 点遮罩关闭 */
[modalCheckin, modalDay].forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.hidden = true; });
});

/* ================= 统计与教训墙 ================= */
function renderStats() {
  document.getElementById('st-streak').textContent = currentStreak();
  document.getElementById('st-best').textContent = longestStreak();
  document.getElementById('st-total').textContent = successCount();
  document.getElementById('st-relapse').textContent = relapseCount();
}

function renderLessons() {
  const list = document.getElementById('lesson-list');
  const items = Object.keys(store.records)
    .filter(k => store.records[k].type === 'relapse' && store.records[k].note)
    .sort()
    .reverse();
  if (!items.length) {
    list.innerHTML = '<div class="lesson-empty">暂无破戒记录，继续保持</div>';
    return;
  }
  list.innerHTML = items.map(k => `
    <div class="lesson-item">
      <div class="lesson-date">${k}</div>
      <div class="lesson-text">${escapeHTML(store.records[k].note)}</div>
    </div>`).join('');
}

/* ================= 数据导入导出 ================= */
document.getElementById('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zhengqi-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('已导出备份文件');
});

document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('import-file').click();
});
document.getElementById('import-file').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data.records !== 'object') throw new Error('bad format');
      store.records = data.records;
      saveStore();
      render();
      renderCalendar();
      showToast('导入成功');
    } catch (err) {
      showToast('导入失败：文件格式不正确');
    }
  };
  reader.readAsText(f);
  e.target.value = '';
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (confirm('确定要清空全部数据吗？此操作不可恢复！')) {
    store.records = {};
    saveStore();
    render();
    renderCalendar();
    showToast('数据已清空');
  }
});

/* ================= Toast ================= */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

/* ================= 启动 ================= */
renderQuote();
render();
renderCalendar();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
