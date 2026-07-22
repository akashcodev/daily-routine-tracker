const DEFAULT_ACTIVITIES = [
  { id: 'wake', name: 'Wake up', note: 'Begin with a fresh start', time: '06:00', icon: '☀', color: 'sun' },
  { id: 'gym', name: 'Gym', note: 'Move your body, feel strong', time: '07:00', icon: '⌁', color: 'sky' },
  { id: 'run', name: 'Running', note: 'One step at a time', time: '08:15', icon: '↗', color: 'rose' },
  { id: 'swim', name: 'Swimming', note: 'Make a splash', time: '09:30', icon: '≈', color: 'sky' },
  { id: 'study', name: 'Study time', note: 'Focus on what matters', time: '10:30', icon: '✎', color: 'violet' },
  { id: 'dinner', name: 'Dinner', note: 'Nourish and unwind', time: '20:00', icon: '⌒', color: 'sun' },
  { id: 'sleep', name: 'Sleep time', note: 'Rest and recharge', time: '22:30', icon: '☾', color: 'violet' }
];

const list = document.querySelector('#routineList');
const dateInput = document.querySelector('#routineDate');
const progressText = document.querySelector('#progressText');
const progressBar = document.querySelector('#progressBar');
const activityDialog = document.querySelector('#activityDialog');
const alarmDialog = document.querySelector('#alarmDialog');
const activityForm = document.querySelector('#activityForm');
let alarmed = new Set();

const localDate = () => new Date().toLocaleDateString('en-CA');
const key = () => `daylight:${dateInput.value}`;
function getData() { return JSON.parse(localStorage.getItem(key()) || '{"items":[],"completed":[]}'); }
function saveData(data) { localStorage.setItem(key(), JSON.stringify(data)); }
function activities() {
  const saved = getData();
  return [
    ...DEFAULT_ACTIVITIES.map(item => ({ ...item, time: saved.times?.[item.id] || item.time })),
    ...saved.items
  ];
}
function iconFor(name) { return ({ sun: '☀', sky: '⌁', rose: '✦', violet: '✎' })[name] || '✦'; }
function formatTime(time) { return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function render() {
  const data = getData();
  const items = activities();
  list.innerHTML = items.map(item => `
    <article class="routine-item ${item.color} ${data.completed.includes(item.id) ? 'complete' : ''} ${item.custom ? 'custom' : ''}" data-id="${item.id}">
      <span class="activity-icon">${item.icon}</span>
      <div><p class="activity-name">${escapeHTML(item.name)}</p><p class="activity-note">${escapeHTML(item.note)}</p></div>
      <label class="time-control" aria-label="Time for ${escapeHTML(item.name)}"><span>◷</span><input type="time" value="${item.time}" data-time="${item.id}" /></label>
      <button class="check-button" type="button" data-complete="${item.id}" aria-label="Mark ${escapeHTML(item.name)} complete">✓</button>
      ${item.custom ? `<button class="delete-button" type="button" data-delete="${item.id}" aria-label="Delete ${escapeHTML(item.name)}">×</button>` : ''}
    </article>`).join('');
  const complete = data.completed.filter(id => items.some(item => item.id === id)).length;
  progressText.textContent = `${complete} of ${items.length} complete`;
  progressBar.style.width = `${items.length ? (complete / items.length) * 100 : 0}%`;
  document.querySelector('#todayLabel').textContent = dateInput.value === localDate() ? 'YOUR DAILY RHYTHM · TODAY' : 'YOUR DAILY RHYTHM';
}
function escapeHTML(value) { const el = document.createElement('div'); el.textContent = value; return el.innerHTML; }
function updateTime(id, time) {
  const data = getData();
  const custom = data.items.find(item => item.id === id);
  if (custom) custom.time = time;
  else data.times = { ...(data.times || {}), [id]: time };
  saveData(data);
}
function beep() {
  try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); const gain = ctx.createGain(); o.connect(gain); gain.connect(ctx.destination); o.frequency.value = 660; gain.gain.setValueAtTime(.09, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + 1.2); o.start(); o.stop(ctx.currentTime + 1.2); } catch (_) {}
}
function showAlarm(item) {
  document.querySelector('#alarmTitle').textContent = item.name;
  document.querySelector('#alarmMessage').textContent = `${formatTime(item.time)} — ${item.note}`;
  beep();
  if (!alarmDialog.open) alarmDialog.showModal();
  if (Notification.permission === 'granted') new Notification(`Daylight: ${item.name}`, { body: `It's ${formatTime(item.time)}. ${item.note}` });
}
function checkAlarms() {
  if (dateInput.value !== localDate()) return;
  const now = new Date(); const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  activities().forEach(item => { const alarmKey = `${dateInput.value}:${item.id}:${item.time}`; if (item.time === current && !alarmed.has(alarmKey)) { alarmed.add(alarmKey); showAlarm(item); } });
}

dateInput.value = localDate();
document.querySelector('#addActivityButton').addEventListener('click', () => { activityForm.reset(); activityDialog.showModal(); });
activityForm.addEventListener('submit', event => {
  event.preventDefault();
  const data = getData(); const name = document.querySelector('#activityName').value.trim(); const color = document.querySelector('input[name="activityColor"]:checked').value;
  data.items.push({ id: `custom-${Date.now()}`, name, note: 'Your custom routine', time: document.querySelector('#activityTime').value, icon: iconFor(color), color, custom: true });
  saveData(data); activityDialog.close(); render();
});
list.addEventListener('click', event => {
  const complete = event.target.closest('[data-complete]'); const remove = event.target.closest('[data-delete]'); const data = getData();
  if (complete) { const id = complete.dataset.complete; data.completed = data.completed.includes(id) ? data.completed.filter(x => x !== id) : [...data.completed, id]; saveData(data); render(); }
  if (remove) { data.items = data.items.filter(item => item.id !== remove.dataset.delete); data.completed = data.completed.filter(id => id !== remove.dataset.delete); saveData(data); render(); }
});
list.addEventListener('change', event => { if (event.target.matches('[data-time]')) { updateTime(event.target.dataset.time, event.target.value); render(); } });
dateInput.addEventListener('change', () => { alarmed = new Set(); render(); });
document.querySelector('#resetButton').addEventListener('click', () => { const data = getData(); data.completed = []; saveData(data); render(); });
document.querySelector('#dismissAlarm').addEventListener('click', () => alarmDialog.close());
document.querySelector('#notificationButton').addEventListener('click', async () => { if (!('Notification' in window)) return; const result = await Notification.requestPermission(); document.querySelector('#notificationButton').classList.toggle('enabled', result === 'granted'); });
if ('Notification' in window && Notification.permission === 'granted') document.querySelector('#notificationButton').classList.add('enabled');
render(); checkAlarms(); setInterval(checkAlarms, 10000);