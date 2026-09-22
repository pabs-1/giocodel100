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

  // Tasti (uguali in tutte le lingue: le scorciatoie non cambiano).
  var ARROWS = '<kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd>';

  var STRINGS = {
    it: {
      name: 'Italiano',
      htmlLang: 'it',
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
      pageTitle: 'Regole — Gioco del 100',
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
      privacy: 'Nessun cookie, nessun tracciamento, nessun servizio esterno. La partita, il record e la lingua scelta restano solo in questo browser. La lingua viene scelta dalle impostazioni del browser, sul tuo dispositivo: non viene inviato nulla.'
    },

    en: {
      name: 'English',
      htmlLang: 'en',
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
      pageTitle: 'Rules — Gioco del 100',
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
      privacy: 'No cookies, no tracking, no external services. Your game, your best score and your language choice stay in this browser only. The language is picked from your browser settings, on your device: nothing is sent anywhere.'
    },

    fr: {
      name: 'Français',
      htmlLang: 'fr',
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
      pageTitle: 'Règles — Gioco del 100',
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
      privacy: 'Aucun cookie, aucun pistage, aucun service externe. Votre partie, votre record et votre choix de langue restent uniquement dans ce navigateur. La langue est choisie d’après les réglages de votre navigateur, sur votre appareil : rien n’est envoyé.'
    },

    es: {
      name: 'Español',
      htmlLang: 'es',
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
      pageTitle: 'Reglas — Gioco del 100',
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
      privacy: 'Sin cookies, sin rastreo, sin servicios externos. Tu partida, tu récord y el idioma elegido se guardan solo en este navegador. El idioma se elige según la configuración de tu navegador, en tu dispositivo: no se envía nada.'
    },

    de: {
      name: 'Deutsch',
      htmlLang: 'de',
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
      pageTitle: 'Regeln — Gioco del 100',
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
      privacy: 'Keine Cookies, kein Tracking, keine externen Dienste. Dein Spiel, dein Rekord und deine Sprachwahl bleiben nur in diesem Browser. Die Sprache wird anhand deiner Browsereinstellungen auf deinem Gerät gewählt: Es wird nichts übertragen.'
    },

    pt: {
      name: 'Português',
      htmlLang: 'pt',
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
      pageTitle: 'Regras — Gioco del 100',
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
      privacy: 'Sem cookies, sem rastreamento, sem serviços externos. O jogo, o recorde e o idioma escolhido ficam apenas neste navegador. O idioma é escolhido a partir das preferências do navegador, no seu dispositivo: nada é enviado.'
    },

    zh: {
      name: '中文',
      htmlLang: 'zh-Hans',
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
      pageTitle: '规则 — Gioco del 100',
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
      privacy: '没有 Cookie，没有跟踪，没有外部服务。你的游戏进度、最佳成绩和语言选择只保存在这个浏览器中。语言根据你的浏览器设置在本机上选择，不会发送任何数据。'
    },

    ja: {
      name: '日本語',
      htmlLang: 'ja',
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
      pageTitle: 'ルール — Gioco del 100',
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
      privacy: 'Cookie なし、トラッキングなし、外部サービスなし。ゲームの進行、最高記録、言語の選択はこのブラウザーの中だけに保存されます。言語はお使いのブラウザーの設定をもとに端末上で選ばれ、どこにも送信されません。'
    }
  };

  var LANGUAGES = ['it', 'en', 'fr', 'es', 'de', 'pt', 'zh', 'ja'];

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

  /**
   * Sceglie la lingua dall'elenco di preferenze del browser (es.
   * navigator.languages = ['pt-BR', 'en-US']). Confronta solo la lingua
   * principale ('pt-BR' -> 'pt', 'zh-TW' -> 'zh').
   *   - nessuna preferenza nota  -> italiano (lingua originale del sito)
   *   - preferenze non supportate -> inglese
   */
  function pickLanguage(preferred) {
    var list = Array.isArray(preferred) ? preferred : [];
    var any = false;
    for (var i = 0; i < list.length; i++) {
      if (typeof list[i] !== 'string' || !list[i]) continue;
      any = true;
      var base = list[i].toLowerCase().split(/[-_]/)[0];
      if (Object.prototype.hasOwnProperty.call(STRINGS, base)) return base;
    }
    return any ? FALLBACK_LANG : DEFAULT_LANG;
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
    pickLanguage: pickLanguage,
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
    Array.prototype.forEach.call(doc.querySelectorAll('[data-i18n-attr]'), function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var parts = pair.split(':');
        var v = t[parts[1]];
        if (parts[0] && typeof v === 'string') el.setAttribute(parts[0], v);
      });
    });
  }

  function start(win) {
    var doc = win.document;
    var choice = readChoice();
    setLanguage(choice || pickLanguage(browserPreferences(win.navigator)));
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
      select.value = choice || '';
      select.addEventListener('change', function () {
        var value = isSupported(select.value) ? select.value : '';
        writeChoice(value);
        setLanguage(value || pickLanguage(browserPreferences(win.navigator)));
        apply(doc);
      });
    }

    // Tornando indietro, il browser può mostrare la pagina dalla cache
    // (bfcache) con la lingua vecchia: se la scelta è cambiata, ricarica.
    win.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      var now = readChoice() || pickLanguage(browserPreferences(win.navigator));
      if (now !== api.lang) win.location.reload();
    });
  }

  return api;
});
