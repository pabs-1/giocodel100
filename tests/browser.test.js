// Smoke test end-to-end in Chromium (solo sviluppo, serve Playwright):
//   node tests/browser.test.js
// Avvia un piccolo server statico, gioca una partita completa con tocchi
// reali su viewport mobili e desktop e controlla che la console sia pulita.
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const L = require('../logic.js');
const I = require('../i18n.js');

const ROOT = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, path.normalize(p));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (err) {
    failed++;
    console.log('  FAIL ' + name + '\n       ' + String(err && err.stack || err).split('\n').slice(0, 4).join('\n       '));
  }
}

function watchConsole(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return errors;
}

async function cellCenter(page, index) {
  return page.evaluate((i) => {
    const r = document.querySelectorAll('.cell')[i].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, index);
}

async function layoutReport(page) {
  return page.evaluate(() => {
    const b = document.getElementById('board').getBoundingClientRect();
    const c = document.querySelector('.cell').getBoundingClientRect();
    const buttons = [...document.querySelectorAll('.btn')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0); // esclude l'overlay nascosto
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
      board: { top: b.top, left: b.left, right: b.right, bottom: b.bottom, w: b.width, h: b.height },
      cell: c.width,
      overflowing: [...document.querySelectorAll('.btn, .title, .dedica')]
        .filter((el) => el.offsetWidth > 0 && el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.id || el.textContent.trim()),
      minButton: Math.min(...buttons.map((r) => Math.min(r.width, r.height)))
    };
  });
}

function assertFits(rep) {
  assert.ok(rep.scrollW <= rep.vw, `scroll orizzontale: ${rep.scrollW} > ${rep.vw}`);
  assert.ok(rep.scrollH <= rep.vh, `scroll verticale: ${rep.scrollH} > ${rep.vh}`);
  assert.ok(Math.abs(rep.board.w - rep.board.h) < 1, 'griglia non quadrata');
  assert.ok(rep.board.left >= 0 && rep.board.right <= rep.vw, 'griglia fuori in larghezza');
  assert.ok(rep.board.top >= 0 && rep.board.bottom <= rep.vh, 'griglia fuori in altezza');
  assert.ok(rep.minButton >= 44, `pulsante più piccolo di 44px: ${rep.minButton}`);
  assert.deepEqual(rep.overflowing, [], 'testo che esce dai pulsanti');
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const localhost = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  // I test esistenti controllano i testi italiani: il browser "parla" italiano
  // salvo dove un test sceglie un'altra lingua.
  const newContext = (opts = {}) => browser.newContext({ locale: 'it-IT', ...opts });
  const shotDir = process.env.SHOT_DIR;

  const viewports = [
    ['iPhone SE', { ...devices['iPhone SE'] }],
    ['iPhone 13', { ...devices['iPhone 13'] }],
    ['iPhone 13 orizzontale', { ...devices['iPhone 13 landscape'] }],
    ['Pixel 7', { ...devices['Pixel 7'] }],
    ['Galaxy S8 (360px)', { ...devices['Galaxy S8'] }],
    ['iPad Mini', { ...devices['iPad Mini'] }],
    ['Desktop 1366×768', { viewport: { width: 1366, height: 768 } }],
    ['Desktop 320×480 (minimo)', { viewport: { width: 320, height: 480 } }]
  ];

  console.log('Layout');
  for (const [name, opts] of viewports) {
    await test(`${name}: niente scroll, griglia quadrata nel viewport, pulsanti ≥ 44px`, async () => {
      // devices[] usa webkit come default browser: forziamo chromium.
      delete opts.defaultBrowserType;
      const ctx = await newContext(opts);
      const page = await ctx.newPage();
      const errors = watchConsole(page);
      await page.goto(base);
      const rep = await layoutReport(page);
      assertFits(rep);
      if (shotDir) await page.screenshot({ path: path.join(shotDir, name.replace(/\W+/g, '_') + '.png') });
      assert.deepEqual(errors, []);
      await ctx.close();
    });
  }

  console.log('Partita completa al tocco (iPhone 13)');
  const phone = { ...devices['iPhone 13'] };
  delete phone.defaultBrowserType;
  const ctx = await newContext(phone);
  const page = await ctx.newPage();
  const errors = watchConsole(page);
  await page.goto(base);

  const solution = L.solve(0);

  await test('tocco illegale ignorato, tocco legale piazza il numero', async () => {
    let p = await cellCenter(page, 0);
    await page.touchscreen.tap(p.x, p.y);
    assert.equal(await page.textContent('#stat-current'), '1');
    // (0,1) è adiacente: dista oltre 0.95 celle da ogni mossa legale -> rifiutata.
    p = await cellCenter(page, 1);
    await page.touchscreen.tap(p.x, p.y);
    assert.equal(await page.textContent('#stat-current'), '1');
    assert.equal(await page.textContent('#stat-remaining'), '99');
    assert.equal(await page.locator('.cell.legal').count(), 3);
    assert.equal(await page.locator('#board.hints').count(), 1);
  });

  await test('un tocco genera una sola mossa (niente doppio touch+click)', async () => {
    const p = await cellCenter(page, solution[1]);
    await page.touchscreen.tap(p.x, p.y);
    await page.waitForTimeout(400);
    assert.equal(await page.textContent('#stat-current'), '2');
  });

  await test('tocco vicino a una mossa legale viene agganciato (bersaglio effettivo ≥ 44px)', async () => {
    const target = solution[2];
    const rect = await page.evaluate((i) => {
      const r = document.querySelectorAll('.cell')[i].getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width };
    }, target);
    const rc = L.toRowCol(target);
    // Tocca mezza cella fuori dal bordo del bersaglio, verso il centro della griglia.
    const dx = rc.col < 5 ? 1 : -1;
    const x = rect.x + rect.w / 2 + dx * rect.w * 0.9;
    await page.touchscreen.tap(x, rect.y + rect.w / 2);
    assert.equal(await page.textContent('#stat-current'), '3');
    assert.equal(await page.locator('.cell').nth(target).textContent(), '3');
  });

  await test('undo ripristina il numero e le mosse legali', async () => {
    await page.click('#btn-undo');
    assert.equal(await page.textContent('#stat-current'), '2');
    assert.equal(await page.locator('.cell').nth(solution[2]).textContent(), '');
    await page.click('#btn-undo');
    await page.click('#btn-undo');
    assert.equal(await page.textContent('#stat-current'), '0');
    assert.ok(await page.isDisabled('#btn-undo'));
    assert.equal(await page.locator('#board.ready').count(), 1);
  });

  await test('toggle mosse on/off', async () => {
    let p = await cellCenter(page, solution[0]);
    await page.touchscreen.tap(p.x, p.y);
    await page.click('#btn-hints');
    assert.equal(await page.getAttribute('#btn-hints', 'aria-pressed'), 'false');
    assert.equal(await page.locator('#board.hints').count(), 0);
    await page.click('#btn-hints');
    assert.equal(await page.locator('#board.hints').count(), 1);
  });

  await test('vittoria: overlay (non alert) dopo il 100', async () => {
    page.on('dialog', () => { throw new Error('dialog nativo aperto'); });
    for (let i = 1; i < 100; i++) {
      const p = await cellCenter(page, solution[i]);
      await page.touchscreen.tap(p.x, p.y);
    }
    // Il click sintetico del tocco finale non deve "premere" l'overlay.
    await page.waitForSelector('#overlay:not([hidden])');
    await page.waitForTimeout(500);
    assert.equal(await page.textContent('#stat-current'), '100');
    assert.equal(await page.textContent('#stat-remaining'), '0');
    assert.ok(await page.isVisible('#overlay'));
    assert.equal(await page.textContent('#overlay-title'), 'Hai vinto!');
    assert.equal(await page.textContent('#stat-best'), '100');
    if (shotDir) await page.screenshot({ path: path.join(shotDir, 'vittoria.png') });
  });

  await test('reload: partita e record ripresi da localStorage', async () => {
    await page.reload();
    assert.equal(await page.textContent('#stat-current'), '100');
    assert.equal(await page.textContent('#stat-best'), '100');
    assert.ok(await page.isVisible('#overlay'));
  });

  await test('undo dal nuovo stato + nuova partita', async () => {
    await page.click('#overlay-close');
    assert.ok(!(await page.isVisible('#overlay')));
    await page.click('#btn-undo');
    assert.equal(await page.textContent('#stat-current'), '99');
    // A partita in corso serve la conferma a due tocchi.
    await page.click('#btn-new');
    assert.equal(await page.textContent('#stat-current'), '99');
    await page.click('#btn-new');
    assert.equal(await page.textContent('#stat-current'), '0');
    assert.equal(await page.textContent('#stat-best'), '100');
  });

  await test('sconfitta: overlay con numero raggiunto e "Annulla ultima mossa"', async () => {
    // Percorso greedy che si blocca presto.
    let s = L.createState();
    s = L.applyMove(s, 0);
    while (L.legalMoves(s).length) s = L.applyMove(s, L.legalMoves(s)[0]);
    assert.equal(L.status(s), 'lost');
    for (const i of s.path) {
      const p = await cellCenter(page, i);
      await page.touchscreen.tap(p.x, p.y);
    }
    await page.waitForSelector('#overlay:not([hidden])');
    assert.ok(await page.isVisible('#overlay'));
    assert.equal(await page.textContent('#overlay-title'), 'Nessuna mossa possibile');
    assert.equal(await page.textContent('#overlay-badge'), String(s.path.length));
    if (shotDir) await page.screenshot({ path: path.join(shotDir, 'sconfitta.png') });
    await page.click('#overlay-undo');
    assert.ok(!(await page.isVisible('#overlay')));
    assert.equal(await page.textContent('#stat-current'), String(s.path.length - 1));
  });

  await test('nessun errore o warning in console', async () => {
    assert.deepEqual(errors, []);
  });
  await ctx.close();

  console.log('Tastiera e accessibilità (desktop)');
  await test('frecce + Invio piazzano i numeri, focus visibile, ruoli ARIA', async () => {
    const c = await newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    const errs = watchConsole(p);
    await p.goto(base);
    assert.equal(await p.getAttribute('#board', 'role'), 'grid');
    assert.equal(await p.locator('[role=row]').count(), 10);
    assert.equal(await p.locator('[role=gridcell]').count(), 100);
    assert.equal(await p.locator('[role=gridcell][tabindex="0"]').count(), 1);
    // Tab fino alla griglia: il primo elemento focusabile è "?", poi la cella attiva.
    await p.keyboard.press('Tab');
    await p.keyboard.press('Tab');
    assert.equal(await p.evaluate(() => document.activeElement.getAttribute('role')), 'gridcell');
    // Cella iniziale 44 = (4,4). Vai in (4,4) e scrivi 1, poi → → → e scrivi 2 in (4,7).
    await p.keyboard.press('Enter');
    assert.equal(await p.textContent('#stat-current'), '1');
    for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowRight');
    await p.keyboard.press(' ');
    assert.equal(await p.textContent('#stat-current'), '2');
    assert.equal(await p.locator('.cell').nth(47).textContent(), '2');
    const label = await p.locator('.cell').nth(47).getAttribute('aria-label');
    assert.equal(label, 'riga 5, colonna 8: 2, ultimo numero');
    const outline = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    assert.equal(outline, 'solid');
    await p.keyboard.press('Control+z');
    assert.equal(await p.textContent('#stat-current'), '1');
    assert.match(await p.textContent('#status'), /Annullato il 2/);
    assert.deepEqual(errs, []);
    await c.close();
  });

  console.log('Robustezza');
  await test('localStorage che lancia eccezioni (Safari privato): si gioca lo stesso', async () => {
    const c = await newContext();
    await c.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() { throw new DOMException('The operation is insecure.', 'SecurityError'); }
      });
    });
    const p = await c.newPage();
    const errs = watchConsole(p);
    await p.goto(base);
    await p.click('.cell >> nth=0');
    await p.click('.cell >> nth=3');
    assert.equal(await p.textContent('#stat-current'), '2');
    assert.deepEqual(errs, []);
    await c.close();
  });

  await test('localStorage pieno (setItem lancia QuotaExceededError)', async () => {
    const c = await newContext();
    await c.addInitScript(() => {
      Storage.prototype.setItem = function () { throw new DOMException('quota', 'QuotaExceededError'); };
    });
    const p = await c.newPage();
    const errs = watchConsole(p);
    await p.goto(base);
    await p.click('.cell >> nth=0');
    assert.equal(await p.textContent('#stat-current'), '1');
    assert.deepEqual(errs, []);
    await c.close();
  });

  await test('salvataggio corrotto ignorato', async () => {
    const c = await newContext();
    await c.addInitScript(() => {
      localStorage.setItem('giocodel100:partita', '{"v":1,"path":[0,1,2]}');
      localStorage.setItem('giocodel100:record', 'banana');
    });
    const p = await c.newPage();
    const errs = watchConsole(p);
    await p.goto(base);
    assert.equal(await p.textContent('#stat-current'), '0');
    assert.equal(await p.textContent('#stat-best'), '0');
    assert.deepEqual(errs, []);
    await c.close();
  });

  await test('service worker: installabile e funziona offline', async () => {
    const c = await newContext();
    const p = await c.newPage();
    const errs = watchConsole(p);
    await p.goto(localhost);
    await p.evaluate(() => navigator.serviceWorker.ready);
    const manifest = await p.evaluate(async () => (await fetch('manifest.json')).json());
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
    await p.reload(); // ora la pagina è controllata dal SW
    await c.setOffline(true);
    await p.reload();
    assert.equal(await p.locator('[role=gridcell]').count(), 100);
    await p.goto(localhost + 'rules.html');
    assert.match(await p.textContent('h1'), /Come si gioca/);
    await c.setOffline(false);
    assert.deepEqual(errs, []);
    await c.close();
  });

  console.log('Lingue (scelte solo dalle preferenze del browser)');
  const LOCALES = {
    it: 'it-IT', en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', pt: 'pt-BR', nl: 'nl-NL', pl: 'pl-PL',
    tr: 'tr-TR', id: 'id-ID', ru: 'ru-RU', zh: 'zh-CN', 'zh-Hant': 'zh-TW', ja: 'ja-JP', ko: 'ko-KR'
  };
  const narrow = { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };
  const dead = (() => {
    let s = L.applyMove(L.createState(), 0);
    while (L.legalMoves(s).length) s = L.applyMove(s, L.legalMoves(s)[0]);
    return s;
  })();

  for (const lang of I.LANGUAGES) {
    const T = I.STRINGS[lang];
    await test(`${lang} (${LOCALES[lang]}): testi tradotti, niente trabocchi a 320px, partita e regole`, async () => {
      const c = await newContext({ ...narrow, locale: LOCALES[lang] });
      const p = await c.newPage();
      const errs = watchConsole(p);
      await p.goto(base);
      assert.equal(await p.getAttribute('html', 'lang'), T.htmlLang);
      assert.equal(await p.title(), T.title);
      assert.equal(await p.textContent('h1.title'), T.title);
      assert.equal(await p.textContent('h1.title .title-num'), '100');
      assert.equal(await p.textContent('.dedica'), T.dedication);
      assert.equal(await p.textContent('[data-i18n="undo"]'), T.undo);
      assert.equal(await p.textContent('#status'), T.statusReady);
      assertFits(await layoutReport(p));

      let pt = await cellCenter(p, 0);
      await p.touchscreen.tap(pt.x, pt.y);
      assert.equal(await p.textContent('#status'), T.placed(1, T.position(1, 1)) + ' ' + T.statusPlaying(2, 3));
      assert.equal(await p.getAttribute('.cell >> nth=0', 'aria-label'), T.position(1, 1) + T.colon + '1' + T.comma + T.cellLast);

      // "Nuova partita" a partita in corso: testo di conferma senza trabocchi.
      await p.click('#btn-new');
      assert.equal(await p.textContent('#btn-new'), T.confirm);
      assertFits(await layoutReport(p));
      await p.click('#btn-new');

      for (const i of dead.path) {
        pt = await cellCenter(p, i);
        await p.touchscreen.tap(pt.x, pt.y);
      }
      await p.waitForSelector('#overlay:not([hidden])');
      assert.equal(await p.textContent('#overlay-title'), T.lostTitle);
      assert.equal(await p.textContent('#overlay-text'), T.lostText(dead.path.length, 100 - dead.path.length, dead.path.length, true));
      assertFits(await layoutReport(p));
      if (shotDir) await p.screenshot({ path: path.join(shotDir, `lang-${lang}.png`) });

      await p.goto(base + 'rules.html');
      assert.equal(await p.title(), T.pageTitle);
      assert.equal(await p.textContent('h1'), T.rulesH1);
      assert.equal(await p.textContent('.dedica'), T.dedication);
      assert.equal(await p.inputValue('#lang-select'), '');
      assert.equal(await p.locator('#lang-select option').count(), I.LANGUAGES.length + 1);
      const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      assert.ok(w[0] <= w[1], `pagina regole più larga dello schermo: ${w}`);
      if (shotDir) await p.screenshot({ path: path.join(shotDir, `rules-${lang}.png`), fullPage: true });
      assert.deepEqual(errs, []);
      await c.close();
    });
  }

  await test('lingua non supportata (ar-SA) -> inglese', async () => {
    const c = await newContext({ locale: 'ar-SA' });
    const p = await c.newPage();
    await p.goto(base);
    assert.equal(await p.getAttribute('html', 'lang'), 'en');
    assert.equal(await p.textContent('[data-i18n="undo"]'), 'Undo');
    await c.close();
  });

  await test('scelta manuale: vale anche per il gioco, resta dopo il reload, "Automatica" la toglie', async () => {
    const c = await newContext({ locale: 'it-IT' });
    const p = await c.newPage();
    const errs = watchConsole(p);
    await p.goto(base + 'rules.html');
    await p.selectOption('#lang-select', 'ja');
    assert.equal(await p.textContent('h1'), I.STRINGS.ja.rulesH1);
    await p.click('.back');
    await p.waitForURL(base);
    assert.equal(await p.textContent('[data-i18n="undo"]'), I.STRINGS.ja.undo);
    await p.reload();
    assert.equal(await p.getAttribute('html', 'lang'), 'ja');
    // Indietro/avanti dalla cache (bfcache) dopo un cambio di lingua.
    await p.goto(base + 'rules.html');
    await p.selectOption('#lang-select', '');
    assert.equal(await p.textContent('h1'), I.STRINGS.it.rulesH1);
    await p.goBack();
    await p.waitForFunction(() => document.documentElement.lang === 'it');
    assert.equal(await p.textContent('[data-i18n="undo"]'), I.STRINGS.it.undo);
    assert.deepEqual(errs, []);
    await c.close();
  });

  console.log('Pagine con la lingua nell’indirizzo (SEO)');
  await test('/fr/ resta in francese anche con il browser in italiano, e si gioca', async () => {
    const c = await newContext({ ...narrow, locale: 'it-IT' });
    const p = await c.newPage();
    const errs = watchConsole(p);
    await p.goto(base + 'fr/');
    const T = I.STRINGS.fr;
    assert.equal(await p.getAttribute('html', 'lang'), 'fr');
    assert.equal(await p.title(), T.title);
    assert.equal(await p.textContent('#status'), T.statusReady);
    assertFits(await layoutReport(p)); // stile e script caricati da ../
    const pt = await cellCenter(p, 44);
    await p.touchscreen.tap(pt.x, pt.y);
    assert.equal(await p.textContent('#stat-current'), '1');
    assert.equal(await p.textContent('#status'), T.placed(1, T.position(5, 5)) + ' ' + T.statusPlaying(2, 8));
    assert.deepEqual(errs, []);
    await c.close();
  });

  await test('la partita è la stessa in tutte le lingue (stesso salvataggio)', async () => {
    const c = await newContext({ locale: 'it-IT' });
    const p = await c.newPage();
    await p.goto(base + 'de/');
    await p.click('.cell >> nth=0');
    await p.click('.cell >> nth=3');
    await p.goto(base + 'ja/');
    assert.equal(await p.textContent('#stat-current'), '2');
    await p.goto(base);
    assert.equal(await p.textContent('#stat-current'), '2');
    await c.close();
  });

  await test('dal selettore in /fr/rules.html si passa a /de/rules.html; "Automatica" torna alla radice', async () => {
    const c = await newContext({ locale: 'it-IT' });
    const p = await c.newPage();
    const errs = watchConsole(p);
    await p.goto(base + 'fr/rules.html');
    assert.equal(await p.inputValue('#lang-select'), 'fr');
    assert.equal(await p.getAttribute('.lang-links a[aria-current="page"]', 'hreflang'), 'fr');
    await Promise.all([p.waitForURL(base + 'de/rules.html'), p.selectOption('#lang-select', 'de')]);
    assert.equal(await p.textContent('h1'), I.STRINGS.de.rulesH1);
    await p.click('.back');
    await p.waitForURL(base + 'de/');
    assert.equal(await p.textContent('[data-i18n="undo"]'), I.STRINGS.de.undo);
    // La scelta vale anche per la radice.
    await p.goto(base);
    assert.equal(await p.getAttribute('html', 'lang'), 'de');
    await p.goto(base + 'de/rules.html');
    await Promise.all([p.waitForURL(base + 'rules.html'), p.selectOption('#lang-select', '')]);
    assert.equal(await p.getAttribute('html', 'lang'), 'it');
    // I link "altre lingue" sono veri link, seguibili dai crawler.
    await p.click('.lang-links a[hreflang="ko"]');
    await p.waitForURL(base + 'ko/rules.html');
    assert.equal(await p.textContent('h1'), I.STRINGS.ko.rulesH1);
    assert.deepEqual(errs, []);
    await c.close();
  });

  await test('service worker registrato da /es/ con scope sulla radice; /es/ funziona offline', async () => {
    const c = await newContext({ locale: 'it-IT' });
    const p = await c.newPage();
    const errs = watchConsole(p);
    await p.goto(localhost + 'es/');
    const scope = await p.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    assert.equal(scope, localhost);
    await p.reload();
    await c.setOffline(true);
    await p.reload();
    assert.equal(await p.getAttribute('html', 'lang'), 'es');
    assert.equal(await p.locator('[role=gridcell]').count(), 100);
    await c.setOffline(false);
    assert.deepEqual(errs, []);
    await c.close();
  });

  await test('pagina 404: tradotta, con link al gioco', async () => {
    const c = await newContext({ locale: 'pl-PL' });
    const p = await c.newPage();
    const errs = watchConsole(p);
    await p.goto(base + 'not_found.html');
    assert.equal(await p.textContent('h1'), I.STRINGS.pl.title);
    assert.equal(await p.getAttribute('a.btn', 'href'), '/');
    assert.deepEqual(errs, []);
    await c.close();
  });

  console.log('Regressioni (revisione del codice)');
  const tapCell = (pg, i) => pg.evaluate((k) => {
    const e = document.querySelectorAll('.cell')[k];
    const r = e.getBoundingClientRect();
    e.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, isPrimary: true, pointerType: 'mouse', button: 0,
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
    }));
  }, i);

  await test('due schede aperte: il record non scende e la partita resta allineata', async () => {
    const c = await newContext();
    const A = await c.newPage();
    await A.goto(base);
    const B = await c.newPage();
    await B.goto(base);
    for (let i = 0; i < 20; i++) await tapCell(B, solution[i]);
    await A.waitForFunction(() => document.getElementById('stat-current').textContent === '20');
    assert.equal(await A.textContent('#stat-best'), '20');
    // A continua la partita di B invece di sovrascriverla con la sua vecchia.
    await tapCell(A, solution[20]);
    assert.equal(await A.textContent('#stat-current'), '21');
    assert.equal(await A.evaluate(() => localStorage.getItem('giocodel100:record')), '21');
    // Nuova partita in B: il record resta 21 anche quando A gioca poche mosse.
    await B.waitForFunction(() => document.getElementById('stat-current').textContent === '21');
    await B.click('#btn-new');
    await B.click('#btn-new');
    await A.waitForFunction(() => document.getElementById('stat-current').textContent === '0');
    for (let i = 0; i < 3; i++) await tapCell(A, solution[i]);
    assert.equal(await A.evaluate(() => localStorage.getItem('giocodel100:record')), '21');
    assert.equal(await A.textContent('#stat-best'), '21');
    await c.close();
  });

  await test('scorciatoie con tastiera russa (Ctrl+Z → "я", U → "г") e AZERTY', async () => {
    const c = await newContext({ locale: 'ru-RU' });
    const p = await c.newPage();
    await p.goto(base);
    for (let i = 0; i < 3; i++) await tapCell(p, solution[i]);
    const key = (init) => p.evaluate((o) => document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...o })), init);
    await key({ key: 'я', code: 'KeyZ', ctrlKey: true });
    assert.equal(await p.textContent('#stat-current'), '2');
    await key({ key: 'г', code: 'KeyU' });
    assert.equal(await p.textContent('#stat-current'), '1');
    await key({ key: 'ь', code: 'KeyM' });
    assert.equal(await p.getAttribute('#btn-hints', 'aria-pressed'), 'false');
    // AZERTY: la lettera "z" sta dove QWERTY ha la W (code KeyW). Vale la lettera.
    await tapCell(p, solution[1]);
    await key({ key: 'z', code: 'KeyW', ctrlKey: true });
    assert.equal(await p.textContent('#stat-current'), '1');
    // …e il tasto fisico KeyZ su AZERTY produce "w": non deve annullare.
    await tapCell(p, solution[1]);
    await key({ key: 'w', code: 'KeyZ', ctrlKey: true });
    assert.equal(await p.textContent('#stat-current'), '2');
    await c.close();
  });

  await test('schermata finale: sfondo inert, e dopo "Annulla ultima mossa" il focus torna sulla griglia', async () => {
    const c = await newContext();
    const p = await c.newPage();
    await p.goto(base);
    let s = L.applyMove(L.createState(), 0);
    while (L.legalMoves(s).length) s = L.applyMove(s, L.legalMoves(s)[0]);
    for (const i of s.path) await tapCell(p, i);
    await p.waitForSelector('#overlay:not([hidden])');
    assert.equal(await p.evaluate(() => document.querySelector('.app').inert), true);
    await p.focus('#overlay-undo');
    await p.keyboard.press('Enter');
    assert.equal(await p.evaluate(() => document.querySelector('.app').inert), false);
    assert.equal(await p.evaluate(() => document.activeElement.getAttribute('role')), 'gridcell');
    assert.equal(await p.textContent('#stat-current'), String(s.path.length - 1));
    // Le frecce funzionano subito, senza dover ritrovare la griglia col Tab.
    await p.keyboard.press('ArrowRight');
    assert.equal(await p.evaluate(() => document.activeElement.getAttribute('role')), 'gridcell');
    await c.close();
  });

  await test('pagina regole: zoom permesso (solo il gioco lo blocca)', async () => {
    const c = await newContext();
    const p = await c.newPage();
    for (const url of ['rules.html', 'fr/rules.html']) {
      await p.goto(base + url);
      assert.doesNotMatch(await p.getAttribute('meta[name=viewport]', 'content'), /user-scalable=no|maximum-scale/);
    }
    await p.goto(base);
    assert.match(await p.getAttribute('meta[name=viewport]', 'content'), /user-scalable=no/);
    await c.close();
  });

  console.log('Controller (simulato)');
  // Controller finto: il test decide quali tasti sono premuti. Leggere
  // gamepad.id viene registrato, per verificare che il gioco non lo faccia.
  // Come nei browser veri, il controller è invisibile finché non si preme
  // un tasto (__pad.awake): quella pressione "lo sveglia".
  const fakePad = () => {
    window.__pad = { buttons: new Array(17).fill(false), axes: [0, 0, 0, 0], idRead: false, awake: false };
    navigator.getGamepads = () => (!window.__pad.awake ? [null] : [{
      connected: true,
      mapping: 'standard',
      get id() { window.__pad.idRead = true; return 'Test controller'; },
      buttons: window.__pad.buttons.map((p) => ({ pressed: p, value: p ? 1 : 0 })),
      axes: window.__pad.axes.slice()
    }]);
  };
  const wake = (pg, button) => pg.evaluate((b) => {
    if (b != null) window.__pad.buttons[b] = true;
    window.__pad.awake = true;
    window.dispatchEvent(new Event('gamepadconnected'));
  }, button);
  const padSet = (pg, patch) => pg.evaluate((o) => {
    if (o.buttons) for (const [i, v] of Object.entries(o.buttons)) window.__pad.buttons[i] = v;
    if (o.axes) window.__pad.axes = o.axes;
  }, patch);
  const frames = (pg, n = 3) => pg.evaluate((k) => new Promise((res) => {
    const step = () => (k-- > 0 ? requestAnimationFrame(step) : res());
    step();
  }), n);
  const press = async (pg, button) => {
    await padSet(pg, { buttons: { [button]: true } });
    await frames(pg);
    await padSet(pg, { buttons: { [button]: false } });
    await frames(pg);
  };
  const cursor = (pg) => pg.evaluate(() => Number(document.querySelector('.cell[tabindex="0"]').dataset.index));
  const PAD = { A: 0, B: 1, Y: 3, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

  await test('controller: collegamento, cursore visibile, croce, A scrive, B annulla, Y mosse', async () => {
    const c = await newContext({ locale: 'en-US' });
    await c.addInitScript(fakePad);
    const p = await c.newPage();
    const errs = watchConsole(p);
    await p.goto(base);
    // Il tasto che "sveglia" il controller (qui A) non deve scrivere nulla.
    await frames(p, 5);
    assert.equal(await p.locator('#board.show-cursor').count(), 0, 'nessun cursore prima del controller');
    await wake(p, PAD.A);
    await frames(p, 5);
    await padSet(p, { buttons: { [PAD.A]: false } });
    await frames(p);
    assert.equal(await p.textContent('#stat-current'), '0');
    // Messaggio di collegamento, seguito da cosa fare adesso.
    assert.equal(await p.textContent('#status'), I.STRINGS.en.gamepadConnected + ' ' + I.STRINGS.en.statusReady);
    assert.equal(await p.locator('#board.show-cursor').count(), 1);
    assert.equal(await cursor(p), 44);

    await press(p, PAD.RIGHT);
    await press(p, PAD.DOWN);
    assert.equal(await cursor(p), 55);
    await press(p, PAD.A);
    assert.equal(await p.textContent('#stat-current'), '1');
    assert.equal(await p.locator('.cell').nth(55).textContent(), '1');
    // Tre passi a destra = mossa legale (5,8): la scrive.
    for (let i = 0; i < 3; i++) await press(p, PAD.RIGHT);
    await press(p, PAD.A);
    assert.equal(await p.locator('.cell').nth(58).textContent(), '2');
    await press(p, PAD.B);
    assert.equal(await p.textContent('#stat-current'), '1');
    await press(p, PAD.Y);
    assert.equal(await p.getAttribute('#btn-hints', 'aria-pressed'), 'false');
    // Start: nuova partita con la stessa conferma a due pressioni.
    await press(p, PAD.START);
    assert.equal(await p.textContent('#stat-current'), '1');
    await press(p, PAD.START);
    assert.equal(await p.textContent('#stat-current'), '0');
    // Toccare lo schermo nasconde il cursore.
    await p.mouse.click(5, 5);
    const pt = await cellCenter(p, 0);
    await p.mouse.click(pt.x, pt.y);
    assert.equal(await p.locator('#board.show-cursor').count(), 0);
    assert.equal(await p.evaluate(() => window.__pad.idRead), false, 'gamepad.id letto');
    assert.deepEqual(errs, []);
    await c.close();
  });

  await test('controller: tenere premuto ripete (non attraversa la griglia), ai bordi si ferma', async () => {
    const c = await newContext();
    await c.addInitScript(fakePad);
    const p = await c.newPage();
    await p.goto(base);
    await wake(p);
    await frames(p);
    await padSet(p, { buttons: { [PAD.LEFT]: true } });
    await p.waitForTimeout(250);
    assert.equal(await cursor(p), 43, 'un solo passo prima della ripetizione');
    await p.waitForTimeout(700);
    await padSet(p, { buttons: { [PAD.LEFT]: false } });
    await frames(p);
    assert.equal(await cursor(p), 40, 'fermo al bordo sinistro');
    await c.close();
  });

  await test('controller: levetta con zona morta e asse dominante', async () => {
    const c = await newContext();
    await c.addInitScript(fakePad);
    const p = await c.newPage();
    await p.goto(base);
    await wake(p);
    await frames(p);
    await padSet(p, { axes: [0.2, -0.25, 0, 0] });
    await frames(p, 5);
    assert.equal(await cursor(p), 44, 'levetta quasi ferma: nessun movimento');
    await padSet(p, { axes: [0.3, -0.9, 0, 0] });
    await frames(p);
    await padSet(p, { axes: [0, 0, 0, 0] });
    await frames(p);
    assert.equal(await cursor(p), 34, 'su (asse dominante), non in diagonale');
    await c.close();
  });

  await test('controller: schermata finale — croce tra i pulsanti, A conferma, B annulla', async () => {
    const c = await newContext();
    await c.addInitScript(fakePad);
    const p = await c.newPage();
    await p.goto(base);
    await wake(p);
    await frames(p);
    let s = L.applyMove(L.createState(), 0);
    while (L.legalMoves(s).length) s = L.applyMove(s, L.legalMoves(s)[0]);
    for (const i of s.path) await tapCell(p, i);
    await p.waitForSelector('#overlay:not([hidden])');
    // B = annulla l'ultima mossa (come fuori dalla schermata).
    await press(p, PAD.B);
    assert.ok(!(await p.isVisible('#overlay')));
    assert.equal(await p.textContent('#stat-current'), String(s.path.length - 1));
    // Di nuovo alla fine: su/giù spostano tra i pulsanti, A conferma quello scelto.
    await tapCell(p, s.path[s.path.length - 1]);
    await p.waitForSelector('#overlay:not([hidden])');
    assert.equal(await p.evaluate(() => document.activeElement.id), 'overlay-new');
    await press(p, PAD.DOWN);
    assert.equal(await p.evaluate(() => document.activeElement.id), 'overlay-close');
    await press(p, PAD.A);
    assert.ok(!(await p.isVisible('#overlay')));
    assert.equal(await p.textContent('#stat-current'), String(s.path.length), '"Guarda la griglia" non cambia la partita');
    await c.close();
  });

  console.log('Privacy');
  await test('zero richieste esterne, zero cookie, localStorage solo con chiavi del gioco', async () => {
    const c = await newContext({ locale: 'de-DE' });
    const p = await c.newPage();
    const urls = [];
    p.on('request', (r) => urls.push(r.url()));
    await p.goto(base);
    const pt = await cellCenter(p, 44);
    await p.mouse.click(pt.x, pt.y);
    await p.goto(base + 'rules.html');
    await p.selectOption('#lang-select', 'fr');
    await p.goto(base);
    const external = urls.filter((u) => !u.startsWith(base));
    assert.deepEqual(external, [], 'richieste verso altri domini');
    assert.deepEqual(await c.cookies(), []);
    assert.equal(await p.evaluate(() => document.cookie), '');
    const keys = await p.evaluate(() => Object.keys(localStorage).sort());
    assert.deepEqual(keys, ['giocodel100:lingua', 'giocodel100:partita', 'giocodel100:record']);
    await c.close();
  });

  await browser.close();
  server.close();
  console.log(`\n${passed} passati, ${failed} falliti`);
  process.exitCode = failed ? 1 : 0;
})();
