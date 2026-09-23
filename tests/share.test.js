// Test della condivisione, senza framework: `node tests/share.test.js`
'use strict';

const assert = require('node:assert/strict');
const S = require('../share.js');
const I = require('../i18n.js');

let passed = 0;
let failed = 0;
const pending = [];
function test(name, fn) {
  pending.push(Promise.resolve().then(fn).then(
    () => { passed++; console.log('  ok   ' + name); },
    (err) => { failed++; console.log('  FAIL ' + name + '\n       ' + String(err && err.stack || err).split('\n').slice(0, 3).join('\n       ')); }
  ));
}

console.log('Messaggio');

test('barra di avanzamento: 10 quadrati, una decina ciascuno', () => {
  assert.equal(S.progressBar(0), '⬜'.repeat(10));
  assert.equal(S.progressBar(1), '🟨' + '⬜'.repeat(9));
  assert.equal(S.progressBar(10), '🟩' + '⬜'.repeat(9));
  assert.equal(S.progressBar(11), '🟩🟨' + '⬜'.repeat(8));
  assert.equal(S.progressBar(69), '🟩'.repeat(6) + '🟨' + '⬜'.repeat(3));
  assert.equal(S.progressBar(99), '🟩'.repeat(9) + '🟨');
  assert.equal(S.progressBar(100), '🟩'.repeat(10));
  assert.equal(S.progressBar(-5), '⬜'.repeat(10));
  assert.equal(S.progressBar(250), '🟩'.repeat(10));
});

for (const code of I.LANGUAGES) {
  test(`${code}: titolo, punteggio, tagline e link senza tracciamento`, () => {
    const T = I.STRINGS[code];
    const lost = S.compose(T, 69, I.ORIGIN);
    assert.ok(lost.text.startsWith(T.title + ' — '));
    assert.match(lost.text, /69/);
    assert.ok(lost.text.includes(T.shareTagline));
    assert.equal(lost.url, 'https://giocodel100.neocities.org/');
    assert.equal(lost.full, lost.text + '\n' + lost.url);
    assert.equal(lost.full.split(lost.url).length, 2, 'link una sola volta');
    assert.doesNotMatch(lost.full, /[?&](utm_|ref=|fbclid|gclid)/);
    const won = S.compose(T, 100, I.ORIGIN);
    assert.ok(won.text.includes(T.shareWon));
    assert.ok(won.text.includes('🟩'.repeat(10)));
    assert.doesNotMatch(lost.full + won.full, /undefined|NaN/);
  });
}

test('italiano: il messaggio proposto', () => {
  assert.equal(S.compose(I.STRINGS.it, 69, I.ORIGIN).full,
    'Gioco del 100 — Ho scritto 69 numeri su 100.\n🟩🟩🟩🟩🟩🟩🟨⬜⬜⬜\nE tu, riesci a fare 100?\nhttps://giocodel100.neocities.org/');
});

console.log('Menu di sistema, appunti, copia a mano');

const MSG = S.compose(I.STRINGS.it, 42, I.ORIGIN);

/** Finto window con navigator.share / clipboard configurabili. */
function fakeWin({ share, canShare, clipboard } = {}) {
  const calls = { share: [], clipboard: [] };
  const navigator = {};
  if (share) navigator.share = (data) => { calls.share.push(data); return share(data); };
  if (canShare) navigator.canShare = canShare;
  if (clipboard) navigator.clipboard = { writeText: (t) => { calls.clipboard.push(t); return clipboard(t); } };
  return { win: { navigator }, calls };
}
const abort = () => Promise.reject(Object.assign(new Error('chiuso'), { name: 'AbortError' }));
const notAllowed = () => Promise.reject(Object.assign(new Error('nessun gesto'), { name: 'NotAllowedError' }));

test('menu di sistema: testo e link separati (anteprima del link nelle app)', async () => {
  const { win, calls } = fakeWin({ share: () => Promise.resolve(), clipboard: () => Promise.resolve() });
  assert.equal(await S.share(MSG, win), 'shared');
  assert.deepEqual(calls.share, [{ text: MSG.text, url: MSG.url }]);
  assert.deepEqual(calls.clipboard, []);
});

test('menu chiuso dall’utente: nessun’altra azione (niente copia a sorpresa)', async () => {
  const { win, calls } = fakeWin({ share: abort, clipboard: () => Promise.resolve() });
  assert.equal(await S.share(MSG, win), 'cancelled');
  assert.deepEqual(calls.clipboard, []);
});

test('menu non permesso (es. dal controller, senza gesto): si copia negli appunti', async () => {
  const { win, calls } = fakeWin({ share: notAllowed, clipboard: () => Promise.resolve() });
  assert.equal(await S.share(MSG, win), 'copied');
  assert.deepEqual(calls.clipboard, [MSG.full]);
});

test('senza menu di sistema (es. Firefox desktop): appunti', async () => {
  const { win, calls } = fakeWin({ clipboard: () => Promise.resolve() });
  assert.equal(await S.share(MSG, win), 'copied');
  assert.deepEqual(calls.clipboard, [MSG.full]);
});

test('canShare dice di no: appunti', async () => {
  const { win, calls } = fakeWin({ share: () => Promise.resolve(), canShare: () => false, clipboard: () => Promise.resolve() });
  assert.equal(await S.share(MSG, win), 'copied');
  assert.deepEqual(calls.share, []);
});

test('share che lancia subito un’eccezione: appunti', async () => {
  const { win } = fakeWin({ share: () => { throw new TypeError('x'); }, clipboard: () => Promise.resolve() });
  assert.equal(await S.share(MSG, win), 'copied');
});

test('appunti rifiutati o assenti: testo da copiare a mano', async () => {
  const a = fakeWin({ clipboard: () => Promise.reject(new Error('negato')) });
  assert.equal(await S.share(MSG, a.win), 'manual');
  const b = fakeWin({});
  assert.equal(await S.share(MSG, b.win), 'manual');
  const c = fakeWin({ share: notAllowed });
  assert.equal(await S.share(MSG, c.win), 'manual');
});

Promise.all(pending).then(() => {
  console.log(`\n${passed} passati, ${failed} falliti`);
  process.exitCode = failed ? 1 : 0;
});
