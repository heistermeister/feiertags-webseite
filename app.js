const stateSelect = document.getElementById('stateSelect');
const nextHolidayCard = document.getElementById('nextHolidayCard');
const holidayList = document.getElementById('holidayList');
const listTitle = document.getElementById('listTitle');
const bridgeToggle = document.getElementById('bridgeToggle');

const STATE_NAMES = {
  NRW: 'Nordrhein-Westfalen',
  NDS: 'Niedersachsen',
};

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getHolidays(state, year) {
  const easter = easterSunday(year);
  const holidays = [
    { name: 'Neujahr', date: new Date(year, 0, 1) },
    { name: 'Karfreitag', date: addDays(easter, -2) },
    { name: 'Ostermontag', date: addDays(easter, 1) },
    { name: 'Tag der Arbeit', date: new Date(year, 4, 1) },
    { name: 'Christi Himmelfahrt', date: addDays(easter, 39) },
    { name: 'Pfingstmontag', date: addDays(easter, 50) },
    { name: 'Tag der Deutschen Einheit', date: new Date(year, 9, 3) },
    { name: '1. Weihnachtstag', date: new Date(year, 11, 25) },
    { name: '2. Weihnachtstag', date: new Date(year, 11, 26) },
  ];

  if (state === 'NRW') {
    holidays.push(
      { name: 'Fronleichnam', date: addDays(easter, 60) },
      { name: 'Allerheiligen', date: new Date(year, 10, 1) }
    );
  }

  if (state === 'NDS') {
    holidays.push({ name: 'Reformationstag', date: new Date(year, 9, 31) });
  }

  return holidays.sort((a, b) => a.date - b.date);
}

function atMidnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysUntil(date) {
  const now = atMidnight(new Date());
  const target = atMidnight(date);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

function formatDate(date) {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function findNextHoliday(state) {
  const year = new Date().getFullYear();
  const thisYear = getHolidays(state, year);
  const upcoming = thisYear.find((h) => daysUntil(h.date) >= 0);
  if (upcoming) return upcoming;
  return getHolidays(state, year + 1)[0];
}

function getBridgeDays(holidays) {
  const result = [];
  const known = new Set(holidays.map((h) => atMidnight(h.date).getTime()));

  for (const h of holidays) {
    const day = h.date.getDay(); // 0=So,1=Mo,...6=Sa

    // Feiertag am Dienstag -> Montag als möglicher Brückentag
    if (day === 2) {
      const bridge = addDays(h.date, -1);
      if (!known.has(atMidnight(bridge).getTime())) {
        result.push({ date: bridge, reason: `zwischen Wochenende und ${h.name}` });
      }
    }

    // Feiertag am Donnerstag -> Freitag als möglicher Brückentag
    if (day === 4) {
      const bridge = addDays(h.date, 1);
      if (!known.has(atMidnight(bridge).getTime())) {
        result.push({ date: bridge, reason: `zwischen ${h.name} und Wochenende` });
      }
    }
  }

  const unique = new Map();
  for (const item of result) {
    unique.set(atMidnight(item.date).getTime(), item);
  }

  return [...unique.values()].sort((a, b) => a.date - b.date);
}

function render() {
  const state = stateSelect.value;
  const year = new Date().getFullYear();
  const holidays = getHolidays(state, year);
  const next = findNextHoliday(state);

  listTitle.textContent = `Feiertage ${year} – ${STATE_NAMES[state]}`;

  nextHolidayCard.innerHTML = `
    <h2>Nächster Feiertag</h2>
    <div class="name">${next.name}</div>
    <div class="meta">${formatDate(next.date)} · ${STATE_NAMES[state]}</div>
    <div class="count">${daysUntil(next.date)} Tage</div>
  `;

  const bridges = getBridgeDays(holidays).map((b) => ({ ...b, isBridge: true }));
  const items = holidays.map((h) => ({ ...h, isBridge: false }));

  const merged = bridgeToggle.checked
    ? [...items, ...bridges].sort((a, b) => a.date - b.date)
    : items;

  holidayList.innerHTML = merged
    .map((item) => {
      const d = daysUntil(item.date);
      let right = `${d} Tage`;
      if (d < 0) right = `vor ${Math.abs(d)} Tagen`;
      if (d === 0) right = 'Heute';

      if (item.isBridge) {
        return `
          <li class="holiday-item bridge">
            <div class="left">
              <span class="tag">Brückentag</span>
              <strong>${formatDate(item.date)}</strong>
              <span>${item.reason}</span>
            </div>
            <div class="right">${right}</div>
          </li>
        `;
      }

      return `
        <li class="holiday-item">
          <div class="left">
            <strong>${item.name}</strong>
            <span>${formatDate(item.date)}</span>
          </div>
          <div class="right">${right}</div>
        </li>
      `;
    })
    .join('');
}

stateSelect.addEventListener('change', render);
bridgeToggle.addEventListener('change', render);
render();
