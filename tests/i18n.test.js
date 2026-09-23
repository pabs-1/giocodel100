// SPDX-FileCopyrightText: 2026 pabs-1 e i contributori del Gioco del 100
// SPDX-License-Identifier: AGPL-3.0-or-later
// Test delle traduzioni, senza framework: `node tests/i18n.test.js`
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const I = require('../i18n.js');

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

console.log('Scelta della lingua (solo preferenze del browser, nessun dato inviato)');

test('lingua esatta o con regione', () => {
  assert.equal(I.pickLanguage(['it-IT']), 'it');
  assert.equal(I.pickLanguage(['en-US', 'it']), 'en');
  assert.equal(I.pickLanguage(['pt-BR']), 'pt');
  assert.equal(I.pickLanguage(['pt-PT']), 'pt');
  assert.equal(I.pickLanguage(['de-CH']), 'de');
  assert.equal(I.pickLanguage(['fr-CA']), 'fr');
  assert.equal(I.pickLanguage(['es-419']), 'es');
  assert.equal(I.pickLanguage(['zh-CN']), 'zh');
  assert.equal(I.pickLanguage(['zh-SG']), 'zh');
  assert.equal(I.pickLanguage(['zh-Hans']), 'zh');
  assert.equal(I.pickLanguage(['zh']), 'zh');
  assert.equal(I.pickLanguage(['zh-TW']), 'zh-Hant');
  assert.equal(I.pickLanguage(['zh-HK']), 'zh-Hant');
  assert.equal(I.pickLanguage(['zh-MO']), 'zh-Hant');
  assert.equal(I.pickLanguage(['zh-Hant']), 'zh-Hant');
  assert.equal(I.pickLanguage(['zh-Hant-HK']), 'zh-Hant');
  assert.equal(I.pickLanguage(['ru-RU']), 'ru');
  assert.equal(I.pickLanguage(['ko-KR']), 'ko');
  assert.equal(I.pickLanguage(['nl-BE']), 'nl');
  assert.equal(I.pickLanguage(['pl-PL']), 'pl');
  assert.equal(I.pickLanguage(['tr-TR']), 'tr');
  assert.equal(I.pickLanguage(['id-ID']), 'id');
  assert.equal(I.pickLanguage(['ja-JP']), 'ja');
  assert.equal(I.pickLanguage(['JA']), 'ja');
  assert.equal(I.pickLanguage(['en_GB']), 'en');
});

test('rispetta l’ordine: la prima lingua supportata vince', () => {
  assert.equal(I.pickLanguage(['ar-SA', 'de-DE', 'en']), 'de');
  assert.equal(I.pickLanguage(['sv', 'nl', 'fr', 'it']), 'nl');
});

test('preferenze note ma non supportate -> inglese', () => {
  assert.equal(I.pickLanguage(['ar-SA']), 'en');
  assert.equal(I.pickLanguage(['he', 'hi', 'sv']), 'en');
});

test('nessuna preferenza nota -> italiano', () => {
  assert.equal(I.pickLanguage([]), 'it');
  assert.equal(I.pickLanguage(undefined), 'it');
  assert.equal(I.pickLanguage(['', null]), 'it');
});

test('nessuna chiave "ereditata" viene presa per una lingua', () => {
  assert.equal(I.pickLanguage(['constructor', 'toString', '__proto__']), 'en');
});

console.log('Dizionari');

const REF = I.STRINGS.it;
const KEYS = Object.keys(REF).sort();

test('15 lingue', () => {
  assert.deepEqual(I.LANGUAGES, ['it', 'en', 'fr', 'es', 'de', 'pt', 'nl', 'pl', 'tr', 'id', 'ru', 'zh', 'zh-Hant', 'ja', 'ko']);
  assert.deepEqual(Object.keys(I.STRINGS).sort(), I.LANGUAGES.slice().sort());
});

for (const lang of I.LANGUAGES) {
  test(`${lang}: stesse chiavi e stessi tipi dell’italiano`, () => {
    const d = I.STRINGS[lang];
    assert.deepEqual(Object.keys(d).sort(), KEYS);
    for (const k of KEYS) {
      assert.equal(typeof d[k], typeof REF[k], `${lang}.${k}`);
      if (typeof d[k] === 'string' && k !== 'newRest') assert.ok(d[k].trim(), `${lang}.${k} vuota`);
    }
  });

  test(`${lang}: i testi dinamici contengono i numeri giusti`, () => {
    const d = I.STRINGS[lang];
    const pos = d.position(3, 7);
    assert.match(pos, /3/);
    assert.match(pos, /7/);
    for (const k of [1, 2, 5]) assert.match(d.statusPlaying(38, k), new RegExp(`38[^0-9].*${k}|${k}[^0-9].*38`));
    assert.match(d.statusLost(70), /70/);
    assert.match(d.placed(12, pos), /12/);
    assert.match(d.undone(12), /12/);
    assert.match(d.invalid(12, pos), /12/);
    assert.match(d.lostText(69, 31, 100, false), /69.*31.*100/);
    assert.match(d.lostText(99, 1, 99, true), /99/);
    assert.doesNotMatch(d.lostText(99, 1, 99, true), /undefined|NaN/);
  });

  test(`${lang}: titolo tradotto con "100" dentro, dedica con "5C" e "Spalla"`, () => {
    const d = I.STRINGS[lang];
    assert.match(d.title, /100/);
    assert.match(d.dedication, /5C/);
    assert.match(d.dedication, /Spalla/);
    assert.equal(d.pageTitle, d.rulesTitle + ' — ' + d.title);
    if (lang !== 'it') assert.notEqual(d.title, REF.title, 'titolo non tradotto');
    if (lang !== 'it') assert.notEqual(d.dedication, REF.dedication, 'dedica non tradotta');
  });

  test(`${lang}: HTML delle regole con tag bilanciati`, () => {
    const d = I.STRINGS[lang];
    for (const k of KEYS) {
      if (typeof d[k] !== 'string') continue;
      for (const tag of ['strong', 'kbd', 'sup', 'a']) {
        const open = (d[k].match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
        const close = (d[k].match(new RegExp(`</${tag}>`, 'g')) || []).length;
        assert.equal(open, close, `${lang}.${k}: <${tag}> non bilanciato`);
      }
      assert.doesNotMatch(d[k], /<(?!\/?(strong|kbd|sup|a)>|a href="https:\/\/[^"<>]+"( rel="license")?>)/, `${lang}.${k}: tag non previsto`);
    }
  });
}

test('francese: spazio non separabile prima di : ! ?', () => {
  const fr = I.STRINGS.fr;
  assert.equal(fr.wonTitle, 'Gagné !');
  assert.match(fr.lostText(5, 95, 10, false), /5 : /);
  assert.doesNotMatch(fr.statusWon, / [:!?]/);
});

test('plurale russo e polacco: 1 / 2–4 / 5+ (12–14 con 5+)', () => {
  const ru = I.STRINGS.ru;
  assert.match(ru.statusPlaying(2, 1), /1 возможный ход\./);
  assert.match(ru.statusPlaying(2, 3), /3 возможных хода\./);
  assert.match(ru.statusPlaying(2, 5), /5 возможных ходов\./);
  assert.match(ru.lostText(79, 21, 90, false), /осталось 21 число\./);
  assert.match(ru.lostText(78, 22, 90, false), /осталось 22 числа\./);
  assert.match(ru.lostText(88, 12, 90, false), /осталось 12 чисел\./);
  const pl = I.STRINGS.pl;
  assert.match(pl.statusPlaying(2, 1), /1 możliwy ruch\./);
  assert.match(pl.statusPlaying(2, 4), /4 możliwe ruchy\./);
  assert.match(pl.statusPlaying(2, 5), /5 możliwych ruchów\./);
});

test('avviso di licenza in ogni lingua: link al sorgente, AGPLv3 e CC BY-SA 4.0', () => {
  for (const lang of I.LANGUAGES) {
    const n = I.STRINGS[lang].licenseNotice;
    assert.ok(n.includes('<a href="https://github.com/pabs-1/giocodel100">'), lang);
    assert.ok(n.includes('>GNU AGPLv3</a>'), lang);
    assert.ok(n.includes('>CC BY-SA 4.0</a>'), lang);
    assert.doesNotMatch(n, /\{|\}/, `${lang}: segnaposto rimasto`);
  }
});

console.log('Pagine');

for (const file of ['index.html', 'rules.html']) {
  test(`${file}: ogni chiave data-i18n esiste nei dizionari`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const keys = [];
    for (const m of html.matchAll(/data-i18n(?:-html|-accent)?="([^"]+)"/g)) keys.push(m[1]);
    for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
      for (const pair of m[1].split(';')) keys.push(pair.split(':')[1]);
    }
    assert.ok(keys.length > 5);
    for (const k of keys) assert.equal(typeof REF[k], 'string', `chiave mancante: ${k}`);
  });
}

console.log(`\n${passed} passati, ${failed} falliti`);
process.exitCode = failed ? 1 : 0;
