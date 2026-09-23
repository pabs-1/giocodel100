// SPDX-FileCopyrightText: 2026 pabs-1 e i contributori del Gioco del 100
// SPDX-License-Identifier: AGPL-3.0-or-later
// Test della logica pura, senza framework: `node tests/logic.test.js`
'use strict';

const assert = require('node:assert/strict');
const L = require('../logic.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (err) {
    failed++;
    console.log('  FAIL ' + name);
    console.log('       ' + String(err && err.stack || err).split('\n').join('\n       '));
  }
}

const idx = (r, c) => L.toIndex(r, c);
const sorted = (arr) => arr.slice().sort((a, b) => a - b);
const cells = (pairs) => sorted(pairs.map(([r, c]) => idx(r, c)));

/** Stato con il numero 1 in `start` (nessun'altra cella occupata). */
const startAt = (r, c) => L.applyMove(L.createState(), idx(r, c));

console.log('Mosse legali');

test('prima mossa: tutte le 100 celle sono legali', () => {
  assert.equal(L.legalMoves(L.createState()).length, 100);
});

test('angolo in alto a sinistra (0,0): 3 mosse', () => {
  assert.deepEqual(L.legalMoves(startAt(0, 0)), cells([[0, 3], [3, 0], [2, 2]]));
});

test('angolo in basso a destra (9,9): 3 mosse', () => {
  assert.deepEqual(L.legalMoves(startAt(9, 9)), cells([[9, 6], [6, 9], [7, 7]]));
});

test('angolo in alto a destra (0,9) e in basso a sinistra (9,0)', () => {
  assert.deepEqual(L.legalMoves(startAt(0, 9)), cells([[0, 6], [3, 9], [2, 7]]));
  assert.deepEqual(L.legalMoves(startAt(9, 0)), cells([[9, 3], [6, 0], [7, 2]]));
});

test('bordo superiore (0,5): 5 mosse', () => {
  assert.deepEqual(
    L.legalMoves(startAt(0, 5)),
    cells([[0, 2], [0, 8], [3, 5], [2, 3], [2, 7]])
  );
});

test('bordo sinistro (4,0): 5 mosse', () => {
  assert.deepEqual(
    L.legalMoves(startAt(4, 0)),
    cells([[1, 0], [7, 0], [4, 3], [2, 2], [6, 2]])
  );
});

test('vicino al bordo (1,1): nessun salto ±3 verso l\'esterno', () => {
  assert.deepEqual(L.legalMoves(startAt(1, 1)), cells([[4, 1], [1, 4], [3, 3]]));
});

test('centro (4,4): tutte e 8 le mosse', () => {
  assert.deepEqual(
    L.legalMoves(startAt(4, 4)),
    cells([[1, 4], [7, 4], [4, 1], [4, 7], [2, 2], [2, 6], [6, 2], [6, 6]])
  );
});

test('centro (5,5): tutte e 8 le mosse', () => {
  assert.equal(L.legalMoves(startAt(5, 5)).length, 8);
});

test('le celle occupate non sono mosse legali', () => {
  // 1 in (4,4), 2 in (4,7): da (4,7) il salto (4,4) è occupato.
  const s = L.applyMove(startAt(4, 4), idx(4, 7));
  assert.ok(s);
  const moves = L.legalMoves(s);
  assert.ok(!moves.includes(idx(4, 4)));
  assert.deepEqual(moves, cells([[1, 7], [7, 7], [2, 5], [2, 9], [6, 5], [6, 9]]));
});

test('applyMove rifiuta celle illegali, occupate o fuori griglia', () => {
  const s = startAt(4, 4);
  assert.equal(L.applyMove(s, idx(4, 5)), null); // adiacente
  assert.equal(L.applyMove(s, idx(4, 4)), null); // occupata
  assert.equal(L.applyMove(s, -1), null);
  assert.equal(L.applyMove(s, 100), null);
  assert.equal(L.applyMove(s, 1.5), null);
  assert.equal(L.applyMove(s, '44'), null);
});

test('nessun salto "avvolge" il bordo (da (0,8) non si arriva a riga 1)', () => {
  for (let i = 0; i < 100; i++) {
    const a = L.toRowCol(i);
    for (const j of L.jumpTargets(i)) {
      const b = L.toRowCol(j);
      const dr = Math.abs(a.row - b.row);
      const dc = Math.abs(a.col - b.col);
      const ok = (dr === 3 && dc === 0) || (dr === 0 && dc === 3) || (dr === 2 && dc === 2);
      assert.ok(ok, `salto non valido ${i} -> ${j}`);
    }
  }
});

console.log('Stallo e fine partita');

test('stallo: nessuna mossa legale prima del 100 -> lost', () => {
  // Cerchiamo con una DFS breve e deterministica un path valido in cui
  // l'ultima cella non ha più uscite libere.
  function findDeadEnd(state, depth) {
    const moves = L.legalMoves(state);
    if (moves.length === 0 && state.path.length < 100) return state;
    if (depth === 0) return null;
    for (const m of moves) {
      const found = findDeadEnd(L.applyMove(state, m), depth - 1);
      if (found) return found;
    }
    return null;
  }
  const dead = findDeadEnd(startAt(0, 0), 12);
  assert.ok(dead, 'deve esistere uno stallo raggiungibile');
  assert.equal(L.legalMoves(dead).length, 0);
  assert.equal(L.status(dead), 'lost');
  assert.ok(dead.path.length < 100);
  assert.equal(L.applyMove(dead, dead.path[0]), null);
});

test('stato iniziale -> ready, dopo il primo numero -> playing', () => {
  assert.equal(L.status(L.createState()), 'ready');
  assert.equal(L.status(startAt(4, 4)), 'playing');
});

test('path completo da 100 -> won, nessuna mossa ulteriore', () => {
  const path = L.solve(0);
  assert.ok(path);
  const s = L.stateFromPath(path);
  assert.ok(s);
  assert.equal(L.status(s), 'won');
  assert.equal(L.remaining(s), 0);
  assert.deepEqual(L.legalMoves(s), []);
});

console.log('Undo');

test('undo ripristina esattamente lo stato precedente', () => {
  let s = L.createState();
  const history = [s];
  // Gioca 30 mosse "a caso" ma deterministiche (sempre la mossa centrale della lista).
  for (let i = 0; i < 30; i++) {
    const moves = L.legalMoves(s);
    if (!moves.length) break;
    s = L.applyMove(s, moves[Math.floor(moves.length / 2)]);
    history.push(s);
  }
  assert.ok(history.length > 5);
  const snapshot = JSON.stringify(history);
  for (let i = history.length - 1; i > 0; i--) {
    const back = L.undo(history[i]);
    assert.deepEqual(back, history[i - 1]);
    assert.deepEqual(L.legalMoves(back), L.legalMoves(history[i - 1]));
    assert.equal(L.status(back), L.status(history[i - 1]));
    assert.deepEqual(L.boardFromPath(back.path), L.boardFromPath(history[i - 1].path));
  }
  // Gli stati precedenti non sono stati mutati.
  assert.equal(JSON.stringify(history), snapshot);
});

test('undo dopo uno stallo torna a uno stato giocabile', () => {
  let s = startAt(0, 0);
  while (L.legalMoves(s).length) s = L.applyMove(s, L.legalMoves(s)[0]);
  if (s.path.length < 100) {
    assert.equal(L.status(s), 'lost');
    const prev = L.undo(s);
    assert.equal(prev.path.length, s.path.length - 1);
    assert.ok(L.legalMoves(prev).includes(s.path[s.path.length - 1]));
  }
});

test('undo sullo stato vuoto è un no-op', () => {
  const s = L.createState();
  assert.equal(L.undo(s), s);
});

test('gli stati sono immutabili', () => {
  const s = startAt(4, 4);
  assert.ok(Object.isFrozen(s) && Object.isFrozen(s.path));
  L.applyMove(s, idx(4, 7));
  assert.deepEqual(s.path, [idx(4, 4)]);
});

console.log('Salvataggi');

test('isValidPath / stateFromPath rifiutano dati corrotti', () => {
  assert.equal(L.isValidPath([0, 3, 33]), true);
  assert.equal(L.isValidPath([0, 1]), false);
  assert.equal(L.isValidPath([0, 3, 0]), false);
  assert.equal(L.isValidPath('0,3'), false);
  assert.equal(L.isValidPath([0, null]), false);
  assert.equal(L.stateFromPath([5, 5]), null);
  assert.deepEqual(L.stateFromPath([]).path, []);
});

console.log('Risolvibilità (solver a backtracking)');

test('esiste una soluzione da 100 partendo da OGNI cella', () => {
  const t0 = Date.now();
  for (let start = 0; start < 100; start++) {
    const path = L.solve(start);
    assert.ok(path, `nessuna soluzione trovata partendo da ${start}`);
    assert.equal(path.length, 100);
    assert.equal(path[0], start);
    assert.equal(new Set(path).size, 100);
    assert.ok(L.isValidPath(path), `soluzione non valida da ${start}`);
  }
  console.log(`       (100 partenze risolte in ${Date.now() - t0} ms)`);
});

console.log(`\n${passed} passati, ${failed} falliti`);
process.exitCode = failed ? 1 : 0;
