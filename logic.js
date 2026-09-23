// SPDX-FileCopyrightText: 2026 pabs-1 e i contributori del Gioco del 100
// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Gioco del 100 — logica pura.
 *
 * Nessun accesso al DOM né a localStorage: solo funzioni che ricevono uno
 * stato e ne restituiscono uno nuovo. Lo stato è immutabile:
 *
 *   { path: number[] }   // indici delle celle (0..99) nell'ordine 1, 2, 3...
 *
 * path[k] è la cella che contiene il numero k + 1. La griglia, il numero
 * corrente e le mosse legali si ricavano tutti da path.
 *
 * Il file funziona sia nel browser (window.GameLogic) sia in Node
 * (module.exports), così i test girano senza DOM.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.GameLogic = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SIZE = 10;
  var TOTAL = SIZE * SIZE;

  // Orizzontale/verticale: salta 2 celle, atterra sulla 3a (±3).
  // Diagonale: salta 1 cella, atterra sulla 2a (±2, ±2).
  var OFFSETS = Object.freeze([
    [-3, 0], [3, 0], [0, -3], [0, 3],
    [-2, -2], [-2, 2], [2, -2], [2, 2]
  ]);

  function toRowCol(index) {
    return { row: Math.floor(index / SIZE), col: index % SIZE };
  }

  function toIndex(row, col) {
    return row * SIZE + col;
  }

  function inBounds(row, col) {
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
  }

  function isCellIndex(index) {
    return typeof index === 'number' && index % 1 === 0 && index >= 0 && index < TOTAL;
  }

  /** Tutte le celle raggiungibili da `index` con un salto, ignorando l'occupazione. */
  function jumpTargets(index) {
    var rc = toRowCol(index);
    var out = [];
    for (var i = 0; i < OFFSETS.length; i++) {
      var r = rc.row + OFFSETS[i][0];
      var c = rc.col + OFFSETS[i][1];
      if (inBounds(r, c)) out.push(toIndex(r, c));
    }
    return out;
  }

  // Precalcolo: la tabella dei salti non cambia mai.
  var JUMPS = [];
  for (var k = 0; k < TOTAL; k++) JUMPS.push(Object.freeze(jumpTargets(k)));
  Object.freeze(JUMPS);

  function createState() {
    return Object.freeze({ path: Object.freeze([]) });
  }

  /** Array di 100 elementi: 0 = vuota, altrimenti il numero scritto nella cella. */
  function boardFromPath(path) {
    var board = new Array(TOTAL);
    for (var i = 0; i < TOTAL; i++) board[i] = 0;
    for (var n = 0; n < path.length; n++) board[path[n]] = n + 1;
    return board;
  }

  /** Mosse legali da `from` dato un array/insieme di occupazione (board[i] !== 0). */
  function movesFrom(from, board) {
    var targets = JUMPS[from];
    var out = [];
    for (var i = 0; i < targets.length; i++) {
      if (!board[targets[i]]) out.push(targets[i]);
    }
    return out;
  }

  /** Numero già piazzato più alto (0 se la partita non è iniziata). */
  function currentNumber(state) {
    return state.path.length;
  }

  function lastCell(state) {
    return state.path.length ? state.path[state.path.length - 1] : -1;
  }

  function remaining(state) {
    return TOTAL - state.path.length;
  }

  /** Celle su cui si può scrivere il prossimo numero, in ordine crescente. */
  function legalMoves(state) {
    if (state.path.length >= TOTAL) return [];
    if (state.path.length === 0) {
      var all = [];
      for (var i = 0; i < TOTAL; i++) all.push(i);
      return all;
    }
    return movesFrom(lastCell(state), boardFromPath(state.path)).sort(function (a, b) {
      return a - b;
    });
  }

  function isLegalMove(state, index) {
    return legalMoves(state).indexOf(index) !== -1;
  }

  /** Restituisce il nuovo stato, oppure null se la mossa non è legale. */
  function applyMove(state, index) {
    if (!isCellIndex(index) || !isLegalMove(state, index)) return null;
    return Object.freeze({ path: Object.freeze(state.path.concat([index])) });
  }

  /** Annulla l'ultima mossa. Su uno stato vuoto restituisce lo stato stesso. */
  function undo(state) {
    if (state.path.length === 0) return state;
    return Object.freeze({ path: Object.freeze(state.path.slice(0, -1)) });
  }

  /** 'ready' (nessun numero), 'playing', 'won' o 'lost' (stallo prima del 100). */
  function status(state) {
    var n = state.path.length;
    if (n === 0) return 'ready';
    if (n === TOTAL) return 'won';
    return legalMoves(state).length === 0 ? 'lost' : 'playing';
  }

  /** Verifica che `path` sia una sequenza di mosse legali (usata per i salvataggi). */
  function isValidPath(path) {
    if (!Array.isArray(path) || path.length > TOTAL) return false;
    var state = createState();
    for (var i = 0; i < path.length; i++) {
      state = applyMove(state, path[i]);
      if (!state) return false;
    }
    return true;
  }

  /** Ricostruisce uno stato da un path non fidato; null se non valido. */
  function stateFromPath(path) {
    return isValidPath(path) ? Object.freeze({ path: Object.freeze(path.slice()) }) : null;
  }

  // Distanza (al quadrato, ×4 per restare interi) dal centro della griglia.
  function centerDistance(index) {
    var rc = toRowCol(index);
    var dr = 2 * rc.row - (SIZE - 1);
    var dc = 2 * rc.col - (SIZE - 1);
    return dr * dr + dc * dc;
  }

  /**
   * Solver a backtracking con euristica di Warnsdorff (prima le celle con
   * meno uscite, a parità le più lontane dal centro) e potatura dei vicoli
   * ciechi. Restituisce un path completo da 100 celle che parte da `start`,
   * oppure null se non lo trova entro `maxNodes` nodi visitati.
   */
  function solve(start, maxNodes) {
    if (!isCellIndex(start)) return null;
    var limit = maxNodes || 2e6;
    var board = boardFromPath([]);
    var path = [start];
    board[start] = 1;
    var nodes = 0;

    function degree(cell) {
      return movesFrom(cell, board).length;
    }

    // Una cella libera resta senza uscite solo quando viene occupato un suo
    // vicino, cioè la nuova testa: da lì in poi può essere solo l'ultima
    // cella del percorso. Se ne esiste una e non siamo alla fine, è un
    // vicolo cieco.
    function createsDeadEnd(head) {
      if (path.length >= TOTAL - 1) return false;
      var around = movesFrom(head, board);
      for (var i = 0; i < around.length; i++) {
        if (degree(around[i]) === 0) return true;
      }
      return false;
    }

    function step(from) {
      if (path.length === TOTAL) return true;
      if (++nodes > limit) return false;
      var next = movesFrom(from, board);
      next.sort(function (a, b) {
        return degree(a) - degree(b) || centerDistance(b) - centerDistance(a) || a - b;
      });
      for (var i = 0; i < next.length; i++) {
        var cell = next[i];
        board[cell] = path.length + 1;
        path.push(cell);
        if (!createsDeadEnd(cell) && step(cell)) return true;
        path.pop();
        board[cell] = 0;
      }
      return false;
    }

    return step(start) ? path.slice() : null;
  }

  return Object.freeze({
    SIZE: SIZE,
    TOTAL: TOTAL,
    OFFSETS: OFFSETS,
    toRowCol: toRowCol,
    toIndex: toIndex,
    jumpTargets: jumpTargets,
    createState: createState,
    boardFromPath: boardFromPath,
    currentNumber: currentNumber,
    lastCell: lastCell,
    remaining: remaining,
    legalMoves: legalMoves,
    isLegalMove: isLegalMove,
    applyMove: applyMove,
    undo: undo,
    status: status,
    isValidPath: isValidPath,
    stateFromPath: stateFromPath,
    solve: solve
  });
});
