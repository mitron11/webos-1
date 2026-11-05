const windows = [...document.querySelectorAll('.window')];
const notes = document.querySelector('#notes-content');
let highestZIndex = 10;

// Configuración inicial y persistencia
const settings = {
  theme: 'light',
  style: 'neo',
  windowSize: 100,
  weatherCity: 'madrid_spain_3117735'
};

try {
  Object.assign(settings, JSON.parse(localStorage.getItem('nubeos-settings') || '{}'));
} catch {}

if (!['light', 'dark'].includes(settings.theme)) settings.theme = 'light';
if (!['neo', 'glass', 'flat'].includes(settings.style)) settings.style = 'neo';
if (!Number.isFinite(settings.windowSize)) settings.windowSize = 100;

const cityNames = {
  madrid_spain_3117735: 'Madrid',
  barcelona_spain_3128760: 'Barcelona',
  valencia_spain_2509954: 'Valencia',
  seville_spain_2510911: 'Sevilla',
  bilbao_spain_3128026: 'Bilbao',
  granada_spain_2517117: 'Granada',
  malaga_spain_2514256: 'Málaga',
  zaragoza_spain_3104324: 'Zaragoza'
};

// Bloc de Notas con Guardado Automático
try { notes.value = localStorage.getItem('nubeos-notes') || ''; } catch {}
notes.addEventListener('input', () => {
  try { localStorage.setItem('nubeos-notes', notes.value); } catch {}
});

// Sistema de Ventanas (Abrir, Traer al frente y Enfocar)
function bringToFront(win) {
  highestZIndex += 1;
  win.style.zIndex = highestZIndex;
}

function openApp(id) {
  const win = document.getElementById(id);
  if (!win) return;
  
  win.classList.add('open');
  bringToFront(win);
  
  document.querySelectorAll('.dock-button').forEach((button) => {
    if (button.dataset.open === id) button.classList.add('active');
  });

  if (id === 'browser') document.querySelector('#search-input').focus();
  if (id === 'tasks') document.querySelector('#task-input').focus();
}

// Hacer ventanas arrastrables y focalizables
windows.forEach((win) => {
  win.addEventListener('mousedown', () => bringToFront(win));
  
  const header = win.querySelector('.window-header');
  if (!header) return;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.window-controls')) return;
    isDragging = true;
    
    // Convertir posiciones fijas para permitir arrastre fluido
    const rect = win.getBoundingClientRect();
    win.style.transform = 'none';
    win.style.left = `${rect.left}px`;
    win.style.top = `${rect.top}px`;

    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    win.style.left = `${e.clientX - offsetX}px`;
    win.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
});

document.querySelectorAll('[data-open]').forEach((button) => {
  button.addEventListener('click', () => openApp(button.dataset.open));
});

document.querySelectorAll('[data-close], [data-minimize]').forEach((button) => {
  button.addEventListener('click', (e) => {
    const win = button.closest('.window');
    win.classList.remove('open');
    const dockBtn = document.querySelector(`.dock-button[data-open="${win.id}"]`);
    if (dockBtn) dockBtn.classList.remove('active');
  });
});

// Navegador Web
document.querySelector('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.querySelector('#search-input').value.trim();
  if (!input) return;
  const isAddress = /^(https?:\/\/|localhost\b|[\w-]+\.[a-z]{2,})([:/]|$)/i.test(input);
  const target = isAddress
    ? (input.startsWith('http') ? input : `https://${input}`)
    : `https://www.google.com/search?igu=1&q=${encodeURIComponent(input)}`;
  const view = document.querySelector('#browser-view');
  
  if (isAddress) {
    view.innerHTML = `<div class="browser-message"><div class="big-icon">🌐</div><p>Abriendo <strong>${escapeHtml(input)}</strong> en una pestaña nueva.</p><a href="${escapeHtml(target)}" target="_blank" rel="noopener noreferrer">Ir al sitio ↗</a></div>`;
    window.open(target, '_blank', 'noopener,noreferrer');
  } else {
    view.innerHTML = `<iframe title="Resultados de Google" src="${target}" style="width:100%;height:100%;min-height:180px;border:0;border-radius:8px;background:#fff"></iframe>`;
  }
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

// Calculadora
const display = document.querySelector('#calc-display');
const keys = document.querySelector('#calc-keys');
const keyValues = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '⌫', '='];
let calcValue = '0';
let calcStored = null;
let calcOperator = null;
let calcFresh = false;

keyValues.forEach((value) => {
  const key = document.createElement('button');
  key.className = `calc-key ${['÷', '×', '−', '+', '='].includes(value) ? 'operator' : ''}`;
  key.textContent = value;
  key.addEventListener('click', () => calculate(value));
  keys.append(key);
});

function calculate(key) {
  if (/^[0-9.]$/.test(key)) {
    if (calcFresh) { calcValue = '0'; calcFresh = false; }
    if (key !== '.' || !calcValue.includes('.')) calcValue = calcValue === '0' && key !== '.' ? key : calcValue + key;
  } else if (key === 'C') {
    calcValue = '0'; calcStored = null; calcOperator = null; calcFresh = false;
  } else if (key === '⌫') {
    calcValue = calcValue.length > 1 ? calcValue.slice(0, -1) : '0';
  } else if (key === '±') {
    calcValue = String(Number(calcValue) * -1);
  } else if (key === '%') {
    calcValue = String(Number(calcValue) / 100);
  } else if (key === '=') {
    if (calcOperator && calcStored !== null) calcValue = String(operate(calcStored, Number(calcValue), calcOperator));
    calcStored = null; calcOperator = null; calcFresh = true;
  } else {
    calcStored = Number(calcValue); calcOperator = key; calcFresh = true;
  }
  display.textContent = Number(calcValue).toLocaleString('es-ES', { maximumFractionDigits: 8 });
}

function operate(left, right, operator) {
  if (operator === '+') return left + right;
  if (operator === '−') return left - right;
  if (operator === '×') return left * right;
  return right === 0 ? 0 : left / right;
}

// Reloj y Fecha Superior
function updateClock() {
  const now = new Date();
  document.querySelector('#dock-clock').innerHTML = `${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}<br>${now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
  document.querySelector('#top-date').textContent = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}
updateClock();
setInterval(updateClock, 1000);

// Personalización y Ajustes
const themeToggle = document.querySelector('#dark-theme');
const styleButtons = [...document.querySelectorAll('[data-style-choice]')];
const windowSize = document.querySelector('#window-size');
const weatherCity = document.querySelector('#weather-city');

function saveSettings() {
  try { localStorage.setItem('nubeos-settings', JSON.stringify(settings)); } catch {}
}

function applyAppearance() {
  document.body.dataset.theme = settings.theme;
  document.body.dataset.style = settings.style;
  document.documentElement.style.setProperty('--window-scale', String(settings.windowSize / 100));
  themeToggle.checked = settings.theme === 'dark';
  windowSize.value = String(settings.windowSize);
  document.querySelector('#window-size-value').textContent = `${settings.windowSize}%`;
  styleButtons.forEach((button) => {
    const selected = button.dataset.styleChoice === settings.style;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  updateWeather();
}

themeToggle.addEventListener('change', () => {
  settings.theme = themeToggle.checked ? 'dark' : 'light';
  applyAppearance();
  saveSettings();
});

styleButtons.forEach((button) => {
  button.addEventListener('click', () => {
    settings.style = button.dataset.styleChoice;
    applyAppearance();
    saveSettings();
  });
});

windowSize.addEventListener('input', () => {
  settings.windowSize = Number(windowSize.value);
  applyAppearance();
  saveSettings();
});

weatherCity.value = cityNames[settings.weatherCity] ? settings.weatherCity : 'madrid_spain_3117735';
settings.weatherCity = weatherCity.value;
weatherCity.addEventListener('change', () => {
  settings.weatherCity = weatherCity.value;
  updateWeather();
  saveSettings();
});

function updateWeather() {
  if (!weatherCity) return;
  const city = weatherCity.value || settings.weatherCity;
  const layout = settings.theme === 'dark' ? 'dark' : 'light';
  const widgetUrl = `https://www.meteoblue.com/en/weather/widget/daily/${city}?geoloc=fixed&days=4&tempunit=CELSIUS&windunit=KILOMETER_PER_HOUR&precipunit=MILLIMETER&coloured=monochrome&pictoicon=1&maxtemperature=1&mintemperature=1&windspeed=0&winddirection=0&humidity=0&precipitation=0&precipitationprobability=0&spot=1&pressure=0&layout=${layout}`;
  const weatherUrl = `https://www.meteoblue.com/en/weather/week/${city}`;
  const cityName = cityNames[city] || 'Madrid';

  document.querySelector('#home-weather-city').textContent = cityName;
  document.querySelector('#app-weather-city').textContent = cityName;
  const homeFrame = document.querySelector('#weather-home-frame');
  const appFrame = document.querySelector('#weather-app-frame');
  if (homeFrame.getAttribute('src') !== widgetUrl) homeFrame.src = widgetUrl;
  if (appFrame.getAttribute('src') !== widgetUrl) appFrame.src = widgetUrl;
  document.querySelector('#weather-home-link').href = weatherUrl;
  document.querySelector('#weather-app-link').href = weatherUrl;
}

applyAppearance();

// Lista de Tareas
const taskList = document.querySelector('#task-list');
let tasks = [];
try { tasks = JSON.parse(localStorage.getItem('nubeos-tasks') || '[]'); } catch {}
if (!Array.isArray(tasks)) tasks = [];

function saveTasks() {
  try { localStorage.setItem('nubeos-tasks', JSON.stringify(tasks)); } catch {}
}

function renderTasks() {
  taskList.replaceChildren();
  if (tasks.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-tasks';
    empty.textContent = 'No tienes tareas pendientes.';
    taskList.append(empty);
    return;
  }

  tasks.forEach((task, index) => {
    const item = document.createElement('li');
    item.className = 'task-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);
    checkbox.setAttribute('aria-label', `Completar ${task.text}`);
    checkbox.addEventListener('change', () => {
      tasks[index].done = checkbox.checked;
      saveTasks();
      renderTasks();
    });
    const label = document.createElement('label');
    label.textContent = task.text;
    const remove = document.createElement('button');
    remove.className = 'task-delete';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Eliminar ${task.text}`);
    remove.addEventListener('click', () => {
      tasks.splice(index, 1);
      saveTasks();
      renderTasks();
    });
    item.append(checkbox, label, remove);
    taskList.append(item);
  });
}

document.querySelector('#task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.querySelector('#task-input');
  const text = input.value.trim();
  if (!text) return;
  tasks.push({ text, done: false });
  input.value = '';
  saveTasks();
  renderTasks();
  input.focus();
});
renderTasks();

// Calendario
const calendarDate = new Date();
const calendarGrid = document.querySelector('#calendar-grid');

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  document.querySelector('#calendar-title').textContent = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(calendarDate);
  calendarGrid.replaceChildren();
  ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach((day) => {
    const heading = document.createElement('span');
    heading.className = 'calendar-cell weekday';
    heading.textContent = day;
    calendarGrid.append(heading);
  });

  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - ((firstDay.getDay() + 6) % 7));
  const today = new Date();
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const cell = document.createElement('span');
    cell.className = 'calendar-cell';
    cell.textContent = String(date.getDate());
    if (date.getMonth() !== month) cell.classList.add('outside');
    if (date.toDateString() === today.toDateString()) cell.classList.add('today');
    calendarGrid.append(cell);
  }
}

document.querySelector('#calendar-prev').addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});
document.querySelector('#calendar-next').addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});
renderCalendar();
