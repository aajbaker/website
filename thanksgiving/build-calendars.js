/* Builds cal/thanksgiving-HHMM.ics for each dinner time the app offers
   (12:00 PM to 7:00 PM, every 30 min). Run after editing data.js:
     node thanksgiving/build-calendars.js
   Times are "floating" (no time zone), so they fire at local time. */
const fs = require('fs');
const path = require('path');
const TG = require('./data.js');

const APP_URL = 'https://www.aajbaker.com/thanksgiving/';
const STAMP = '20261122T000000Z';

const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const plain = s => TG.U.fill(s, 1);

function fold(line) {
  // Fold at 73 bytes to stay under the 75-octet limit.
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > 73) { out.push(cur); cur = ' '; bytes = 1; }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}

const pad = n => String(n).padStart(2, '0');
function stamp(date, min) {
  return date.replace(/-/g, '') + 'T' + pad(Math.floor(min / 60)) + pad(min % 60) + '00';
}

function event(uid, date, start, dur, summary, desc) {
  return [
    'BEGIN:VEVENT',
    'UID:' + uid + '@aajbaker.com',
    'DTSTAMP:' + STAMP,
    'DTSTART:' + stamp(date, start),
    'DTEND:' + stamp(date, start + dur),
    'SUMMARY:' + esc(summary),
    'DESCRIPTION:' + esc(desc + '\n\n' + APP_URL),
    'URL:' + APP_URL,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:' + esc(summary),
    'TRIGGER:PT0S',
    'END:VALARM',
    'END:VEVENT',
  ];
}

function build(dinner) {
  const offset = dinner - TG.BASE_DINNER;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//aajbaker.com//Thanksgiving 2026//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Thanksgiving 2026',
  ];

  const sun = TG.days.find(d => d.id === 'sun');
  lines.push(...event('tg26-sun-order', sun.date, 10 * 60, 15, '🦃 Order the fresh turkey',
    '12–14 lb, for pickup Monday evening. Fresh birds sell out Thanksgiving week.'));

  for (const id of ['mon', 'tue', 'wed']) {
    const d = TG.days.find(x => x.id === id);
    const desc = d.blurb + '\n\n' + d.tasks.map(t => '• ' + t.title).join('\n');
    lines.push(...event('tg26-' + id, d.date, 18 * 60, 120, 'Thanksgiving prep: ' + d.sub, desc));
  }

  TG.groupRows(offset).forEach((g, i) => {
    const summary = (g.rows.some(r => r.key) ? '🦃 ' : '') + g.rows.map(r => r.s).join(' + ');
    const desc = g.rows.map(r => '• ' + plain(r.t)).join('\n');
    lines.push(...event('tg26-thu-' + i, TG.dinnerDate, g.t, 10, summary, desc));
  });

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

const dir = path.join(__dirname, 'cal');
fs.mkdirSync(dir, { recursive: true });
for (let m = 12 * 60; m <= 19 * 60; m += 30) {
  const name = 'thanksgiving-' + pad(Math.floor(m / 60)) + pad(m % 60) + '.ics';
  fs.writeFileSync(path.join(dir, name), build(m));
}
console.log('Wrote', fs.readdirSync(dir).length, 'calendar files to', dir);
