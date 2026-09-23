// SPDX-FileCopyrightText: 2026 pabs-1 e i contributori del Gioco del 100
// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Gioco del 100 — condivisione del risultato.
 *
 * Privacy: nessun pulsante o script di social network (tracciano anche chi
 * non clicca). Si usa il menu di condivisione del sistema (Web Share API):
 * è l'utente a scegliere l'app e il sito non invia nulla a nessuno. Il
 * messaggio contiene solo il punteggio e il link al sito, senza parametri
 * di tracciamento.
 *
 *   compose(strings, count, url)  parte pura: il testo da condividere.
 *   share(message, win)           parte browser: menu di sistema, poi appunti,
 *                                 poi testo da copiare a mano.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.Share = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TOTAL = 100;

  /** Barra di 10 quadrati: 🟩 = 10 numeri, 🟨 = decina iniziata, ⬜ = vuota. */
  function progressBar(count) {
    var n = Math.max(0, Math.min(TOTAL, Math.floor(count) || 0));
    var out = '';
    for (var i = 0; i < 10; i++) {
      var inTen = n - i * 10;
      out += inTen >= 10 ? '🟩' : inTen > 0 ? '🟨' : '⬜';
    }
    return out;
  }

  /**
   * Messaggio da condividere. strings: dizionario della lingua (i18n.js).
   * Restituisce { text, url, full }: text e url separati per il menu di
   * sistema (alcune app mostrano l'anteprima del link), full per gli appunti.
   */
  function compose(strings, count, url) {
    var result = count >= TOTAL ? strings.shareWon : strings.shareLost(count);
    var text = strings.title + ' — ' + result + '\n' + progressBar(count) + '\n' + strings.shareTagline;
    return { text: text, url: url, full: text + '\n' + url };
  }

  /**
   * Prova in ordine: menu di condivisione, appunti. Risolve con
   *   'shared'    condiviso dal menu di sistema
   *   'cancelled' l'utente ha chiuso il menu (non si fa altro)
   *   'copied'    testo copiato negli appunti
   *   'manual'    niente di tutto questo: va mostrato il testo da copiare
   */
  function share(message, win) {
    win = win || window;
    var nav = win.navigator || {};
    var data = { text: message.text, url: message.url };

    function copy() {
      if (!nav.clipboard || typeof nav.clipboard.writeText !== 'function') return Promise.resolve('manual');
      return nav.clipboard.writeText(message.full).then(
        function () { return 'copied'; },
        function () { return 'manual'; }
      );
    }

    var canShare = typeof nav.share === 'function' &&
      (typeof nav.canShare !== 'function' || nav.canShare(data));
    if (!canShare) return copy();

    var attempt;
    try {
      attempt = nav.share(data);
    } catch (e) {
      return copy();
    }
    return Promise.resolve(attempt).then(
      function () { return 'shared'; },
      function (err) {
        // Chiuso dall'utente: rispettiamo la scelta. Altri errori (es. nessun
        // gesto dell'utente, come con il controller): si passa agli appunti.
        if (err && err.name === 'AbortError') return 'cancelled';
        return copy();
      }
    );
  }

  return { progressBar: progressBar, compose: compose, share: share };
});
