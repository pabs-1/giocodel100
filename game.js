/*
 * Gioco del 100 — interfaccia.
 *
 * Tutto ciò che tocca DOM, input e localStorage sta qui; le regole stanno
 * in logic.js (window.GameLogic) e questo file si limita a chiamarle.
 */
(function () {
  'use strict';

  var L = window.GameLogic;
  // sw.js sta nella radice del sito, accanto a game.js, anche per le pagine
  // tradotte in /fr/, /de/…: il suo scope copre così tutto il sito.
  var SW_URL = document.currentScript ? new URL('sw.js', document.currentScript.src).href : 'sw.js';
  var T = window.I18N.strings;
  var SIZE = L.SIZE;
  var TOTAL = L.TOTAL;

  var KEYS = {
    save: 'giocodel100:partita',
    best: 'giocodel100:record',
    hints: 'giocodel100:mosse'
  };

  // ---------------------------------------------------------------------
  // localStorage "sicuro": Safari in navigazione privata (e browser con i
  // cookie bloccati) può lanciare eccezioni anche solo accedendo
  // a window.localStorage. In quel caso si gioca senza salvataggio.
  // ---------------------------------------------------------------------
  var storage = (function () {
    var ls = null;
    try {
      ls = window.localStorage;
      var probe = '__giocodel100__';
      ls.setItem(probe, probe);
      ls.removeItem(probe);
    } catch (e) {
      ls = null;
    }
    return {
      get: function (key) {
        if (!ls) return null;
        try { return ls.getItem(key); } catch (e) { return null; }
      },
      set: function (key, value) {
        if (!ls) return false;
        try { ls.setItem(key, value); return true; } catch (e) { return false; }
      }
    };
  })();

  function loadState() {
    try {
      var data = JSON.parse(storage.get(KEYS.save) || 'null');
      var restored = data && L.stateFromPath(data.path);
      if (restored) return restored;
    } catch (e) { /* salvataggio corrotto: si riparte */ }
    return L.createState();
  }

  function saveState() {
    storage.set(KEYS.save, JSON.stringify({ v: 1, path: state.path }));
  }

  function loadBest() {
    var n = parseInt(storage.get(KEYS.best), 10);
    return n >= 0 && n <= TOTAL ? n : 0;
  }

  // ---------------------------------------------------------------------
  // Stato dell'interfaccia
  // ---------------------------------------------------------------------
  var state = loadState();
  var best = Math.max(loadBest(), state.path.length);
  var hints = storage.get(KEYS.hints) !== '0';
  var overlayDismissed = false;
  var newRecordThisGame = false;
  var focusIndex = state.path.length ? L.lastCell(state) : 44;
  var confirmTimer = 0;
  var overlayTimer = 0;
  var overlayShownAt = 0;
  var lastPointerDownAt = -1;
  var lastFocusBeforeOverlay = null;

  var $ = function (id) { return document.getElementById(id); };
  var boardEl = $('board');
  var statusEl = $('status');
  var statCurrent = $('stat-current');
  var statRemaining = $('stat-remaining');
  var statBest = $('stat-best');
  var btnUndo = $('btn-undo');
  var btnHints = $('btn-hints');
  var btnNew = $('btn-new');
  var overlay = $('overlay');
  var overlayBadge = $('overlay-badge');
  var overlayTitle = $('overlay-title');
  var overlayText = $('overlay-text');
  var overlayUndo = $('overlay-undo');
  var overlayNew = $('overlay-new');
  var overlayClose = $('overlay-close');
  var newLabel = btnNew.innerHTML;

  // ---------------------------------------------------------------------
  // Costruzione della griglia (role=grid > row > gridcell)
  // ---------------------------------------------------------------------
  var cells = [];
  (function buildBoard() {
    var frag = document.createDocumentFragment();
    for (var r = 0; r < SIZE; r++) {
      var row = document.createElement('div');
      row.className = 'row';
      row.setAttribute('role', 'row');
      for (var c = 0; c < SIZE; c++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.setAttribute('role', 'gridcell');
        cell.tabIndex = -1;
        cell.dataset.index = String(L.toIndex(r, c));
        row.appendChild(cell);
        cells.push(cell);
      }
      frag.appendChild(row);
    }
    boardEl.appendChild(frag);
  })();

  function position(index) {
    var rc = L.toRowCol(index);
    return T.position(rc.row + 1, rc.col + 1);
  }

  // ---------------------------------------------------------------------
  // Render: sincronizza il DOM con lo stato corrente
  // ---------------------------------------------------------------------
  function render(delayOverlay) {
    var board = L.boardFromPath(state.path);
    var st = L.status(state);
    var legal = {};
    L.legalMoves(state).forEach(function (i) { legal[i] = true; });
    var last = L.lastCell(state);
    var over = st === 'won' || st === 'lost';

    boardEl.classList.toggle('ready', st === 'ready');
    boardEl.classList.toggle('hints', hints && st === 'playing');
    boardEl.classList.toggle('over', over);

    for (var i = 0; i < TOTAL; i++) {
      var cell = cells[i];
      var n = board[i];
      var label = position(i) + T.colon;
      if (n) {
        label += String(n) + (i === last ? T.comma + T.cellLast : '');
      } else {
        label += T.cellEmpty + (legal[i] && hints && st === 'playing' ? T.comma + T.cellLegal : '');
      }
      var text = n ? String(n) : '';
      if (cell.textContent !== text) cell.textContent = text;
      cell.setAttribute('aria-label', label);
      cell.classList.toggle('filled', !!n);
      cell.classList.toggle('last', i === last);
      cell.classList.toggle('legal', !!legal[i]);
      if (n) cell.style.setProperty('--p', ((n - 1) / (TOTAL - 1)).toFixed(3));
      else cell.style.removeProperty('--p');
      cell.tabIndex = i === focusIndex ? 0 : -1;
    }

    statCurrent.textContent = String(L.currentNumber(state));
    statRemaining.textContent = String(L.remaining(state));
    statBest.textContent = String(best);
    btnUndo.disabled = state.path.length === 0;
    btnHints.setAttribute('aria-pressed', hints ? 'true' : 'false');

    clearTimeout(overlayTimer);
    if (over && !overlayDismissed) {
      // Dopo l'ultima mossa si lascia vedere la griglia per un attimo.
      if (delayOverlay) overlayTimer = setTimeout(function () { showOverlay(st); }, 350);
      else showOverlay(st);
    } else if (!over) {
      hideOverlay(false);
    }
  }

  function statusMessage() {
    var st = L.status(state);
    var n = L.currentNumber(state);
    if (st === 'ready') return T.statusReady;
    if (st === 'won') return T.statusWon;
    if (st === 'lost') return T.statusLost(n + 1);
    return T.statusPlaying(n + 1, L.legalMoves(state).length);
  }

  function announce(prefix) {
    statusEl.textContent = (prefix ? prefix + ' ' : '') + statusMessage();
  }

  function flash(el, cls, ms) {
    el.classList.remove(cls);
    // Forza il reflow così l'animazione riparte anche se la classe c'era già.
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  // ---------------------------------------------------------------------
  // Azioni
  // ---------------------------------------------------------------------
  function place(index) {
    var st = L.status(state);
    if (st === 'won' || st === 'lost') {
      overlayDismissed = false;
      render();
      return;
    }
    var next = L.applyMove(state, index);
    if (!next) {
      flash(cells[index], 'invalid', 320);
      if (navigator.vibrate) {
        try { navigator.vibrate(30); } catch (e) { /* ignorato */ }
      }
      statusEl.textContent = T.invalid(L.currentNumber(state) + 1, position(index)) + ' ' + statusMessage();
      return;
    }
    state = next;
    focusIndex = index;
    if (state.path.length > best) {
      best = state.path.length;
      newRecordThisGame = true;
      storage.set(KEYS.best, String(best));
    }
    overlayDismissed = false;
    saveState();
    render(true);
    flash(cells[index], 'placed', 240);
    announce(T.placed(state.path.length, position(index)));
  }

  function undoMove() {
    if (!state.path.length) return;
    var removed = L.lastCell(state);
    var n = L.currentNumber(state);
    state = L.undo(state);
    focusIndex = state.path.length ? L.lastCell(state) : removed;
    overlayDismissed = false;
    saveState();
    render();
    announce(T.undone(n));
  }

  function newGame() {
    resetConfirm();
    state = L.createState();
    overlayDismissed = false;
    newRecordThisGame = false;
    saveState();
    render();
    announce(T.newGame);
  }

  function requestNewGame() {
    // Conferma a due tocchi (niente confirm() nativo) solo se c'è una
    // partita in corso da perdere.
    if (L.status(state) !== 'playing' || btnNew.classList.contains('confirm')) {
      newGame();
      return;
    }
    btnNew.classList.add('confirm');
    btnNew.textContent = T.confirm;
    confirmTimer = setTimeout(resetConfirm, 3000);
  }

  function resetConfirm() {
    clearTimeout(confirmTimer);
    btnNew.classList.remove('confirm');
    btnNew.innerHTML = newLabel;
  }

  function toggleHints() {
    hints = !hints;
    storage.set(KEYS.hints, hints ? '1' : '0');
    render();
  }

  // ---------------------------------------------------------------------
  // Overlay vittoria / sconfitta
  // ---------------------------------------------------------------------
  function showOverlay(kind) {
    var n = L.currentNumber(state);
    if (kind === 'won') {
      overlayBadge.textContent = '100';
      overlayTitle.textContent = T.wonTitle;
      overlayText.textContent = T.wonText;
      overlayUndo.hidden = true;
    } else {
      overlayBadge.textContent = String(n);
      overlayTitle.textContent = T.lostTitle;
      overlayText.textContent = T.lostText(n, TOTAL - n, best, newRecordThisGame && n === best);
      overlayUndo.hidden = false;
    }
    if (overlay.hidden) {
      lastFocusBeforeOverlay = document.activeElement;
      overlayShownAt = now();
      overlay.hidden = false;
      overlayNew.focus();
    }
  }

  function hideOverlay(restoreFocus) {
    if (overlay.hidden) return;
    overlay.hidden = true;
    if (restoreFocus && lastFocusBeforeOverlay && lastFocusBeforeOverlay.focus) {
      lastFocusBeforeOverlay.focus();
    }
    lastFocusBeforeOverlay = null;
  }

  function dismissOverlay() {
    overlayDismissed = true;
    hideOverlay(true);
    announce('');
  }

  function now() {
    return window.performance && performance.now ? performance.now() : Date.now();
  }

  // Il numero si scrive su pointerdown: se quella mossa chiude la partita,
  // l'overlay compare sotto il dito e il click sintetico che segue il
  // rilascio finirebbe sui suoi pulsanti ("ghost click"). Ignoriamo i click
  // di un puntatore premuto prima che l'overlay apparisse; i click da
  // tastiera (detail === 0) passano sempre.
  document.addEventListener('pointerdown', function () {
    lastPointerDownAt = now();
  }, true);

  function isGhostClick(e) {
    return e.detail > 0 && lastPointerDownAt >= 0 && lastPointerDownAt < overlayShownAt;
  }

  function overlayAction(fn) {
    return function (e) {
      if (isGhostClick(e)) return;
      fn();
    };
  }

  // Focus trap minimale nel dialog.
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      dismissOverlay();
      return;
    }
    if (e.key !== 'Tab') return;
    var buttons = Array.prototype.filter.call(
      overlay.querySelectorAll('button'),
      function (b) { return !b.hidden; }
    );
    var first = buttons[0];
    var last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // ---------------------------------------------------------------------
  // Input: Pointer Events con fallback a click (mai entrambi, così un tocco
  // non genera due mosse). Il tocco viene "agganciato" alla mossa legale più
  // vicina: le celle su telefono sono ~33px, ma le mosse legali distano
  // almeno 2 celle fra loro, quindi il bersaglio effettivo supera i 44px.
  // ---------------------------------------------------------------------
  function hitTest(x, y, snap) {
    var rect = boardEl.getBoundingClientRect();
    var size = rect.width / SIZE;
    var col = Math.floor((x - rect.left) / size);
    var row = Math.floor((y - rect.top) / size);
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return -1;
    var index = L.toIndex(row, col);
    if (!snap || L.status(state) !== 'playing' || L.isLegalMove(state, index)) return index;

    var bestIndex = index;
    var bestDist = Infinity;
    L.legalMoves(state).forEach(function (i) {
      var rc = L.toRowCol(i);
      var cx = rect.left + (rc.col + 0.5) * size;
      var cy = rect.top + (rc.row + 0.5) * size;
      var d = Math.sqrt((cx - x) * (cx - x) + (cy - y) * (cy - y));
      if (d < bestDist) { bestDist = d; bestIndex = i; }
    });
    return bestDist <= size * 0.95 ? bestIndex : index;
  }

  function handleBoardInput(x, y, snap) {
    var index = hitTest(x, y, snap);
    if (index < 0) return;
    flash(cells[index], 'pressed', 140);
    place(index);
  }

  if (window.PointerEvent) {
    boardEl.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      handleBoardInput(e.clientX, e.clientY, e.pointerType !== 'mouse');
    });
  } else {
    boardEl.addEventListener('click', function (e) {
      handleBoardInput(e.clientX, e.clientY, true);
    });
  }

  // Niente menu contestuale al long-press, niente selezione o trascinamento.
  ['contextmenu', 'selectstart', 'dragstart'].forEach(function (type) {
    boardEl.addEventListener(type, function (e) { e.preventDefault(); });
  });

  // iOS Safari applica :active solo se esiste un listener touchstart.
  document.addEventListener('touchstart', function () {}, { passive: true });

  // ---------------------------------------------------------------------
  // Tastiera: frecce per muoversi (roving tabindex), Invio/Spazio per scrivere.
  // ---------------------------------------------------------------------
  function moveFocus(index) {
    cells[focusIndex].tabIndex = -1;
    focusIndex = index;
    cells[focusIndex].tabIndex = 0;
    cells[focusIndex].focus();
  }

  boardEl.addEventListener('keydown', function (e) {
    var rc = L.toRowCol(focusIndex);
    var row = rc.row;
    var col = rc.col;
    switch (e.key) {
      case 'ArrowUp': row = Math.max(0, row - 1); break;
      case 'ArrowDown': row = Math.min(SIZE - 1, row + 1); break;
      case 'ArrowLeft': col = Math.max(0, col - 1); break;
      case 'ArrowRight': col = Math.min(SIZE - 1, col + 1); break;
      case 'Home': col = 0; if (e.ctrlKey) row = 0; break;
      case 'End': col = SIZE - 1; if (e.ctrlKey) row = SIZE - 1; break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        e.preventDefault();
        place(focusIndex);
        return;
      default:
        return;
    }
    e.preventDefault();
    moveFocus(L.toIndex(row, col));
  });

  // Tiene il roving tabindex allineato se una cella riceve il focus col mouse.
  boardEl.addEventListener('focusin', function (e) {
    var i = e.target && e.target.dataset ? parseInt(e.target.dataset.index, 10) : NaN;
    if (i >= 0 && i !== focusIndex) {
      cells[focusIndex].tabIndex = -1;
      focusIndex = i;
      cells[i].tabIndex = 0;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!overlay.hidden) return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      undoMove();
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'u' || e.key === 'U' || e.key === 'Backspace')) {
      e.preventDefault();
      undoMove();
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'm' || e.key === 'M')) {
      toggleHints();
    }
  });

  // ---------------------------------------------------------------------
  // Pulsanti (click va bene qui: sono <button>, attivabili anche da tastiera)
  // ---------------------------------------------------------------------
  btnUndo.addEventListener('click', undoMove);
  btnHints.addEventListener('click', toggleHints);
  btnNew.addEventListener('click', requestNewGame);
  overlayUndo.addEventListener('click', overlayAction(function () {
    hideOverlay(false);
    undoMove();
  }));
  overlayNew.addEventListener('click', overlayAction(function () {
    hideOverlay(false);
    newGame();
  }));
  overlayClose.addEventListener('click', overlayAction(dismissOverlay));

  // ---------------------------------------------------------------------
  // Avvio
  // ---------------------------------------------------------------------
  if (best > loadBest()) storage.set(KEYS.best, String(best));
  render();
  announce(state.path.length ? T.resumed : '');

  // Service worker: gioco disponibile offline (solo su https o localhost).
  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(SW_URL).catch(function () { /* offline non disponibile */ });
    });
  }
})();
