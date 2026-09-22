// Rigenera og-image.png, l'anteprima 1200×630 usata quando si condivide il
// link (solo sviluppo, serve Playwright):   node tools/make-og.js
// Nessun testo tradotto: la stessa immagine va bene per tutte le lingue.
const { chromium } = require('playwright');
const path = require('path');
const L = require('../logic.js');

const path100 = L.solve(0);
const SHOWN = 37; // quanti numeri della soluzione mostrare sulla griglia
const board = L.boardFromPath(path100.slice(0, SHOWN));
const last = path100[SHOWN - 1];
const next = L.legalMoves(L.stateFromPath(path100.slice(0, SHOWN)));

let cells = '';
for (let i = 0; i < 100; i++) {
  const n = board[i];
  const cls = i === last ? 'last' : n ? 'filled' : next.includes(i) ? 'legal' : '';
  const p = n ? ((n - 1) / 99).toFixed(3) : 0;
  cells += `<div class="c ${cls}" style="--p:${p}">${n || ''}</div>`;
}

const html = `<!doctype html><html><head><style>
  body { margin: 0; width: 1200px; height: 630px; display: flex; align-items: center; gap: 64px;
         padding: 0 72px; box-sizing: border-box; background: #f6f1e7;
         font-family: system-ui, "DejaVu Sans", sans-serif; }
  .board { width: 530px; height: 530px; display: grid; grid-template-columns: repeat(10, 1fr);
           gap: 4px; padding: 4px; background: #e2d9c7; border-radius: 16px;
           box-shadow: 0 10px 40px rgb(60 45 20 / .15); }
  .c { display: flex; align-items: center; justify-content: center; border-radius: 7px;
       background: #fbf7ef; font-weight: 700; font-size: 21px; color: #2a2620; }
  .filled { background: hsl(calc(38 + var(--p) * 110) 55% 86%); }
  .last { background: #d9572b; color: #fff; }
  .legal { background: #e1f0ea; box-shadow: inset 0 0 0 3px #2f7d6d; }
  .brand { display: flex; flex-direction: column; align-items: flex-start; }
  .big { font-size: 230px; font-weight: 800; letter-spacing: -0.05em; line-height: .9; color: #d9572b; }
  .seq { margin-top: 28px; font-size: 64px; font-weight: 700; color: #2a2620; letter-spacing: -0.02em; }
  .seq span { color: #2f7d6d; }
</style></head><body>
  <div class="board">${cells}</div>
  <div class="brand"><div class="big">100</div><div class="seq">1 <span>→</span> 100</div></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html);
  await page.screenshot({ path: path.join(__dirname, '..', 'og-image.png') });
  await browser.close();
})();
