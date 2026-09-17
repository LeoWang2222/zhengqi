'use strict';

/* ================= 数据层 ================= */
const STORE_KEY = 'zhengqi_v1';
const IMPORT_BACKUP_KEY = 'zhengqi_pre_import_backup_v1';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidDateKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function normalizeStoredData(data) {
  if (!isPlainObject(data) || !isPlainObject(data.records)) return { records: {} };
  const records = {};
  for (const [key, rec] of Object.entries(data.records)) {
    if (!isValidDateKey(key) || !isPlainObject(rec)) continue;
    if (rec.type !== 'success' && rec.type !== 'relapse') continue;
    records[key] = {
      type: rec.type,
      note: typeof rec.note === 'string' ? rec.note.slice(0, 500) : '',
      ts: Number.isFinite(rec.ts) ? rec.ts : Date.now(),
    };
  }
  return { records };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return normalizeStoredData(JSON.parse(raw));
  } catch (e) { /* 数据损坏则重置 */ }
  return { records: {} };
}
function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    return true;
  } catch (err) {
    showToast('保存失败，请先导出备份并检查浏览器存储空间');
    return false;
  }
}
const store = loadStore();

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function todayKey() { return dateKey(new Date()); }
function recordKeysThroughToday() {
  const today = todayKey();
  return Object.keys(store.records).filter(k => k <= today).sort();
}
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
  for (const k of recordKeysThroughToday()) {
    if (store.records[k].type === 'relapse' && (!latest || k > latest)) latest = k;
  }
  return latest;
}

function streakStartDate() {
  const lr = latestRelapseKey();
  if (lr) return addDays(parseKey(lr), 1);
  const keys = recordKeysThroughToday();
  if (keys.length) return parseKey(keys[0]);
  return new Date();
}

function currentStreak() {
  if (!recordKeysThroughToday().length) return 0;
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
  const keys = recordKeysThroughToday();
  let best = 0;
  let run = 0;
  let prevDay = null;
  for (const k of keys) {
    const [y, m, d] = k.split('-').map(Number);
    const day = Date.UTC(y, m - 1, d) / 86400000;
    if (prevDay !== null && day - prevDay === 1) {
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
    prevDay = day;
  }
  return best;
}

function successCount() {
  let n = 0;
  for (const k of recordKeysThroughToday()) if (store.records[k].type === 'success') n++;
  return n;
}
function relapseCount() {
  let n = 0;
  for (const k of recordKeysThroughToday()) if (store.records[k].type === 'relapse') n++;
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

function renderGrowthProgress(days) {
  const stage = document.getElementById('growth-stage');
  const next = document.getElementById('growth-next');
  const fill = document.getElementById('growth-fill');
  let from = 0;
  let target = 1;
  let stageName = '种子';
  let nextName = '发芽';

  if (days <= 0) {
    next.textContent = '今天播下种子';
  } else if (days < 7) {
    from = 1;
    target = 7;
    stageName = '发芽';
    nextName = '小苗';
  } else if (days < 30) {
    from = 7;
    target = 30;
    stageName = '小苗';
    nextName = '小树';
  } else if (days < 100) {
    from = 30;
    target = 100;
    stageName = '小树';
    nextName = '开花';
  } else {
    from = 100;
    target = 100;
    stageName = '开花大树';
    nextName = '';
  }

  stage.textContent = stageName;
  if (days > 0 && nextName) next.textContent = `距${nextName}还有 ${target - days} 天`;
  if (!nextName) next.textContent = '每一天都在继续生长';
  const percent = target === from ? 100 : Math.max(0, Math.min(100, ((days - from) / (target - from)) * 100));
  fill.style.width = `${percent}%`;
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
  renderGrowthProgress(streak);

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
  updateRestoreButton();
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
  const nextButton = document.getElementById('cal-next');
  const today = new Date();
  nextButton.disabled = y > today.getFullYear() || (y === today.getFullYear() && m >= today.getMonth());

  for (let i = 0; i < first.getDay(); i++) {
    const c = document.createElement('div');
    c.className = 'cal-cell empty';
    grid.appendChild(c);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(new Date(y, m, d));
    const rec = store.records[key];
    const c = document.createElement('button');
    const isFuture = key > tk;
    c.className = 'cal-cell' + (key === tk ? ' today' : '') + (isFuture ? ' future' : '');
    c.disabled = isFuture;
    c.setAttribute('aria-label', `${key}${rec ? (rec.type === 'success' ? '，守住了' : '，破戒了') : '，无记录'}`);
    let inner = `<span>${d}</span>`;
    if (rec) {
      inner += rec.type === 'success'
        ? '<span class="mark ok">✓</span>'
        : '<span class="mark bad">破</span>';
    }
    c.innerHTML = inner;
    if (!isFuture) c.addEventListener('click', () => openDayModal(key));
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
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-current', 'false');
    });
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-current', 'page');
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
  const previous = store.records[editingKey];
  store.records[editingKey] = {
    type: checkinType,
    note: note,
    ts: Date.now(),
  };
  if (!saveStore()) {
    if (previous) store.records[editingKey] = previous;
    else delete store.records[editingKey];
    return;
  }
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
  const previous = store.records[dayKey];
  delete store.records[dayKey];
  if (!saveStore()) {
    store.records[dayKey] = previous;
    return;
  }
  modalDay.hidden = true;
  render();
  renderCalendar();
  showToast('已删除该日记录');
});

/* ================= 冲动急救 ================= */
const modalUrge = document.getElementById('modal-urge');
const urgeReady = document.getElementById('urge-ready');
const urgeRunning = document.getElementById('urge-running');
const urgeTimer = document.getElementById('urge-timer');
const urgeStatus = document.getElementById('urge-status');
let urgeInterval = null;
let urgeSeconds = 60;

function resetUrge() {
  clearInterval(urgeInterval);
  urgeInterval = null;
  urgeSeconds = 60;
  urgeTimer.textContent = '60';
  urgeStatus.textContent = '慢慢吸气，再更慢地呼气';
  document.getElementById('urge-finish').textContent = '我已经稳住了';
  urgeReady.hidden = false;
  urgeRunning.hidden = true;
}

function closeUrge() {
  modalUrge.hidden = true;
  resetUrge();
}

document.getElementById('btn-urge').addEventListener('click', () => {
  resetUrge();
  modalUrge.hidden = false;
});
document.getElementById('urge-close').addEventListener('click', closeUrge);
document.getElementById('urge-start').addEventListener('click', () => {
  urgeReady.hidden = true;
  urgeRunning.hidden = false;
  urgeInterval = setInterval(() => {
    urgeSeconds--;
    urgeTimer.textContent = String(urgeSeconds);
    if (urgeSeconds <= 0) {
      clearInterval(urgeInterval);
      urgeInterval = null;
      urgeStatus.textContent = '这一分钟已经过去。现在离开屏幕，去做一件具体的小事。';
      document.getElementById('urge-finish').textContent = '结束急救';
    }
  }, 1000);
});
document.getElementById('urge-finish').addEventListener('click', () => {
  closeUrge();
  showToast('很好，把注意力交还给真实生活');
});

/* 点遮罩关闭 */
[modalCheckin, modalDay, modalUrge].forEach(m => {
  m.addEventListener('click', e => {
    if (e.target !== m) return;
    if (m === modalUrge) closeUrge();
    else m.hidden = true;
  });
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
  const items = recordKeysThroughToday()
    .filter(k => store.records[k].type === 'relapse' && store.records[k].note)
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
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('已导出备份文件');
});

const modalImport = document.getElementById('modal-import');
let pendingImport = null;

function validateImportData(data) {
  if (!isPlainObject(data) || !isPlainObject(data.records)) throw new Error('缺少有效的 records 数据');
  const entries = Object.entries(data.records);
  if (entries.length > 20000) throw new Error('记录数量异常');
  const records = {};
  for (const [key, rec] of entries) {
    if (!isValidDateKey(key)) throw new Error(`日期 ${key} 格式不正确`);
    if (key > todayKey()) throw new Error(`不能导入未来日期 ${key}`);
    if (!isPlainObject(rec) || (rec.type !== 'success' && rec.type !== 'relapse')) {
      throw new Error(`${key} 的记录类型不正确`);
    }
    if (typeof rec.note !== 'string' || rec.note.length > 500) {
      throw new Error(`${key} 的备注不正确或超过 500 字`);
    }
    if (rec.type === 'relapse' && !rec.note.trim()) throw new Error(`${key} 的破戒教训不能为空`);
    if (rec.ts !== undefined && (!Number.isFinite(rec.ts) || rec.ts < 0)) throw new Error(`${key} 的时间戳不正确`);
    records[key] = {
      type: rec.type,
      note: rec.note,
      ts: Number.isFinite(rec.ts) ? rec.ts : Date.now(),
    };
  }
  return { records };
}

function updateRestoreButton() {
  document.getElementById('btn-restore-import').hidden = !localStorage.getItem(IMPORT_BACKUP_KEY);
}

function closeImportPreview() {
  modalImport.hidden = true;
  pendingImport = null;
}

document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('import-file').click();
});
document.getElementById('import-file').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 2 * 1024 * 1024) {
    showToast('导入失败：文件不能超过 2 MB');
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      pendingImport = validateImportData(JSON.parse(reader.result));
      const records = Object.values(pendingImport.records);
      const success = records.filter(r => r.type === 'success').length;
      const relapse = records.length - success;
      document.getElementById('import-summary').textContent =
        `文件包含 ${records.length} 条记录：守住 ${success} 条，破戒 ${relapse} 条。`;
      modalImport.hidden = false;
    } catch (err) {
      pendingImport = null;
      showToast(`导入失败：${err.message || '文件格式不正确'}`);
    }
  };
  reader.readAsText(f);
  e.target.value = '';
});

function applyImport(mode) {
  if (!pendingImport) return;
  try {
    localStorage.setItem(IMPORT_BACKUP_KEY, JSON.stringify(store));
  } catch (err) {
    showToast('无法创建安全备份，已取消导入');
    return;
  }
  const imported = pendingImport.records;
  const previous = store.records;
  store.records = mode === 'merge' ? { ...store.records, ...imported } : { ...imported };
  if (!saveStore()) {
    store.records = previous;
    return;
  }
  closeImportPreview();
  render();
  renderCalendar();
  showToast(mode === 'merge' ? '数据已安全合并' : '数据已覆盖，可随时恢复');
}

document.getElementById('import-merge').addEventListener('click', () => applyImport('merge'));
document.getElementById('import-replace').addEventListener('click', () => applyImport('replace'));
document.getElementById('import-cancel').addEventListener('click', closeImportPreview);
modalImport.addEventListener('click', e => { if (e.target === modalImport) closeImportPreview(); });

document.getElementById('btn-restore-import').addEventListener('click', () => {
  const raw = localStorage.getItem(IMPORT_BACKUP_KEY);
  if (!raw || !confirm('恢复导入前的数据？当前数据会被替换。')) return;
  try {
    const backup = normalizeStoredData(JSON.parse(raw));
    const previous = store.records;
    store.records = backup.records;
    if (!saveStore()) {
      store.records = previous;
      return;
    }
    localStorage.removeItem(IMPORT_BACKUP_KEY);
    render();
    renderCalendar();
    showToast('已恢复导入前数据');
  } catch (err) {
    showToast('恢复失败：备份数据已损坏');
  }
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (confirm('确定要清空全部数据吗？此操作不可恢复！')) {
    const previous = store.records;
    store.records = {};
    if (!saveStore()) {
      store.records = previous;
      return;
    }
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

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!modalImport.hidden) closeImportPreview();
  else if (!modalUrge.hidden) closeUrge();
  else if (!modalDay.hidden) modalDay.hidden = true;
  else if (!modalCheckin.hidden) closeCheckin();
});

/* ================= 启动 ================= */
renderQuote();
render();
renderCalendar();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
