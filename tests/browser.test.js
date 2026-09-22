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
      overflowing: [...document.querySelectorAll('.btn')]
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
      const ctx = await browser.newContext(opts);
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
  const ctx = await browser.newContext(phone);
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
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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
    const c = await browser.newContext();
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
    const c = await browser.newContext();
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
    const c = await browser.newContext();
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
    const c = await browser.newContext();
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

  await browser.close();
  server.close();
  console.log(`\n${passed} passati, ${failed} falliti`);
  process.exitCode = failed ? 1 : 0;
})();
