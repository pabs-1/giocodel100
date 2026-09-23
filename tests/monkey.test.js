// SPDX-FileCopyrightText: 2026 pabs-1 e i contributori del Gioco del 100
// SPDX-License-Identifier: AGPL-3.0-or-later
// Test "a raffica" (monkey test) in Chromium, solo sviluppo (serve Playwright):
//   node tests/monkey.test.js [semi separati da virgola] [azioni per seme]
//   node tests/monkey.test.js 21,22,23 350
// Centinaia di azioni casuali ma riproducibili (tocchi, clic, tastiera,
// controller simulato, schermata finale, condivisione, seconda scheda,
// partite vinte fino al 100). Dopo ogni azione controlla su entrambe le
// schede: griglia = partita salvata, contatori, ultima cella, record che non
// scende mai, schermata finale solo a partita finita, sfondo inert solo con
// la schermata aperta, nessun errore in console.
'use strict';

const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium, devices } = require('playwright');
const L = require('../logic.js');
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!fs.existsSync(f)) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });

// PRNG riproducibile
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

srv.listen(0, async () => {
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const seeds = (process.argv[2] || '21,22,23').split(',').map(Number);
  const STEPS = Number(process.argv[3] || 350);
  const b = await chromium.launch();
  let problems = 0;
  for (const seed of seeds) {
    const R = rng(seed); const pick = (a) => a[Math.floor(R() * a.length)];
    const dev = { ...pick([devices['iPhone 13'], devices['Pixel 7'], { viewport: { width: 1280, height: 800 } }, devices['iPad Mini']]) }; delete dev.defaultBrowserType;
    const ctx = await b.newContext({ ...dev, locale: pick(['it-IT', 'en-US', 'ru-RU', 'ja-JP', 'de-DE']) });
    await ctx.addInitScript(() => {
      window.__b = new Array(17).fill(false); window.__awake = false;
      navigator.getGamepads = () => window.__awake ? [{ connected: true, buttons: window.__b.map(p => ({ pressed: p, value: p ? 1 : 0 })), axes: [0, 0, 0, 0] }] : [null];
      navigator.share = () => Promise.resolve();
    });
    const page = await ctx.newPage(); const other = await ctx.newPage();
    const errs = []; for (const pg of [page, other]) { pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); }
    await page.goto(pick([base, base + 'fr/', base + 'ko/']));
    await other.goto(base);
    const hasTouch = !!dev.hasTouch;
    const log = [];
    const center = (pg, i) => pg.evaluate(k => { const r = document.querySelectorAll('.cell')[k].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }, i);
    const padPress = async (pg, btn) => { await pg.evaluate(k => { if (!window.__awake) { window.__awake = true; window.dispatchEvent(new Event('gamepadconnected')); } window.__b[k] = true; }, btn); await pg.waitForTimeout(40); await pg.evaluate(k => { window.__b[k] = false; }, btn); await pg.waitForTimeout(40); };
    const saved = (pg) => pg.evaluate(() => { try { return JSON.parse(localStorage.getItem('giocodel100:partita')); } catch (e) { return 'ERR'; } });
    let maxBest = 0;

    for (let step = 0; step < STEPS; step++) {
      const pg = R() < 0.12 ? other : page;
      const overlayOpen = await pg.evaluate(() => !document.getElementById('overlay').hidden);
      const st = await saved(pg);
      const path = st && st.path ? st.path : [];
      const s = L.stateFromPath(path) || L.createState();
      const legal = L.legalMoves(s);
      let action;
      try {
        if (overlayOpen) {
          action = pick(['ov-undo', 'ov-new', 'ov-close', 'ov-share', 'esc', 'pad-A', 'pad-B', 'pad-down', 'tab']);
          if (action === 'ov-undo') await pg.click('#overlay-undo', { timeout: 1000 }).catch(() => {});
          else if (action === 'ov-new') await pg.click('#overlay-new');
          else if (action === 'ov-close') await pg.click('#overlay-close');
          else if (action === 'ov-share') await pg.click('#overlay-share');
          else if (action === 'esc') await pg.keyboard.press('Escape');
          else if (action === 'tab') await pg.keyboard.press('Tab');
          else await padPress(pg, { 'pad-A': 0, 'pad-B': 1, 'pad-down': 13 }[action]);
        } else {
          const r = R();
          if (r < 0.015) {
            // Partita vinta completa: nuova partita e soluzione fino al 100.
            action = 'vittoria';
            await pg.evaluate(() => localStorage.setItem('giocodel100:partita', JSON.stringify({ v: 1, path: [] })));
            await pg.reload();
            const sol = L.solve(Math.floor(R() * 100));
            for (const i of sol) { const c = await center(pg, i); if (hasTouch) await pg.touchscreen.tap(c.x, c.y); else await pg.mouse.click(c.x, c.y); }
          }
          else if (r < 0.75 && legal.length) { const i = pick(legal); action = 'legale ' + i; const c = await center(pg, i); if (hasTouch) await pg.touchscreen.tap(c.x, c.y); else await pg.mouse.click(c.x, c.y); }
          else if (r < 0.80) { const i = Math.floor(R() * 100); action = 'cella a caso ' + i; const c = await center(pg, i); const dx = (R() - 0.5) * c.w * 1.6; if (hasTouch) await pg.touchscreen.tap(c.x + dx, c.y); else await pg.mouse.click(c.x + dx, c.y); }
          else if (r < 0.84) { action = 'annulla'; if (await pg.isEnabled('#btn-undo')) await pg.click('#btn-undo'); }
          else if (r < 0.86) { action = 'nuova'; await pg.click('#btn-new'); }
          else if (r < 0.88) { action = 'mosse'; await pg.click('#btn-hints'); }
          else if (r < 0.94) { action = 'tastiera'; await pg.focus('.cell[tabindex="0"]'); await pg.keyboard.press(pick(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Home', 'End', 'Control+z', 'u', 'm', 'Backspace'])); }
          else { action = 'controller'; await padPress(pg, pick([0, 1, 3, 9, 12, 13, 14, 15])); }
        }
      } catch (e) { action += ' (errore azione: ' + e.message.split('\n')[0] + ')'; }
      await pg.waitForTimeout(R() < 0.2 ? 400 : 30); // a volte si aspetta la schermata finale (350 ms)
      log.push(`${pg === page ? 'A' : 'B'} ${action}`);

      // Invarianti su entrambe le schede
      for (const [name, p] of [['A', page], ['B', other]]) {
        const snap = await p.evaluate(() => {
          const cells = [...document.querySelectorAll('.cell')];
          return {
            texts: cells.map(c => c.textContent), filled: cells.filter(c => c.classList.contains('filled')).length,
            last: cells.filter(c => c.classList.contains('last')).map(c => +c.dataset.index),
            cur: document.getElementById('stat-current').textContent, rem: document.getElementById('stat-remaining').textContent,
            best: document.getElementById('stat-best').textContent, overlay: !document.getElementById('overlay').hidden,
            inert: !!document.querySelector('.app').inert,
            saved: (() => { try { return JSON.parse(localStorage.getItem('giocodel100:partita')); } catch (e) { return null; } })(),
            rec: localStorage.getItem('giocodel100:record')
          };
        });
        const sp = snap.saved ? snap.saved.path : [];
        const ss = L.stateFromPath(sp);
        const bad = [];
        if (!ss) bad.push('salvataggio non valido');
        const n = sp.length;
        const want = L.boardFromPath(sp).map(v => v ? String(v) : '');
        // la scheda B può essere rimasta indietro solo se non ha ancora ricevuto l'evento storage: diamo tempo
        if (JSON.stringify(snap.texts) !== JSON.stringify(want)) bad.push('griglia ≠ partita salvata');
        if (snap.filled !== n) bad.push(`celle piene ${snap.filled} ≠ ${n}`);
        if (snap.cur !== String(n)) bad.push(`contatore ${snap.cur} ≠ ${n}`);
        if (snap.rem !== String(100 - n)) bad.push('rimaste errato');
        if (JSON.stringify(snap.last) !== JSON.stringify(n ? [sp[n - 1]] : [])) bad.push('ultima cella errata');
        const rec = Number(snap.rec || 0);
        if (rec < maxBest) bad.push(`record sceso ${maxBest} → ${rec}`);
        maxBest = Math.max(maxBest, rec);
        if (Number(snap.best) !== rec) bad.push(`record mostrato ${snap.best} ≠ salvato ${rec}`);
        if (rec < n) bad.push('record < numero');
        const over = ss && (L.status(ss) === 'won' || L.status(ss) === 'lost');
        if (snap.overlay && !over) bad.push('schermata finale aperta a partita non finita');
        if (snap.inert !== snap.overlay) bad.push(`inert ${snap.inert} ≠ schermata ${snap.overlay}`);
        if (bad.length) {
          problems++;
          console.log(`seme ${seed}, passo ${step}, scheda ${name}: ${bad.join('; ')}\n  ultime azioni: ${log.slice(-6).join(' | ')}`);
          step = STEPS; break;
        }
      }
    }
    if (errs.length) { problems++; console.log(`seme ${seed}: errori console:`, errs.slice(0, 5)); }
    const kinds = {}; for (const l of log) { const k = l.slice(2).split(' ')[0]; kinds[k] = (kinds[k] || 0) + 1; }
    console.log('  azioni:', JSON.stringify(kinds));
    console.log(`seme ${seed}: ${STEPS} azioni, ${dev.hasTouch ? 'touch' : 'mouse'}, record ${maxBest}, errori console ${errs.length}`);
    await ctx.close();
  }
  console.log(problems ? `PROBLEMI: ${problems}` : 'nessun problema');
  await b.close(); srv.close();
  process.exitCode = problems ? 1 : 0;
});
