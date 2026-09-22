#!/usr/bin/env node
/*
 * Genera le pagine per i motori di ricerca, a partire da index.html e
 * rules.html (le sorgenti, in italiano):
 *
 *   - /it/, /en/, /fr/, … /ko/: gioco e regole con il testo GIÀ tradotto
 *     nell'HTML, così i motori di ricerca indicizzano ogni lingua al suo
 *     indirizzo. Nel browser vince la lingua dell'indirizzo.
 *   - nel <head> di tutte le pagine (radice compresa): descrizione,
 *     canonical, hreflang, Open Graph e dati strutturati schema.org;
 *   - sitemap.xml con tutte le pagine e le loro alternative linguistiche.
 *
 * La radice / resta la pagina "x-default": sceglie la lingua dal browser.
 *
 *   node tools/build-pages.js           # rigenera i file
 *   node tools/build-pages.js --check   # esce con errore se non aggiornati (CI)
 *
 * Solo Node, nessuna dipendenza. Le sorgenti sono HTML scritto da noi e
 * marcato con data-i18n*, quindi bastano sostituzioni mirate.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const I = require('../i18n.js');

const ROOT = path.join(__dirname, '..');
const ORIGIN = I.ORIGIN;
const PAGES = { index: 'index.html', rules: 'rules.html' };
const OG_IMAGE = ORIGIN + 'og-image.png';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const stripTags = (s) => s.replace(/<[^>]+>/g, '');

/** URL assoluto di una pagina; code = null per la radice (x-default). */
function pageUrl(code, page) {
  const dir = code ? I.dirFor(code) + '/' : '';
  return ORIGIN + dir + (page === 'index' ? '' : PAGES[page]);
}

function description(d, page) {
  if (page === 'index') return d.metaDescription;
  return stripTags(d.rulesH1 + ': ' + d.rulesIntro + ' ' + d.rule3 + ' ' + d.rule4).replace(/\s+/g, ' ');
}

function seoBlock(code, page) {
  const d = I.STRINGS[code || I.DEFAULT_LANG];
  const url = pageUrl(code, page);
  const title = page === 'index' ? d.title : d.pageTitle;
  const desc = description(d, page);
  const out = [
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${url}">`
  ];
  for (const c of I.LANGUAGES) {
    out.push(`<link rel="alternate" hreflang="${I.STRINGS[c].htmlLang}" href="${pageUrl(c, page)}">`);
  }
  out.push(`<link rel="alternate" hreflang="x-default" href="${pageUrl(null, page)}">`);
  out.push(
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${esc(d.title)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${OG_IMAGE}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(d.title)}">`,
    `<meta property="og:locale" content="${d.ogLocale}">`
  );
  for (const c of I.LANGUAGES) {
    if (I.STRINGS[c].ogLocale !== d.ogLocale) {
      out.push(`<meta property="og:locale:alternate" content="${I.STRINGS[c].ogLocale}">`);
    }
  }
  out.push('<meta name="twitter:card" content="summary_large_image">');
  if (page === 'index') {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: d.title,
      alternateName: I.LANGUAGES.map((c) => I.STRINGS[c].title).filter((t) => t !== d.title),
      url,
      description: desc,
      inLanguage: d.htmlLang,
      applicationCategory: 'GameApplication',
      genre: 'Puzzle',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      image: OG_IMAGE
    };
    // "<" escapato: il JSON sta dentro un <script>.
    out.push(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`);
  }
  return out;
}

function langLinks(code) {
  const d = I.STRINGS[code || I.DEFAULT_LANG];
  const items = I.LANGUAGES.map((c) => {
    const s = I.STRINGS[c];
    const current = c === code ? ' aria-current="page"' : '';
    return `<a href="${I.dirFor(c)}/rules.html" lang="${s.htmlLang}" hreflang="${s.htmlLang}"${current}>${esc(s.name)}</a>`;
  });
  return [
    `<nav class="lang-links" aria-label="${esc(d.language)}" data-i18n-attr="aria-label:language">`,
    // Spazi tra i link: servono per andare a capo sugli schermi stretti.
    '  ' + items.join(' <span aria-hidden="true">·</span> '),
    '</nav>'
  ];
}

/** Sostituisce il contenuto tra <!-- name:start --> e <!-- name:end -->, mantenendo il rientro. */
function fillBlock(html, name, lines) {
  const re = new RegExp(`([ \\t]*)<!-- ${name}:start -->[\\s\\S]*?<!-- ${name}:end -->`);
  if (!re.test(html)) throw new Error(`manca il blocco ${name}`);
  return html.replace(re, (_, indent) =>
    [`${indent}<!-- ${name}:start -->`, ...lines.map((l) => indent + l), `${indent}<!-- ${name}:end -->`].join('\n'));
}

/** Applica i testi di una lingua agli elementi data-i18n* (come fa i18n.js nel browser). */
function translate(html, d) {
  html = html.replace(/(<(\w+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)[\s\S]*?(<\/\2>)/g,
    (m, open, tag, key, close) => (typeof d[key] === 'string' ? open + esc(d[key]) + close : m));
  html = html.replace(/(<(\w+)\b[^>]*\sdata-i18n-html="([^"]+)"[^>]*>)[\s\S]*?(<\/\2>)/g,
    (m, open, tag, key, close) => (typeof d[key] === 'string' ? open + d[key] + close : m));
  html = html.replace(/(<(\w+)\b[^>]*\sdata-i18n-accent="([^"]+)"[^>]*>)[\s\S]*?(<\/\2>)/g,
    (m, open, tag, key, close) => {
      const v = d[key];
      const at = v.indexOf('100');
      const inner = at === -1 ? esc(v)
        : esc(v.slice(0, at)) + '<span class="title-num">100</span>' + esc(v.slice(at + 3));
      return open + inner + close;
    });
  html = html.replace(/<[^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g, (tag, spec) => {
    for (const pair of spec.split(';')) {
      const [attr, key] = pair.split(':');
      if (typeof d[key] !== 'string') continue;
      tag = tag.replace(new RegExp(`(\\s${attr}=")[^"]*(")`), `$1${esc(d[key])}$2`);
    }
    return tag;
  });
  return html;
}

/** Nelle pagine in /xx/ i file del sito stanno una cartella più su. */
function relocate(html) {
  return html.replace(/(\s(?:href|src)=")(?!https?:|#|\.\.?\/|rules\.html"|data:|mailto:)([^"]+")/g, '$1../$2');
}

function build() {
  const files = {};
  const sources = {};
  for (const [page, file] of Object.entries(PAGES)) {
    sources[page] = fs.readFileSync(path.join(ROOT, file), 'utf8');
  }

  // Radice: solo i blocchi generati cambiano, il resto è la sorgente.
  for (const [page, file] of Object.entries(PAGES)) {
    let html = fillBlock(sources[page], 'seo', seoBlock(null, page));
    if (page === 'rules') html = fillBlock(html, 'langs', langLinks(null));
    files[file] = html;
  }

  // Una cartella per lingua.
  for (const code of I.LANGUAGES) {
    const d = I.STRINGS[code];
    for (const [page, file] of Object.entries(PAGES)) {
      let html = translate(files[file], d);
      html = fillBlock(html, 'seo', seoBlock(code, page));
      if (page === 'rules') html = fillBlock(html, 'langs', langLinks(code));
      html = html.replace(/<html lang="[^"]*">/, `<html lang="${d.htmlLang}" data-i18n-lang="${code}">`);
      html = html.replace('<!doctype html>', '<!doctype html>\n<!-- Generato da tools/build-pages.js a partire da /' + file + ': non modificare a mano. -->');
      files[`${I.dirFor(code)}/${file}`] = relocate(html);
    }
  }

  files['sitemap.xml'] = sitemap();
  return files;
}

function sitemap() {
  const out = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
  ];
  for (const page of Object.keys(PAGES)) {
    for (const code of [null, ...I.LANGUAGES]) {
      out.push('  <url>', `    <loc>${pageUrl(code, page)}</loc>`);
      for (const c of I.LANGUAGES) {
        out.push(`    <xhtml:link rel="alternate" hreflang="${I.STRINGS[c].htmlLang}" href="${pageUrl(c, page)}"/>`);
      }
      out.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(null, page)}"/>`);
      out.push('  </url>');
    }
  }
  out.push('</urlset>');
  return out.join('\n') + '\n';
}

module.exports = { build, pageUrl };

if (require.main === module) {
  const check = process.argv.includes('--check');
  const files = build();
  const stale = [];
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(ROOT, rel);
    const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    if (current === content) continue;
    stale.push(rel);
    if (!check) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
    }
  }
  if (check && stale.length) {
    console.error('Pagine non aggiornate (esegui: node tools/build-pages.js):\n  ' + stale.join('\n  '));
    process.exit(1);
  }
  console.log(check ? `Pagine aggiornate (${Object.keys(files).length} file).`
    : `Scritti ${stale.length} file su ${Object.keys(files).length}.`);
}
