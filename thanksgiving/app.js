(function () {
  'use strict';

  const TG = window.TG;
  const { fill, fmtTime } = TG.U;
  const KEY = 'tg2026';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  /* ---------- state ---------- */

  const DEFAULTS = { v: 1, checked: {}, guests: 8, dinner: 960, custom: [], hideDone: false, timers: [], lg: false, awake: false, room: null, pending: {}, ver: -1 };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.v === 1) return Object.assign({}, DEFAULTS, s, { checked: s.checked || {}, custom: s.custom || [], timers: s.timers || [], pending: s.pending || {} });
      }
    } catch (e) { /* storage unavailable */ }
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
  let S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  // ?now=2026-11-26T14:40 lets you preview another moment (handy for testing).
  const OVR = new URLSearchParams(location.search).get('now');
  const t0 = Date.now();
  const ovrBase = OVR && !isNaN(new Date(OVR)) ? new Date(OVR).getTime() : null;
  const getNow = () => (ovrBase ? new Date(ovrBase + (Date.now() - t0)) : new Date());

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const F = () => S.guests / TG.BASE_GUESTS;
  const offset = () => S.dinner - TG.BASE_DINNER;
  const q = (text, scales) => fill(esc(text), scales === false ? 1 : F(), s => '<b class="q">' + s + '</b>');

  const ALL_TASKS = TG.days.flatMap(d => d.tasks.map(t => Object.assign({}, t, { day: d.id })));
  const ROW_IDS = TG.rows.map(r => r.id);
  const GEAR_IDS = TG.gear.flatMap(g => g.items.map(i => i.id));
  const DATES = TG.days.map(d => d.date);

  /* ---------- icons ---------- */

  const svg = (d, cls) => '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const I = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    chev: svg('<path d="m9 6 6 6-6 6"/>', 'chev'),
    back: svg('<path d="m15 6-6 6 6 6"/>'),
    people: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 4.6a3.2 3.2 0 0 1 0 6.3M21 20a6 6 0 0 0-3.5-5.5"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    cal: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    share: svg('<path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
    sync: svg('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>'),
    bell: svg('<path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9Z"/><path d="M10 21h4"/>'),
  };

  /* ---------- dates ---------- */

  function localISO(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  /** Index into TG.days for today; -1 before Saturday, 99 after Thursday. */
  function todayIndex() {
    const t = localISO(getNow());
    const i = DATES.indexOf(t);
    if (i >= 0) return i;
    return t < DATES[0] ? -1 : 99;
  }
  const minutesNow = () => { const n = getNow(); return n.getHours() * 60 + n.getMinutes(); };
  const dinnerAt = () => new Date(2026, 10, 26, Math.floor(S.dinner / 60), S.dinner % 60);
  const dayById = id => TG.days.find(d => d.id === id);
  const dateNum = d => Number(d.date.slice(8));

  function fmtDur(m) {
    if (m >= 60) return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
    return m + ' min';
  }
  function fmtLeft(ms) {
    const m = Math.max(0, Math.round(ms / 60000));
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    return h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
  }

  /* ---------- progress ---------- */

  function idsFor(key) {
    if (key === 'shop') return TG.shop.map(s => s.id).concat(S.custom.map(c => c.id));
    if (key === 'gear') return GEAR_IDS;
    if (key === 'prep') return Array.from(new Set(ALL_TASKS.map(t => t.id))).concat(ROW_IDS);
    if (key.startsWith('day:')) {
      const d = key.slice(4);
      return d === 'thu' ? ROW_IDS : ALL_TASKS.filter(t => t.day === d).map(t => t.id);
    }
    if (key.startsWith('sec:')) {
      const sec = key.slice(4);
      return sec === 'extras' ? S.custom.map(c => c.id) : TG.shop.filter(s => s.sec === sec).map(s => s.id);
    }
    if (key.startsWith('gear:')) return TG.gear[Number(key.slice(5))].items.map(i => i.id);
    if (key.startsWith('ing:')) { const r = key.slice(4); return TG.dishes[r].ingredients.map((_, i) => 'i:' + r + ':' + i); }
    return [];
  }
  function prog(key) { const ids = idsFor(key); return [ids.filter(id => S.checked[id]).length, ids.length]; }
  function pgHTML(key) {
    const [d, t] = prog(key);
    const pct = t ? Math.round(d / t * 100) : 0;
    return '<span class="pg' + (t && d === t ? ' full' : '') + '" data-pg="' + key + '"><span class="pg-bar"><i style="width:' + pct + '%"></i></span><span class="pg-n">' + d + '/' + t + '</span></span>';
  }
  function refreshPG() {
    $$('[data-pg]').forEach(el => {
      const [d, t] = prog(el.dataset.pg);
      el.classList.toggle('full', t > 0 && d === t);
      const i = el.querySelector('i'); if (i) i.style.width = (t ? d / t * 100 : 0) + '%';
      const n = el.querySelector('.pg-n'); if (n) n.textContent = d + '/' + t;
      const num = el.querySelector('.pg-num'); if (num) num.innerHTML = d + '<small> / ' + t + '</small>';
    });
  }

  /* ---------- shared components ---------- */

  function row(id, body, opts) {
    opts = opts || {};
    const on = !!S.checked[id];
    return '<div class="row' + (on ? ' done' : '') + (opts.cls ? ' ' + opts.cls : '') + '" data-check="' + esc(id) + '" role="checkbox" aria-checked="' + on + '" tabindex="0">' +
      '<span class="box">' + I.check + '</span><div class="row-body">' + body + '</div>' + (opts.after || '') + '</div>';
  }

  function dishName(id) {
    if (TG.dishes[id]) return TG.dishes[id].short;
    return id === 'oven' ? 'Oven' : 'Table';
  }
  function dishTags(ids) {
    if (!ids || !ids.length) return '';
    return '<div class="tags">' + ids.map(id => '<span class="tag d-' + id + '">' + esc(dishName(id)) + '</span>').join('') + '</div>';
  }
  const badge = r => (r.veg ? '<span class="badge veg">Veg</span>' : '<span class="badge meat">Not veg</span>');

  function timerBtns(timers, prefix) {
    if (!timers || !timers.length) return '';
    return '<div class="timers">' + timers.map(t => {
      const label = (prefix ? prefix + ': ' : '') + t.l;
      const running = S.timers.some(x => x.label === label && !x.rang);
      return '<button class="tbtn' + (running ? ' running' : '') + '" data-timer="' + t.m + '" data-label="' + esc(label) + '">' + I.play + fmtDur(t.m) + ' · ' + esc(t.l.toLowerCase()) + '</button>';
    }).join('') + '</div>';
  }
  const rowPrefix = r => { const d = r.dish.find(x => TG.dishes[x]); return d ? TG.dishes[d].short : ''; };

  function stepLi(rid, day, i, s, r) {
    const id = 'st:' + rid + ':' + day + ':' + i;
    const on = !!S.checked[id];
    return '<li class="step' + (on ? ' done' : '') + '" data-check="' + id + '" role="checkbox" aria-checked="' + on + '" tabindex="0"><div class="step-t">' + q(s.t, r.scales) + timerBtns(s.timers, r.short) + '</div></li>';
  }

  function taskBlock(t, opts) {
    opts = opts || {};
    const r = t.recipe && TG.dishes[t.recipe];
    let body = '<div class="row-title">' + esc(t.title) + (r && !r.veg ? ' <span class="badge meat">Not veg</span>' : '') + '</div>';
    if (t.detail) body += '<div class="row-note">' + q(t.detail) + '</div>';
    if (opts.showDay) body += '<div class="row-note">From ' + esc(dayById(t.day).name) + '</div>';
    if (r) body += dishTags([t.recipe]);
    let steps = '';
    if (r && !opts.compact) {
      const ph = r.phases.find(p => p.day === t.phase);
      steps = '<ol class="steps">' + ph.steps.map((s, i) => stepLi(t.recipe, ph.day, i, s, r)).join('') + '</ol>';
    }
    const foot = [];
    if (t.link) foot.push('<a href="' + t.link + '">' + esc(t.linkLabel || 'Open') + ' →</a>');
    if (r) foot.push('<a href="#/cook/' + t.recipe + '">Full recipe →</a>');
    if (t.action === 'settings') foot.push('<a href="#" data-act="settings">' + esc(t.actionLabel) + ' →</a>');
    return '<div class="task">' + row(t.id, body, { cls: t.critical ? 'crit' : '' }) + steps +
      (foot.length ? '<div class="task-foot">' + foot.join('') + '</div>' : '') + '</div>';
  }

  function setupChips() {
    return '<div class="chips"><button class="chip" data-act="settings">' + I.people + S.guests + ' guests</button>' +
      '<button class="chip" data-act="settings">' + I.clock + 'Dinner ' + fmtTime(S.dinner) + '</button>' +
      (S.room ? syncBadge('chip') : '') + '</div>';
  }

  function syncBadge(cls) {
    return '<a class="' + cls + ' sync-' + syncStatus + '" data-sync href="#/guide/sync"><i class="sdot"></i><span class="sync-t">' + esc(syncLabel()) + '</span></a>';
  }

  function guestNotesFor(dish) {
    return TG.guestNotes(S.guests).filter(n => !dish || n.dish === dish);
  }

  /* ---------- Thursday timeline ---------- */

  function timelineHTML(live) {
    const groups = TG.groupRows(offset());
    const n = live ? minutesNow() : null;
    let html = '<div class="tl">';
    let placed = false;
    groups.forEach((g, gi) => {
      const next = groups[gi + 1];
      let cls = '';
      if (n !== null) {
        if (next && n >= next.t) cls = ' past';
        else if (n >= g.t) cls = ' now';
        if (!placed && g.t > n) { html += '<div class="nowline"><span>Now</span><i></i></div>'; placed = true; }
      }
      const allDone = g.rows.every(r => S.checked[r.id]);
      const key = g.rows.some(r => r.key);
      html += '<div class="tl-g' + cls + (allDone ? ' allDone' : '') + (key ? ' key' : '') + '" data-group="' + gi + '">' +
        '<div class="tl-time">' + (g.approx ? '~' : '') + fmtTime(g.t, { noAmPm: true }) + '<small>' + (g.t >= 720 ? 'PM' : 'AM') + '</small></div>' +
        '<div class="tl-rows">' + g.rows.map(r => row(r.id, '<div class="row-title">' + q(r.t) + '</div>' + dishTags(r.dish) + timerBtns(r.timers, rowPrefix(r)))).join('') + '</div></div>';
    });
    return html + '</div>';
  }

  function liveHTML() {
    const groups = TG.groupRows(offset());
    const n = minutesNow();
    let cur = null;
    let nxt = null;
    for (const g of groups) { if (g.t <= n) cur = g; else { nxt = g; break; } }
    const toDinner = dinnerAt() - getNow();
    let h = '<div class="card live" id="live">';
    if (!cur && nxt) {
      h += '<div class="lbl">First up · ' + fmtTime(nxt.t) + '</div><div class="big">' + esc(nxt.rows.map(r => r.s).join(' · ')) + '</div>' +
        '<div class="in">In ' + fmtLeft((nxt.t - n) * 60000) + '. The turkey goes in at ' + fmtTime(S.dinner - 135) + '.</div>';
    } else if (cur && nxt) {
      h += '<div class="lbl">Now · ' + (cur.approx ? '~' : '') + fmtTime(cur.t) + '</div><div class="big">' + esc(cur.rows.map(r => r.s).join(' · ')) + '</div>' +
        '<div class="in"><b>Next at ' + fmtTime(nxt.t) + '</b> (in ' + fmtLeft((nxt.t - n) * 60000) + '): ' + esc(nxt.rows.map(r => r.s).join(', ')) + '</div>' +
        '<div class="in" style="margin-top:6px">Dinner in ' + fmtLeft(toDinner) + '</div>';
    } else {
      const by = fmtTime(S.dinner + 120);
      h += '<div class="lbl">Dinner is served</div><div class="big">Happy Thanksgiving</div>' +
        '<div class="in">Leftovers go in the fridge by <b>' + by + '</b> (within 2 hours) and keep 3–4 days. Carve the leftover turkey off the bone first so it cools fast.</div>';
    }
    return h + '</div>';
  }

  /* ---------- views ---------- */

  function viewToday() {
    const ti = todayIndex();
    const now = getNow();
    const msLeft = dinnerAt() - now;
    const daysLeft = Math.round((new Date(2026, 10, 26) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    let headline = daysLeft + ' days to go';
    if (daysLeft === 1) headline = 'Tomorrow’s the day';
    if (ti === 5) headline = msLeft > 0 ? 'It’s Thanksgiving' : 'Happy Thanksgiving';
    if (ti === 99) headline = 'Leftovers';

    let h = '<header class="head"><div class="eyebrow">Thanksgiving 2026</div><h1 class="title">' + headline + '</h1>' +
      '<p class="lede" style="margin:0">Thursday, Nov 26 · Dinner at ' + fmtTime(S.dinner) + '</p>' + setupChips() + '</header>';

    if (ti < 5 && ti !== 99) {
      const m = Math.max(0, Math.floor(msLeft / 60000));
      h += '<div class="card countdown"><div><b>' + Math.floor(m / 1440) + '</b><span>days</span></div><div><b>' + Math.floor(m % 1440 / 60) + '</b><span>hours</span></div><div><b>' + (m % 60) + '</b><span>min</span></div></div>';
    }

    if (!S.checked['t:sun-order'] && ti <= 2) {
      h += '<div class="alert" style="margin-top:12px"><div class="ico">🦃</div><div><b>Order the fresh turkey' + (ti <= 1 ? ' by Sunday' : ' now') + '</b>' +
        '<p>12–14 lb, for pickup Tuesday. Fresh birds sell out Thanksgiving week.</p>' +
        '<button class="btn btn-sm btn-primary" data-toggle="t:sun-order">Mark it ordered</button></div></div>';
    }

    if (ti === 5) {
      h += liveHTML();
      h += '<h2 class="h2">Thursday timeline ' + pgHTML('day:thu') + '</h2>' + timelineHTML(true);
    } else if (ti === 99) {
      h += '<div class="card card-pad"><div class="h3">Leftovers</div><p class="muted" style="margin:0">Eat them within 3–4 days of Thursday, so by about Monday, Nov 30. Leftovers should have gone in the fridge within 2 hours of serving.</p></div>';
    } else {
      const day = TG.days[Math.max(0, ti)];
      h += '<h2 class="h2">' + (ti < 0 ? 'First up · ' : 'Today · ') + esc(day.name) + ' ' + pgHTML('day:' + day.id) + '</h2>';
      h += '<p class="lede small" style="margin:-4px 2px 10px">' + esc(day.blurb) + (day.est ? ' <b>' + esc(day.est) + '.</b>' : '') + '</p>';
      h += '<div class="card list">' + day.tasks.map(t => taskBlock(t)).join('') + '</div>';
    }

    // Carry-over from earlier days
    if (ti > 0) {
      const earlier = TG.days.slice(0, Math.min(ti, 5)).map(d => d.id);
      const left = ALL_TASKS.filter(t => earlier.includes(t.day) && !S.checked[t.id] && !(ti <= 5 && TG.days[ti] && TG.days[ti].tasks.some(x => x.id === t.id)));
      if (left.length) {
        h += '<h2 class="h2">Still to do from earlier</h2><div class="card list">' + left.map(t => taskBlock(t, { showDay: true })).join('') + '</div>';
      }
    }

    // Tomorrow preview
    if (ti >= -1 && ti < 5) {
      const nd = TG.days[ti + 1];
      if (nd) {
        const items = nd.thursday ? ['Turkey in at ' + fmtTime(S.dinner - 135), 'Dinner at ' + fmtTime(S.dinner)] : nd.tasks.map(t => t.title);
        h += '<h2 class="h2">' + (ti < 0 ? 'Then' : 'Tomorrow') + ' · ' + esc(nd.name) + '<a class="tiny" href="#/plan/' + nd.id + '" style="text-transform:none;letter-spacing:0">See the day →</a></h2>' +
          '<div class="card card-pad"><ul class="bul" style="padding:0 0 0 18px;margin:0">' + items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
      }
    }

    // Progress
    const stat = (key, label, href) => {
      const [d, t] = prog(key);
      return '<a class="stat" href="' + href + '" data-pg="' + key + '"><div class="lbl">' + label + '</div><div class="num pg-num">' + d + '<small> / ' + t + '</small></div><div class="pg-bar"><i style="width:' + (t ? d / t * 100 : 0) + '%"></i></div></a>';
    };
    h += '<h2 class="h2">Progress</h2><div class="card stats">' + stat('shop', 'Groceries', '#/shop') + stat('prep', 'Prep steps', '#/plan') + stat('gear', 'Gear', '#/shop/gear') + '</div>';

    h += '<h2 class="h2">The menu</h2><div class="card board" id="board">' + boardHTML() + '</div>';
    h += '<p class="foot">' + (S.room ? 'Live sync is on. Changes from other phones show up within a few seconds.' : 'Checkmarks are saved on this phone. Turn on live sync in Guide to share them.') + '</p>';
    return h;
  }

  function boardHTML() {
    return TG.dishOrder.map(id => {
      const d = TG.dishes[id];
      const tasks = ALL_TASKS.filter(t => t.recipe === id);
      const done = tasks.length && tasks.every(t => S.checked[t.id]);
      const thuRows = TG.rows.filter(r => r.dish.includes(id));
      const served = thuRows.length && thuRows.every(r => S.checked[r.id]);
      const st = served ? '<span class="st ok">✓ Ready</span>' : done ? '<span class="st ok">✓ Prepped</span>' : '<span class="st">' + esc(d.makeAhead) + '</span>';
      return '<a class="d-' + id + '" href="#/cook/' + id + '"><span class="dot"></span><span><div class="nm">' + esc(d.name) + '</div>' + st + '</span></a>';
    }).join('');
  }

  function viewShop(sub) {
    const gear = sub === 'gear';
    let h = '<header class="head"><div class="eyebrow">' + (gear ? 'Check by Saturday' : 'Monday evening') + '</div><h1 class="title">' + (gear ? 'Gear' : 'Shopping') + '</h1>' +
      '<p class="lede" style="margin:0">' + (gear
        ? 'The two you can’t skip are poultry shears for the backbone and an instant-read thermometer.'
        : 'One shop on Monday evening for everything but the turkey, and all of it keeps until Thursday. Quantities are for ' + S.guests + ' guests.') + '</p></header>';
    h += '<nav class="seg"><a href="#/shop" class="' + (gear ? '' : 'on') + '">Groceries</a><a href="#/shop/gear" class="' + (gear ? 'on' : '') + '">Gear</a></nav>';

    if (gear) {
      h += '<div class="toolbar">' + pgHTML('gear') + '</div>';
      TG.gear.forEach((g, gi) => {
        h += '<h2 class="h2">' + esc(g.name) + ' ' + pgHTML('gear:' + gi) + '</h2><div class="card list">' + g.items.map(it =>
          row(it.id, '<div class="row-title">' + esc(it.n) + (it.must ? '<span class="must">Must have</span>' : '') + (it.opt ? '<span class="opt">Optional</span>' : '') + '</div>' +
            (it.note ? '<div class="row-note">' + esc(it.note) + '</div>' : ''), { cls: it.must ? 'crit' : '' })).join('') + '</div>';
      });
      return h;
    }

    const f = F();
    const turkeyNotes = guestNotesFor('turkey');
    h += '<div class="card list" style="margin-bottom:6px">' +
      row('t:sun-order', '<div class="row-line"><span class="row-title">Turkey ordered</span><span class="row-qty">12–14 lb fresh</span></div><div class="row-note">Do it this weekend. Fresh birds sell out Thanksgiving week.</div>', { cls: 'crit' }) +
      row('s:turkey', '<div class="row-line"><span class="row-title">Turkey picked up</span><span class="row-qty">Tuesday</span></div><div class="row-note">Check that the use-by date is after Thursday. If pickup falls through, a fresh bird bought Wednesday still works.</div>') +
      (turkeyNotes.length ? '<div class="sec-note">' + turkeyNotes.map(n => esc(n.t)).join(' ') + '</div>' : '') + '</div>';

    h += '<div id="shoplist" class="' + (S.hideDone ? 'hide-done' : '') + '">';
    h += '<div class="toolbar" style="margin-top:18px">' + pgHTML('shop') + '<label class="switch">Hide checked <input type="checkbox" data-act="hide"' + (S.hideDone ? ' checked' : '') + '></label></div>';
    TG.shopSections.filter(s => s.id !== 'meat').forEach(sec => {
      const items = TG.shop.filter(s => s.sec === sec.id);
      h += '<h2 class="h2">' + esc(sec.name) + ' ' + pgHTML('sec:' + sec.id) + '</h2><div class="card list">' + items.map(it => {
        const qty = it.q ? it.q(f, S.guests) : '';
        return row(it.id, '<div class="row-line"><span class="row-title">' + esc(it.n) + (it.meat ? ' <span class="badge meat">Not veg</span>' : '') + '</span>' + (qty ? '<span class="row-qty">' + esc(qty) + '</span>' : '') + '</div>' +
          (it.note ? '<div class="row-note">' + esc(it.note) + '</div>' : '') + (it.for ? dishTags(it.for) : ''));
      }).join('') + (sec.note ? '<div class="sec-note">' + esc(sec.note) + '</div>' : '') + '</div>';
    });

    h += '<h2 class="h2">Extras ' + (S.custom.length ? pgHTML('sec:extras') : '') + '</h2><div class="card list">' +
      S.custom.map(c => row(c.id, '<div class="row-title">' + esc(c.n) + '</div>', { after: '<button class="x" data-act="del" data-id="' + esc(c.id) + '" aria-label="Remove ' + esc(c.n) + '">×</button>' })).join('') +
      '<form class="addform" id="addform" autocomplete="off"><input name="item" placeholder="Add an item (pie, flowers…)" maxlength="80" enterkeyhint="done" /><button class="btn btn-primary btn-sm" type="submit">Add</button></form></div>';
    h += '</div>';
    return h;
  }

  function viewPlan(sub) {
    const ti = todayIndex();
    const def = ti < 0 ? 'sat' : ti > 5 ? 'thu' : TG.days[ti].id;
    const sel = dayById(sub) ? sub : def;
    const day = dayById(sel);
    const todayISO = localISO(getNow());

    let h = '<header class="head" style="margin-bottom:8px"><div class="eyebrow">Prep timeline</div><h1 class="title">The plan</h1></header>';
    h += '<nav class="daybar">' + TG.days.map(d => {
      const [dn, tt] = prog('day:' + d.id);
      return '<a class="day' + (d.id === sel ? ' sel' : '') + (d.date === todayISO ? ' today' : '') + (tt && dn === tt ? ' full' : '') + '" href="#/plan/' + d.id + '" data-pg="day:' + d.id + '"><div class="dn">' + d.short + '</div><div class="dd">' + dateNum(d) + '</div><div class="dp"><i style="width:' + (tt ? dn / tt * 100 : 0) + '%"></i></div></a>';
    }).join('') + '</nav>';

    h += '<div class="dayhead"><div class="h3">' + esc(day.name) + ', Nov ' + dateNum(day) + '</div>' +
      '<div class="meta"><span>' + esc(day.sub) + '</span>' + (day.est ? '<span>' + esc(day.est) + '</span>' : '') + pgHTML('day:' + day.id) + '</div>' +
      '<p class="lede small" style="margin:8px 0 0">' + esc(day.blurb) + '</p></div>';

    if (day.thursday) {
      h += '<div class="chips" style="margin:-4px 0 16px"><button class="chip" data-act="settings">' + I.clock + 'Dinner ' + fmtTime(S.dinner) + ' · change</button>' +
        '<a class="chip" href="#/guide/calendar">' + I.bell + 'Get alerts</a></div>';
      h += timelineHTML(ti === 5);
    } else {
      h += '<div class="card list">' + day.tasks.map(t => taskBlock(t)).join('') + '</div>';
    }
    return h;
  }

  function viewCook(sub) {
    if (sub && TG.dishes[sub]) return viewRecipe(sub);
    let h = '<header class="head"><div class="eyebrow">The menu</div><h1 class="title">Cook</h1><p class="lede" style="margin:0">Everything except the turkey and the turkey gravy is vegetarian.</p></header>';
    h += '<div class="card">' + TG.dishOrder.map(id => {
      const d = TG.dishes[id];
      return '<a class="dish d-' + id + '" href="#/cook/' + id + '"><div class="top"><span class="nm">' + esc(d.name) + '</span><span style="display:flex;gap:6px;align-items:center">' + badge(d) + I.chev + '</span></div>' +
        '<p>' + esc(d.approach) + '</p><div class="ma">' + I.clock + esc(d.makeAhead) + '</div></a>';
    }).join('') + '</div>';

    h += '<h2 class="h2">Kitchen timers</h2><div class="card"><p class="small muted" style="margin:0;padding:14px 16px 12px">Recipe steps have their own timer buttons. These are for anything else. The screen stays on while a timer runs, and the alarm needs the ringer on.</p><div class="presets">' +
      [5, 10, 15, 20, 25, 30, 45, 60].map(m => '<button class="tbtn" data-timer="' + m + '" data-label="' + m + '-min timer">' + I.play + m + ' min</button>').join('') +
      '<button class="tbtn" data-act="custom-timer">Custom…</button></div></div>';
    return h;
  }

  function viewRecipe(id) {
    const r = TG.dishes[id];
    let h = '<a class="back" href="#/cook">' + I.back + 'Menu</a>';
    h += '<header class="head rhead"><div class="eyebrow">' + (r.veg ? 'Vegetarian' : 'Not vegetarian') + '</div><h1 class="title">' + esc(r.name) + '</h1>' +
      '<p class="lede" style="margin:0">' + esc(r.approach) + '</p>' +
      '<div class="meta"><span class="pill">' + esc(r.makeAhead) + '</span>' +
      (r.scales ? '<button class="pill chip" style="border:0" data-act="settings">' + (S.guests === TG.BASE_GUESTS ? 'For 8 guests' : 'Scaled for ' + S.guests + ' guests') + '</button>' : '<span class="pill">Same for any headcount</span>') + '</div>';
    if (r.yieldNote) h += '<p class="small muted" style="margin:10px 0 0">' + esc(r.yieldNote) + '</p>';
    guestNotesFor(id).forEach(n => { h += '<div class="note-box">' + esc(n.t) + '</div>'; });
    h += '<div class="btn-row" style="margin-top:14px"><label class="switch">Keep screen on <input type="checkbox" data-act="awake"' + (S.awake ? ' checked' : '') + '></label>' +
      '<label class="switch" style="margin-left:14px">Large text <input type="checkbox" data-act="lg"' + (S.lg ? ' checked' : '') + '></label></div></header>';

    h += '<h2 class="h2">Ingredients ' + pgHTML('ing:' + id) + '</h2><div class="card list">' +
      r.ingredients.map((ing, i) => row('i:' + id + ':' + i, '<div class="row-title" style="font-weight:400">' + q(ing, r.scales) + '</div>')).join('') + '</div>';

    r.phases.forEach(ph => {
      const day = dayById(ph.day);
      h += '<h2 class="h2"><span>' + esc(day.name) + ' · ' + esc(ph.title) + '</span><a class="tiny" style="text-transform:none;letter-spacing:0" href="#/plan/' + ph.day + '">Day plan →</a></h2>' +
        '<div class="card"><ol class="recipe-steps">' + ph.steps.map((s, i) => stepLi(id, ph.day, i, s, r)).join('') + '</ol></div>';
    });

    const thu = TG.rows.filter(x => x.dish.includes(id));
    if (thu.length) {
      h += '<h2 class="h2"><span>Thursday · Finish</span><a class="tiny" style="text-transform:none;letter-spacing:0" href="#/plan/thu">Timeline →</a></h2><div class="card"><ol class="recipe-steps">' +
        thu.map(x => {
          const t = TG.U.hm(x.at) + offset();
          const on = !!S.checked[x.id];
          return '<li class="step' + (on ? ' done' : '') + '" data-check="' + x.id + '" role="checkbox" aria-checked="' + on + '" tabindex="0"><div class="step-t"><span class="at">' + (x.approx ? '~' : '') + fmtTime(t) + '</span>' + q(x.t) + timerBtns(x.timers, rowPrefix(x)) + '</div></li>';
        }).join('') + '</ol></div>';
    }

    if (id === 'turkey' || id === 'stuffing') {
      const rowsT = TG.temps.filter(t => (id === 'turkey' ? t.item.startsWith('Turkey') : t.item === 'Stuffing'));
      h += '<h2 class="h2">Target temperatures</h2><div class="card">' + tempsTable(rowsT) + '</div>';
    }

    if (r.tips.length) {
      h += '<h2 class="h2">If something goes wrong</h2><div class="card">' + r.tips.map(k => tipAcc(k)).join('') + '</div>';
    }
    return h;
  }

  function tempsTable(list) {
    return '<table class="temps"><thead><tr><th>Item</th><th>Pull at</th></tr></thead><tbody>' +
      list.map(t => '<tr><td>' + esc(t.item) + '<small>' + esc(t.note) + '</small></td><td class="t">' + esc(t.pull) + '</td></tr>').join('') + '</tbody></table>';
  }
  function tipAcc(k) {
    const t = TG.tips[k];
    return '<details class="acc"><summary>' + esc(t.q) + '</summary><div class="acc-b">' + esc(t.a) + '</div></details>';
  }

  function calHref() {
    const h = String(Math.floor(S.dinner / 60)).padStart(2, '0') + String(S.dinner % 60).padStart(2, '0');
    return '/thanksgiving/cal/thanksgiving-' + h + '.ics';
  }

  function viewGuide() {
    let h = '<header class="head"><div class="eyebrow">Reference</div><h1 class="title">Guide</h1></header>';

    h += '<h2 class="h2">Your setup</h2><div class="card"><div class="kv"><b>Guests</b><span>' + S.guests + (S.guests === 8 ? ' (the plan’s default, with leftovers)' : '. Quantities are rescaled from the plan’s 8.') + '</span></div>' +
      '<div class="kv"><b>Dinner</b><span>' + fmtTime(S.dinner) + ' on Thursday. The turkey goes in at ' + fmtTime(S.dinner - 135) + '.</span></div>' +
      '<div class="kv"><button class="btn btn-block" data-act="settings">Change setup</button></div></div>';

    h += '<h2 class="h2" id="g-calendar">Phone alerts</h2><div class="card card-pad"><p class="small" style="margin:0 0 12px">Adds a calendar event with an alert for each prep night and every step on Thursday, timed to a ' + fmtTime(S.dinner) + ' dinner. A web page can’t ring while your phone is locked, but a calendar alert can.</p>' +
      '<a class="btn btn-primary btn-block" href="' + calHref() + '">' + I.bell + 'Add alerts to Calendar</a>' +
      '<p class="tiny muted" style="margin:10px 0 0">If you change the dinner time later, delete the old events and add them again.</p></div>';

    h += '<h2 class="h2" id="g-sync">Live sync</h2><div class="card card-pad">';
    if (!S.room) {
      h += '<p class="small" style="margin:0 0 12px">Keep checkmarks, extra items, the guest count and the dinner time in sync across phones. Start it here, then send the invite link to whoever is cooking with you.</p>' +
        '<button class="btn btn-primary btn-block" data-act="sync-start">' + I.sync + 'Start live sync</button>';
    } else {
      h += syncBadge('syncline') + '<p class="small muted sync-msg" style="margin:6px 0 14px">' + esc(syncMsg()) + '</p>' +
        '<div class="btn-row"><button class="btn btn-primary" style="flex:1" data-act="invite">' + I.share + 'Invite</button>' +
        '<button class="btn" style="flex:1" data-act="sync-stop">Stop syncing</button></div>';
    }
    h += '</div>';

    h += '<h2 class="h2">Keeping it vegetarian</h2><div class="card"><ul class="bul" style="padding-top:12px">' + TG.vegRules.map(v => '<li>' + esc(v) + '</li>').join('') + '</ul></div>';
    h += '<h2 class="h2">Target temperatures</h2><div class="card">' + tempsTable(TG.temps) + '</div>';
    h += '<h2 class="h2" id="g-spatchcock">How to spatchcock</h2><div class="card"><ol class="bul" style="padding-top:12px">' + TG.spatchcock.map(s => '<li>' + esc(s) + '</li>').join('') + '</ol></div>';
    h += '<h2 class="h2">If something goes wrong</h2><div class="card">' + Object.keys(TG.tips).map(tipAcc).join('') + '</div>';
    h += '<h2 class="h2">Assumptions</h2><div class="card">' + TG.assumptions.map(a => '<div class="kv"><b>' + esc(a.k) + '</b><span>' + esc(a.v) + '</span></div>').join('') + '</div>';
    h += '<h2 class="h2">Food safety</h2><div class="card card-pad small">Refrigerate leftovers within 2 hours of serving (by ' + fmtTime(S.dinner + 120) + ') and eat them within 3–4 days. Carve the leftover turkey off the bone before you refrigerate it so it cools fast.</div>';
    h += '<div style="margin-top:28px;text-align:center"><button class="btn btn-danger" data-act="reset">Clear all checkmarks</button></div>';
    h += '<p class="foot">Thanksgiving 2026 · aajbaker.com</p>';
    return h;
  }

  /* ---------- render + routing ---------- */

  const $main = document.getElementById('main');
  let route = { tab: null, sub: null };

  function parseHash() {
    const h = location.hash;
    if (h.startsWith('#join=')) return { join: h.slice(6) };
    const p = h.replace(/^#\/?/, '').split('/');
    const tab = ['today', 'shop', 'plan', 'cook', 'guide'].includes(p[0]) ? p[0] : 'today';
    return { tab, sub: p[1] || null };
  }

  function render() {
    const { tab, sub } = route;
    const views = { today: viewToday, shop: viewShop, plan: viewPlan, cook: viewCook, guide: viewGuide };
    $main.innerHTML = views[tab](sub);
    $$('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
    const titles = { today: 'Thanksgiving 2026', shop: 'Shopping', plan: 'The plan', cook: 'Cook', guide: 'Guide' };
    document.title = (tab === 'cook' && TG.dishes[sub]) ? TG.dishes[sub].name : titles[tab];
  }

  function onRoute() {
    const r = parseHash();
    if (r.join) {
      history.replaceState(null, '', '#/today');
      route = { tab: 'today', sub: null };
      render();
      window.scrollTo(0, 0);
      offerJoin(r.join);
      return;
    }
    const changed = r.tab !== route.tab || r.sub !== route.sub;
    route = r;
    render();
    if (r.tab === 'guide' && r.sub) {
      const el = document.getElementById('g-' + r.sub);
      if (el) { el.scrollIntoView(); return; }
    }
    if (changed) window.scrollTo(0, 0);
  }

  function sync() {
    $$('[data-check]').forEach(el => {
      const on = !!S.checked[el.dataset.check];
      el.classList.toggle('done', on);
      el.setAttribute('aria-checked', on);
    });
    $$('.tl-g').forEach(g => {
      const rows = $$('[data-check]', g);
      g.classList.toggle('allDone', rows.length > 0 && rows.every(r => S.checked[r.dataset.check]));
    });
    const board = $('#board'); if (board) board.innerHTML = boardHTML();
    refreshPG();
  }

  function toggle(id, el) {
    if (S.checked[id]) delete S.checked[id];
    else S.checked[id] = 1;
    record('k:' + id, S.checked[id] ? '1' : '0');
    // Finishing every step of a recipe task checks the task off too.
    if (id.startsWith('st:') && S.checked[id]) {
      const [, rid, day] = id.split(':');
      const task = ALL_TASKS.find(t => t.recipe === rid && t.phase === day);
      const ph = TG.dishes[rid].phases.find(p => p.day === day);
      if (task && !S.checked[task.id] && ph.steps.every((_, i) => S.checked['st:' + rid + ':' + day + ':' + i])) {
        S.checked[task.id] = 1;
        record('k:' + task.id, '1');
      }
    }
    save();
    sync();
    if (S.checked[id] && el) {
      el.classList.add('pop', 'just');
      setTimeout(() => el.classList.remove('pop'), 320);
      setTimeout(() => el.classList.remove('just'), 900);
      if (navigator.vibrate) navigator.vibrate(8);
    }
  }

  /* ---------- sheets + toast ---------- */

  const sheetRoot = document.getElementById('sheet-root');
  let sheetKind = null;

  function openSheet(kind, html) {
    sheetKind = kind;
    sheetRoot.innerHTML = '<div class="backdrop"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div></div>';
  }
  function closeSheet() { sheetKind = null; sheetRoot.innerHTML = ''; }

  function settingsHTML() {
    let opts = '';
    for (let m = 12 * 60; m <= 19 * 60; m += 30) opts += '<option value="' + m + '"' + (m === S.dinner ? ' selected' : '') + '>' + fmtTime(m) + '</option>';
    const notes = guestNotesFor();
    return '<h3>Setup</h3><p class="muted small" style="margin:0 0 8px">Quantities and Thursday times update everywhere.</p>' +
      '<div class="field"><div class="fl"><b>Guests</b><span>The plan was written for 8, with leftovers</span></div><div class="stepper"><button data-act="g-" aria-label="Fewer guests">−</button><output>' + S.guests + '</output><button data-act="g+" aria-label="More guests">+</button></div></div>' +
      (notes.length ? '<div class="notes">' + notes.map(n => '<div class="note-box" style="margin:0 0 10px">' + esc(n.t) + '</div>').join('') + '</div>' : '') +
      '<div class="field"><div class="fl"><b>Dinner time</b><span>The turkey goes in at ' + fmtTime(S.dinner - 135) + '</span></div><select class="sel" data-act="dinner" aria-label="Dinner time">' + opts + '</select></div>' +
      '<div class="field"><div class="fl"><b>Large text</b><span>Easier to read while cooking</span></div><label class="switch"><input type="checkbox" data-act="lg"' + (S.lg ? ' checked' : '') + ' aria-label="Large text"></label></div>' +
      '<div class="field"><div class="fl"><b>Keep screen on</b><span>Always on while a timer runs</span></div><label class="switch"><input type="checkbox" data-act="awake"' + (S.awake ? ' checked' : '') + ' aria-label="Keep screen on"></label></div>' +
      '<button class="btn btn-primary btn-block" style="margin-top:8px" data-act="close">Done</button>';
  }
  function openSettings() { openSheet('settings', settingsHTML()); }
  function refreshSettings() { if (sheetKind === 'settings') $('.sheet', sheetRoot).innerHTML = '<div class="grab"></div>' + settingsHTML(); }

  let toastT = null;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- live sync ---------- */
  // Each shared plan is a "room" on /api/thanksgiving. Local changes queue in
  // S.pending (kept across reloads, so nothing is lost offline) and are sent
  // right away; other phones' changes are pulled every few seconds.

  const API = '/api/thanksgiving';
  const ROOM_RE = /^[a-z0-9]{12,32}$/;
  let syncStatus = S.room ? 'connecting' : 'off';
  let flushing = false;
  let epoch = 0;
  let pollT = null;
  let flushT = null;

  function syncLabel() {
    if (!S.room) return 'Not syncing';
    if (syncStatus === 'ok') return 'Synced';
    if (syncStatus === 'offline') return Object.keys(S.pending).length ? 'Offline · will sync' : 'Offline';
    if (syncStatus === 'nostore') return 'Sync not set up yet';
    return 'Connecting…';
  }
  function syncMsg() {
    if (syncStatus === 'nostore') return 'The sync database isn’t connected yet. Your changes are saved and will sync as soon as it is.';
    if (syncStatus === 'offline') return 'Can’t reach the sync server. Your changes are saved and will sync when you’re back online.';
    return 'Changes from other phones show up within a few seconds while the app is open.';
  }
  function setSyncStatus(st) {
    syncStatus = st;
    $$('[data-sync]').forEach(el => {
      el.classList.remove('sync-ok', 'sync-offline', 'sync-nostore', 'sync-connecting', 'sync-off');
      el.classList.add('sync-' + st);
      const t = el.querySelector('.sync-t'); if (t) t.textContent = syncLabel();
    });
    $$('.sync-msg').forEach(el => { el.textContent = syncMsg(); });
  }

  function record(k, v) {
    if (!S.room) return;
    S.pending[k] = String(v);
    save();
    clearTimeout(flushT);
    flushT = setTimeout(flush, 200);
  }

  async function post(room, ops) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room, ops }) });
    if (r.status === 503) { const e = new Error('nostore'); e.nostore = true; throw e; }
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }

  async function flush() {
    if (!S.room || flushing) return;
    const keys = Object.keys(S.pending);
    if (!keys.length) return;
    const ops = {};
    keys.slice(0, 400).forEach(k => { ops[k] = S.pending[k]; });
    const room = S.room;
    flushing = true;
    let ok = false;
    try {
      const j = await post(room, ops);
      if (S.room === room) {
        Object.keys(ops).forEach(k => { if (S.pending[k] === ops[k]) delete S.pending[k]; });
        epoch++;
        // If nobody else wrote in between, we're already up to date.
        if (j.v === S.ver + 1) S.ver = j.v; else schedulePoll(0);
        save();
        setSyncStatus('ok');
        ok = true;
      }
    } catch (e) {
      setSyncStatus(e.nostore ? 'nostore' : 'offline');
    } finally {
      flushing = false;
    }
    if (ok && Object.keys(S.pending).length) flush();
  }

  function schedulePoll(ms) {
    clearTimeout(pollT);
    if (S.room) pollT = setTimeout(poll, ms);
  }

  async function poll() {
    if (!S.room || document.visibilityState !== 'visible') return; // resumes on visibilitychange
    if (flushing) { schedulePoll(800); return; }
    const ep = epoch;
    const room = S.room;
    let next = 5000;
    try {
      const r = await fetch(API + '?room=' + room + '&v=' + S.ver, { cache: 'no-store' });
      if (r.status === 503) { setSyncStatus('nostore'); next = 30000; }
      else if (!r.ok) throw new Error('http ' + r.status);
      else {
        const j = await r.json();
        if (S.room !== room) return;
        if (ep !== epoch || flushing) next = 0; // a write landed mid-request; ask again
        else {
          if (j.data) applyServer(j.data);
          S.ver = j.v;
          save();
          setSyncStatus('ok');
          if (Object.keys(S.pending).length) flush();
        }
      }
    } catch (e) {
      setSyncStatus('offline');
      next = 10000;
    }
    schedulePoll(next);
  }

  function applyServer(data) {
    const before = JSON.stringify([S.guests, S.dinner, S.custom]);
    const checked = {};
    const custom = [];
    let g = S.guests;
    let d = S.dinner;
    const put = (k, v) => {
      if (k === 'g') { const n = Number(v); if (n >= 2 && n <= 24) g = n; }
      else if (k === 'd') { const n = Number(v); if (n >= 720 && n <= 1140) d = n; }
      else if (k.startsWith('k:')) { if (v === '1') checked[k.slice(2)] = 1; else delete checked[k.slice(2)]; }
      else if (k.startsWith('x:')) {
        const id = k.slice(2);
        const i = custom.findIndex(c => c.id === id);
        if (v) { if (i < 0) custom.push({ id, n: v }); else custom[i].n = v; }
        else if (i >= 0) custom.splice(i, 1);
      }
    };
    Object.keys(data).forEach(k => put(k, data[k]));
    // Local changes that haven't reached the server yet win.
    Object.keys(S.pending).forEach(k => put(k, S.pending[k]));
    custom.sort((a, b) => (a.id < b.id ? -1 : 1));
    S.checked = checked;
    S.guests = g;
    S.dinner = d;
    S.custom = custom;
    save();
    if (JSON.stringify([S.guests, S.dinner, S.custom]) !== before) rerender();
    else sync();
  }

  /** Re-render without losing a half-typed extra item. */
  function rerender() {
    const a = document.activeElement;
    const typing = a && a.closest && a.closest('#addform') ? a.value : null;
    render();
    refreshSettings();
    if (typing !== null) { const n = $('#addform input'); if (n) { n.value = typing; n.focus(); } }
  }

  function allOps(withSetup) {
    const ops = {};
    if (withSetup) { ops.g = String(S.guests); ops.d = String(S.dinner); }
    Object.keys(S.checked).forEach(id => { ops['k:' + id] = '1'; });
    S.custom.forEach(c => { ops['x:' + c.id] = c.n; });
    return ops;
  }

  function makeCode() {
    const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
    const a = new Uint8Array(14);
    crypto.getRandomValues(a);
    return Array.from(a, b => abc[b % abc.length]).join('');
  }

  function joinRoom(room, ops) {
    S.room = room;
    S.pending = ops;
    S.ver = -1;
    save();
    setSyncStatus('connecting');
    render();
    flush().then(() => schedulePoll(0));
  }

  function startSync() {
    joinRoom(makeCode(), allOps(true));
    openInvite(true);
  }

  function stopSync() {
    clearTimeout(pollT);
    clearTimeout(flushT);
    S.room = null;
    S.pending = {};
    S.ver = -1;
    save();
    setSyncStatus('off');
    closeSheet();
    render();
    toast('Stopped syncing on this phone');
  }

  const inviteUrl = () => location.origin + '/thanksgiving/#join=' + S.room;

  function openInvite(fresh) {
    openSheet('invite', '<h3>' + (fresh ? 'Live sync is on' : 'Invite someone') + '</h3>' +
      '<p class="muted">Anyone who opens this link joins this plan, so send it only to the people cooking with you. Checkmarks, extra items, the guest count and the dinner time all stay in sync.</p>' +
      '<div class="codebox">' + esc(inviteUrl().replace(/^https?:\/\//, '')) + '</div>' +
      (navigator.share ? '<button class="btn btn-primary btn-block" data-act="invite-send">' + I.share + 'Send invite link</button>' : '') +
      '<button class="btn btn-block" style="margin-top:8px" data-act="invite-copy">Copy link</button>' +
      '<button class="btn btn-block" style="margin-top:8px;border:0" data-act="close">Done</button>');
  }

  function offerJoin(room) {
    if (!ROOM_RE.test(room)) { toast('That invite link didn’t work'); return; }
    if (S.room === room) { toast('This phone is already synced to that plan'); return; }
    openSheet('join', '<h3>Join the shared plan?</h3><p class="muted">Checkmarks, extra shopping items, the guest count and the dinner time will stay in sync with everyone using this link. Anything already checked on this phone gets added' +
      (S.room ? ', and this replaces the plan you’re syncing with now' : '') + '.</p>' +
      '<div class="btn-row" style="margin-top:16px"><button class="btn" style="flex:1" data-act="close">Cancel</button><button class="btn btn-primary" style="flex:1" data-act="join" data-room="' + esc(room) + '">Join</button></div>');
  }

  /* ---------- timers ---------- */

  let audioCtx = null;
  function unlockAudio() {
    try {
      if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* no audio */ }
  }
  function beep() {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = audioCtx.currentTime;
      [0, 0.22, 0.44].forEach(dt => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, t + dt);
        g.gain.exponentialRampToValueAtTime(0.5, t + dt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.18);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t + dt); o.stop(t + dt + 0.2);
      });
    } catch (e) { /* ignore */ }
  }

  function startTimer(min, label) {
    unlockAudio();
    if (S.timers.some(t => t.label === label && !t.rang)) { toast(label + ' is already running'); return; }
    S.timers.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), label, end: Date.now() + min * 60000 });
    save();
    toast(label + ' · ' + fmtDur(min));
    tick();
    updateWake();
  }
  function removeTimer(id) {
    S.timers = S.timers.filter(t => t.id !== id);
    save();
    tick();
    updateWake();
  }

  const dock = document.getElementById('dock');
  let lastBeep = 0;
  let baseTitle = '';
  function tick() {
    const now = Date.now();
    let ringing = false;
    S.timers.forEach(t => {
      if (!t.rang && t.end <= now) { t.rang = true; save(); }
      if (t.rang) ringing = true;
    });
    if (!S.timers.length) {
      dock.hidden = true;
      document.body.classList.remove('has-dock');
    } else {
      dock.hidden = false;
      document.body.classList.add('has-dock');
      const list = S.timers.slice().sort((a, b) => a.end - b.end);
      dock.innerHTML = list.map(t => {
        const left = Math.max(0, Math.ceil((t.end - now) / 1000));
        const v = t.rang ? 'Done!' : (left >= 3600 ? Math.floor(left / 3600) + ':' + String(Math.floor(left % 3600 / 60)).padStart(2, '0') + ':' : Math.floor(left / 60) + ':') + String(left % 60).padStart(2, '0');
        return '<button class="tmr' + (t.rang ? ' ring' : '') + '" data-tmr="' + t.id + '" aria-label="' + esc(t.label) + (t.rang ? ', done. Tap to dismiss' : ', ' + v + ' left') + '"><div><div class="tl-l">' + esc(t.label) + '</div><div class="tl-v">' + v + '</div></div><span class="tx" role="img" aria-label="' + (t.rang ? 'Dismiss' : 'Cancel') + '">' + (t.rang ? '✓' : '×') + '</span></button>';
      }).join('');
    }
    $$('[data-timer]').forEach(b => b.classList.toggle('running', S.timers.some(t => t.label === b.dataset.label && !t.rang)));
    if (ringing) {
      if (now - lastBeep > 2500) {
        lastBeep = now;
        beep();
        if (navigator.vibrate) navigator.vibrate([250, 100, 250]);
      }
      if (!baseTitle) baseTitle = document.title;
      document.title = (Math.floor(now / 1000) % 2) ? '⏰ Timer done' : baseTitle;
    } else if (baseTitle) {
      document.title = baseTitle;
      baseTitle = '';
    }
  }

  let wake = null;
  async function updateWake() {
    const want = S.awake || S.timers.length > 0;
    try {
      if (want && !wake && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        wake = await navigator.wakeLock.request('screen');
        wake.addEventListener('release', () => { wake = null; });
      } else if (!want && wake) {
        await wake.release();
        wake = null;
      }
    } catch (e) { wake = null; }
  }

  /* ---------- events ---------- */

  function doAct(act, el) {
    if (act === 'settings') openSettings();
    else if (act === 'close') closeSheet();
    else if (act === 'g-' || act === 'g+') {
      S.guests = Math.min(24, Math.max(2, S.guests + (act === 'g+' ? 1 : -1)));
      record('g', S.guests);
      save(); refreshSettings(); render();
    } else if (act === 'del') {
      const id = el.dataset.id;
      S.custom = S.custom.filter(c => c.id !== id);
      if (S.checked[id]) record('k:' + id, '0');
      delete S.checked[id];
      record('x:' + id, '');
      save(); render();
    } else if (act === 'sync-start') startSync();
    else if (act === 'sync-stop') {
      openSheet('stop', '<h3>Stop syncing?</h3><p class="muted">This phone keeps its checkmarks but stops sending and receiving changes. You can rejoin later from the invite link.</p>' +
        '<div class="btn-row" style="margin-top:16px"><button class="btn" style="flex:1" data-act="close">Cancel</button><button class="btn btn-primary" style="flex:1" data-act="sync-stop-yes">Stop</button></div>');
    } else if (act === 'sync-stop-yes') stopSync();
    else if (act === 'invite') openInvite(false);
    else if (act === 'invite-send') navigator.share({ title: 'Thanksgiving plan', text: 'Join our Thanksgiving plan', url: inviteUrl() }).catch(() => {});
    else if (act === 'invite-copy') {
      const url = inviteUrl();
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Invite link copied'), () => prompt('Copy this link', url));
      else prompt('Copy this link', url);
    } else if (act === 'join') {
      closeSheet();
      joinRoom(el.dataset.room, allOps(false));
      toast('Joined the shared plan');
    }
    else if (act === 'reset') {
      openSheet('reset', '<h3>Clear all checkmarks?</h3><p class="muted">This unchecks everything' + (S.room ? ' for everyone on the shared plan' : ' on this phone') + ': shopping, gear, prep and recipe steps. The guest count, dinner time and extra items stay.</p>' +
        '<div class="btn-row" style="margin-top:16px"><button class="btn" style="flex:1" data-act="close">Cancel</button><button class="btn btn-primary" style="flex:1" data-act="reset-yes">Clear</button></div>');
    } else if (act === 'reset-yes') {
      Object.keys(S.checked).forEach(id => record('k:' + id, '0'));
      S.checked = {};
      save(); closeSheet(); render(); toast('All checkmarks cleared');
    } else if (act === 'custom-timer') {
      openSheet('timer', '<h3>Custom timer</h3><form id="tform" autocomplete="off"><div class="field"><div class="fl"><b>Minutes</b></div><input class="sel" name="m" type="number" inputmode="numeric" min="1" max="600" value="12" style="width:96px;text-align:center" /></div>' +
        '<div class="field"><div class="fl"><b>Label</b></div><input class="sel" name="l" placeholder="Pie" maxlength="30" style="width:60%" /></div>' +
        '<button class="btn btn-primary btn-block" type="submit" style="margin-top:8px">Start</button></form>');
    }
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (t.classList && t.classList.contains('backdrop')) { closeSheet(); return; }
    const tb = t.closest('[data-timer]');
    if (tb) { e.preventDefault(); startTimer(Number(tb.dataset.timer), tb.dataset.label); return; }
    const tm = t.closest('[data-tmr]');
    if (tm) {
      const timer = S.timers.find(x => x.id === tm.dataset.tmr);
      if (!timer) return;
      if (timer.rang || t.closest('.tx')) removeTimer(timer.id);
      else { const d = new Date(timer.end); toast(timer.label + ' ends at ' + fmtTime(d.getHours() * 60 + d.getMinutes()) + '. Tap × to cancel.'); }
      return;
    }
    const tg = t.closest('[data-toggle]');
    if (tg) { toggle(tg.dataset.toggle); render(); return; }
    const act = t.closest('[data-act]');
    if (act && act.tagName !== 'INPUT' && act.tagName !== 'SELECT') { e.preventDefault(); doAct(act.dataset.act, act); return; }
    if (t.closest('a, button, input, select, label, summary, form')) return;
    const ck = t.closest('[data-check]');
    if (ck) toggle(ck.dataset.check, ck);
  });

  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-check]')) {
      e.preventDefault();
      toggle(e.target.dataset.check, e.target);
    }
    if (e.key === 'Escape' && sheetKind) closeSheet();
  });

  document.addEventListener('change', e => {
    const a = e.target.dataset && e.target.dataset.act;
    if (a === 'dinner') { S.dinner = Number(e.target.value); record('d', S.dinner); save(); refreshSettings(); render(); }
    else if (a === 'lg') { S.lg = e.target.checked; save(); document.documentElement.classList.toggle('lg', S.lg); $$('input[data-act="lg"]').forEach(i => { i.checked = S.lg; }); }
    else if (a === 'awake') { S.awake = e.target.checked; save(); updateWake(); $$('input[data-act="awake"]').forEach(i => { i.checked = S.awake; }); }
    else if (a === 'hide') { S.hideDone = e.target.checked; save(); const l = $('#shoplist'); if (l) l.classList.toggle('hide-done', S.hideDone); }
  });

  document.addEventListener('submit', e => {
    if (e.target.id === 'addform') {
      e.preventDefault();
      const v = e.target.item.value.trim();
      if (!v) return;
      const item = { id: 'c:' + Date.now().toString(36), n: v.slice(0, 80) };
      S.custom.push(item);
      record('x:' + item.id, item.n);
      save(); render();
      const inp = $('#addform input'); if (inp) inp.focus();
    } else if (e.target.id === 'tform') {
      e.preventDefault();
      const m = Math.round(Number(e.target.m.value));
      if (!(m >= 1 && m <= 600)) { toast('Enter 1 to 600 minutes'); return; }
      const l = e.target.l.value.trim() || m + '-min timer';
      closeSheet();
      startTimer(m, l.slice(0, 30));
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateWake(); tick();
      if (route.tab === 'today' || route.tab === 'plan') render();
      if (S.room) { flush(); schedulePoll(0); }
    }
  });
  window.addEventListener('online', () => { if (S.room) { flush(); schedulePoll(0); } });

  /* ---------- boot ---------- */

  document.documentElement.classList.toggle('lg', S.lg);
  window.addEventListener('hashchange', onRoute);
  onRoute();
  tick();
  updateWake();
  if (S.room) { flush(); schedulePoll(0); }
  setInterval(() => { if (S.timers.length) tick(); }, 1000);
  setInterval(() => {
    if (sheetKind) return;
    if (route.tab === 'today' || (route.tab === 'plan' && todayIndex() === 5)) render();
  }, 30000);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('/thanksgiving/sw.js', { scope: '/thanksgiving/' }).catch(() => {});
  }
})();
