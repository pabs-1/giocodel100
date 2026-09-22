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
  assert.equal(I.pickLanguage(['zh-TW']), 'zh');
  assert.equal(I.pickLanguage(['zh-Hant-HK']), 'zh');
  assert.equal(I.pickLanguage(['ja-JP']), 'ja');
  assert.equal(I.pickLanguage(['JA']), 'ja');
  assert.equal(I.pickLanguage(['en_GB']), 'en');
});

test('rispetta l’ordine: la prima lingua supportata vince', () => {
  assert.equal(I.pickLanguage(['ru-RU', 'de-DE', 'en']), 'de');
  assert.equal(I.pickLanguage(['nl', 'fr', 'it']), 'fr');
});

test('preferenze note ma non supportate -> inglese', () => {
  assert.equal(I.pickLanguage(['ru-RU']), 'en');
  assert.equal(I.pickLanguage(['ko', 'ar']), 'en');
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

test('8 lingue: it, en, fr, es, de, pt, zh, ja', () => {
  assert.deepEqual(I.LANGUAGES, ['it', 'en', 'fr', 'es', 'de', 'pt', 'zh', 'ja']);
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

  test(`${lang}: HTML delle regole con tag bilanciati`, () => {
    const d = I.STRINGS[lang];
    for (const k of KEYS) {
      if (typeof d[k] !== 'string') continue;
      for (const tag of ['strong', 'kbd', 'sup']) {
        const open = (d[k].match(new RegExp(`<${tag}>`, 'g')) || []).length;
        const close = (d[k].match(new RegExp(`</${tag}>`, 'g')) || []).length;
        assert.equal(open, close, `${lang}.${k}: <${tag}> non bilanciato`);
      }
      assert.doesNotMatch(d[k], /<(?!\/?(strong|kbd|sup)>)/, `${lang}.${k}: tag non previsto`);
    }
  });
}

test('francese: spazio non separabile prima di : ! ?', () => {
  const fr = I.STRINGS.fr;
  assert.equal(fr.wonTitle, 'Gagné !');
  assert.match(fr.lostText(5, 95, 10, false), /5 : /);
  assert.doesNotMatch(fr.statusWon, / [:!?]/);
});

console.log('Pagine');

for (const file of ['index.html', 'rules.html']) {
  test(`${file}: ogni chiave data-i18n esiste nei dizionari`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const keys = [];
    for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) keys.push(m[1]);
    for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
      for (const pair of m[1].split(';')) keys.push(pair.split(':')[1]);
    }
    assert.ok(keys.length > 5);
    for (const k of keys) assert.equal(typeof REF[k], 'string', `chiave mancante: ${k}`);
  });
}

console.log(`\n${passed} passati, ${failed} falliti`);
process.exitCode = failed ? 1 : 0;
