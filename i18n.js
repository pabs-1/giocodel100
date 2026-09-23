// SPDX-FileCopyrightText: 2026 pabs-1 e i contributori del Gioco del 100
// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Gioco del 100 — traduzioni.
 *
 * Privacy: la lingua si sceglie SOLO nel browser, leggendo
 * navigator.languages (le preferenze che l'utente ha impostato). Non parte
 * nessuna richiesta, non si usano cookie né servizi esterni. Se l'utente
 * sceglie a mano una lingua, la scelta resta in localStorage su questo
 * dispositivo e non viene mai trasmessa.
 *
 * La parte pura (dizionari, pickLanguage) funziona anche in Node per i test;
 * la parte che tocca il DOM parte solo nel browser.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.I18N = api;
    if (root.document) api.start(root);
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_LANG = 'it';   // nessuna preferenza nota: lingua originale
  var FALLBACK_LANG = 'en';  // preferenze note ma nessuna supportata
  var STORAGE_KEY = 'giocodel100:lingua';

  function plural(n, one, many) {
    return n === 1 ? one : many;
  }

  /**
   * Plurale di russo e polacco: 1 / 2–4 / 5+ (12–14 vanno con 5+).
   * In russo 21, 31… tornano al singolare; in polacco solo 1 lo è
   * (strictOne = true).
   */
  function pluralSlavic(n, one, few, many, strictOne) {
    var d = n % 10;
    var h = n % 100;
    if (strictOne ? n === 1 : d === 1 && h !== 11) return one;
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
    return many;
  }

  // Licenze e codice sorgente (AGPL: chi usa il gioco deve poter avere il
  // sorgente). {src:testo} diventa il link al repository, {agpl} e {cc} i
  // link alle licenze: gli indirizzi stanno qui una volta sola.
  var SOURCE_URL = 'https://github.com/pabs-1/giocodel100';
  function licenseNotice(template) {
    return template
      .replace(/\{src:([^}]+)\}/, '<a href="' + SOURCE_URL + '">$1</a>')
      .replace('{agpl}', '<a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="license">GNU AGPLv3</a>')
      .replace('{cc}', '<a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license">CC BY-SA 4.0</a>');
  }

  // Tasti (uguali in tutte le lingue: le scorciatoie non cambiano).
  var ARROWS = '<kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd>';

  var STRINGS = {
    it: {
      name: 'Italiano',
      htmlLang: 'it',
      licenseNotice: licenseNotice('Il {src:codice sorgente} è libero, con licenza {agpl}; le immagini sono con licenza {cc}.'),
      share: 'Condividi il risultato',
      shareCopied: 'Risultato copiato: incollalo dove vuoi.',
      shareManual: 'Copia il testo:',
      shareLost: function (n) { return 'Ho scritto ' + n + ' numeri su 100.'; },
      shareWon: 'Ho scritto tutti i numeri da 1 a 100! 🎉',
      shareTagline: 'E tu, riesci a fare 100?',
      gamepadConnected: 'Controller collegato: croce direzionale per spostarti, A/✕ per scrivere, B/○ per annullare.',
      controllerH: 'Controller',
      controller1: 'Croce direzionale o levetta sinistra per spostarti, <kbd>A</kbd>/<kbd>✕</kbd> per scrivere il numero, <kbd>B</kbd>/<kbd>○</kbd> per annullare.',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> mostra o nasconde le mosse, <kbd>Start</kbd>/<kbd>Options</kbd> inizia una nuova partita. Funziona con i controller Xbox, PlayStation e compatibili, anche su iPad.',
      noscript: 'Per giocare serve JavaScript.',
      ogLocale: 'it_IT',
      metaDescription: 'Il gioco del 100: scrivi i numeri da 1 a 100 su una griglia 10×10 saltando 2 caselle in orizzontale o verticale e 1 in diagonale. Gratis e senza pubblicità.',
      title: 'Gioco del 100',
      dedication: 'Dedicato alla 5C dello Spalla',
      colon: ': ',
      comma: ', ',
      statCurrent: 'Numero',
      statRemaining: 'Rimaste',
      statBest: 'Record',
      rulesLink: 'Regole del gioco',
      rulesTitle: 'Regole',
      boardLabel: 'Griglia 10 per 10',
      controlsLabel: 'Comandi di gioco',
      undo: 'Annulla',
      hints: 'Mosse',
      newShort: 'Nuova',
      newRest: ' partita',
      confirm: 'Conferma?',
      statusReady: 'Tocca una cella qualsiasi per scrivere l’1.',
      statusWon: 'Hai completato la griglia: 100 su 100!',
      statusLost: function (next) { return 'Nessuna mossa per il ' + next + '. Annulla o inizia una nuova partita.'; },
      statusPlaying: function (next, k) { return 'Scrivi il ' + next + ' — ' + k + ' ' + plural(k, 'mossa possibile', 'mosse possibili') + '.'; },
      placed: function (n, pos) { return n + ' in ' + pos + '.'; },
      undone: function (n) { return 'Annullato il ' + n + '.'; },
      invalid: function (n, pos) { return 'Non puoi scrivere il ' + n + ' in ' + pos + '.'; },
      newGame: 'Nuova partita.',
      resumed: 'Partita ripresa.',
      position: function (r, c) { return 'riga ' + r + ', colonna ' + c; },
      cellEmpty: 'vuota',
      cellLegal: 'mossa possibile',
      cellLast: 'ultimo numero',
      wonTitle: 'Hai vinto!',
      wonText: 'Hai scritto tutti i numeri da 1 a 100.',
      lostTitle: 'Nessuna mossa possibile',
      lostText: function (n, missing, best, isRecord) {
        return 'Sei arrivato a ' + n + ': ' +
          (missing === 1 ? 'manca solo 1 numero' : 'mancano ' + missing + ' numeri') + '. ' +
          (isRecord ? 'Nuovo record!' : 'Record: ' + best + '.');
      },
      overlayUndo: 'Annulla ultima mossa',
      overlayNew: 'Nuova partita',
      overlayClose: 'Guarda la griglia',
      back: '← Torna al gioco',
      language: 'Lingua',
      languageAuto: 'Automatica (dal browser)',
      rulesH1: 'Come si gioca',
      rulesIntro: 'Scrivi i numeri da <strong>1 a 100</strong> sulla griglia 10×10, uno per cella.',
      rule1: 'L’<strong>1</strong> va dove vuoi: tocca una cella qualsiasi.',
      rule2: 'Ogni numero successivo parte dalla cella dell’ultimo numero scritto.',
      rule3: '<strong>In orizzontale o verticale</strong> salti 2 celle e atterri sulla 3ª.',
      rule4: '<strong>In diagonale</strong> salti 1 cella e atterri sulla 2ª.',
      rule5: 'Non puoi usare una cella già occupata né uscire dalla griglia.',
      rule6: 'Se resti senza mosse prima del 100 hai perso; se arrivi a 100 hai vinto.',
      diagram: 'Dalla cella arancione puoi saltare sulle 8 celle verdi:',
      commandsH: 'Comandi',
      command1: '<strong>Mosse</strong>: mostra o nasconde le celle su cui puoi saltare.',
      command2: '<strong>Annulla</strong>: toglie l’ultimo numero; puoi annullare quante volte vuoi.',
      command3: '<strong>Nuova partita</strong>: ricomincia da zero (a partita in corso chiede conferma).',
      command4: 'La partita si salva da sola: chiudi e riapri, riprendi da dove eri.',
      keyboardH: 'Tastiera',
      key1: ARROWS + ' per spostarti sulla griglia, <kbd>Invio</kbd> o <kbd>Spazio</kbd> per scrivere il numero.',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> o <kbd>U</kbd> per annullare, <kbd>M</kbd> per mostrare/nascondere le mosse.',
      winH: 'Si può sempre vincere?',
      win: 'Sì: da qualunque cella parta l’1 esiste almeno un percorso che arriva a 100. Trovarlo è un’altra storia.',
      privacyH: 'Privacy',
      privacy: 'Nessun cookie, nessun tracciamento, nessuno script o servizio di terzi. La partita, il record e le tue preferenze restano solo in questo browser. La lingua dipende dall’indirizzo della pagina o dalle impostazioni del browser e viene scelta sul tuo dispositivo. Il sito è ospitato su Neocities che, come ogni server web, riceve le normali richieste del browser.'
    },

    en: {
      name: 'English',
      htmlLang: 'en',
      licenseNotice: licenseNotice('The {src:source code} is free software under the {agpl}; images are licensed under {cc}.'),
      share: 'Share your result',
      shareCopied: 'Result copied: paste it anywhere.',
      shareManual: 'Copy this text:',
      shareLost: function (n) { return 'I wrote ' + n + ' of the 100 numbers.'; },
      shareWon: 'I wrote every number from 1 to 100! 🎉',
      shareTagline: 'Can you make it to 100?',
      gamepadConnected: 'Controller connected: D-pad to move, A/✕ to write, B/○ to undo.',
      controllerH: 'Controller',
      controller1: 'D-pad or left stick to move, <kbd>A</kbd>/<kbd>✕</kbd> to write the number, <kbd>B</kbd>/<kbd>○</kbd> to undo.',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> shows or hides the moves, <kbd>Start</kbd>/<kbd>Options</kbd> starts a new game. Works with Xbox, PlayStation and compatible controllers, iPad included.',
      noscript: 'JavaScript is required to play.',
      ogLocale: 'en_US',
      metaDescription: 'The Game of 100: write the numbers 1 to 100 on a 10×10 grid, skipping 2 squares across or down and 1 diagonally. A free puzzle with no ads and no tracking.',
      title: 'The Game of 100',
      dedication: 'Dedicated to class 5C at the Spalla',
      colon: ': ',
      comma: ', ',
      statCurrent: 'Number',
      statRemaining: 'Left',
      statBest: 'Best',
      rulesLink: 'Game rules',
      rulesTitle: 'Rules',
      boardLabel: 'Grid, 10 by 10',
      controlsLabel: 'Game controls',
      undo: 'Undo',
      hints: 'Moves',
      newShort: 'New',
      newRest: ' game',
      confirm: 'Sure?',
      statusReady: 'Tap any cell to write the 1.',
      statusWon: 'You filled the grid: 100 out of 100!',
      statusLost: function (next) { return 'No moves left for ' + next + '. Undo or start a new game.'; },
      statusPlaying: function (next, k) { return 'Write ' + next + ' — ' + k + ' possible ' + plural(k, 'move', 'moves') + '.'; },
      placed: function (n, pos) { return n + ' at ' + pos + '.'; },
      undone: function (n) { return 'Undid ' + n + '.'; },
      invalid: function (n, pos) { return 'You can’t write ' + n + ' at ' + pos + '.'; },
      newGame: 'New game.',
      resumed: 'Game resumed.',
      position: function (r, c) { return 'row ' + r + ', column ' + c; },
      cellEmpty: 'empty',
      cellLegal: 'possible move',
      cellLast: 'last number',
      wonTitle: 'You won!',
      wonText: 'You wrote every number from 1 to 100.',
      lostTitle: 'No moves left',
      lostText: function (n, missing, best, isRecord) {
        return 'You reached ' + n + ': ' +
          (missing === 1 ? 'just 1 number to go' : missing + ' numbers to go') + '. ' +
          (isRecord ? 'New record!' : 'Best: ' + best + '.');
      },
      overlayUndo: 'Undo last move',
      overlayNew: 'New game',
      overlayClose: 'Look at the grid',
      back: '← Back to the game',
      language: 'Language',
      languageAuto: 'Automatic (from browser)',
      rulesH1: 'How to play',
      rulesIntro: 'Write the numbers from <strong>1 to 100</strong> on the 10×10 grid, one per cell.',
      rule1: 'Put the <strong>1</strong> wherever you like: tap any cell.',
      rule2: 'Each following number starts from the cell of the last number you wrote.',
      rule3: '<strong>Horizontally or vertically</strong> you skip 2 cells and land on the 3rd.',
      rule4: '<strong>Diagonally</strong> you skip 1 cell and land on the 2nd.',
      rule5: 'You can’t reuse an occupied cell or leave the grid.',
      rule6: 'If you run out of moves before 100 you lose; reach 100 and you win.',
      diagram: 'From the orange cell you can jump to the 8 green cells:',
      commandsH: 'Controls',
      command1: '<strong>Moves</strong>: shows or hides the cells you can jump to.',
      command2: '<strong>Undo</strong>: removes the last number; you can undo as many times as you like.',
      command3: '<strong>New game</strong>: starts over (asks for confirmation during a game).',
      command4: 'The game saves itself: close it, reopen it and carry on where you left off.',
      keyboardH: 'Keyboard',
      key1: ARROWS + ' to move around the grid, <kbd>Enter</kbd> or <kbd>Space</kbd> to write the number.',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> or <kbd>U</kbd> to undo, <kbd>M</kbd> to show/hide moves.',
      winH: 'Can you always win?',
      win: 'Yes: wherever the 1 starts, there is at least one path that reaches 100. Finding it is another story.',
      privacyH: 'Privacy',
      privacy: 'No cookies, no tracking, no third-party scripts or services. Your game, best score and preferences stay in this browser only. The language comes from the page address or your browser settings and is picked on your device. The site is hosted on Neocities, which, like any web server, receives your browser’s normal requests.'
    },

    fr: {
      name: 'Français',
      htmlLang: 'fr',
      licenseNotice: licenseNotice('Le {src:code source} est libre, sous licence {agpl} ; les images sont sous licence {cc}.'),
      share: 'Partager le résultat',
      shareCopied: 'Résultat copié : collez-le où vous voulez.',
      shareManual: 'Copiez ce texte :',
      shareLost: function (n) { return 'J’ai écrit ' + n + ' nombres sur 100.'; },
      shareWon: 'J’ai écrit tous les nombres de 1 à 100 ! 🎉',
      shareTagline: 'Et toi, tu arrives à 100 ?',
      gamepadConnected: 'Manette connectée : croix directionnelle pour se déplacer, A/✕ pour écrire, B/○ pour annuler.',
      controllerH: 'Manette',
      controller1: 'Croix directionnelle ou stick gauche pour vous déplacer, <kbd>A</kbd>/<kbd>✕</kbd> pour écrire le nombre, <kbd>B</kbd>/<kbd>○</kbd> pour annuler.',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> affiche ou masque les coups, <kbd>Start</kbd>/<kbd>Options</kbd> commence une nouvelle partie. Fonctionne avec les manettes Xbox, PlayStation et compatibles, iPad compris.',
      noscript: 'JavaScript est nécessaire pour jouer.',
      ogLocale: 'fr_FR',
      metaDescription: 'Le jeu du 100 : écrivez les nombres de 1 à 100 sur une grille 10×10 en sautant 2 cases en ligne droite et 1 en diagonale. Casse-tête gratuit, sans pub.',
      title: 'Le jeu du 100',
      dedication: 'Dédié à la classe 5C du Spalla',
      colon: ' : ',
      comma: ', ',
      statCurrent: 'Numéro',
      statRemaining: 'Restantes',
      statBest: 'Record',
      rulesLink: 'Règles du jeu',
      rulesTitle: 'Règles',
      boardLabel: 'Grille de 10 sur 10',
      controlsLabel: 'Commandes du jeu',
      undo: 'Annuler',
      hints: 'Coups',
      newShort: 'Nouvelle',
      newRest: ' partie',
      confirm: 'Sûr ?',
      statusReady: 'Touchez une case pour écrire le 1.',
      statusWon: 'Grille complète : 100 sur 100 !',
      statusLost: function (next) { return 'Aucun coup possible pour le ' + next + '. Annulez ou commencez une nouvelle partie.'; },
      statusPlaying: function (next, k) { return 'Écrivez le ' + next + ' — ' + k + ' ' + plural(k, 'coup possible', 'coups possibles') + '.'; },
      placed: function (n, pos) { return n + ' en ' + pos + '.'; },
      undone: function (n) { return n + ' annulé.'; },
      invalid: function (n, pos) { return 'Impossible d’écrire le ' + n + ' en ' + pos + '.'; },
      newGame: 'Nouvelle partie.',
      resumed: 'Partie reprise.',
      position: function (r, c) { return 'ligne ' + r + ', colonne ' + c; },
      cellEmpty: 'vide',
      cellLegal: 'coup possible',
      cellLast: 'dernier nombre',
      wonTitle: 'Gagné !',
      wonText: 'Vous avez écrit tous les nombres de 1 à 100.',
      lostTitle: 'Aucun coup possible',
      lostText: function (n, missing, best, isRecord) {
        return 'Vous êtes arrivé à ' + n + ' : ' +
          (missing === 1 ? 'il ne manque qu’un nombre' : 'il manque ' + missing + ' nombres') + '. ' +
          (isRecord ? 'Nouveau record !' : 'Record : ' + best + '.');
      },
      overlayUndo: 'Annuler le dernier coup',
      overlayNew: 'Nouvelle partie',
      overlayClose: 'Voir la grille',
      back: '← Retour au jeu',
      language: 'Langue',
      languageAuto: 'Automatique (navigateur)',
      rulesH1: 'Comment jouer',
      rulesIntro: 'Écrivez les nombres de <strong>1 à 100</strong> sur la grille 10×10, un par case.',
      rule1: 'Placez le <strong>1</strong> où vous voulez : touchez n’importe quelle case.',
      rule2: 'Chaque nombre suivant part de la case du dernier nombre écrit.',
      rule3: '<strong>À l’horizontale ou à la verticale</strong>, vous sautez 2 cases et atterrissez sur la 3<sup>e</sup>.',
      rule4: '<strong>En diagonale</strong>, vous sautez 1 case et atterrissez sur la 2<sup>e</sup>.',
      rule5: 'Impossible de réutiliser une case occupée ou de sortir de la grille.',
      rule6: 'Si vous êtes bloqué avant 100, vous perdez ; si vous atteignez 100, vous gagnez.',
      diagram: 'Depuis la case orange, vous pouvez sauter sur les 8 cases vertes :',
      commandsH: 'Commandes',
      command1: '<strong>Coups</strong> : affiche ou masque les cases où vous pouvez sauter.',
      command2: '<strong>Annuler</strong> : retire le dernier nombre ; vous pouvez annuler autant de fois que vous voulez.',
      command3: '<strong>Nouvelle partie</strong> : recommence à zéro (demande confirmation en cours de partie).',
      command4: 'La partie s’enregistre toute seule : fermez, rouvrez et reprenez où vous en étiez.',
      keyboardH: 'Clavier',
      key1: ARROWS + ' pour vous déplacer sur la grille, <kbd>Entrée</kbd> ou <kbd>Espace</kbd> pour écrire le nombre.',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> ou <kbd>U</kbd> pour annuler, <kbd>M</kbd> pour afficher/masquer les coups.',
      winH: 'Peut-on toujours gagner ?',
      win: 'Oui : quelle que soit la case du 1, il existe au moins un parcours jusqu’à 100. Le trouver, c’est une autre histoire.',
      privacyH: 'Confidentialité',
      privacy: 'Aucun cookie, aucun pistage, aucun script ni service tiers. Votre partie, votre record et vos préférences restent uniquement dans ce navigateur. La langue dépend de l’adresse de la page ou des réglages de votre navigateur et est choisie sur votre appareil. Le site est hébergé par Neocities qui, comme tout serveur web, reçoit les requêtes habituelles du navigateur.'
    },

    es: {
      name: 'Español',
      htmlLang: 'es',
      licenseNotice: licenseNotice('El {src:código fuente} es libre, con licencia {agpl}; las imágenes, con licencia {cc}.'),
      share: 'Compartir resultado',
      shareCopied: 'Resultado copiado: pégalo donde quieras.',
      shareManual: 'Copia este texto:',
      shareLost: function (n) { return 'He escrito ' + n + ' de los 100 números.'; },
      shareWon: '¡He escrito todos los números del 1 al 100! 🎉',
      shareTagline: 'Y tú, ¿llegas a 100?',
      gamepadConnected: 'Mando conectado: cruceta para moverte, A/✕ para escribir, B/○ para deshacer.',
      controllerH: 'Mando',
      controller1: 'Cruceta o joystick izquierdo para moverte, <kbd>A</kbd>/<kbd>✕</kbd> para escribir el número, <kbd>B</kbd>/<kbd>○</kbd> para deshacer.',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> muestra u oculta las jugadas, <kbd>Start</kbd>/<kbd>Options</kbd> empieza una nueva partida. Funciona con mandos de Xbox, PlayStation y compatibles, también en iPad.',
      noscript: 'Para jugar se necesita JavaScript.',
      ogLocale: 'es_ES',
      metaDescription: 'El juego del 100: escribe los números del 1 al 100 en una cuadrícula de 10×10 saltando 2 casillas en línea recta y 1 en diagonal. Gratis y sin anuncios.',
      title: 'El juego del 100',
      dedication: 'Dedicado a la clase 5C del Spalla',
      colon: ': ',
      comma: ', ',
      statCurrent: 'Número',
      statRemaining: 'Quedan',
      statBest: 'Récord',
      rulesLink: 'Reglas del juego',
      rulesTitle: 'Reglas',
      boardLabel: 'Cuadrícula de 10 por 10',
      controlsLabel: 'Controles del juego',
      undo: 'Deshacer',
      hints: 'Jugadas',
      newShort: 'Nueva',
      newRest: ' partida',
      confirm: '¿Seguro?',
      statusReady: 'Toca cualquier casilla para escribir el 1.',
      statusWon: '¡Cuadrícula completa: 100 de 100!',
      statusLost: function (next) { return 'No hay jugadas para el ' + next + '. Deshaz o empieza una nueva partida.'; },
      statusPlaying: function (next, k) { return 'Escribe el ' + next + ' — ' + k + ' ' + plural(k, 'jugada posible', 'jugadas posibles') + '.'; },
      placed: function (n, pos) { return n + ' en ' + pos + '.'; },
      undone: function (n) { return 'Deshecho el ' + n + '.'; },
      invalid: function (n, pos) { return 'No puedes escribir el ' + n + ' en ' + pos + '.'; },
      newGame: 'Nueva partida.',
      resumed: 'Partida reanudada.',
      position: function (r, c) { return 'fila ' + r + ', columna ' + c; },
      cellEmpty: 'vacía',
      cellLegal: 'jugada posible',
      cellLast: 'último número',
      wonTitle: '¡Has ganado!',
      wonText: 'Has escrito todos los números del 1 al 100.',
      lostTitle: 'No quedan jugadas',
      lostText: function (n, missing, best, isRecord) {
        return 'Has llegado al ' + n + ': ' +
          (missing === 1 ? 'solo falta 1 número' : 'faltan ' + missing + ' números') + '. ' +
          (isRecord ? '¡Nuevo récord!' : 'Récord: ' + best + '.');
      },
      overlayUndo: 'Deshacer la última jugada',
      overlayNew: 'Nueva partida',
      overlayClose: 'Ver la cuadrícula',
      back: '← Volver al juego',
      language: 'Idioma',
      languageAuto: 'Automático (navegador)',
      rulesH1: 'Cómo se juega',
      rulesIntro: 'Escribe los números del <strong>1 al 100</strong> en la cuadrícula de 10×10, uno por casilla.',
      rule1: 'El <strong>1</strong> va donde quieras: toca cualquier casilla.',
      rule2: 'Cada número siguiente parte de la casilla del último número escrito.',
      rule3: '<strong>En horizontal o vertical</strong> saltas 2 casillas y caes en la 3.ª.',
      rule4: '<strong>En diagonal</strong> saltas 1 casilla y caes en la 2.ª.',
      rule5: 'No puedes usar una casilla ocupada ni salir de la cuadrícula.',
      rule6: 'Si te quedas sin jugadas antes del 100, pierdes; si llegas al 100, ganas.',
      diagram: 'Desde la casilla naranja puedes saltar a las 8 casillas verdes:',
      commandsH: 'Controles',
      command1: '<strong>Jugadas</strong>: muestra u oculta las casillas a las que puedes saltar.',
      command2: '<strong>Deshacer</strong>: quita el último número; puedes deshacer todas las veces que quieras.',
      command3: '<strong>Nueva partida</strong>: empieza de cero (pide confirmación si hay una partida en curso).',
      command4: 'La partida se guarda sola: cierra, vuelve a abrir y sigue donde lo dejaste.',
      keyboardH: 'Teclado',
      key1: ARROWS + ' para moverte por la cuadrícula, <kbd>Intro</kbd> o <kbd>Espacio</kbd> para escribir el número.',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> o <kbd>U</kbd> para deshacer, <kbd>M</kbd> para mostrar/ocultar las jugadas.',
      winH: '¿Se puede ganar siempre?',
      win: 'Sí: empiece donde empiece el 1, existe al menos un recorrido que llega al 100. Encontrarlo es otra historia.',
      privacyH: 'Privacidad',
      privacy: 'Sin cookies, sin rastreo, sin scripts ni servicios de terceros. Tu partida, tu récord y tus preferencias se quedan solo en este navegador. El idioma depende de la dirección de la página o de la configuración del navegador y se elige en tu dispositivo. El sitio está alojado en Neocities, que, como cualquier servidor web, recibe las solicitudes normales del navegador.'
    },

    de: {
      name: 'Deutsch',
      htmlLang: 'de',
      licenseNotice: licenseNotice('Der {src:Quellcode} ist freie Software unter der {agpl}; die Bilder stehen unter {cc}.'),
      share: 'Ergebnis teilen',
      shareCopied: 'Ergebnis kopiert: Füge es ein, wo du willst.',
      shareManual: 'Kopiere diesen Text:',
      shareLost: function (n) { return 'Ich habe ' + n + ' von 100 Zahlen geschrieben.'; },
      shareWon: 'Ich habe alle Zahlen von 1 bis 100 geschrieben! 🎉',
      shareTagline: 'Und du, schaffst du die 100?',
      gamepadConnected: 'Controller verbunden: Steuerkreuz zum Bewegen, A/✕ zum Schreiben, B/○ zum Zurücknehmen.',
      controllerH: 'Controller',
      controller1: 'Steuerkreuz oder linker Stick zum Bewegen, <kbd>A</kbd>/<kbd>✕</kbd> zum Schreiben der Zahl, <kbd>B</kbd>/<kbd>○</kbd> zum Zurücknehmen.',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> blendet die Züge ein oder aus, <kbd>Start</kbd>/<kbd>Options</kbd> startet ein neues Spiel. Funktioniert mit Xbox-, PlayStation- und kompatiblen Controllern, auch auf dem iPad.',
      noscript: 'Zum Spielen wird JavaScript benötigt.',
      ogLocale: 'de_DE',
      metaDescription: 'Das Spiel der 100: Schreibe die Zahlen 1 bis 100 in ein 10×10-Raster und überspringe dabei 2 Felder gerade oder 1 diagonal. Kostenlos und ohne Werbung.',
      title: 'Das Spiel der 100',
      dedication: 'Gewidmet der Klasse 5C des Spalla',
      colon: ': ',
      comma: ', ',
      statCurrent: 'Zahl',
      statRemaining: 'Übrig',
      statBest: 'Rekord',
      rulesLink: 'Spielregeln',
      rulesTitle: 'Regeln',
      boardLabel: 'Raster, 10 mal 10',
      controlsLabel: 'Spielsteuerung',
      undo: 'Zurück',
      hints: 'Züge',
      // "Neu" + "es Spiel": auf schmalen Bildschirmen steht nur "Neu".
      newShort: 'Neu',
      newRest: 'es Spiel',
      confirm: 'Sicher?',
      statusReady: 'Tippe auf ein beliebiges Feld, um die 1 zu schreiben.',
      statusWon: 'Raster gefüllt: 100 von 100!',
      statusLost: function (next) { return 'Kein Zug mehr für die ' + next + '. Nimm einen Zug zurück oder starte ein neues Spiel.'; },
      statusPlaying: function (next, k) { return 'Schreibe die ' + next + ' — ' + k + ' ' + plural(k, 'möglicher Zug', 'mögliche Züge') + '.'; },
      placed: function (n, pos) { return n + ' in ' + pos + '.'; },
      undone: function (n) { return n + ' zurückgenommen.'; },
      invalid: function (n, pos) { return 'Die ' + n + ' kann nicht in ' + pos + ' stehen.'; },
      newGame: 'Neues Spiel.',
      resumed: 'Spiel fortgesetzt.',
      position: function (r, c) { return 'Zeile ' + r + ', Spalte ' + c; },
      cellEmpty: 'leer',
      cellLegal: 'möglicher Zug',
      cellLast: 'letzte Zahl',
      wonTitle: 'Gewonnen!',
      wonText: 'Du hast alle Zahlen von 1 bis 100 geschrieben.',
      lostTitle: 'Kein Zug mehr möglich',
      lostText: function (n, missing, best, isRecord) {
        return 'Du bist bis ' + n + ' gekommen: ' +
          (missing === 1 ? 'es fehlt nur noch 1 Zahl' : 'es fehlen noch ' + missing + ' Zahlen') + '. ' +
          (isRecord ? 'Neuer Rekord!' : 'Rekord: ' + best + '.');
      },
      overlayUndo: 'Letzten Zug zurücknehmen',
      overlayNew: 'Neues Spiel',
      overlayClose: 'Raster ansehen',
      back: '← Zurück zum Spiel',
      language: 'Sprache',
      languageAuto: 'Automatisch (Browser)',
      rulesH1: 'So wird gespielt',
      rulesIntro: 'Schreibe die Zahlen von <strong>1 bis 100</strong> in das 10×10-Raster, eine pro Feld.',
      rule1: 'Die <strong>1</strong> kommt, wohin du willst: Tippe auf ein beliebiges Feld.',
      rule2: 'Jede weitere Zahl startet vom Feld der zuletzt geschriebenen Zahl.',
      rule3: '<strong>Waagerecht oder senkrecht</strong> überspringst du 2 Felder und landest auf dem 3.',
      rule4: '<strong>Diagonal</strong> überspringst du 1 Feld und landest auf dem 2.',
      rule5: 'Besetzte Felder darfst du nicht erneut benutzen, und du darfst das Raster nicht verlassen.',
      rule6: 'Gehen dir vor der 100 die Züge aus, hast du verloren; erreichst du die 100, hast du gewonnen.',
      diagram: 'Vom orangefarbenen Feld aus kannst du auf die 8 grünen Felder springen:',
      commandsH: 'Steuerung',
      command1: '<strong>Züge</strong>: zeigt oder verbirgt die Felder, auf die du springen kannst.',
      command2: '<strong>Zurück</strong>: entfernt die letzte Zahl – so oft du willst.',
      command3: '<strong>Neues Spiel</strong>: fängt von vorn an (fragt während eines Spiels nach).',
      command4: 'Das Spiel speichert sich selbst: Schließen, wieder öffnen und dort weitermachen, wo du warst.',
      keyboardH: 'Tastatur',
      key1: ARROWS + ', um dich im Raster zu bewegen, <kbd>Enter</kbd> oder <kbd>Leertaste</kbd>, um die Zahl zu schreiben.',
      key2: '<kbd>Strg</kbd>+<kbd>Z</kbd> oder <kbd>U</kbd> zum Zurücknehmen, <kbd>M</kbd> zum Ein- und Ausblenden der Züge.',
      winH: 'Kann man immer gewinnen?',
      win: 'Ja: Egal, wo die 1 steht, es gibt mindestens einen Weg bis zur 100. Ihn zu finden, ist eine andere Sache.',
      privacyH: 'Datenschutz',
      privacy: 'Keine Cookies, kein Tracking, keine Skripte oder Dienste von Dritten. Dein Spiel, dein Rekord und deine Einstellungen bleiben nur in diesem Browser. Die Sprache ergibt sich aus der Seitenadresse oder deinen Browsereinstellungen und wird auf deinem Gerät gewählt. Die Seite liegt bei Neocities, das wie jeder Webserver die üblichen Anfragen des Browsers erhält.'
    },

    pt: {
      name: 'Português',
      htmlLang: 'pt',
      licenseNotice: licenseNotice('O {src:código-fonte} é livre, com licença {agpl}; as imagens estão sob a licença {cc}.'),
      share: 'Compartilhar resultado',
      shareCopied: 'Resultado copiado: cole onde quiser.',
      shareManual: 'Copie este texto:',
      shareLost: function (n) { return 'Escrevi ' + n + ' dos 100 números.'; },
      shareWon: 'Escrevi todos os números de 1 a 100! 🎉',
      shareTagline: 'E você, consegue chegar ao 100?',
      gamepadConnected: 'Comando ligado: direcional para se mover, A/✕ para escrever, B/○ para desfazer.',
      controllerH: 'Comando',
      controller1: 'Direcional ou analógico esquerdo para se mover, <kbd>A</kbd>/<kbd>✕</kbd> para escrever o número, <kbd>B</kbd>/<kbd>○</kbd> para desfazer.',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> mostra ou esconde as jogadas, <kbd>Start</kbd>/<kbd>Options</kbd> começa um novo jogo. Funciona com comandos Xbox, PlayStation e compatíveis, também no iPad.',
      noscript: 'É preciso JavaScript para jogar.',
      ogLocale: 'pt_BR',
      metaDescription: 'O jogo do 100: escreva os números de 1 a 100 num tabuleiro 10×10 saltando 2 casas em linha reta e 1 na diagonal. Quebra-cabeça grátis e sem anúncios.',
      title: 'O jogo do 100',
      dedication: 'Dedicado à turma 5C do Spalla',
      colon: ': ',
      comma: ', ',
      statCurrent: 'Número',
      statRemaining: 'Restam',
      statBest: 'Recorde',
      rulesLink: 'Regras do jogo',
      rulesTitle: 'Regras',
      boardLabel: 'Tabuleiro de 10 por 10',
      controlsLabel: 'Comandos do jogo',
      undo: 'Desfazer',
      hints: 'Jogadas',
      newShort: 'Novo',
      newRest: ' jogo',
      confirm: 'Certeza?',
      statusReady: 'Toque em qualquer casa para escrever o 1.',
      statusWon: 'Tabuleiro completo: 100 de 100!',
      statusLost: function (next) { return 'Não há jogadas para o ' + next + '. Desfaça ou comece um novo jogo.'; },
      statusPlaying: function (next, k) { return 'Escreva o ' + next + ' — ' + k + ' ' + plural(k, 'jogada possível', 'jogadas possíveis') + '.'; },
      placed: function (n, pos) { return n + ' em ' + pos + '.'; },
      undone: function (n) { return n + ' desfeito.'; },
      invalid: function (n, pos) { return 'Não pode escrever o ' + n + ' em ' + pos + '.'; },
      newGame: 'Novo jogo.',
      resumed: 'Jogo retomado.',
      position: function (r, c) { return 'linha ' + r + ', coluna ' + c; },
      cellEmpty: 'vazia',
      cellLegal: 'jogada possível',
      cellLast: 'último número',
      wonTitle: 'Vitória!',
      wonText: 'Escreveu todos os números de 1 a 100.',
      lostTitle: 'Não há mais jogadas',
      lostText: function (n, missing, best, isRecord) {
        return 'Chegou ao ' + n + ': ' +
          (missing === 1 ? 'falta só 1 número' : 'faltam ' + missing + ' números') + '. ' +
          (isRecord ? 'Novo recorde!' : 'Recorde: ' + best + '.');
      },
      overlayUndo: 'Desfazer a última jogada',
      overlayNew: 'Novo jogo',
      overlayClose: 'Ver o tabuleiro',
      back: '← Voltar ao jogo',
      language: 'Idioma',
      languageAuto: 'Automático (navegador)',
      rulesH1: 'Como jogar',
      rulesIntro: 'Escreva os números de <strong>1 a 100</strong> no tabuleiro 10×10, um por casa.',
      rule1: 'O <strong>1</strong> vai onde quiser: toque em qualquer casa.',
      rule2: 'Cada número seguinte parte da casa do último número escrito.',
      rule3: '<strong>Na horizontal ou na vertical</strong>, salta 2 casas e cai na 3.ª.',
      rule4: '<strong>Na diagonal</strong>, salta 1 casa e cai na 2.ª.',
      rule5: 'Não pode usar uma casa ocupada nem sair do tabuleiro.',
      rule6: 'Se ficar sem jogadas antes do 100, perde; se chegar ao 100, ganha.',
      diagram: 'A partir da casa laranja pode saltar para as 8 casas verdes:',
      commandsH: 'Comandos',
      command1: '<strong>Jogadas</strong>: mostra ou esconde as casas para onde pode saltar.',
      command2: '<strong>Desfazer</strong>: retira o último número; pode desfazer quantas vezes quiser.',
      command3: '<strong>Novo jogo</strong>: recomeça do zero (pede confirmação durante um jogo).',
      command4: 'O jogo não se perde: feche, volte a abrir e continue de onde parou.',
      keyboardH: 'Teclado',
      key1: ARROWS + ' para se mover no tabuleiro, <kbd>Enter</kbd> ou <kbd>Espaço</kbd> para escrever o número.',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> ou <kbd>U</kbd> para desfazer, <kbd>M</kbd> para mostrar/esconder as jogadas.',
      winH: 'Dá sempre para ganhar?',
      win: 'Sim: seja qual for a casa do 1, existe pelo menos um percurso que chega ao 100. Encontrá-lo é outra história.',
      privacyH: 'Privacidade',
      privacy: 'Sem cookies, sem rastreamento, sem scripts ou serviços de terceiros. O jogo, o recorde e as suas preferências ficam apenas neste navegador. O idioma depende do endereço da página ou das preferências do navegador e é escolhido no seu dispositivo. O site está hospedado no Neocities, que, como qualquer servidor web, recebe as solicitações normais do navegador.'
    },

    zh: {
      name: '简体中文',
      htmlLang: 'zh-Hans',
      licenseNotice: licenseNotice('{src:源代码}为自由软件，采用 {agpl} 许可；图片采用 {cc} 许可。'),
      share: '分享成绩',
      shareCopied: '已复制，粘贴到任意地方即可。',
      shareManual: '复制下面的文字：',
      shareLost: function (n) { return '我写到了 ' + n + '，满分 100。'; },
      shareWon: '我写完了 1 到 100 的所有数字！🎉',
      shareTagline: '你能写到 100 吗？',
      gamepadConnected: '已连接手柄：方向键移动，A/✕ 写入，B/○ 撤销。',
      controllerH: '手柄',
      controller1: '用方向键或左摇杆移动，<kbd>A</kbd>/<kbd>✕</kbd> 写下数字，<kbd>B</kbd>/<kbd>○</kbd> 撤销。',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> 显示/隐藏走法，<kbd>Start</kbd>/<kbd>Options</kbd> 开始新游戏。支持 Xbox、PlayStation 及兼容手柄，iPad 也可以用。',
      noscript: '需要启用 JavaScript 才能玩。',
      ogLocale: 'zh_CN',
      metaDescription: '数到 100：在 10×10 方格中依次写下 1 到 100，横竖跳过 2 格，斜向跳过 1 格。免费益智游戏，无广告。',
      title: '数到 100',
      dedication: '献给 Spalla 的 5C 班',
      colon: '：',
      comma: '，',
      statCurrent: '数字',
      statRemaining: '剩余',
      statBest: '最佳',
      rulesLink: '游戏规则',
      rulesTitle: '规则',
      boardLabel: '10×10 方格',
      controlsLabel: '游戏控制',
      undo: '撤销',
      hints: '走法',
      newShort: '新游戏',
      newRest: '',
      confirm: '确定？',
      statusReady: '点击任意格子，写下 1。',
      statusWon: '全部填满：100/100！',
      statusLost: function (next) { return next + ' 无路可走。请撤销或开始新游戏。'; },
      statusPlaying: function (next, k) { return '请写 ' + next + ' — 有 ' + k + ' 种走法。'; },
      placed: function (n, pos) { return n + ' 写在' + pos + '。'; },
      undone: function (n) { return '已撤销 ' + n + '。'; },
      invalid: function (n, pos) { return n + ' 不能写在' + pos + '。'; },
      newGame: '新游戏。',
      resumed: '已继续上次的游戏。',
      position: function (r, c) { return '第 ' + r + ' 行第 ' + c + ' 列'; },
      cellEmpty: '空',
      cellLegal: '可走',
      cellLast: '最后一个数字',
      wonTitle: '你赢了！',
      wonText: '你写下了从 1 到 100 的所有数字。',
      lostTitle: '无路可走',
      lostText: function (n, missing, best, isRecord) {
        return '你写到了 ' + n + '：' +
          (missing === 1 ? '只差 1 个数字' : '还差 ' + missing + ' 个数字') + '。' +
          (isRecord ? '新纪录！' : '最佳：' + best + '。');
      },
      overlayUndo: '撤销上一步',
      overlayNew: '新游戏',
      overlayClose: '查看方格',
      back: '← 返回游戏',
      language: '语言',
      languageAuto: '自动（跟随浏览器）',
      rulesH1: '玩法',
      rulesIntro: '在 10×10 的方格中写下 <strong>1 到 100</strong>，每格一个数字。',
      rule1: '<strong>1</strong> 可以写在任意位置：点击任意格子即可。',
      rule2: '之后的每个数字都从上一个数字所在的格子出发。',
      rule3: '<strong>横向或纵向</strong>：跳过 2 格，落在第 3 格。',
      rule4: '<strong>斜向</strong>：跳过 1 格，落在第 2 格。',
      rule5: '不能使用已被占用的格子，也不能跳出方格。',
      rule6: '写到 100 之前无路可走就输了；写到 100 就赢了。',
      diagram: '从橙色格子可以跳到 8 个绿色格子：',
      commandsH: '按钮',
      command1: '<strong>走法</strong>：显示或隐藏可以跳到的格子。',
      command2: '<strong>撤销</strong>：擦掉最后一个数字，可以无限次撤销。',
      command3: '<strong>新游戏</strong>：从头开始（游戏进行中会先确认）。',
      command4: '游戏会自动保存：关闭后再打开，可以从上次的位置继续。',
      keyboardH: '键盘',
      key1: '用 ' + ARROWS + ' 在方格中移动，按 <kbd>Enter</kbd> 或 <kbd>空格</kbd> 写下数字。',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> 或 <kbd>U</kbd> 撤销，<kbd>M</kbd> 显示/隐藏走法。',
      winH: '总能赢吗？',
      win: '能：无论 1 写在哪里，至少有一条路径能写到 100。至于能不能找到，那就是另一回事了。',
      privacyH: '隐私',
      privacy: '没有 Cookie，没有跟踪，没有第三方脚本或服务。你的游戏进度、最佳成绩和偏好设置只保存在这个浏览器中。语言由页面地址或浏览器设置决定，在你的设备上选择。本网站托管在 Neocities 上，它和所有网站服务器一样，会收到浏览器的常规请求。'
    },

    ja: {
      name: '日本語',
      htmlLang: 'ja',
      licenseNotice: licenseNotice('{src:ソースコード}は {agpl} のフリーソフトウェアです。画像は {cc} で提供しています。'),
      share: '結果をシェア',
      shareCopied: 'コピーしました。好きな場所に貼り付けてください。',
      shareManual: 'このテキストをコピー：',
      shareLost: function (n) { return '100 マス中 ' + n + ' まで書けました。'; },
      shareWon: '1 から 100 まで全部書けました！🎉',
      shareTagline: 'あなたは 100 まで行ける？',
      gamepadConnected: 'コントローラーを接続しました：十字キーで移動、A/✕ で書く、B/○ で戻す。',
      controllerH: 'コントローラー',
      controller1: '十字キーまたは左スティックで移動、<kbd>A</kbd>/<kbd>✕</kbd> で数字を書き、<kbd>B</kbd>/<kbd>○</kbd> で戻します。',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> で候補の表示を切り替え、<kbd>Start</kbd>/<kbd>Options</kbd> で最初からやり直します。Xbox、PlayStation、互換コントローラーに対応、iPad でも使えます。',
      noscript: '遊ぶには JavaScript が必要です。',
      ogLocale: 'ja_JP',
      metaDescription: '100 マスゲーム：10×10 のマス目に 1 から 100 までの数字を書くパズル。縦横は 2 マス、斜めは 1 マス飛ばして進みます。無料・広告なし。',
      title: '100 マスゲーム',
      dedication: 'Spalla の 5C クラスに捧ぐ',
      colon: '：',
      comma: '、',
      statCurrent: '数字',
      statRemaining: '残り',
      statBest: '最高',
      rulesLink: 'ゲームのルール',
      rulesTitle: 'ルール',
      boardLabel: '10×10 のマス目',
      controlsLabel: 'ゲーム操作',
      undo: '戻す',
      hints: '候補',
      newShort: '最初から',
      newRest: '',
      confirm: '本当に？',
      statusReady: '好きなマスをタップして 1 を書きましょう。',
      statusWon: 'すべて埋まりました：100／100！',
      statusLost: function (next) { return next + ' を書ける場所がありません。戻すか、新しいゲームを始めてください。'; },
      statusPlaying: function (next, k) { return next + ' を書きましょう — 候補は ' + k + ' か所。'; },
      placed: function (n, pos) { return pos + 'に ' + n + '。'; },
      undone: function (n) { return n + ' を取り消しました。'; },
      invalid: function (n, pos) { return n + ' は' + pos + 'に書けません。'; },
      newGame: '新しいゲーム。',
      resumed: '前回のゲームを再開しました。',
      position: function (r, c) { return r + ' 行 ' + c + ' 列'; },
      cellEmpty: '空き',
      cellLegal: '書ける',
      cellLast: '最後の数字',
      wonTitle: 'クリア！',
      wonText: '1 から 100 まで、すべての数字を書きました。',
      lostTitle: 'もう動けません',
      lostText: function (n, missing, best, isRecord) {
        return n + ' まで到達：' +
          (missing === 1 ? 'あと 1 つ' : 'あと ' + missing + ' 個') + '。' +
          (isRecord ? '新記録！' : '最高記録：' + best + '。');
      },
      overlayUndo: '最後の一手を戻す',
      overlayNew: '新しいゲーム',
      overlayClose: '盤面を見る',
      back: '← ゲームに戻る',
      language: '言語',
      languageAuto: '自動（ブラウザー）',
      rulesH1: '遊び方',
      rulesIntro: '10×10 のマス目に <strong>1 から 100</strong> までの数字を、1 マスに 1 つずつ書いていきます。',
      rule1: '<strong>1</strong> は好きなマスに書けます。どこでもタップしてください。',
      rule2: '次の数字は、最後に書いた数字のマスから進みます。',
      rule3: '<strong>縦または横</strong>：2 マス飛ばして 3 マス目に進みます。',
      rule4: '<strong>斜め</strong>：1 マス飛ばして 2 マス目に進みます。',
      rule5: '使用済みのマスには書けません。マス目の外にも出られません。',
      rule6: '100 の前に動けなくなったら負け、100 まで書けたら勝ちです。',
      diagram: 'オレンジのマスからは、8 つの緑のマスに進めます：',
      commandsH: '操作',
      command1: '<strong>候補</strong>：進めるマスの表示を切り替えます。',
      command2: '<strong>戻す</strong>：最後の数字を消します。何回でも戻せます。',
      command3: '<strong>最初から</strong>：はじめからやり直します（ゲーム中は確認があります）。',
      command4: 'ゲームは自動で保存されます。閉じてまた開けば、続きから遊べます。',
      keyboardH: 'キーボード',
      key1: ARROWS + ' でマス目を移動、<kbd>Enter</kbd> または <kbd>スペース</kbd> で数字を書きます。',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> または <kbd>U</kbd> で戻す、<kbd>M</kbd> で候補の表示を切り替えます。',
      winH: 'いつでも勝てるの？',
      win: 'はい。1 をどこに書いても、100 まで到達できる道が少なくとも 1 つあります。見つけられるかどうかは別の話です。',
      privacyH: 'プライバシー',
      privacy: 'Cookie なし、トラッキングなし、第三者のスクリプトやサービスなし。ゲームの進行、最高記録、設定はこのブラウザーの中だけに保存されます。言語はページのアドレスまたはブラウザーの設定で決まり、端末上で選ばれます。サイトは Neocities でホストされており、ほかのウェブサーバーと同じく、ブラウザーからの通常のリクエストを受け取ります。'
    },

    nl: {
      name: 'Nederlands',
      htmlLang: 'nl',
      licenseNotice: licenseNotice('De {src:broncode} is vrije software onder de {agpl}; de afbeeldingen vallen onder {cc}.'),
      share: 'Resultaat delen',
      shareCopied: 'Resultaat gekopieerd: plak het waar je wilt.',
      shareManual: 'Kopieer deze tekst:',
      shareLost: function (n) { return 'Ik heb ' + n + ' van de 100 getallen geschreven.'; },
      shareWon: 'Ik heb alle getallen van 1 tot en met 100 geschreven! 🎉',
      shareTagline: 'En jij, haal jij de 100?',
      gamepadConnected: 'Controller verbonden: D-pad om te bewegen, A/✕ om te schrijven, B/○ om terug te nemen.',
      controllerH: 'Controller',
      controller1: 'D-pad of linkerstick om te bewegen, <kbd>A</kbd>/<kbd>✕</kbd> om het getal te schrijven, <kbd>B</kbd>/<kbd>○</kbd> om een zet terug te nemen.',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> toont of verbergt de zetten, <kbd>Start</kbd>/<kbd>Options</kbd> begint een nieuw spel. Werkt met Xbox-, PlayStation- en compatibele controllers, ook op de iPad.',
      noscript: 'Om te spelen is JavaScript nodig.',
      ogLocale: 'nl_NL',
      metaDescription: 'Het spel van 100: schrijf de getallen 1 tot en met 100 in een rooster van 10×10 en sla 2 vakjes recht of 1 diagonaal over. Gratis puzzel zonder reclame.',
      title: 'Het spel van 100',
      dedication: 'Opgedragen aan klas 5C van het Spalla',
      colon: ': ',
      comma: ', ',
      statCurrent: 'Getal',
      statRemaining: 'Over',
      statBest: 'Record',
      rulesLink: 'Spelregels',
      rulesTitle: 'Regels',
      boardLabel: 'Rooster van 10 bij 10',
      controlsLabel: 'Spelbediening',
      undo: 'Terug',
      hints: 'Zetten',
      newShort: 'Nieuw',
      newRest: ' spel',
      confirm: 'Zeker?',
      statusReady: 'Tik op een vakje om de 1 te schrijven.',
      statusWon: 'Rooster vol: 100 van de 100!',
      statusLost: function (next) { return 'Geen zetten meer voor de ' + next + '. Neem een zet terug of begin een nieuw spel.'; },
      statusPlaying: function (next, k) { return 'Schrijf de ' + next + ' — ' + k + ' ' + plural(k, 'mogelijke zet', 'mogelijke zetten') + '.'; },
      placed: function (n, pos) { return n + ' op ' + pos + '.'; },
      undone: function (n) { return n + ' teruggenomen.'; },
      invalid: function (n, pos) { return 'De ' + n + ' kan niet op ' + pos + '.'; },
      newGame: 'Nieuw spel.',
      resumed: 'Spel hervat.',
      position: function (r, c) { return 'rij ' + r + ', kolom ' + c; },
      cellEmpty: 'leeg',
      cellLegal: 'mogelijke zet',
      cellLast: 'laatste getal',
      wonTitle: 'Gewonnen!',
      wonText: 'Je hebt alle getallen van 1 tot en met 100 geschreven.',
      lostTitle: 'Geen zetten meer',
      lostText: function (n, missing, best, isRecord) {
        return 'Je bent tot ' + n + ' gekomen: ' +
          (missing === 1 ? 'nog maar 1 getal te gaan' : 'nog ' + missing + ' getallen te gaan') + '. ' +
          (isRecord ? 'Nieuw record!' : 'Record: ' + best + '.');
      },
      overlayUndo: 'Laatste zet terugnemen',
      overlayNew: 'Nieuw spel',
      overlayClose: 'Rooster bekijken',
      back: '← Terug naar het spel',
      language: 'Taal',
      languageAuto: 'Automatisch (browser)',
      rulesH1: 'Zo speel je',
      rulesIntro: 'Schrijf de getallen van <strong>1 tot en met 100</strong> in het rooster van 10×10, één per vakje.',
      rule1: 'De <strong>1</strong> zet je waar je wilt: tik op een willekeurig vakje.',
      rule2: 'Elk volgend getal vertrekt vanaf het vakje van het laatst geschreven getal.',
      rule3: '<strong>Horizontaal of verticaal</strong> sla je 2 vakjes over en kom je op het 3e.',
      rule4: '<strong>Diagonaal</strong> sla je 1 vakje over en kom je op het 2e.',
      rule5: 'Je mag geen bezet vakje gebruiken en niet buiten het rooster gaan.',
      rule6: 'Zit je vast vóór de 100, dan heb je verloren; haal je de 100, dan heb je gewonnen.',
      diagram: 'Vanaf het oranje vakje kun je naar de 8 groene vakjes springen:',
      commandsH: 'Knoppen',
      command1: '<strong>Zetten</strong>: toont of verbergt de vakjes waar je naartoe kunt springen.',
      command2: '<strong>Terug</strong>: haalt het laatste getal weg, zo vaak als je wilt.',
      command3: '<strong>Nieuw spel</strong>: begint opnieuw (vraagt tijdens een spel om bevestiging).',
      command4: 'Het spel wordt vanzelf bewaard: sluit het, open het opnieuw en ga verder waar je was.',
      keyboardH: 'Toetsenbord',
      key1: ARROWS + ' om over het rooster te bewegen, <kbd>Enter</kbd> of <kbd>Spatie</kbd> om het getal te schrijven.',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> of <kbd>U</kbd> om een zet terug te nemen, <kbd>M</kbd> om de zetten te tonen/verbergen.',
      winH: 'Kun je altijd winnen?',
      win: 'Ja: waar de 1 ook staat, er is altijd minstens één route tot 100. Die vinden is een ander verhaal.',
      privacyH: 'Privacy',
      privacy: 'Geen cookies, geen tracking, geen scripts of diensten van derden. Je spel, je record en je voorkeuren blijven alleen in deze browser. De taal hangt af van het adres van de pagina of je browserinstellingen en wordt op je apparaat gekozen. De site wordt gehost door Neocities, dat zoals elke webserver de gewone verzoeken van je browser ontvangt.'
    },

    pl: {
      name: 'Polski',
      htmlLang: 'pl',
      licenseNotice: licenseNotice('{src:Kod źródłowy} jest wolny, na licencji {agpl}; obrazy są na licencji {cc}.'),
      share: 'Udostępnij wynik',
      shareCopied: 'Wynik skopiowany: wklej go, gdzie chcesz.',
      shareManual: 'Skopiuj ten tekst:',
      shareLost: function (n) { return 'Mój wynik: ' + n + ' ze 100.'; },
      shareWon: 'Mój wynik: wszystkie liczby od 1 do 100! 🎉',
      shareTagline: 'A ty, dojdziesz do 100?',
      gamepadConnected: 'Kontroler podłączony: krzyżak — ruch, A/✕ — wpisz, B/○ — cofnij.',
      controllerH: 'Kontroler',
      controller1: 'Krzyżak lub lewa gałka — poruszanie się, <kbd>A</kbd>/<kbd>✕</kbd> — wpisanie liczby, <kbd>B</kbd>/<kbd>○</kbd> — cofnięcie ruchu.',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> pokazuje lub ukrywa ruchy, <kbd>Start</kbd>/<kbd>Options</kbd> zaczyna nową grę. Działa z kontrolerami Xbox, PlayStation i kompatybilnymi, także na iPadzie.',
      noscript: 'Do gry potrzebny jest JavaScript.',
      ogLocale: 'pl_PL',
      metaDescription: 'Gra w 100: wpisz liczby od 1 do 100 na planszy 10×10, przeskakując 2 pola w linii prostej lub 1 po skosie. Darmowa łamigłówka bez reklam.',
      title: 'Gra w 100',
      dedication: 'Dedykowane klasie 5C ze Spalla',
      colon: ': ',
      comma: ', ',
      statCurrent: 'Liczba',
      statRemaining: 'Zostało',
      statBest: 'Rekord',
      rulesLink: 'Zasady gry',
      rulesTitle: 'Zasady',
      boardLabel: 'Plansza 10 na 10',
      controlsLabel: 'Sterowanie grą',
      undo: 'Cofnij',
      hints: 'Ruchy',
      newShort: 'Nowa',
      newRest: ' gra',
      confirm: 'Na pewno?',
      statusReady: 'Dotknij dowolnego pola, aby wpisać 1.',
      statusWon: 'Plansza pełna: 100 na 100!',
      statusLost: function (next) { return 'Brak ruchów dla liczby ' + next + '. Cofnij ruch albo zacznij nową grę.'; },
      statusPlaying: function (next, k) { return 'Wpisz ' + next + ' — ' + k + ' ' + pluralSlavic(k, 'możliwy ruch', 'możliwe ruchy', 'możliwych ruchów', true) + '.'; },
      placed: function (n, pos) { return 'Wpisano ' + n + ' (' + pos + ').'; },
      undone: function (n) { return 'Cofnięto ' + n + '.'; },
      invalid: function (n, pos) { return 'Nie można wpisać ' + n + ' w tym miejscu (' + pos + ').'; },
      newGame: 'Nowa gra.',
      resumed: 'Wznowiono grę.',
      position: function (r, c) { return 'wiersz ' + r + ', kolumna ' + c; },
      cellEmpty: 'puste',
      cellLegal: 'możliwy ruch',
      cellLast: 'ostatnia liczba',
      wonTitle: 'Wygrana!',
      wonText: 'Wszystkie liczby od 1 do 100 są na planszy.',
      lostTitle: 'Brak ruchów',
      lostText: function (n, missing, best, isRecord) {
        // "brakuje" regge il genitivo: 1 liczby, 2/5/… liczb.
        return 'Dotarto do ' + n + ': ' +
          (missing === 1 ? 'brakuje tylko 1 liczby' : 'brakuje jeszcze ' + missing + ' liczb') + '. ' +
          (isRecord ? 'Nowy rekord!' : 'Rekord: ' + best + '.');
      },
      overlayUndo: 'Cofnij ostatni ruch',
      overlayNew: 'Nowa gra',
      overlayClose: 'Zobacz planszę',
      back: '← Wróć do gry',
      language: 'Język',
      languageAuto: 'Automatycznie (z przeglądarki)',
      rulesH1: 'Jak grać',
      rulesIntro: 'Wpisz liczby od <strong>1 do 100</strong> na planszy 10×10, po jednej w każde pole.',
      rule1: '<strong>1</strong> wpisujesz, gdzie chcesz: dotknij dowolnego pola.',
      rule2: 'Każda następna liczba startuje z pola ostatnio wpisanej liczby.',
      rule3: '<strong>W poziomie lub w pionie</strong> przeskakujesz 2 pola i lądujesz na trzecim.',
      rule4: '<strong>Po skosie</strong> przeskakujesz 1 pole i lądujesz na drugim.',
      rule5: 'Nie można użyć zajętego pola ani wyjść poza planszę.',
      rule6: 'Jeśli zabraknie ruchów przed 100 — przegrywasz; jeśli dojdziesz do 100 — wygrywasz.',
      diagram: 'Z pomarańczowego pola można skoczyć na jedno z 8 zielonych pól:',
      commandsH: 'Przyciski',
      command1: '<strong>Ruchy</strong>: pokazuje lub ukrywa pola, na które możesz skoczyć.',
      command2: '<strong>Cofnij</strong>: usuwa ostatnią liczbę; możesz cofać dowolnie wiele razy.',
      command3: '<strong>Nowa gra</strong>: zaczyna od nowa (w trakcie gry prosi o potwierdzenie).',
      command4: 'Gra zapisuje się sama: zamknij ją, otwórz ponownie i graj dalej od tego samego miejsca.',
      keyboardH: 'Klawiatura',
      key1: ARROWS + ' — poruszanie się po planszy, <kbd>Enter</kbd> lub <kbd>Spacja</kbd> — wpisanie liczby.',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> lub <kbd>U</kbd> — cofnij, <kbd>M</kbd> — pokaż/ukryj ruchy.',
      winH: 'Czy zawsze da się wygrać?',
      win: 'Tak: niezależnie od tego, gdzie stoi 1, istnieje co najmniej jedna droga do 100. Znalezienie jej to już inna sprawa.',
      privacyH: 'Prywatność',
      privacy: 'Bez plików cookie, bez śledzenia, bez skryptów i usług firm trzecich. Twoja gra, rekord i ustawienia zostają tylko w tej przeglądarce. Język zależy od adresu strony lub ustawień przeglądarki i jest wybierany na Twoim urządzeniu. Strona jest hostowana na Neocities, który jak każdy serwer WWW otrzymuje zwykłe żądania przeglądarki.'
    },

    ru: {
      name: 'Русский',
      htmlLang: 'ru',
      licenseNotice: licenseNotice('{src:Исходный код} свободный, по лицензии {agpl}; изображения — по лицензии {cc}.'),
      share: 'Поделиться результатом',
      shareCopied: 'Результат скопирован: вставьте его куда угодно.',
      shareManual: 'Скопируйте текст:',
      shareLost: function (n) { return 'Мой результат: ' + n + ' из 100.'; },
      shareWon: 'Мой результат: все числа от 1 до 100! 🎉',
      shareTagline: 'А ты сможешь дойти до 100?',
      gamepadConnected: 'Геймпад подключён: крестовина — перемещение, A/✕ — написать, B/○ — отменить.',
      controllerH: 'Геймпад',
      controller1: 'Крестовина или левый стик — перемещение, <kbd>A</kbd>/<kbd>✕</kbd> — написать число, <kbd>B</kbd>/<kbd>○</kbd> — отменить ход.',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> показывает или скрывает ходы, <kbd>Start</kbd>/<kbd>Options</kbd> начинает новую игру. Работает с геймпадами Xbox, PlayStation и совместимыми, в том числе на iPad.',
      noscript: 'Для игры нужен JavaScript.',
      ogLocale: 'ru_RU',
      metaDescription: 'Игра до 100: напишите числа от 1 до 100 на поле 10×10, перепрыгивая 2 клетки по прямой или 1 по диагонали. Бесплатная головоломка без рекламы.',
      title: 'Игра до 100',
      dedication: 'Посвящается классу 5C из «Spalla»',
      colon: ': ',
      comma: ', ',
      statCurrent: 'Число',
      statRemaining: 'Осталось',
      statBest: 'Рекорд',
      rulesLink: 'Правила игры',
      rulesTitle: 'Правила',
      boardLabel: 'Поле 10 на 10',
      controlsLabel: 'Управление игрой',
      undo: 'Отменить',
      hints: 'Ходы',
      newShort: 'Новая',
      newRest: ' игра',
      confirm: 'Точно?',
      statusReady: 'Нажмите на любую клетку, чтобы написать 1.',
      statusWon: 'Поле заполнено: 100 из 100!',
      statusLost: function (next) { return 'Для числа ' + next + ' нет ходов. Отмените ход или начните новую игру.'; },
      statusPlaying: function (next, k) { return 'Напишите ' + next + ' — ' + k + ' ' + pluralSlavic(k, 'возможный ход', 'возможных хода', 'возможных ходов') + '.'; },
      placed: function (n, pos) { return n + ' — ' + pos + '.'; },
      undone: function (n) { return 'Число ' + n + ' отменено.'; },
      invalid: function (n, pos) { return 'Число ' + n + ' нельзя поставить сюда (' + pos + ').'; },
      newGame: 'Новая игра.',
      resumed: 'Игра продолжена.',
      position: function (r, c) { return 'ряд ' + r + ', столбец ' + c; },
      cellEmpty: 'пусто',
      cellLegal: 'возможный ход',
      cellLast: 'последнее число',
      wonTitle: 'Победа!',
      wonText: 'Вы написали все числа от 1 до 100.',
      lostTitle: 'Ходов больше нет',
      lostText: function (n, missing, best, isRecord) {
        return 'Вы дошли до ' + n + ': ' +
          (missing === 1 ? 'осталось всего 1 число' : 'осталось ' + missing + ' ' + pluralSlavic(missing, 'число', 'числа', 'чисел')) + '. ' +
          (isRecord ? 'Новый рекорд!' : 'Рекорд: ' + best + '.');
      },
      overlayUndo: 'Отменить последний ход',
      overlayNew: 'Новая игра',
      overlayClose: 'Посмотреть поле',
      back: '← Назад к игре',
      language: 'Язык',
      languageAuto: 'Автоматически (из браузера)',
      rulesH1: 'Как играть',
      rulesIntro: 'Напишите числа от <strong>1 до 100</strong> на поле 10×10, по одному в каждую клетку.',
      rule1: '<strong>1</strong> можно поставить куда угодно: нажмите на любую клетку.',
      rule2: 'Каждое следующее число ставится, начиная с клетки последнего написанного числа.',
      rule3: '<strong>По горизонтали или вертикали</strong> вы перепрыгиваете 2 клетки и попадаете на третью.',
      rule4: '<strong>По диагонали</strong> вы перепрыгиваете 1 клетку и попадаете на вторую.',
      rule5: 'Нельзя занимать уже заполненную клетку или выходить за пределы поля.',
      rule6: 'Если ходы закончились раньше 100 — вы проиграли; дошли до 100 — победили.',
      diagram: 'Из оранжевой клетки можно прыгнуть на любую из 8 зелёных:',
      commandsH: 'Кнопки',
      command1: '<strong>Ходы</strong>: показывает или скрывает клетки, на которые можно прыгнуть.',
      command2: '<strong>Отменить</strong>: убирает последнее число; отменять можно сколько угодно раз.',
      command3: '<strong>Новая игра</strong>: начинает заново (во время игры просит подтверждения).',
      command4: 'Игра сохраняется сама: закройте её, откройте снова и продолжайте с того же места.',
      keyboardH: 'Клавиатура',
      key1: ARROWS + ' — перемещение по полю, <kbd>Enter</kbd> или <kbd>Пробел</kbd> — написать число.',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> или <kbd>U</kbd> — отменить, <kbd>M</kbd> — показать/скрыть ходы.',
      winH: 'Можно ли выиграть всегда?',
      win: 'Да: с какой бы клетки ни начиналась 1, существует хотя бы один путь до 100. Найти его — другое дело.',
      privacyH: 'Конфиденциальность',
      privacy: 'Никаких cookie, отслеживания, сторонних скриптов и сервисов. Ваша игра, рекорд и настройки хранятся только в этом браузере. Язык определяется адресом страницы или настройками браузера и выбирается на вашем устройстве. Сайт размещён на Neocities, который, как любой веб-сервер, получает обычные запросы браузера.'
    },

    tr: {
      name: 'Türkçe',
      htmlLang: 'tr',
      licenseNotice: licenseNotice('{src:Kaynak kodu}, {agpl} lisanslı özgür yazılımdır; görseller {cc} lisanslıdır.'),
      share: 'Sonucu paylaş',
      shareCopied: 'Sonuç kopyalandı: istediğin yere yapıştır.',
      shareManual: 'Bu metni kopyala:',
      shareLost: function (n) { return 'Skorum: 100 üzerinden ' + n + '.'; },
      shareWon: '1’den 100’e kadar bütün sayıları yazdım! 🎉',
      shareTagline: 'Peki sen 100’e ulaşabilir misin?',
      gamepadConnected: 'Oyun kolu bağlandı: hareket için yön tuşları, yazmak için A/✕, geri almak için B/○.',
      controllerH: 'Oyun kolu',
      controller1: 'Hareket için yön tuşları veya sol çubuk, sayıyı yazmak için <kbd>A</kbd>/<kbd>✕</kbd>, geri almak için <kbd>B</kbd>/<kbd>○</kbd>.',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> hamleleri gösterir ya da gizler, <kbd>Start</kbd>/<kbd>Options</kbd> yeni oyun başlatır. Xbox, PlayStation ve uyumlu oyun kollarıyla, iPad’de de çalışır.',
      noscript: 'Oynamak için JavaScript gerekli.',
      ogLocale: 'tr_TR',
      metaDescription: '100 Oyunu: 1’den 100’e kadar sayıları 10×10 ızgaraya yaz; düz giderken 2, çaprazda 1 kare atla. Reklamsız, ücretsiz bir bulmaca.',
      title: '100 Oyunu',
      dedication: 'Spalla 5C sınıfına ithaf edilmiştir',
      colon: ': ',
      comma: ', ',
      statCurrent: 'Sayı',
      statRemaining: 'Kalan',
      statBest: 'Rekor',
      rulesLink: 'Oyun kuralları',
      rulesTitle: 'Kurallar',
      boardLabel: '10’a 10 ızgara',
      controlsLabel: 'Oyun kontrolleri',
      undo: 'Geri al',
      hints: 'Hamle',
      newShort: 'Yeni',
      newRest: ' oyun',
      confirm: 'Emin misin?',
      statusReady: '1’i yazmak için herhangi bir kareye dokun.',
      statusWon: 'Izgara doldu: 100’de 100!',
      statusLost: function (next) { return next + ' için hamle kalmadı. Geri al ya da yeni oyuna başla.'; },
      statusPlaying: function (next, k) { return 'Sıradaki sayı: ' + next + ' — ' + k + ' olası hamle.'; },
      placed: function (n, pos) { return n + ': ' + pos + '.'; },
      undone: function (n) { return n + ' geri alındı.'; },
      invalid: function (n, pos) { return n + ' buraya yazılamaz (' + pos + ').'; },
      newGame: 'Yeni oyun.',
      resumed: 'Oyun kaldığı yerden devam ediyor.',
      position: function (r, c) { return 'satır ' + r + ', sütun ' + c; },
      cellEmpty: 'boş',
      cellLegal: 'olası hamle',
      cellLast: 'son sayı',
      wonTitle: 'Kazandın!',
      wonText: '1’den 100’e kadar bütün sayıları yazdın.',
      lostTitle: 'Hamle kalmadı',
      lostText: function (n, missing, best, isRecord) {
        return 'Ulaştığın sayı: ' + n + '. ' +
          (missing === 1 ? 'Sadece 1 sayı kaldı' : missing + ' sayı kaldı') + '. ' +
          (isRecord ? 'Yeni rekor!' : 'Rekor: ' + best + '.');
      },
      overlayUndo: 'Son hamleyi geri al',
      overlayNew: 'Yeni oyun',
      overlayClose: 'Izgaraya bak',
      back: '← Oyuna dön',
      language: 'Dil',
      languageAuto: 'Otomatik (tarayıcı)',
      rulesH1: 'Nasıl oynanır',
      rulesIntro: '10×10 ızgaraya <strong>1’den 100’e</strong> kadar sayıları, her kareye bir tane olacak şekilde yaz.',
      rule1: '<strong>1</strong> istediğin yere gelir: herhangi bir kareye dokun.',
      rule2: 'Her yeni sayı, en son yazdığın sayının karesinden başlar.',
      rule3: '<strong>Yatay veya dikey</strong> olarak 2 kare atlar, 3. kareye konarsın.',
      rule4: '<strong>Çapraz</strong> olarak 1 kare atlar, 2. kareye konarsın.',
      rule5: 'Dolu bir kareyi yeniden kullanamaz, ızgaranın dışına çıkamazsın.',
      rule6: '100’den önce hamlen kalmazsa kaybedersin; 100’e ulaşırsan kazanırsın.',
      diagram: 'Turuncu kareden 8 yeşil kareye atlayabilirsin:',
      commandsH: 'Düğmeler',
      command1: '<strong>Hamle</strong>: atlayabileceğin kareleri gösterir ya da gizler.',
      command2: '<strong>Geri al</strong>: son sayıyı siler; istediğin kadar geri alabilirsin.',
      command3: '<strong>Yeni oyun</strong>: baştan başlar (oyun sürerken onay ister).',
      command4: 'Oyun kendiliğinden kaydedilir: kapatıp yeniden açtığında kaldığın yerden devam edersin.',
      keyboardH: 'Klavye',
      key1: ARROWS + ' ile ızgarada gezin, <kbd>Enter</kbd> veya <kbd>Boşluk</kbd> ile sayıyı yaz.',
      key2: 'Geri almak için <kbd>Ctrl</kbd>+<kbd>Z</kbd> veya <kbd>U</kbd>, hamleleri göstermek/gizlemek için <kbd>M</kbd>.',
      winH: 'Her zaman kazanılabilir mi?',
      win: 'Evet: 1 nereden başlarsa başlasın, 100’e ulaşan en az bir yol vardır. Onu bulmak ise başka bir hikâye.',
      privacyH: 'Gizlilik',
      privacy: 'Çerez yok, takip yok, üçüncü taraf betik ya da hizmet yok. Oyunun, rekorun ve tercihlerin yalnızca bu tarayıcıda kalır. Dil, sayfanın adresine ya da tarayıcı ayarlarına göre cihazında seçilir. Site Neocities’te barındırılır; her web sunucusu gibi o da tarayıcının olağan isteklerini alır.'
    },

    id: {
      name: 'Bahasa Indonesia',
      htmlLang: 'id',
      licenseNotice: licenseNotice('{src:Kode sumber} bebas dengan lisensi {agpl}; gambar berlisensi {cc}.'),
      share: 'Bagikan hasil',
      shareCopied: 'Hasil disalin: tempel di mana saja.',
      shareManual: 'Salin teks ini:',
      shareLost: function (n) { return 'Aku menulis ' + n + ' dari 100 angka.'; },
      shareWon: 'Aku berhasil menulis semua angka dari 1 sampai 100! 🎉',
      shareTagline: 'Kalau kamu, bisa sampai 100?',
      gamepadConnected: 'Kontroler terhubung: D-pad untuk bergerak, A/✕ untuk menulis, B/○ untuk mengurungkan.',
      controllerH: 'Kontroler',
      controller1: 'D-pad atau stik kiri untuk bergerak, <kbd>A</kbd>/<kbd>✕</kbd> untuk menulis angka, <kbd>B</kbd>/<kbd>○</kbd> untuk mengurungkan.',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> menampilkan atau menyembunyikan langkah, <kbd>Start</kbd>/<kbd>Options</kbd> memulai permainan baru. Bisa dengan kontroler Xbox, PlayStation, dan yang kompatibel, juga di iPad.',
      noscript: 'Perlu JavaScript untuk bermain.',
      ogLocale: 'id_ID',
      metaDescription: 'Permainan 100: tulis angka 1 sampai 100 di kisi 10×10 dengan melompati 2 kotak lurus atau 1 kotak diagonal. Teka-teki gratis tanpa iklan.',
      title: 'Permainan 100',
      dedication: 'Didedikasikan untuk kelas 5C Spalla',
      colon: ': ',
      comma: ', ',
      statCurrent: 'Angka',
      statRemaining: 'Sisa',
      statBest: 'Rekor',
      rulesLink: 'Aturan permainan',
      rulesTitle: 'Aturan',
      boardLabel: 'Kisi 10 kali 10',
      controlsLabel: 'Kontrol permainan',
      undo: 'Urungkan',
      hints: 'Langkah',
      newShort: 'Ulang',
      newRest: '',
      confirm: 'Yakin?',
      statusReady: 'Ketuk kotak mana saja untuk menulis angka 1.',
      statusWon: 'Kisi penuh: 100 dari 100!',
      statusLost: function (next) { return 'Tidak ada langkah untuk angka ' + next + '. Urungkan atau mulai permainan baru.'; },
      statusPlaying: function (next, k) { return 'Tulis angka ' + next + ' — ' + k + ' langkah mungkin.'; },
      placed: function (n, pos) { return n + ' di ' + pos + '.'; },
      undone: function (n) { return 'Angka ' + n + ' diurungkan.'; },
      invalid: function (n, pos) { return 'Angka ' + n + ' tidak bisa ditulis di ' + pos + '.'; },
      newGame: 'Permainan baru.',
      resumed: 'Permainan dilanjutkan.',
      position: function (r, c) { return 'baris ' + r + ', kolom ' + c; },
      cellEmpty: 'kosong',
      cellLegal: 'langkah mungkin',
      cellLast: 'angka terakhir',
      wonTitle: 'Kamu menang!',
      wonText: 'Kamu sudah menulis semua angka dari 1 sampai 100.',
      lostTitle: 'Tidak ada langkah lagi',
      lostText: function (n, missing, best, isRecord) {
        return 'Kamu sampai di angka ' + n + ': ' +
          (missing === 1 ? 'tinggal 1 angka lagi' : 'masih kurang ' + missing + ' angka') + '. ' +
          (isRecord ? 'Rekor baru!' : 'Rekor: ' + best + '.');
      },
      overlayUndo: 'Urungkan langkah terakhir',
      overlayNew: 'Permainan baru',
      overlayClose: 'Lihat kisi',
      back: '← Kembali ke permainan',
      language: 'Bahasa',
      languageAuto: 'Otomatis (dari browser)',
      rulesH1: 'Cara bermain',
      rulesIntro: 'Tulis angka <strong>1 sampai 100</strong> di kisi 10×10, satu angka per kotak.',
      rule1: 'Angka <strong>1</strong> boleh di mana saja: ketuk kotak mana pun.',
      rule2: 'Setiap angka berikutnya berangkat dari kotak angka terakhir yang kamu tulis.',
      rule3: '<strong>Mendatar atau menurun</strong>: lompati 2 kotak dan mendarat di kotak ke-3.',
      rule4: '<strong>Diagonal</strong>: lompati 1 kotak dan mendarat di kotak ke-2.',
      rule5: 'Kotak yang sudah terisi tidak boleh dipakai lagi, dan kamu tidak boleh keluar dari kisi.',
      rule6: 'Kalau langkahmu habis sebelum 100, kamu kalah; kalau sampai 100, kamu menang.',
      diagram: 'Dari kotak oranye kamu bisa melompat ke 8 kotak hijau:',
      commandsH: 'Tombol',
      command1: '<strong>Langkah</strong>: menampilkan atau menyembunyikan kotak tujuan lompatan.',
      command2: '<strong>Urungkan</strong>: menghapus angka terakhir; bisa diulang sebanyak yang kamu mau.',
      command3: '<strong>Ulang</strong>: mulai lagi dari awal (saat permainan berjalan, ada konfirmasi).',
      command4: 'Permainan tersimpan otomatis: tutup, buka lagi, dan lanjutkan dari posisi terakhir.',
      keyboardH: 'Keyboard',
      key1: ARROWS + ' untuk bergerak di kisi, <kbd>Enter</kbd> atau <kbd>Spasi</kbd> untuk menulis angka.',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> atau <kbd>U</kbd> untuk mengurungkan, <kbd>M</kbd> untuk menampilkan/menyembunyikan langkah.',
      winH: 'Apakah selalu bisa menang?',
      win: 'Ya: dari kotak mana pun angka 1 dimulai, selalu ada setidaknya satu jalur sampai 100. Menemukannya, itu cerita lain.',
      privacyH: 'Privasi',
      privacy: 'Tanpa cookie, tanpa pelacakan, tanpa skrip atau layanan pihak ketiga. Permainan, rekor, dan preferensimu hanya tersimpan di browser ini. Bahasa ditentukan oleh alamat halaman atau pengaturan browser dan dipilih di perangkatmu. Situs ini di-hosting di Neocities, yang seperti server web lainnya menerima permintaan biasa dari browser.'
    },

    'zh-Hant': {
      name: '繁體中文',
      htmlLang: 'zh-Hant',
      licenseNotice: licenseNotice('{src:原始碼}為自由軟體，採用 {agpl} 授權；圖片採用 {cc} 授權。'),
      share: '分享成績',
      shareCopied: '已複製，貼到任何地方即可。',
      shareManual: '複製下面的文字：',
      shareLost: function (n) { return '我寫到了 ' + n + '，滿分 100。'; },
      shareWon: '我寫完了 1 到 100 的所有數字！🎉',
      shareTagline: '你能寫到 100 嗎？',
      gamepadConnected: '已連接手把：方向鍵移動，A/✕ 寫入，B/○ 復原。',
      controllerH: '手把',
      controller1: '用方向鍵或左搖桿移動，<kbd>A</kbd>/<kbd>✕</kbd> 寫下數字，<kbd>B</kbd>/<kbd>○</kbd> 復原。',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd> 顯示／隱藏走法，<kbd>Start</kbd>/<kbd>Options</kbd> 開始新遊戲。支援 Xbox、PlayStation 及相容手把，iPad 也能用。',
      noscript: '需要啟用 JavaScript 才能玩。',
      ogLocale: 'zh_TW',
      metaDescription: '數到 100：在 10×10 方格中依序寫下 1 到 100，橫直跳過 2 格，斜向跳過 1 格。免費益智遊戲，無廣告。',
      title: '數到 100',
      dedication: '獻給 Spalla 的 5C 班',
      colon: '：',
      comma: '，',
      statCurrent: '數字',
      statRemaining: '剩餘',
      statBest: '最佳',
      rulesLink: '遊戲規則',
      rulesTitle: '規則',
      boardLabel: '10×10 方格',
      controlsLabel: '遊戲控制',
      undo: '復原',
      hints: '走法',
      newShort: '新遊戲',
      newRest: '',
      confirm: '確定？',
      statusReady: '點選任一格子，寫下 1。',
      statusWon: '全部填滿：100/100！',
      statusLost: function (next) { return next + ' 無路可走。請復原或開始新遊戲。'; },
      statusPlaying: function (next, k) { return '請寫 ' + next + ' — 有 ' + k + ' 種走法。'; },
      placed: function (n, pos) { return n + ' 寫在' + pos + '。'; },
      undone: function (n) { return '已復原 ' + n + '。'; },
      invalid: function (n, pos) { return n + ' 不能寫在' + pos + '。'; },
      newGame: '新遊戲。',
      resumed: '已繼續上次的遊戲。',
      // 台灣與香港「行」「列」的用法和中國大陸相反，用「橫列／直行」避免混淆。
      position: function (r, c) { return '第 ' + r + ' 橫列、第 ' + c + ' 直行'; },
      cellEmpty: '空',
      cellLegal: '可走',
      cellLast: '最後一個數字',
      wonTitle: '你贏了！',
      wonText: '你寫下了從 1 到 100 的所有數字。',
      lostTitle: '無路可走',
      lostText: function (n, missing, best, isRecord) {
        return '你寫到了 ' + n + '：' +
          (missing === 1 ? '只差 1 個數字' : '還差 ' + missing + ' 個數字') + '。' +
          (isRecord ? '新紀錄！' : '最佳：' + best + '。');
      },
      overlayUndo: '復原上一步',
      overlayNew: '新遊戲',
      overlayClose: '查看方格',
      back: '← 返回遊戲',
      language: '語言',
      languageAuto: '自動（依瀏覽器）',
      rulesH1: '玩法',
      rulesIntro: '在 10×10 的方格中寫下 <strong>1 到 100</strong>，每格一個數字。',
      rule1: '<strong>1</strong> 可以寫在任何位置：點選任一格子即可。',
      rule2: '之後的每個數字都從上一個數字所在的格子出發。',
      rule3: '<strong>橫向或直向</strong>：跳過 2 格，落在第 3 格。',
      rule4: '<strong>斜向</strong>：跳過 1 格，落在第 2 格。',
      rule5: '不能使用已被佔用的格子，也不能跳出方格。',
      rule6: '寫到 100 之前無路可走就輸了；寫到 100 就贏了。',
      diagram: '從橘色格子可以跳到 8 個綠色格子：',
      commandsH: '按鈕',
      command1: '<strong>走法</strong>：顯示或隱藏可以跳到的格子。',
      command2: '<strong>復原</strong>：擦掉最後一個數字，可以無限次復原。',
      command3: '<strong>新遊戲</strong>：從頭開始（遊戲進行中會先確認）。',
      command4: '遊戲會自動儲存：關閉後再打開，可以從上次的位置繼續。',
      keyboardH: '鍵盤',
      key1: '用 ' + ARROWS + ' 在方格中移動，按 <kbd>Enter</kbd> 或 <kbd>空白鍵</kbd> 寫下數字。',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> 或 <kbd>U</kbd> 復原，<kbd>M</kbd> 顯示／隱藏走法。',
      winH: '總是能贏嗎？',
      win: '能：無論 1 寫在哪裡，至少有一條路徑能寫到 100。至於能不能找到，那就是另一回事了。',
      privacyH: '隱私',
      privacy: '沒有 Cookie，沒有追蹤，沒有第三方指令碼或服務。你的遊戲進度、最佳成績和偏好設定只儲存在這個瀏覽器中。語言由頁面網址或瀏覽器設定決定，在你的裝置上選擇。本網站託管於 Neocities，它和所有網站伺服器一樣，會收到瀏覽器的一般請求。'
    },

    ko: {
      name: '한국어',
      htmlLang: 'ko',
      licenseNotice: licenseNotice('{src:소스 코드}는 {agpl} 라이선스의 자유 소프트웨어이며, 이미지는 {cc} 라이선스입니다.'),
      share: '결과 공유',
      shareCopied: '결과를 복사했습니다. 원하는 곳에 붙여 넣으세요.',
      shareManual: '이 텍스트를 복사하세요:',
      shareLost: function (n) { return '100개 중 ' + n + '까지 썼어요.'; },
      shareWon: '1부터 100까지 모두 썼어요! 🎉',
      shareTagline: '너도 100까지 갈 수 있어?',
      gamepadConnected: '컨트롤러 연결됨: 방향 버튼으로 이동, A/✕로 쓰기, B/○로 되돌리기.',
      controllerH: '컨트롤러',
      controller1: '방향 버튼이나 왼쪽 스틱으로 이동하고, <kbd>A</kbd>/<kbd>✕</kbd>로 숫자를 쓰고, <kbd>B</kbd>/<kbd>○</kbd>로 되돌립니다.',
      controller2: '<kbd>Y</kbd>/<kbd>△</kbd>로 이동 칸 표시/숨기기, <kbd>Start</kbd>/<kbd>Options</kbd>로 새 게임을 시작합니다. Xbox, PlayStation 및 호환 컨트롤러를 지원하며 iPad에서도 됩니다.',
      noscript: '게임을 하려면 JavaScript가 필요합니다.',
      ogLocale: 'ko_KR',
      metaDescription: '100 게임: 10×10 격자에 1부터 100까지 숫자를 쓰는 퍼즐. 가로세로는 2칸, 대각선은 1칸을 건너뜁니다. 무료, 광고 없음.',
      title: '100 게임',
      dedication: 'Spalla 5C 반에게 바칩니다',
      colon: ': ',
      comma: ', ',
      statCurrent: '숫자',
      statRemaining: '남은 칸',
      statBest: '최고',
      rulesLink: '게임 규칙',
      rulesTitle: '규칙',
      boardLabel: '10×10 격자',
      controlsLabel: '게임 조작',
      undo: '되돌리기',
      hints: '이동',
      newShort: '새 게임',
      newRest: '',
      confirm: '정말요?',
      // 숫자 뒤의 조사(을/를)는 읽는 법에 따라 달라지므로 피한다.
      statusReady: '아무 칸이나 눌러 1부터 시작하세요.',
      statusWon: '격자 완성: 100/100!',
      statusLost: function (next) { return '숫자 ' + next + ': 더 이상 이동할 수 없습니다. 되돌리거나 새 게임을 시작하세요.'; },
      statusPlaying: function (next, k) { return '다음 숫자: ' + next + ' — 이동 가능한 칸 ' + k + '곳.'; },
      placed: function (n, pos) { return pos + '에 ' + n + '.'; },
      undone: function (n) { return '되돌림: ' + n + '.'; },
      invalid: function (n, pos) { return pos + '에는 쓸 수 없습니다 (숫자 ' + n + ').'; },
      newGame: '새 게임.',
      resumed: '이전 게임을 이어서 합니다.',
      position: function (r, c) { return r + '행 ' + c + '열'; },
      cellEmpty: '빈 칸',
      cellLegal: '이동 가능',
      cellLast: '마지막 숫자',
      wonTitle: '승리!',
      wonText: '1부터 100까지 모든 숫자를 썼습니다.',
      lostTitle: '더 이상 이동할 수 없습니다',
      lostText: function (n, missing, best, isRecord) {
        return n + '까지 도달: ' +
          (missing === 1 ? '딱 1개 남았습니다' : missing + '개 남았습니다') + '. ' +
          (isRecord ? '새 기록!' : '최고 기록: ' + best + '.');
      },
      overlayUndo: '마지막 수 되돌리기',
      overlayNew: '새 게임',
      overlayClose: '격자 보기',
      back: '← 게임으로 돌아가기',
      language: '언어',
      languageAuto: '자동 (브라우저)',
      rulesH1: '게임 방법',
      rulesIntro: '10×10 격자에 <strong>1부터 100까지</strong> 숫자를 한 칸에 하나씩 쓰세요.',
      rule1: '<strong>1</strong>은 원하는 곳에 씁니다. 아무 칸이나 누르세요.',
      rule2: '다음 숫자는 마지막으로 쓴 숫자의 칸에서 출발합니다.',
      rule3: '<strong>가로 또는 세로</strong>로는 2칸을 건너뛰어 3번째 칸에 놓습니다.',
      rule4: '<strong>대각선</strong>으로는 1칸을 건너뛰어 2번째 칸에 놓습니다.',
      rule5: '이미 쓴 칸은 다시 쓸 수 없고, 격자 밖으로 나갈 수도 없습니다.',
      rule6: '100 전에 이동할 곳이 없으면 패배, 100까지 쓰면 승리입니다.',
      diagram: '주황색 칸에서 초록색 8칸으로 이동할 수 있습니다:',
      commandsH: '버튼',
      command1: '<strong>이동</strong>: 이동할 수 있는 칸을 보이거나 숨깁니다.',
      command2: '<strong>되돌리기</strong>: 마지막 숫자를 지웁니다. 몇 번이든 되돌릴 수 있습니다.',
      command3: '<strong>새 게임</strong>: 처음부터 다시 시작합니다 (게임 중에는 확인을 묻습니다).',
      command4: '게임은 자동으로 저장됩니다. 닫았다가 다시 열면 이어서 할 수 있습니다.',
      keyboardH: '키보드',
      key1: ARROWS + '로 격자를 이동하고, <kbd>Enter</kbd> 또는 <kbd>Space</kbd>로 숫자를 씁니다.',
      key2: '<kbd>Ctrl</kbd>+<kbd>Z</kbd> 또는 <kbd>U</kbd>로 되돌리기, <kbd>M</kbd>으로 이동 칸 표시/숨기기.',
      winH: '항상 이길 수 있나요?',
      win: '네. 1을 어디에 쓰든 100까지 가는 길이 적어도 하나 있습니다. 찾는 건 또 다른 문제지만요.',
      privacyH: '개인정보',
      privacy: '쿠키, 추적, 제3자 스크립트나 서비스가 없습니다. 게임 진행, 최고 기록, 설정은 이 브라우저에만 저장됩니다. 언어는 페이지 주소나 브라우저 설정에 따라 기기에서 선택됩니다. 이 사이트는 Neocities에서 호스팅되며, 다른 웹 서버와 마찬가지로 브라우저의 일반적인 요청을 받습니다.'
    }

  };

  // Ordine del selettore: prima l'originale, poi alfabeti latini, poi gli altri.
  var LANGUAGES = ['it', 'en', 'fr', 'es', 'de', 'pt', 'nl', 'pl', 'tr', 'id', 'ru', 'zh', 'zh-Hant', 'ja', 'ko'];

  // Titolo della pagina regole ricavato dal titolo tradotto.
  LANGUAGES.forEach(function (code) {
    STRINGS[code].pageTitle = STRINGS[code].rulesTitle + ' — ' + STRINGS[code].title;
  });

  // Francese: spazio non separabile prima di : ; ! ? (tipografia francese),
  // così la punteggiatura non va a capo da sola.
  (function frenchSpacing(dict) {
    function fix(s) { return s.replace(/ ([:;!?])/g, ' $1'); }
    Object.keys(dict).forEach(function (key) {
      var v = dict[key];
      if (typeof v === 'string') dict[key] = fix(v);
      else if (typeof v === 'function') dict[key] = function () { return fix(v.apply(null, arguments)); };
    });
  })(STRINGS.fr);

  /** zh-Hant, zh-TW, zh-HK, zh-MO -> tradizionale; tutto il resto -> semplificato. */
  function chineseVariant(parts) {
    if (parts.indexOf('hant') !== -1) return 'zh-Hant';
    if (parts.indexOf('hans') !== -1) return 'zh';
    if (parts.indexOf('tw') !== -1 || parts.indexOf('hk') !== -1 || parts.indexOf('mo') !== -1) return 'zh-Hant';
    return 'zh';
  }

  /**
   * Sceglie la lingua dall'elenco di preferenze del browser (es.
   * navigator.languages = ['pt-BR', 'en-US']). Confronta solo la lingua
   * principale ('pt-BR' -> 'pt'); per il cinese distingue tradizionale
   * (zh-TW, zh-HK, zh-Hant) e semplificato (zh-CN, zh-Hans, zh).
   *   - nessuna preferenza nota  -> italiano (lingua originale del sito)
   *   - preferenze non supportate -> inglese
   */
  function pickLanguage(preferred) {
    var list = Array.isArray(preferred) ? preferred : [];
    var any = false;
    for (var i = 0; i < list.length; i++) {
      if (typeof list[i] !== 'string' || !list[i]) continue;
      any = true;
      var parts = list[i].toLowerCase().split(/[-_]/);
      var base = parts[0];
      if (base === 'zh') return chineseVariant(parts);
      if (Object.prototype.hasOwnProperty.call(STRINGS, base)) return base;
    }
    return any ? FALLBACK_LANG : DEFAULT_LANG;
  }

  var ORIGIN = 'https://giocodel100.neocities.org/';

  /** Cartella delle pagine di una lingua: 'fr', 'zh-hans', 'zh-hant'… */
  function dirFor(code) {
    return STRINGS[code].htmlLang.toLowerCase();
  }

  function isSupported(lang) {
    return typeof lang === 'string' && LANGUAGES.indexOf(lang) !== -1;
  }

  // ---------------------------------------------------------------------
  // Parte DOM (solo browser)
  // ---------------------------------------------------------------------
  var api = {
    STRINGS: STRINGS,
    LANGUAGES: LANGUAGES,
    DEFAULT_LANG: DEFAULT_LANG,
    FALLBACK_LANG: FALLBACK_LANG,
    STORAGE_KEY: STORAGE_KEY,
    ORIGIN: ORIGIN,
    SOURCE_URL: SOURCE_URL,
    pickLanguage: pickLanguage,
    dirFor: dirFor,
    lang: DEFAULT_LANG,
    strings: STRINGS[DEFAULT_LANG],
    start: start,
    apply: apply
  };

  function readChoice() {
    try {
      var v = window.localStorage.getItem(STORAGE_KEY);
      return isSupported(v) ? v : null;
    } catch (e) {
      return null;
    }
  }

  function writeChoice(lang) {
    try {
      if (lang) window.localStorage.setItem(STORAGE_KEY, lang);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* senza localStorage la scelta vale solo per questa pagina */ }
  }

  function browserPreferences(nav) {
    if (nav.languages && nav.languages.length) return Array.prototype.slice.call(nav.languages);
    return nav.language ? [nav.language] : [];
  }

  function setLanguage(lang) {
    api.lang = lang;
    api.strings = STRINGS[lang];
  }

  /** Applica le traduzioni agli elementi marcati con data-i18n*. */
  function apply(doc) {
    var t = api.strings;
    doc.documentElement.lang = t.htmlLang;
    Array.prototype.forEach.call(doc.querySelectorAll('[data-i18n]'), function (el) {
      var v = t[el.getAttribute('data-i18n')];
      if (typeof v === 'string') el.textContent = v;
    });
    // Solo stringhe scritte qui sopra (nessun contenuto esterno): innerHTML è sicuro.
    Array.prototype.forEach.call(doc.querySelectorAll('[data-i18n-html]'), function (el) {
      var v = t[el.getAttribute('data-i18n-html')];
      if (typeof v === 'string') el.innerHTML = v;
    });
    // Titolo: testo tradotto con il "100" nel colore d'accento.
    Array.prototype.forEach.call(doc.querySelectorAll('[data-i18n-accent]'), function (el) {
      var v = t[el.getAttribute('data-i18n-accent')];
      if (typeof v !== 'string') return;
      var at = v.indexOf('100');
      el.textContent = '';
      if (at === -1) {
        el.textContent = v;
        return;
      }
      var num = doc.createElement('span');
      num.className = 'title-num';
      num.textContent = '100';
      el.appendChild(doc.createTextNode(v.slice(0, at)));
      el.appendChild(num);
      el.appendChild(doc.createTextNode(v.slice(at + 3)));
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-i18n-attr]'), function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var parts = pair.split(':');
        var v = t[parts[1]];
        if (parts[0] && typeof v === 'string') el.setAttribute(parts[0], v);
      });
    });
  }

  // Radice del sito = cartella di i18n.js (serve alle pagine in /fr/, /de/…).
  var SCRIPT_SRC = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';

  function start(win) {
    var doc = win.document;
    var choice = readChoice();
    // Le pagine /fr/, /de/… hanno la lingua fissata dall'indirizzo: vince
    // su preferenze e scelta salvata. La radice / sceglie dal browser.
    var fixed = doc.documentElement.getAttribute('data-i18n-lang');
    if (!isSupported(fixed)) fixed = null;
    setLanguage(fixed || choice || pickLanguage(browserPreferences(win.navigator)));
    apply(doc);

    // Selettore della lingua (pagina delle regole).
    var select = doc.getElementById('lang-select');
    if (select) {
      var auto = doc.createElement('option');
      auto.value = '';
      auto.setAttribute('data-i18n', 'languageAuto');
      auto.textContent = api.strings.languageAuto;
      select.appendChild(auto);
      LANGUAGES.forEach(function (code) {
        var opt = doc.createElement('option');
        opt.value = code;
        opt.lang = STRINGS[code].htmlLang;
        opt.textContent = STRINGS[code].name;
        select.appendChild(opt);
      });
      select.value = fixed || choice || '';
      select.addEventListener('change', function () {
        var value = isSupported(select.value) ? select.value : '';
        writeChoice(value);
        if (fixed && SCRIPT_SRC) {
          // Pagina con lingua nell'indirizzo: si va alla stessa pagina
          // nell'altra lingua (o alla radice per "Automatica").
          var page = win.location.pathname.split('/').pop();
          win.location.href = new URL((value ? dirFor(value) + '/' : '') + page, SCRIPT_SRC).href;
          return;
        }
        setLanguage(value || pickLanguage(browserPreferences(win.navigator)));
        apply(doc);
      });
    }

    // Tornando indietro, il browser può mostrare la pagina dalla cache
    // (bfcache) con la lingua vecchia: se la scelta è cambiata, ricarica.
    win.addEventListener('pageshow', function (e) {
      if (!e.persisted || fixed) return;
      var now = readChoice() || pickLanguage(browserPreferences(win.navigator));
      if (now !== api.lang) win.location.reload();
    });
  }

  return api;
});
