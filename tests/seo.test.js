// Test SEO delle pagine generate, senza framework: `node tests/seo.test.js`
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const I = require('../i18n.js');
const { build, pageUrl } = require('../tools/build-pages.js');

const ROOT = path.join(__dirname, '..');
let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (err) {
    failed++;
    console.log('  FAIL ' + name + '\n       ' + String(err && err.stack || err).split('\n').slice(0, 3).join('\n       '));
  }
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const attr = (html, re) => { const m = html.match(re); return m ? m[1] : null; };
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Tutte le pagine indicizzabili: radice (x-default) + 15 lingue, gioco e regole.
const PAGES = [];
for (const code of [null, ...I.LANGUAGES]) {
  for (const page of ['index', 'rules']) {
    const file = (code ? I.dirFor(code) + '/' : '') + page + '.html';
    PAGES.push({ code, page, file, url: pageUrl(code, page) });
  }
}

console.log('Generatore');

test('pagine, blocchi SEO e sitemap sono aggiornati (node tools/build-pages.js)', () => {
  const files = build();
  for (const [rel, content] of Object.entries(files)) {
    assert.equal(read(rel), content, `${rel} non aggiornato`);
  }
  assert.equal(Object.keys(files).length, PAGES.length + 1);
});

console.log('Pagine');

const descriptions = new Map();
for (const p of PAGES) {
  test(`${p.file}: titolo, descrizione, canonical, hreflang, Open Graph`, () => {
    const html = read(p.file);
    const d = I.STRINGS[p.code || 'it'];

    assert.equal(attr(html, /<html lang="([^"]+)"/), d.htmlLang);
    if (p.code) assert.match(html, new RegExp(`<html [^>]*data-i18n-lang="${p.code}"`));
    else assert.doesNotMatch(html, /data-i18n-lang=/);

    const titles = all(html, /<title[^>]*>([^<]*)<\/title>/g);
    assert.equal(titles.length, 1);
    assert.equal(unescape(titles[0]), p.page === 'index' ? d.title : d.pageTitle);

    const desc = unescape(attr(html, /<meta name="description" content="([^"]+)">/));
    assert.ok(desc && [...desc].length >= 40, 'descrizione troppo corta');
    if (p.page === 'index') assert.ok([...desc].length <= 160, `descrizione di ${[...desc].length} caratteri`);
    descriptions.set(p.file, desc);

    const canonicals = all(html, /<link rel="canonical" href="([^"]+)">/g);
    assert.deepEqual(canonicals, [p.url]);

    const alternates = all(html, /<link rel="alternate" hreflang="([^"]+)" href="[^"]+">/g);
    assert.deepEqual(alternates, [...I.LANGUAGES.map((c) => I.STRINGS[c].htmlLang), 'x-default']);
    for (const c of I.LANGUAGES) {
      assert.match(html, new RegExp(`hreflang="${I.STRINGS[c].htmlLang}" href="${pageUrl(c, p.page).replace(/\./g, '\\.')}"`));
    }
    assert.match(html, new RegExp(`hreflang="x-default" href="${pageUrl(null, p.page).replace(/\./g, '\\.')}"`));

    assert.equal(attr(html, /<meta property="og:url" content="([^"]+)">/), p.url);
    assert.equal(attr(html, /<meta property="og:image" content="([^"]+)">/), I.ORIGIN + 'og-image.png');
    assert.equal(attr(html, /<meta property="og:locale" content="([^"]+)">/), d.ogLocale);
    assert.equal(unescape(attr(html, /<meta property="og:description" content="([^"]+)">/)), desc);
  });

  test(`${p.file}: dati strutturati, testi tradotti, link a file esistenti`, () => {
    const html = read(p.file);
    const d = I.STRINGS[p.code || 'it'];

    const ld = all(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    if (p.page === 'index') {
      assert.equal(ld.length, 1);
      const data = JSON.parse(ld[0]);
      assert.equal(data['@type'], 'WebApplication');
      assert.equal(data.name, d.title);
      assert.equal(data.url, p.url);
      assert.equal(data.inLanguage, d.htmlLang);
      assert.equal(data.offers.price, '0');
    } else {
      assert.equal(ld.length, 0);
    }

    // Nessun testo dell'interfaccia rimasto in italiano nelle altre lingue.
    if (p.code && p.code !== 'it') {
      for (const it of ['Torna al gioco', 'Tocca una cella', 'Come si gioca', 'Nuova partita',
        'Annulla ultima mossa', 'Guarda la griglia', 'Dedicato alla', 'Per giocare serve', 'Comandi di gioco']) {
        assert.ok(!html.includes(it), `testo italiano rimasto: "${it}"`);
      }
      if (p.page === 'rules') assert.ok(html.includes(`>${d.rulesH1}</h1>`), 'intestazione non tradotta');
      else assert.ok(html.includes(`>${esc100(d.title)}</h1>`), 'titolo non tradotto');
    }

    // Ogni href/src relativo punta a un file che esiste.
    const dir = path.dirname(path.join(ROOT, p.file));
    for (const ref of all(html, /\s(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|#|data:|mailto:)/.test(ref)) continue;
      let target = path.resolve(dir, ref.split('#')[0]);
      if (ref.endsWith('/')) target = path.join(target, 'index.html');
      assert.ok(fs.existsSync(target), `${ref} non esiste`);
    }
  });
}

/** Il titolo nell'<h1> ha il "100" dentro uno <span>. */
function esc100(title) {
  return title.replace('100', '<span class="title-num">100</span>');
}

test('descrizioni diverse per ogni lingua', () => {
  const idx = PAGES.filter((p) => p.page === 'index' && p.code).map((p) => descriptions.get(p.file));
  assert.equal(new Set(idx).size, I.LANGUAGES.length);
});

console.log('File per i motori di ricerca');

test('sitemap.xml: 32 indirizzi, ognuno con 15 lingue + x-default', () => {
  const xml = read('sitemap.xml');
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  const urls = xml.split('<url>').slice(1);
  assert.equal(urls.length, PAGES.length);
  const locs = urls.map((u) => attr(u, /<loc>([^<]+)<\/loc>/));
  assert.deepEqual(locs.slice().sort(), PAGES.map((p) => p.url).sort());
  for (const u of urls) assert.equal((u.match(/<xhtml:link /g) || []).length, I.LANGUAGES.length + 1);
  assert.equal((xml.match(/<url>/g) || []).length, (xml.match(/<\/url>/g) || []).length);
});

test('robots.txt: tutto indicizzabile e sitemap dichiarata', () => {
  const txt = read('robots.txt');
  assert.match(txt, /^User-agent: \*$/m);
  assert.match(txt, /^Allow: \/$/m);
  assert.doesNotMatch(txt, /^Disallow: \/\s*$/m);
  assert.match(txt, new RegExp(`^Sitemap: ${I.ORIGIN.replace(/\./g, '\\.')}sitemap\\.xml$`, 'm'));
});

test('not_found.html: noindex e percorsi assoluti', () => {
  const html = read('not_found.html');
  assert.match(html, /<meta name="robots" content="noindex">/);
  for (const ref of all(html, /\s(?:href|src)="([^"]+)"/g)) assert.ok(ref.startsWith('/'), ref);
});

test('og-image.png: PNG 1200×630', () => {
  const buf = fs.readFileSync(path.join(ROOT, 'og-image.png'));
  assert.equal(buf.toString('hex', 0, 8), '89504e470d0a1a0a');
  assert.equal(buf.readUInt32BE(16), 1200);
  assert.equal(buf.readUInt32BE(20), 630);
  assert.ok(buf.length < 300 * 1024, 'immagine troppo pesante');
});

test('deploy.sh carica sitemap, robots, 404, anteprima e cartelle delle lingue', () => {
  const sh = read('deploy.sh');
  for (const f of ['sitemap.xml', 'robots.txt', 'not_found.html', 'og-image.png', '*/index.html', '*/rules.html']) {
    assert.ok(sh.includes(f), f);
  }
});

console.log(`\n${passed} passati, ${failed} falliti`);
process.exitCode = failed ? 1 : 0;
