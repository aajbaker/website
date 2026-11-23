/* Thanksgiving 2026 game plan: all of the content lives in this file.
   Quantities inside {{ }} are written for 8 guests and rescale with the
   guest count. Thursday times are written for a 4:00 PM dinner and shift
   with the dinner time. */
(function (root) {
  'use strict';

  const BASE_GUESTS = 8;
  const BASE_DINNER = 16 * 60; // minutes after midnight

  /* ---------- quantity helpers ---------- */

  const PLURAL = {
    stick: 'sticks', cup: 'cups', onion: 'onions', carrot: 'carrots', stalk: 'stalks',
    clove: 'cloves', egg: 'eggs', carton: 'cartons', loaf: 'loaves', orange: 'oranges', lemon: 'lemons',
    bag: 'bags', bunch: 'bunches', head: 'heads', bottle: 'bottles', quart: 'quarts',
  };
  const SINGULAR = Object.fromEntries(Object.entries(PLURAL).map(([s, p]) => [p, s]));
  const COUNT_WORDS = ['onion', 'carrot', 'stalk', 'clove', 'egg', 'loaf', 'orange', 'bag', 'bunch', 'head', 'bottle'];

  const FRACS = [[0, ''], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];

  /** Snap n to the nearest whole-or-common-fraction. Returns [value, label]. */
  function snap(n) {
    if (n <= 0) return [0, '0'];
    let whole = Math.floor(n + 1e-9);
    const r = n - whole;
    let best = FRACS[0];
    let bd = 9;
    for (const x of FRACS) { const d = Math.abs(r - x[0]); if (d < bd) { bd = d; best = x; } }
    if (best[0] === 1) whole += 1;
    const s = (best[0] === 0 || best[0] === 1) ? '' : best[1];
    if (!whole && !s) return [0.25, '¼'];
    return [whole + (best[0] === 1 ? 0 : best[0]), (whole ? String(whole) : '') + s];
  }

  function frac(n) { return snap(n)[1]; }

  function roundTo(n, step) { return Math.round(n / step) * step; }

  function parseNum(s) {
    let t = 0;
    for (const part of s.trim().split(/\s+/)) {
      if (part.includes('/')) { const [a, b] = part.split('/'); t += Number(a) / Number(b); }
      else t += Number(part);
    }
    return t;
  }

  function unitWord(unit) {
    const words = unit.split(' ');
    return words[words.length - 1].toLowerCase();
  }

  function base(word) { return SINGULAR[word] || word; }

  function roundFor(n, unit) {
    const w = base(unitWord(unit));
    if (w === 'carton') return Math.max(1, Math.ceil(n - 0.05));
    if (COUNT_WORDS.includes(w)) return Math.max(1, Math.round(n));
    if (w === 'stick') return Math.max(0.5, roundTo(n, 0.5));
    if (w === 'lb') return Math.max(0.25, roundTo(n, n >= 3 ? 0.5 : 0.25));
    if (w === 'oz') return Math.max(1, Math.round(n));
    if (w === 'lemon') return Math.max(0.5, roundTo(n, 0.5));
    return n; // cups, tbsp, tsp: snapped by frac()
  }

  function withUnit(numStr, value, unit) {
    if (!unit) return numStr;
    const words = unit.split(' ');
    const last = words[words.length - 1];
    const lw = last.toLowerCase();
    const singular = base(lw);
    const plural = PLURAL[singular];
    if (plural) words[words.length - 1] = value > 1 ? plural : singular;
    return numStr + ' ' + words.join(' ');
  }

  const NUM = '(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?)';
  const TOKEN_RE = new RegExp('^' + NUM + '(?:\\s*[–-]\\s*' + NUM + ')?(?:\\s+(.+))?$');

  /** Scale one "{{...}}" token, e.g. "1 1/2 sticks" × 1.25 → "2 sticks". */
  function scaleToken(inner, f) {
    const m = inner.trim().match(TOKEN_RE);
    if (!m) return inner;
    const unit = m[3] || '';
    const a = roundFor(parseNum(m[1]) * f, unit);
    if (m[2]) {
      const b = snap(roundFor(parseNum(m[2]) * f, unit));
      return withUnit(frac(a) + '–' + b[1], b[0], unit);
    }
    const v = snap(a);
    return withUnit(v[1], v[0], unit);
  }

  /** Replace every {{token}} in text. wrap(s) can decorate the result. */
  function fill(text, f, wrap) {
    return String(text).replace(/\{\{([^}]+)\}\}/g, (_, inner) => {
      const s = scaleToken(inner, f);
      return wrap ? wrap(s) : s;
    });
  }

  function fmtTime(min, opts) {
    let h = Math.floor(min / 60) % 24;
    const m = ((min % 60) + 60) % 60;
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const t = h + ':' + String(m).padStart(2, '0');
    return opts && opts.noAmPm ? t : t + ' ' + ap;
  }

  function hm(str) { const [h, m] = str.split(':').map(Number); return h * 60 + m; }

  const pk = (n, unit) => withUnit(frac(n), n, unit);

  /* ---------- the menu ---------- */

  const dishes = {
    turkey: {
      name: 'Spatchcock turkey', short: 'Turkey', veg: false, color: 'turkey',
      approach: 'Dry-brined, then roasted flat at 450°F for about 80 min',
      makeAhead: 'Brine Tue night',
      scales: false,
      yieldNote: 'One 12–14 lb bird feeds about 10 with leftovers. The bird stays the same size whatever the headcount.',
      ingredients: [
        '1 fresh turkey, 12–14 lb',
        '¼ cup Diamond Crystal kosher salt (or 2 tbsp Morton)',
        '1 tbsp baking powder (for crisper skin)',
        '4 tbsp soft unsalted butter, for the herb butter',
        '1 tbsp each chopped fresh thyme and sage, plus 2 tsp chopped rosemary',
        '2 garlic cloves, grated',
        'Zest of 1 lemon and plenty of black pepper',
        '1 onion, 2 carrots and 2 celery stalks, for the roasting pan',
        'Olive oil, for brushing the skin',
      ],
      phases: [
        {
          day: 'tue', title: 'Spatchcock and dry brine',
          steps: [
            { t: 'Set the turkey breast-side down. Cut along both sides of the backbone with poultry shears and remove it.' },
            { t: 'Flip it breast-side up. Press down hard on the breastbone with both palms until it cracks and the bird lies flat.' },
            { t: 'Set aside the backbone, neck and giblets, but not the liver. They go straight into tonight’s stock.' },
            { t: 'Pat the turkey very dry with paper towels.' },
            { t: 'Mix ¼ cup Diamond Crystal kosher salt (or 2 tbsp Morton) with 1 tbsp baking powder. Rub it all over, including under the breast skin.' },
            { t: 'Set it skin-up on a rack over a sheet pan and refrigerate it uncovered until Thursday.' },
          ],
        },
        {
          day: 'wed', title: 'Herb butter',
          steps: [{ t: 'Mash 4 tbsp soft butter with 1 tbsp each chopped thyme and sage, 2 tsp chopped rosemary, 2 grated garlic cloves, the zest of 1 lemon and plenty of black pepper. Skip the salt, since the bird is already brined. Refrigerate.' }],
        },
      ],
      tips: ['pickup', 'browning', 'early'],
    },

    turkeyGravy: {
      name: 'Turkey gravy', short: 'Turkey gravy', veg: false, color: 'tgravy',
      approach: 'Stock from the backbone and neck, with pan drippings whisked in on Thursday',
      makeAhead: 'Stock Tue, gravy Wed',
      scales: true,
      ingredients: [
        'Turkey backbone, neck and giblets (from Tuesday’s spatchcock)',
        '1 tbsp olive oil',
        '{{2 cartons}} low-sodium chicken stock (32 oz each)',
        '{{1 onion}}, {{2 carrots}} and {{2 celery stalks}}, roughly chopped',
        'Fresh thyme and 1 bay leaf',
        '{{6 tbsp}} unsalted butter',
        '{{6 tbsp}} all-purpose flour',
        'Pan drippings from the turkey (Thursday)',
      ],
      phases: [
        {
          day: 'tue', title: 'Turkey stock',
          steps: [
            { t: 'Heat 1 tbsp olive oil in the stockpot over medium-high. Brown the backbone, neck and giblets, about 10 min.', timers: [{ m: 10, l: 'Brown bones' }] },
            { t: 'Add {{2 cartons}} chicken stock, {{1 onion}}, {{2 carrots}} and {{2 celery stalks}} (roughly chopped), thyme and a bay leaf.' },
            { t: 'Bring it to a boil, then turn it down to a gentle simmer and partly cover it. A hard boil makes the stock cloudy and greasy and boils too much away. Simmer 2–3 hours while you do the rest.', timers: [{ m: 150, l: 'Stock simmer' }] },
            { t: 'Strain and refrigerate.' },
          ],
        },
        {
          day: 'wed', title: 'Gravy base',
          steps: [
            { t: 'Lift off any fat that set on top of the stock overnight.' },
            { t: 'Melt {{6 tbsp}} butter over medium and whisk in {{6 tbsp}} flour. Cook, whisking, until golden, 3–4 min.' },
            { t: 'Slowly whisk in {{4 cups}} turkey stock and simmer until it coats a spoon. Refrigerate it. Save the leftover stock for thinning the gravy on Thursday.' },
          ],
        },
      ],
      tips: ['salty', 'thin', 'lumpy'],
    },

    mushroomGravy: {
      name: 'Mushroom gravy', short: 'Mushroom gravy', veg: true, color: 'mgravy',
      approach: 'Browned cremini mushrooms, vegetable stock, soy sauce and thyme',
      makeAhead: 'Tue (keeps 4 days)',
      scales: true,
      ingredients: [
        '{{1 lb}} cremini mushrooms, chopped',
        '{{1 yellow onion}}, diced',
        '{{4 tbsp}} unsalted butter',
        '{{2 cloves}} garlic, minced',
        '{{1 tsp}} chopped fresh thyme',
        '{{1/3 cup}} all-purpose flour',
        '{{4 cups}} vegetable stock',
        '{{1 tbsp}} soy sauce',
        'Black pepper',
      ],
      phases: [
        {
          day: 'tue', title: 'Make it',
          steps: [
            { t: 'Melt {{4 tbsp}} butter in the large skillet over medium-high. Add {{1 lb}} chopped cremini and {{1 onion}}, diced. Stir only now and then. The mushrooms release a lot of water first, so keep going until it has cooked off and they’re deep brown, about 15 min. If the pan is crowded, brown them in two batches.', timers: [{ m: 15, l: 'Brown mushrooms' }] },
            { t: 'Add {{2 cloves}} minced garlic and {{1 tsp}} chopped thyme. Stir in {{1/3 cup}} flour and cook 2 min.', timers: [{ m: 2, l: 'Cook flour' }] },
            { t: 'Whisk in {{4 cups}} vegetable stock and {{1 tbsp}} soy sauce, then simmer 10 min until thick.', timers: [{ m: 10, l: 'Simmer gravy' }] },
            { t: 'Pour it into a saucepan or tall container and blend it smooth with the immersion blender. A deeper container means fewer splashes.' },
            { t: 'Taste, then season with pepper. Add salt only if it needs it, since the soy sauce is salty. Refrigerate.' },
          ],
        },
      ],
      tips: ['thin', 'lumpy', 'salty'],
    },

    potatoes: {
      name: 'Mashed potatoes', short: 'Potatoes', veg: true, color: 'potatoes',
      approach: 'Yukon Golds with butter and warm milk',
      makeAhead: 'All on Thursday',
      scales: true,
      ingredients: [
        '{{5 lb}} Yukon Gold potatoes',
        '{{1 1/2 sticks}} unsalted butter',
        'About {{1 1/2 cups}} whole milk or half-and-half, warmed',
        'Salt and pepper',
      ],
      phases: [],
      tips: ['stiff'],
    },

    sprouts: {
      name: 'Brussels sprouts', short: 'Sprouts', veg: true, color: 'sprouts',
      approach: 'Halved and roasted cut side down at 450°F, finished with balsamic or lemon',
      makeAhead: 'All on Thursday',
      scales: true,
      ingredients: [
        '{{2 lb}} Brussels sprouts',
        'About {{3 tbsp}} olive oil',
        '{{1 tsp}} kosher salt and black pepper',
        'To finish: {{1–2 tbsp}} balsamic vinegar or maple syrup, or the juice of {{1/2 lemon}}',
      ],
      phases: [],
      tips: ['early'],
    },

    stuffing: {
      name: 'Stuffing', short: 'Stuffing', veg: true, color: 'stuffing',
      approach: 'Bread, butter, sage, thyme, celery and vegetable stock, baked in a dish',
      makeAhead: 'Dry bread Mon, make Thu',
      scales: true,
      ingredients: [
        'About {{1 1/2 lb}} crusty country or sourdough bread ({{2 loaves}})',
        '{{1 stick}} unsalted butter, plus more for the dish',
        '{{2 yellow onions}}, diced',
        '{{4 celery stalks}}, diced',
        '{{3 cloves}} garlic, minced',
        '{{2 tbsp}} chopped fresh sage, {{1 tbsp}} chopped thyme and {{1/4 cup}} chopped parsley',
        '{{2 eggs}}, beaten',
        '{{2–3 cups}} vegetable stock',
        'About {{1 tsp}} kosher salt, plus pepper',
      ],
      phases: [
        {
          day: 'mon', title: 'Dry the bread',
          steps: [
            { t: 'Heat the oven to 250°F. Cut the bread into ¾-inch cubes and spread them over both sheet pans.' },
            { t: 'Bake, stirring once, until dry and crisp, about 40 min. Work in batches if they don’t fit in one layer.', timers: [{ m: 40, l: 'Dry bread' }] },
            { t: 'Let them cool, then keep them in a paper bag or large bowl on the counter until Thursday. That frees both pans, and the turkey needs one from Tuesday.' },
          ],
        },
      ],
      tips: ['dry'],
    },

    cranberry: {
      name: 'Cranberry sauce', short: 'Cranberry', veg: true, color: 'cranberry',
      approach: 'Cranberries, sugar and orange simmered on the stove until the berries burst',
      makeAhead: 'Wed (keeps 1 week)',
      scales: true,
      ingredients: [
        '{{12 oz}} fresh cranberries',
        '{{3/4 cup}} granulated sugar',
        'Zest and juice of {{1 orange}}',
        'Water',
        'A pinch of salt',
      ],
      phases: [
        {
          day: 'wed', title: 'Make it',
          steps: [
            { t: 'In a saucepan, combine {{12 oz}} cranberries, {{3/4 cup}} sugar, the zest and juice of {{1 orange}}, enough water to make {{3/4 cup}} liquid with the juice, and a pinch of salt.' },
            { t: 'Simmer 10–12 min, stirring, until most of the berries burst.', timers: [{ m: 11, l: 'Cranberries' }] },
            { t: 'It will look loose, but it thickens as it cools. Refrigerate.' },
          ],
        },
      ],
      tips: [],
    },
  };

  const dishOrder = ['turkey', 'turkeyGravy', 'mushroomGravy', 'potatoes', 'sprouts', 'stuffing', 'cranberry'];

  /* ---------- prep days ---------- */
  // A task with `recipe` + `phase` shows that recipe phase's steps inline.

  const days = [
    {
      id: 'sat', date: '2026-11-21', name: 'Saturday', short: 'Sat', sub: 'Planning',
      blurb: 'Just ordering and planning tonight.',
      tasks: [
        { id: 't:sat-headcount', title: 'Confirm the headcount', detail: 'Also ask whether any guests are vegan, not just vegetarian. Vegans can’t have the butter, eggs or cream.', action: 'settings', actionLabel: 'Set guest count' },
        { id: 't:sat-gear', title: 'Check the equipment list', detail: 'Order poultry shears or a thermometer now if you’re missing them.', link: '#/shop/gear', linkLabel: 'Open the gear list' },
        { id: 't:sat-measure', title: 'Measure your sheet pan and oven', detail: 'Make sure a flattened turkey (about 15 × 17 in) fits.' },
      ],
    },
    {
      id: 'sun', date: '2026-11-22', name: 'Sunday', short: 'Sun', sub: 'Order the turkey',
      blurb: 'The one thing you can’t let slip is ordering the fresh turkey.',
      tasks: [
        { id: 't:sun-order', critical: true, title: 'Order a fresh 12–14 lb turkey', detail: 'For pickup Tuesday. Fresh birds sell out Thanksgiving week. A frozen one won’t thaw in time, and a bigger bird won’t lie flat on a standard sheet pan.' },
        { id: 't:sun-fridge', title: 'Clear a full fridge shelf', detail: 'The turkey sits uncovered on a sheet pan there from Tuesday to Thursday.' },
      ],
    },
    {
      id: 'mon', date: '2026-11-23', name: 'Monday', short: 'Mon', sub: 'The big shop', est: 'Evening · 1–2 hrs',
      blurb: 'One grocery run covers everything except the turkey, and all of it keeps until Thursday.',
      tasks: [
        { id: 't:mon-shop', title: 'Do the full grocery shop', detail: 'Everything except the turkey comes from one shop, and all of it keeps until Thursday.', link: '#/shop', linkLabel: 'Open the shopping list' },
        { id: 't:mon-bread', title: 'Cube and oven-dry the bread for stuffing', recipe: 'stuffing', phase: 'mon' },
      ],
    },
    {
      id: 'tue', date: '2026-11-24', name: 'Tuesday', short: 'Tue', sub: 'Turkey, stock, mushroom gravy', est: 'Evening · 2–3 hrs',
      blurb: 'Spatchcock the turkey first so the backbone can go straight into the stockpot. The stock simmers 2–3 hours while you brine the bird and make the mushroom gravy.',
      tasks: [
        { id: 's:turkey', title: 'Pick up the turkey' },
        { id: 't:tue-turkey', title: 'Spatchcock and dry-brine the turkey', recipe: 'turkey', phase: 'tue', link: '#/guide/spatchcock', linkLabel: 'How to spatchcock' },
        { id: 't:tue-stock', title: 'Turkey stock', recipe: 'turkeyGravy', phase: 'tue' },
        { id: 't:tue-mgravy', title: 'Mushroom gravy', recipe: 'mushroomGravy', phase: 'tue' },
      ],
    },
    {
      id: 'wed', date: '2026-11-25', name: 'Wednesday', short: 'Wed', sub: 'Gravy base, cranberry, table', est: 'Evening · 1–2 hrs',
      blurb: 'Tonight sets up Thursday so it’s mostly oven time.',
      tasks: [
        { id: 't:wed-tgravy', title: 'Turkey gravy base', recipe: 'turkeyGravy', phase: 'wed' },
        { id: 't:wed-cran', title: 'Cranberry sauce', recipe: 'cranberry', phase: 'wed' },
        { id: 't:wed-herb', title: 'Make the herb butter', recipe: 'turkey', phase: 'wed' },
        { id: 't:wed-pot', title: 'Wash the stockpot', detail: 'It does double duty as the potato pot tomorrow.' },
        { id: 't:wed-table', title: 'Set the table', detail: 'Label each serving dish with a sticky note, and mark which gravy is vegetarian.' },
        { id: 't:wed-chill', title: 'Chill the wine and drinks' },
      ],
    },
    {
      id: 'thu', date: '2026-11-26', name: 'Thursday', short: 'Thu', sub: 'Thanksgiving Day', thursday: true,
      blurb: 'The turkey goes in 2 h 15 min before dinner. Change the dinner time and every row shifts with it.',
      tasks: [],
    },
  ];

  /* ---------- Thursday timeline (times for a 4:00 PM dinner) ---------- */
  // dish: which recipe(s) the row belongs to; s: short label for calendar alerts.

  const rows = [
    { id: 'r:fridge-turkey', at: '12:30', dish: ['turkey'], s: 'Turkey out of fridge', t: 'Take the turkey and the herb butter out of the fridge, so the bird loses its chill and the butter softens.' },
    { id: 'r:stuffing-veg', at: '12:30', dish: ['stuffing'], s: 'Sauté stuffing vegetables', t: 'Melt {{1 stick}} butter in the large skillet. Cook {{2 onions}} and {{4 celery stalks}}, diced, until soft, about 10 min. Add {{3 cloves}} minced garlic for the last minute, then take it off the heat.', timers: [{ m: 10, l: 'Stuffing veg' }] },
    { id: 'r:preheat', at: '13:00', dish: ['oven', 'turkey'], s: 'Preheat oven to 450°F', t: 'Preheat the oven to 450°F with racks in the lower-middle and bottom positions.' },
    { id: 'r:panveg', at: '13:00', dish: ['turkey'], s: 'Veg in the sheet pan', t: 'Scatter 1 chopped onion, 2 carrots and 2 celery stalks in the sheet pan under the rack, and pour in 1 cup water so the drippings don’t scorch.' },
    { id: 'r:trim-sprouts', at: '13:00', dish: ['sprouts'], s: 'Trim sprouts', t: 'Trim and halve {{2 lb}} Brussels sprouts while you’re chopping. They can sit on the counter until they go in the oven.' },
    { id: 'r:herbbutter', at: '13:30', dish: ['turkey'], s: 'Herb butter on the turkey', t: 'Rub herb butter under the breast skin and brush the skin lightly with oil. Tuck the wing tips behind the breast.' },
    { id: 'r:turkey-in', at: '13:45', dish: ['turkey'], s: 'Turkey in', t: 'Turkey in, on the lower-middle rack.', timers: [{ m: 40, l: 'Rotate turkey' }, { m: 60, l: 'Check turkey temp' }], key: true },
    { id: 'r:stuffing-mix', at: '13:50', dish: ['stuffing'], s: 'Assemble stuffing', t: 'Butter the 9 × 13 dish. In a big bowl, toss the bread cubes with the sautéed vegetables, {{2 tbsp}} chopped sage, {{1 tbsp}} thyme, {{1/4 cup}} parsley, about {{1 tsp}} kosher salt and pepper. Taste for salt now, before the eggs go in. Add {{2 eggs}}, beaten, and {{2–3 cups}} vegetable stock, tossing until moist but not soggy. Pack it into the dish and cover with foil.' },
    { id: 'r:peel', at: '14:00', dish: ['potatoes'], s: 'Peel potatoes', t: 'Peel the potatoes and cut them into 2-inch chunks. Drop them into the potato pot as you go and cover them with cold water.' },
    { id: 'r:rotate', at: '14:25', dish: ['turkey'], s: 'Rotate the turkey', t: 'Turn the pan front to back so the turkey browns evenly. If the pan looks dry, add another ½ cup water.' },
    { id: 'r:stuffing-in', at: '14:30', dish: ['stuffing'], s: 'Stuffing in', t: 'Stuffing in on the bottom rack, covered with foil.', timers: [{ m: 30, l: 'Uncover stuffing' }] },
    { id: 'r:rewarm-tgravy', at: '14:30', dish: ['turkeyGravy'], s: 'Rewarm turkey gravy', t: 'Rewarm the turkey gravy on low in its own saucepan. It will have set like jelly, so whisk as it melts. Stir now and then, and add a splash of the saved stock if it gets too thick.' },
    { id: 'r:rewarm-mgravy', at: '14:30', dish: ['mushroomGravy'], s: 'Rewarm mushroom gravy', t: 'Rewarm the mushroom gravy on low in its own saucepan.' },
    { id: 'r:check-temp', at: '14:45', dish: ['turkey'], s: 'Start checking turkey temp', t: 'Start checking the turkey temperature: breast 150°F, thighs 165°F or higher.' },
    { id: 'r:potatoes-on', at: '14:45', dish: ['potatoes'], s: 'Potatoes on', t: 'Salt the potato water and bring it to a boil, then simmer about 20 min until tender.', timers: [{ m: 20, l: 'Potatoes simmer' }] },
    { id: 'r:uncover', at: '15:00', dish: ['stuffing'], s: 'Uncover stuffing', t: 'Uncover the stuffing so the top crisps.' },
    { id: 'r:turkey-out', at: '15:05', approx: true, dish: ['turkey'], s: 'Turkey out to rest', t: 'Turkey out when the breast reads 150°F and the thighs read 165°F or higher. Move it to a cutting board and rest it uncovered for 25–30 min.', timers: [{ m: 25, l: 'Turkey rest' }], key: true },
    { id: 'r:drippings', at: '15:10', dish: ['turkeyGravy'], s: 'Drippings into turkey gravy', t: 'Pour everything in the turkey pan through a strainer into a bowl. Press hard on the vegetables to squeeze out their juices, then throw them away. Skim off the fat and taste the juices, since dry-brine drippings are salty. Whisk them into the turkey gravy only, simmer, and season with pepper, plus salt only if it needs it.' },
    { id: 'r:thin-mgravy', at: '15:10', dish: ['mushroomGravy'], s: 'Check mushroom gravy', t: 'Thin the mushroom gravy with a splash of vegetable stock if needed.' },
    { id: 'r:stuffing-out', at: '15:15', dish: ['stuffing'], s: 'Stuffing out', t: 'Take the stuffing out (165°F in the center) and tent it loosely with foil to keep warm.' },
    { id: 'r:sprouts-in', at: '15:15', dish: ['sprouts'], s: 'Sprouts in', t: 'Toss the sprouts with about {{3 tbsp}} olive oil, {{1 tsp}} kosher salt and pepper. Spread them on the second sheet pan (not the turkey’s) cut side down in one layer. Roast without stirring until the cut sides are deep brown, about 20 min.', timers: [{ m: 20, l: 'Check sprouts' }] },
    { id: 'r:mash', at: '15:20', dish: ['potatoes'], s: 'Mash potatoes', t: 'Drain the potatoes. Mash them with {{1 1/2 sticks}} butter and about {{1 1/2 cups}} warm milk, and season. Keep covered on low or in a slow cooker.' },
    { id: 'r:carve', at: '15:30', dish: ['turkey'], s: 'Carve the turkey', t: 'Carve the turkey. Cut off each leg at the joint and split it into drumstick and thigh. Slice each breast off whole along the breastbone, then cut it across the grain into ½-inch slices. Take off the wings and arrange everything on a warm platter.' },
    { id: 'r:cran-out', at: '15:30', dish: ['cranberry'], s: 'Cranberry sauce out', t: 'Take the cranberry sauce out of the fridge.' },
    { id: 'r:finish-sprouts', at: '15:45', dish: ['sprouts'], s: 'Finish sprouts', t: 'Toss the sprouts with {{1–2 tbsp}} balsamic or maple syrup, or the juice of {{1/2 lemon}}. Taste for salt.' },
    { id: 'r:serve', at: '15:45', dish: ['table'], s: 'Fill serving dishes', t: 'Fill the serving dishes, giving each gravy its own ladle and label.' },
    { id: 'r:dinner', at: '16:00', dish: ['table'], s: 'Dinner', t: 'Dinner. Happy Thanksgiving!', key: true },
  ];

  /** Rows grouped by time, shifted by `offset` minutes. */
  function groupRows(offset) {
    const groups = [];
    for (const r of rows) {
      const t = hm(r.at) + (offset || 0);
      let g = groups[groups.length - 1];
      if (!g || g.t !== t) { g = { t, approx: false, rows: [] }; groups.push(g); }
      if (r.approx) g.approx = true;
      g.rows.push(r);
    }
    return groups;
  }

  /* ---------- shopping list ---------- */
  // q(f, g) returns the quantity text; f = guests / 8, g = guests.

  const shopSections = [
    { id: 'meat', name: 'Meat' },
    { id: 'produce', name: 'Produce', note: 'Store all the herbs wrapped in a damp paper towel inside a bag so they last until Thursday.' },
    { id: 'dairy', name: 'Dairy and eggs' },
    { id: 'bakery', name: 'Bakery' },
    { id: 'pantry', name: 'Pantry and baking' },
    { id: 'drinks', name: 'Drinks' },
    { id: 'supplies', name: 'Kitchen supplies' },
  ];

  const shop = [
    { id: 's:turkey', sec: 'meat', n: 'Fresh turkey', q: () => '12–14 lb', note: 'Ordered ahead, picked up Tuesday', for: ['turkey'] },

    { id: 's:potatoes', sec: 'produce', n: 'Yukon Gold potatoes', q: f => pk(Math.max(2, Math.round(5 * f)), 'lb'), for: ['potatoes'] },
    { id: 's:sprouts', sec: 'produce', n: 'Brussels sprouts', q: f => pk(Math.max(1, roundTo(2 * f, 0.5)), 'lb'), for: ['sprouts'] },
    { id: 's:cremini', sec: 'produce', n: 'Cremini mushrooms', q: f => pk(Math.max(0.5, roundTo(1 * f, 0.5)), 'lb'), for: ['mushroomGravy'] },
    { id: 's:onions', sec: 'produce', n: 'Yellow onions', q: f => String(Math.ceil(3 * f - 0.05) + 2), note: 'For the stuffing, mushroom gravy, turkey stock and roasting pan', for: ['stuffing', 'mushroomGravy', 'turkeyGravy', 'turkey'] },
    { id: 's:celery', sec: 'produce', n: 'Celery', q: f => pk(Math.max(1, Math.ceil((4 * f + 4) / 9 - 0.05)), 'bunch'), for: ['stuffing', 'turkeyGravy', 'turkey'] },
    { id: 's:carrots', sec: 'produce', n: 'Carrots', q: f => (f > 1.6 ? '2 lb' : '1 lb'), for: ['turkeyGravy', 'turkey'] },
    { id: 's:garlic', sec: 'produce', n: 'Garlic', q: () => '2 heads', for: ['stuffing', 'mushroomGravy', 'turkey'] },
    { id: 's:cranberries', sec: 'produce', n: 'Fresh cranberries', q: f => pk(Math.max(1, Math.ceil(f - 0.05)), 'bag') + ' (12 oz)', note: 'Get one more bag if you want leftovers.', for: ['cranberry'] },
    { id: 's:orange', sec: 'produce', n: 'Orange', q: f => String(Math.max(1, Math.ceil(f - 0.05))), for: ['cranberry'] },
    { id: 's:lemon', sec: 'produce', n: 'Lemons', q: f => String(1 + Math.max(1, Math.ceil(f / 2 - 0.05))), for: ['sprouts', 'turkey'] },
    { id: 's:sage', sec: 'produce', n: 'Fresh sage', q: () => '1 bunch', for: ['stuffing', 'turkey'] },
    { id: 's:thyme', sec: 'produce', n: 'Fresh thyme', q: () => '2 bunches', for: ['stuffing', 'turkey', 'mushroomGravy', 'turkeyGravy'] },
    { id: 's:rosemary', sec: 'produce', n: 'Fresh rosemary', q: () => '1 bunch', for: ['turkey'] },
    { id: 's:parsley', sec: 'produce', n: 'Flat-leaf parsley', q: () => '1 bunch', for: ['stuffing'] },

    { id: 's:butter', sec: 'dairy', n: 'Unsalted butter', q: f => { const lb = Math.max(1, Math.ceil(2 * f - 0.05)); return pk(lb, 'lb') + ' (' + lb * 4 + ' sticks)'; }, note: 'Covers the turkey, both gravies, potatoes, stuffing and the table.' },
    { id: 's:milk', sec: 'dairy', n: 'Whole milk or half-and-half', q: f => pk(Math.max(1, Math.ceil(1.5 * f / 4 + 0.25)), 'quart'), for: ['potatoes'] },
    { id: 's:eggs', sec: 'dairy', n: 'Eggs', q: f => (2 * f > 6 ? '1 dozen' : 'Half dozen'), for: ['stuffing'] },

    { id: 's:bread', sec: 'bakery', n: 'Crusty country or sourdough bread', q: f => 'About ' + pk(Math.max(0.75, roundTo(1.5 * f, 0.25)), 'lb') + ' (' + pk(Math.max(1, Math.ceil(2 * f - 0.05)), 'loaf') + ')', for: ['stuffing'] },
    { id: 's:rolls', sec: 'bakery', n: 'Dinner rolls', q: () => 'Optional' },

    { id: 's:vegstock', sec: 'pantry', n: 'Vegetable stock', q: f => pk(Math.max(1, Math.ceil(2 * f - 0.05)), 'carton') + ' (32 oz)', note: 'For the stuffing and mushroom gravy', for: ['stuffing', 'mushroomGravy'], veg: true },
    { id: 's:chxstock', sec: 'pantry', n: 'Low-sodium chicken stock', q: f => pk(Math.max(1, Math.ceil(2 * f - 0.05)), 'carton') + ' (32 oz)', note: 'For the turkey stock only', for: ['turkeyGravy'], meat: true },
    { id: 's:soy', sec: 'pantry', n: 'Soy sauce', for: ['mushroomGravy'] },
    { id: 's:flour', sec: 'pantry', n: 'All-purpose flour', q: f => 'About ' + pk(Math.max(1, Math.ceil(f - 0.05)), 'cup'), for: ['turkeyGravy', 'mushroomGravy'] },
    { id: 's:cornstarch', sec: 'pantry', n: 'Cornstarch', note: 'Only needed if a gravy comes out thin' },
    { id: 's:sugar', sec: 'pantry', n: 'Granulated sugar', q: f => fill('{{3/4 cup}}', f), for: ['cranberry'] },
    { id: 's:salt', sec: 'pantry', n: 'Diamond Crystal kosher salt', q: () => '1 box', note: 'The dry brine needs about ¼ cup', for: ['turkey'] },
    { id: 's:bakingpowder', sec: 'pantry', n: 'Baking powder', q: () => '1 tbsp', note: 'For crisper skin', for: ['turkey'] },
    { id: 's:oil', sec: 'pantry', n: 'Olive oil', for: ['sprouts', 'turkey', 'turkeyGravy'] },
    { id: 's:balsamic', sec: 'pantry', n: 'Balsamic vinegar or maple syrup', for: ['sprouts'] },
    { id: 's:pepper', sec: 'pantry', n: 'Black peppercorns and bay leaves' },

    { id: 's:wine', sec: 'drinks', n: 'Wine', q: (f, g) => { const lo = Math.max(1, Math.ceil(g / 3)); const hi = Math.max(1, Math.ceil(g / 2)); return 'About ' + (lo === hi ? lo : lo + '–' + hi) + (hi > 1 ? ' bottles' : ' bottle'); }, note: 'A light, fruity red like Pinot Noir or Beaujolais is the classic turkey pairing. This year’s Beaujolais Nouveau came out Nov 19. Plan on about 1 bottle per 2–3 drinkers.' },
    { id: 's:na', sec: 'drinks', n: 'Sparkling water, cider or other non-alcoholic drinks' },
    { id: 's:ice', sec: 'drinks', n: 'Ice' },

    { id: 's:foil', sec: 'supplies', n: 'Heavy-duty aluminum foil' },
    { id: 's:parchment', sec: 'supplies', n: 'Parchment paper' },
    { id: 's:wrap', sec: 'supplies', n: 'Plastic wrap' },
    { id: 's:towels', sec: 'supplies', n: 'Paper towels', note: 'A lot of them, for patting the turkey dry' },
    { id: 's:bags', sec: 'supplies', n: 'Gallon zip-top bags' },
    { id: 's:containers', sec: 'supplies', n: 'Leftover containers', note: 'So guests can take food home' },
    { id: 's:trash', sec: 'supplies', n: 'Trash bags and dish soap' },
  ];

  /* ---------- equipment ---------- */

  const gear = [
    {
      name: 'Turkey', items: [
        { id: 'e:shears', n: 'Poultry shears or heavy-duty kitchen shears', must: true, note: 'For cutting out the backbone' },
        { id: 'e:thermo', n: 'Instant-read thermometer', must: true, note: 'Spatchcocked birds cook fast, so go by temperature, not time. A leave-in probe is a bonus.' },
        { id: 'e:sheetpan', n: 'Rimmed half-sheet pan (18 × 13 in) with a wire rack that fits inside', note: 'Dries bread Monday, then holds the turkey from Tuesday on' },
        { id: 'e:board', n: 'Large cutting board with a juice groove' },
        { id: 'e:knives', n: 'Sharp carving knife and chef’s knife' },
        { id: 'e:platter', n: 'Serving platter' },
      ],
    },
    {
      name: 'Stock and gravy', items: [
        { id: 'e:stockpot', n: 'Large stockpot' },
        { id: 'e:saucepans', n: '2 medium saucepans', note: 'One per gravy, plus the cranberry sauce on Wednesday' },
        { id: 'e:strainer', n: 'Fine-mesh strainer' },
        { id: 'e:whisk', n: 'Whisk' },
        { id: 'e:fatsep', n: 'Fat separator', opt: true, note: 'A ladle works too' },
        { id: 'e:blender', n: 'Immersion blender', note: 'For the mushroom gravy' },
        { id: 'e:boats', n: '2 gravy boats or small pitchers, labeled veg and turkey' },
      ],
    },
    {
      name: 'Sides', items: [
        { id: 'e:sheetpan2', n: 'Second rimmed sheet pan', note: 'Dries bread Monday, roasts the sprouts Thursday' },
        { id: 'e:9x13', n: '9 × 13 baking dish', note: 'For the stuffing' },
        { id: 'e:skillet', n: 'Large skillet', note: 'Mushrooms and stuffing aromatics' },
        { id: 'e:potpot', n: 'Large pot for the potatoes', note: 'The stockpot can do double duty if washed Wednesday' },
        { id: 'e:masher', n: 'Potato masher or ricer' },
        { id: 'e:peeler', n: 'Vegetable peeler' },
        { id: 'e:colander', n: 'Colander' },
        { id: 'e:slowcooker', n: 'Slow cooker for keeping potatoes warm', opt: true },
        { id: 'e:cranjar', n: 'Container for the cranberry sauce' },
      ],
    },
    {
      name: 'General', items: [
        { id: 'e:bowls', n: 'Mixing bowls: 2 large, 2 medium' },
        { id: 'e:measure', n: 'Measuring cups and spoons' },
        { id: 'e:zester', n: 'Microplane or zester', note: 'For the orange zest and the herb butter’s lemon zest' },
        { id: 'e:mitts', n: 'Oven mitts and trivets' },
        { id: 'e:servebowls', n: 'Serving bowls and spoons for 5 sides' },
      ],
    },
    {
      name: 'Table', items: [
        { id: 'e:plates', n: 'Plates, dessert plates, cutlery and glasses for everyone' },
        { id: 'e:linens', n: 'Napkins and a tablecloth' },
        { id: 'e:chairs', n: 'Enough chairs' },
        { id: 'e:corkscrew', n: 'Corkscrew' },
      ],
    },
  ];

  /* ---------- reference ---------- */

  const tips = {
    pickup: { q: 'Turkey pickup falls through Tuesday', a: 'A fresh turkey bought Wednesday still works. Spatchcock and dry-brine it that night, since even 1 day of brining makes a real difference. Make the stock that night too, and the gravy base Thursday morning. Avoid frozen birds this late.' },
    browning: { q: 'Skin browning too fast', a: 'Lay a loose sheet of foil over the browned parts only.' },
    early: { q: 'Turkey done early', a: 'It holds 45–60 min loosely tented. Use the time for the sprouts.' },
    thin: { q: 'Gravy too thin', a: 'Simmer longer, or whisk in 1 tbsp cornstarch mixed with 2 tbsp cold water.' },
    lumpy: { q: 'Gravy lumpy', a: 'Whisk hard or pour it through the strainer.' },
    salty: { q: 'Gravy too salty', a: 'Dry-brine drippings are salty, so taste them before adding them to the turkey gravy. Thin either gravy with unsalted stock of the matching kind.' },
    dry: { q: 'Stuffing dry', a: 'Drizzle a few tablespoons of warm vegetable stock over it before the last 10 min.' },
    stiff: { q: 'Mashed potatoes stiff after holding', a: 'Stir in warm milk a splash at a time.' },
  };

  const temps = [
    { item: 'Turkey breast', pull: '150°F', note: 'Rises about 5°F while resting' },
    { item: 'Turkey thigh', pull: '165–175°F', note: 'Dark meat is better on the higher end' },
    { item: 'Stuffing', pull: '165°F', note: 'In the center. Needed because it contains eggs.' },
  ];

  const spatchcock = [
    'Set the turkey breast-side down. Cut along both sides of the backbone with shears and remove it.',
    'Flip it breast-side up. Press down hard on the breastbone with both palms until it cracks and the bird lies flat.',
    'Tuck the wing tips behind the breast and splay the legs out so the thighs face the heat.',
  ];

  const vegRules = [
    'Everything except the turkey and the turkey gravy is vegetarian.',
    'The stuffing bakes in a dish, never in the bird.',
    'The two gravies get separate pans, ladles and labels.',
    'The turkey drippings go only into the turkey gravy.',
    'Chicken stock goes only into the turkey stock. The stuffing and mushroom gravy use vegetable stock.',
    'Vegan guests can’t have the butter, eggs or cream, so ask ahead.',
  ];

  const assumptions = [
    { k: 'Turkey', v: 'A fresh 12–14 lb bird picked up Tuesday and dry-brined for 2 days. A frozen one won’t thaw in time, and a bigger bird won’t lie flat on a standard sheet pan.' },
    { k: 'Oven', v: 'Written for one oven. The turkey and stuffing bake together, then the sprouts roast while the turkey rests.' },
    { k: 'Schedule', v: 'The big shop is Monday evening and the turkey comes home Tuesday. Tuesday and Wednesday cover the stock, both gravies and the cranberry sauce. To save fridge space, the potatoes, sprouts and stuffing are all made fresh on Thursday.' },
  ];

  /** Notes that depend on the headcount. */
  function guestNotes(g) {
    const out = [];
    if (g > 10) out.push({ dish: 'turkey', t: 'A 12–14 lb bird feeds about 10. For ' + g + ', add a bone-in turkey breast rather than buying a bigger bird, which won’t lie flat on a standard sheet pan. Both sheet pans are spoken for, so roast the breast in its own oven-safe pan, to 150°F.' });
    if (g > 9) out.push({ dish: 'sprouts', t: 'For ' + g + ' guests that’s more sprouts than one sheet pan holds in a single layer, and the other pan is under the turkey. Pick up a disposable foil sheet pan, or roast them in two batches.' });
    if (g > 10) out.push({ dish: 'stuffing', t: 'For ' + g + ' guests, the stuffing won’t fit in one 9 × 13 dish. Use two dishes or a larger roasting pan.' });
    if (g < 6) out.push({ dish: 'turkey', t: 'Keep the 12–14 lb bird even for a smaller group. You’ll just have more leftovers.' });
    return out;
  }

  const TG = {
    BASE_GUESTS, BASE_DINNER, dinnerDate: '2026-11-26',
    dishes, dishOrder, days, rows, groupRows, shopSections, shop, gear,
    tips, temps, spatchcock, vegRules, assumptions, guestNotes,
    U: { fill, scaleToken, frac, fmtTime, hm },
  };

  root.TG = TG;
  if (typeof module !== 'undefined' && module.exports) module.exports = TG;
})(typeof window !== 'undefined' ? window : globalThis);
