/*
 * Gioco del 100 — controller (Xbox, PlayStation, compatibili; anche iPad).
 *
 * Un altro modo di dare comandi, come mouse, tocco e tastiera: questo file
 * non conosce le regole del gioco. Trasforma tasti e levette in azioni
 * logiche ('up', 'select', 'undo'…) e le passa a game.js, che le esegue con
 * le stesse funzioni della tastiera.
 *
 *   createReader()  parte pura: riceve lo stato dei controller e l'ora,
 *                   restituisce le azioni. Testabile in Node.
 *   attach(actions) parte browser: legge i controller a ogni frame, ma solo
 *                   mentre ce n'è almeno uno collegato.
 *
 * Privacy: si leggono solo tasti e levette, mai gamepad.id (nome e modello
 * del controller, usato per il fingerprinting). Niente esce dal dispositivo.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.GamepadInput = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Disposizione "standard" della Gamepad API (Xbox, PlayStation e la
  // maggior parte dei controller moderni, anche su Safari per iPad).
  var BUTTON = {
    select: 0, // A / Croce (✕)
    undo: 1,   // B / Cerchio (○)
    hints: 3,  // Y / Triangolo (△)
    newGame: 9, // Start / Menu / Options
    up: 12,
    down: 13,
    left: 14,
    right: 15
  };
  var PRESS_ACTIONS = ['select', 'undo', 'hints', 'newGame'];
  var DIRECTIONS = ['up', 'down', 'left', 'right'];

  var DEFAULTS = {
    deadZone: 0.35,     // sotto questa soglia la levetta è "al centro"
    repeatDelay: 300,   // ms prima che una direzione tenuta si ripeta
    repeatInterval: 120 // ms tra una ripetizione e l'altra
  };

  function isPressed(button) {
    if (!button) return false;
    if (typeof button === 'boolean') return button; // già convertito da readPads
    if (typeof button === 'number') return button > 0.5;
    return !!button.pressed || button.value > 0.5;
  }

  /**
   * Una sola direzione alla volta: prima la croce direzionale, poi la
   * levetta sinistra con l'asse dominante (niente diagonali).
   */
  function directionOf(pad, deadZone) {
    for (var i = 0; i < DIRECTIONS.length; i++) {
      if (isPressed(pad.buttons[BUTTON[DIRECTIONS[i]]])) return DIRECTIONS[i];
    }
    var x = pad.axes && pad.axes[0] || 0;
    var y = pad.axes && pad.axes[1] || 0;
    if (Math.max(Math.abs(x), Math.abs(y)) < deadZone) return null;
    if (Math.abs(x) >= Math.abs(y)) return x > 0 ? 'right' : 'left';
    return y > 0 ? 'down' : 'up';
  }

  /** Stato "logico" di tutti i controller insieme: cosa è premuto adesso. */
  function snapshot(pads, deadZone) {
    var held = {};
    var direction = null;
    for (var p = 0; p < pads.length; p++) {
      var pad = pads[p];
      if (!pad || !pad.buttons) continue;
      for (var i = 0; i < PRESS_ACTIONS.length; i++) {
        if (isPressed(pad.buttons[BUTTON[PRESS_ACTIONS[i]]])) held[PRESS_ACTIONS[i]] = true;
      }
      if (!direction) direction = directionOf(pad, deadZone);
    }
    return { held: held, direction: direction };
  }

  /**
   * Trasforma letture successive in azioni:
   *   - pulsanti: un'azione solo quando vengono premuti (non a ogni frame);
   *   - direzioni: subito, poi dopo repeatDelay ogni repeatInterval.
   * Ciò che è già premuto alla prima lettura (il tasto che "sveglia" il
   * controller nel browser) viene ignorato finché non si rilascia.
   */
  function createReader(options) {
    var opt = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      opt[k] = options && options[k] != null ? options[k] : DEFAULTS[k];
    });
    var started = false;
    var held = {};
    var direction = null;
    var nextRepeatAt = 0;

    function update(pads, now) {
      var snap = snapshot(pads || [], opt.deadZone);
      var out = [];

      if (!started) {
        // Prima lettura: tutto ciò che è premuto conta come già tenuto.
        started = true;
        held = snap.held;
        direction = snap.direction;
        nextRepeatAt = Infinity;
        return out;
      }

      for (var i = 0; i < PRESS_ACTIONS.length; i++) {
        var a = PRESS_ACTIONS[i];
        if (snap.held[a] && !held[a]) out.push(a);
      }
      held = snap.held;

      if (snap.direction !== direction) {
        direction = snap.direction;
        if (direction) {
          out.push(direction);
          nextRepeatAt = now + opt.repeatDelay;
        }
      } else if (direction && now >= nextRepeatAt) {
        out.push(direction);
        nextRepeatAt = now + opt.repeatInterval;
      }
      return out;
    }

    /** Dimentica tutto (controller scollegato, pagina nascosta…). */
    function reset() {
      started = false;
      held = {};
      direction = null;
      nextRepeatAt = 0;
    }

    return { update: update, reset: reset };
  }

  // ---------------------------------------------------------------------
  // Parte browser
  // ---------------------------------------------------------------------

  /** Copia solo tasti e levette: nessun altro dato del controller. */
  function readPads(nav) {
    var list;
    try {
      list = nav.getGamepads ? nav.getGamepads() : [];
    } catch (e) {
      return []; // es. bloccato da Permissions-Policy
    }
    var out = [];
    for (var i = 0; list && i < list.length; i++) {
      var pad = list[i];
      if (!pad || pad.connected === false) continue;
      out.push({
        buttons: Array.prototype.map.call(pad.buttons, isPressed),
        axes: Array.prototype.slice.call(pad.axes)
      });
    }
    return out;
  }

  /**
   * actions: { up(), down(), left(), right(), select(), undo(), hints(),
   * newGame(), connected() } — tutte facoltative.
   */
  function attach(actions, win) {
    win = win || window;
    var nav = win.navigator;
    if (!nav || typeof nav.getGamepads !== 'function') return null;

    var reader = createReader();
    var running = false;
    var frame = 0;

    function dispatch(name) {
      if (typeof actions[name] === 'function') actions[name]();
    }

    function loop() {
      var pads = readPads(nav);
      if (!pads.length) {
        // Nessun controller: ci si ferma e si riparte al prossimo collegamento.
        running = false;
        reader.reset();
        return;
      }
      reader.update(pads, win.performance.now()).forEach(dispatch);
      frame = win.requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true;
      reader.reset();
      frame = win.requestAnimationFrame(loop);
    }

    win.addEventListener('gamepadconnected', function () {
      dispatch('connected');
      start();
    });
    win.addEventListener('gamepaddisconnected', function () {
      reader.reset(); // niente tasti "incastrati" tenuti dal controller perso
    });
    // In background il browser sospende i frame: al ritorno si riparte puliti.
    win.document.addEventListener('visibilitychange', function () {
      reader.reset();
    });

    // Controller già collegato e "sveglio" prima del caricamento della pagina.
    if (readPads(nav).length) start();

    return {
      stop: function () {
        running = false;
        win.cancelAnimationFrame(frame);
      }
    };
  }

  return {
    BUTTON: BUTTON,
    DEFAULTS: DEFAULTS,
    createReader: createReader,
    attach: attach
  };
});
