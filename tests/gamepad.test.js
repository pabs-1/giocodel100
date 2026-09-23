// SPDX-FileCopyrightText: 2026 pabs-1 e i contributori del Gioco del 100
// SPDX-License-Identifier: AGPL-3.0-or-later
// Test del lettore del controller, senza framework: `node tests/gamepad.test.js`
'use strict';

const assert = require('node:assert/strict');
const G = require('../gamepad.js');

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

const B = G.BUTTON;

/** Controller "standard" con i tasti indicati premuti e le levette date. */
function pad(pressed = [], axes = [0, 0, 0, 0]) {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 }));
  return { buttons, axes };
}

/** Reader già "partito" con controller a riposo al tempo 0. */
function ready() {
  const r = G.createReader();
  assert.deepEqual(r.update([pad()], 0), []);
  return r;
}

console.log('Pulsanti');

test('A/✕, B/○, Y/△, Start: un’azione solo alla pressione, non a ogni frame', () => {
  const r = ready();
  assert.deepEqual(r.update([pad([B.select])], 16), ['select']);
  assert.deepEqual(r.update([pad([B.select])], 32), []);
  assert.deepEqual(r.update([pad([B.select])], 1000), [], 'i pulsanti non si ripetono');
  assert.deepEqual(r.update([pad()], 1016), []);
  assert.deepEqual(r.update([pad([B.select])], 1032), ['select']);
  assert.deepEqual(r.update([pad([B.undo])], 1048), ['undo']);
  assert.deepEqual(r.update([pad([B.hints])], 1064), ['hints']);
  assert.deepEqual(r.update([pad([B.newGame])], 1080), ['newGame']);
});

test('il tasto che "sveglia" il controller non fa nulla finché non si rilascia', () => {
  const r = G.createReader();
  assert.deepEqual(r.update([pad([B.select, B.right])], 0), []);
  assert.deepEqual(r.update([pad([B.select, B.right])], 500), [], 'né azione né ripetizione');
  assert.deepEqual(r.update([pad()], 516), []);
  assert.deepEqual(r.update([pad([B.select])], 532), ['select']);
});

test('grilletti analogici e valori numerici: premuto sopra 0.5', () => {
  const r = ready();
  const p = pad();
  p.buttons[B.select] = { pressed: false, value: 0.3 };
  assert.deepEqual(r.update([p], 16), []);
  p.buttons[B.select] = { pressed: false, value: 0.8 };
  assert.deepEqual(r.update([p], 32), ['select']);
  const n = pad();
  n.buttons = n.buttons.map(() => 0);
  n.buttons[B.undo] = 1;
  assert.deepEqual(r.update([n], 48), ['undo']);
});

console.log('Direzioni e ripetizione');

test('croce direzionale: subito, poi dopo 300 ms ogni 120 ms', () => {
  const r = ready();
  const got = [];
  for (let t = 16; t <= 800; t += 16) {
    for (const a of r.update([pad([B.right])], t)) got.push([a, t]);
  }
  const times = got.map(([, t]) => t);
  assert.ok(got.every(([a]) => a === 'right'));
  assert.equal(times[0], 16);
  assert.ok(times[1] >= 316 && times[1] < 332, `prima ripetizione a ${times[1]}`);
  for (let i = 2; i < times.length; i++) {
    const gap = times[i] - times[i - 1];
    assert.ok(gap >= 120 && gap < 136, `intervallo ${gap}`);
  }
  assert.equal(got.length, 5); // 16, ~316, ~436, ~556, ~676, (796 > 800? no) -> 5
});

test('rilascio: la ripetizione si ferma; ripremere è subito un passo', () => {
  const r = ready();
  assert.deepEqual(r.update([pad([B.down])], 16), ['down']);
  assert.deepEqual(r.update([pad()], 100), []);
  assert.deepEqual(r.update([pad()], 1000), []);
  assert.deepEqual(r.update([pad([B.down])], 1016), ['down']);
});

test('cambio di direzione senza rilasciare: passo immediato e ripetizione da capo', () => {
  const r = ready();
  r.update([pad([B.left])], 16);
  assert.deepEqual(r.update([pad([B.up])], 200), ['up']);
  assert.deepEqual(r.update([pad([B.up])], 450), [], 'ripetizione ripartita da 200');
  assert.deepEqual(r.update([pad([B.up])], 510), ['up']);
});

console.log('Levetta sinistra');

test('zona morta: sotto 0.35 la levetta è al centro', () => {
  const r = ready();
  assert.deepEqual(r.update([pad([], [0.2, -0.3])], 16), []);
  assert.deepEqual(r.update([pad([], [0.34, 0])], 32), []);
  assert.deepEqual(r.update([pad([], [0.5, 0])], 48), ['right']);
});

test('asse dominante: niente diagonali', () => {
  const cases = [
    [[0.8, 0.2], 'right'], [[-0.8, 0.3], 'left'], [[0.2, -0.8], 'up'], [[-0.3, 0.9], 'down'],
    [[0.7, 0.7], 'right'] // a parità vince l'orizzontale: sempre lo stesso risultato
  ];
  for (const [axes, dir] of cases) {
    const r = ready();
    assert.deepEqual(r.update([pad([], axes)], 16), [dir], JSON.stringify(axes));
  }
});

test('levetta tenuta: si ripete come la croce direzionale', () => {
  const r = ready();
  assert.deepEqual(r.update([pad([], [0, 1])], 16), ['down']);
  assert.deepEqual(r.update([pad([], [0, 1])], 200), []);
  assert.deepEqual(r.update([pad([], [0, 1])], 320), ['down']);
});

test('la croce direzionale ha la precedenza sulla levetta', () => {
  const r = ready();
  assert.deepEqual(r.update([pad([B.up], [1, 0])], 16), ['up']);
});

console.log('Più controller, reset');

test('due controller: contano entrambi, senza azioni doppie', () => {
  const r = G.createReader();
  r.update([pad(), pad()], 0);
  assert.deepEqual(r.update([pad([B.select]), pad()], 16), ['select']);
  assert.deepEqual(r.update([pad([B.select]), pad([B.select])], 32), []);
  assert.deepEqual(r.update([pad(), pad([B.undo])], 48), ['undo']);
  assert.deepEqual(r.update([null, pad([B.undo])], 64), [], 'posti vuoti ignorati');
});

test('reset (controller scollegato, pagina nascosta): i tasti tenuti non scattano', () => {
  const r = ready();
  r.update([pad([B.right])], 16);
  r.reset();
  assert.deepEqual(r.update([pad([B.right, B.select])], 32), []);
  assert.deepEqual(r.update([pad([B.right, B.select])], 1000), []);
});

test('nessun controller o dati mancanti: nessuna azione, nessun errore', () => {
  const r = ready();
  assert.deepEqual(r.update([], 16), []);
  assert.deepEqual(r.update(undefined, 32), []);
  assert.deepEqual(r.update([{ buttons: [], axes: [] }], 48), []);
});

console.log('Ciclo nel browser (attach) con un finto window');

/** Finto window: frame avanzati a mano, controller e ora controllati dal test. */
function fakeWindow() {
  const listeners = {};
  const w = {
    now: 0,
    frame: null,
    idReads: 0,
    pads: [],
    performance: { now: () => w.now },
    requestAnimationFrame: (cb) => { w.frame = cb; return 1; },
    cancelAnimationFrame: () => { w.frame = null; },
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    document: { addEventListener: (type, fn) => { (listeners['doc:' + type] = listeners['doc:' + type] || []).push(fn); } },
    fire: (type) => (listeners[type] || []).forEach((fn) => fn({})),
    tick: (ms = 16) => { w.now += ms; const cb = w.frame; w.frame = null; if (cb) cb(w.now); },
    navigator: {
      getGamepads: () => w.pads.map((p) => p && {
        connected: true,
        get id() { w.idReads++; return 'X'; },
        buttons: p.buttons,
        axes: p.axes
      })
    }
  };
  return w;
}

test('attach: legge i controller veri (tasti come oggetti) e produce le azioni', () => {
  const w = fakeWindow();
  const got = [];
  const actions = {};
  for (const a of ['up', 'down', 'left', 'right', 'select', 'undo', 'hints', 'newGame', 'connected']) actions[a] = () => got.push(a);
  G.attach(actions, w);
  assert.equal(w.frame, null, 'nessun ciclo senza controller');
  w.pads = [pad()];
  w.fire('gamepadconnected');
  assert.deepEqual(got, ['connected']);
  w.tick(); // prima lettura: stato di partenza
  w.pads = [pad([B.left])];
  w.tick();
  w.pads = [pad([B.select])];
  w.tick();
  w.pads = [pad([], [0, -1])];
  w.tick();
  assert.deepEqual(got, ['connected', 'left', 'select', 'up']);
  assert.equal(w.idReads, 0, 'gamepad.id non va mai letto');
});

test('attach: senza controller il ciclo si ferma; ricollegato riparte senza azioni fantasma', () => {
  const w = fakeWindow();
  const got = [];
  G.attach({ select: () => got.push('select') }, w);
  w.pads = [pad([B.select])];
  w.fire('gamepadconnected');
  w.tick();
  w.pads = [];
  w.tick();
  assert.equal(w.frame, null, 'ciclo fermo');
  w.pads = [pad([B.select])]; // ricollegato con A già premuto
  w.fire('gamepadconnected');
  w.tick();
  w.tick();
  assert.deepEqual(got, []);
  w.pads = [pad()];
  w.tick();
  w.pads = [pad([B.select])];
  w.tick();
  assert.deepEqual(got, ['select']);
});

console.log(`\n${passed} passati, ${failed} falliti`);
process.exitCode = failed ? 1 : 0;
