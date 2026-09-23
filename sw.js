// SPDX-FileCopyrightText: 2026 pabs-1 e i contributori del Gioco del 100
// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Service worker minimale: cache-first sugli asset del gioco, così dopo la
 * prima visita si gioca anche offline.
 *
 * __BUILD__ viene sostituito da deploy.sh con l'hash del commit: ogni deploy
 * crea una cache nuova e quella vecchia viene cancellata all'attivazione.
 */
'use strict';

var CACHE = 'giocodel100-__BUILD__';
var ASSETS = [
  './',
  'index.html',
  'rules.html',
  'style.css',
  'i18n.js',
  'logic.js',
  'gamepad.js',
  'share.js',
  'game.js',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // cache: 'reload' salta la cache HTTP e prende sempre la versione nuova.
      return cache.addAll(ASSETS.map(function (url) {
        return new Request(url, { cache: 'reload' });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE && key.indexOf('giocodel100-') === 0) return caches.delete(key);
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // Offline e risorsa non in cache: per le pagine mostra il gioco.
        if (req.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
