// Rigenera le icone PNG da icons/icon.svg (solo sviluppo, serve Playwright):
//   node tools/make-icons.js icons
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
// Maskable: sfondo pieno (niente angoli arrotondati) e contenuto nella safe zone (80%).
const maskable = svg
  .replace('<rect width="512" height="512" rx="112" fill="#d9572b"/>',
           '<rect width="512" height="512" fill="#d9572b"/><g transform="translate(51.2 51.2) scale(0.8)">')
  .replace('</svg>', '</g></svg>');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shots = [
    ['icon-192.png', svg, 192, false],
    ['icon-512.png', svg, 512, false],
    ['icon-maskable-512.png', maskable, 512, false],
    // iOS arrotonda da solo: sfondo pieno, niente trasparenza.
    ['apple-touch-icon.png', maskable, 180],
  ];
  for (const [name, src, size] of shots) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.screenshot({ path: path.join(dir, name), omitBackground: true });
  }
  await browser.close();
})();
