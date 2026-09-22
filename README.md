# Gioco del 100

Il classico rompicapo "100 numeri" (*Jumping Numbers*) nel browser: scrivi i
numeri da 1 a 100 su una griglia 10×10 saltando da una cella all'altra.

**Gioca qui → https://giocodel100.neocities.org/**

HTML, CSS e JavaScript puri: niente build step, dipendenze o CDN. Funziona su
telefono, tablet e desktop, si installa come app (PWA) e dopo la prima visita
funziona anche offline.

## Regole

1. Scrivi l'**1** in una cella qualsiasi.
2. Ogni numero successivo parte dalla cella dell'ultimo numero scritto:
   - **in orizzontale o verticale** salti 2 celle e atterri sulla 3ª (±3);
   - **in diagonale** salti 1 cella e atterri sulla 2ª (±2, ±2).

   In tutto sono 8 destinazioni possibili.
3. Non puoi riusare una cella occupata né uscire dalla griglia.
4. Se resti senza mosse prima del 100 hai perso; se arrivi a 100 hai vinto.

Da qualunque cella parta l'1 esiste almeno una soluzione completa (lo verifica
il test con un solver a backtracking).

## Funzioni

- Evidenziazione delle mosse legali, attivabile e disattivabile ("Mosse").
- Annulla illimitato e "Nuova partita" (con conferma a due tocchi se la
  partita è in corso).
- Contatori del numero corrente, delle celle rimaste e del record.
- Salvataggio automatico in `localStorage`: ricarichi la pagina e riprendi.
  Se `localStorage` non è disponibile (es. Safari in navigazione privata) si
  gioca lo stesso, senza salvataggio.
- Schermate di vittoria e sconfitta; regole in `rules.html` (pulsante "?").
- 15 lingue: italiano, inglese, francese, spagnolo, tedesco, portoghese,
  olandese, polacco, turco, indonesiano, russo, cinese semplificato e
  tradizionale, giapponese e coreano. Vedi sotto.
- Tastiera: frecce per muoversi, <kbd>Invio</kbd>/<kbd>Spazio</kbd> per
  scrivere, <kbd>Ctrl</kbd>+<kbd>Z</kbd> o <kbd>U</kbd> per annullare,
  <kbd>M</kbd> per le mosse.

## Lingue e privacy

Il sito si mostra nella lingua preferita del browser, senza fingerprinting:

- la lingua si sceglie **solo nel browser**, leggendo `navigator.languages`
  (le preferenze impostate dall'utente); non parte nessuna richiesta, non ci
  sono cookie, analytics né servizi esterni;
- vale la prima lingua supportata dell'elenco (`pt-BR` → portoghese;
  `zh-TW`, `zh-HK`, `zh-Hant` → cinese tradizionale, `zh-CN` e `zh` →
  semplificato); se nessuna è supportata si usa l'inglese, se il browser non
  ne indica nessuna l'italiano;
- nella pagina "?" c'è un selettore per sceglierla a mano; la scelta resta
  in `localStorage` su quel dispositivo (come la partita) e non viene mai
  trasmessa.

Anche il titolo ("Gioco del 100", "The Game of 100", "数到 100"…) e la
dedica sono tradotti; manifest e icona dell'app installata restano "Gioco del
100". Per aggiungere una lingua basta un nuovo dizionario in `i18n.js`:
`tests/i18n.test.js` controlla che abbia tutte le chiavi.

## Motori di ricerca

Ogni lingua ha il suo indirizzo, con il testo già tradotto nell'HTML, così
i motori di ricerca possono mostrarla a chi cerca in quella lingua:

| Pagina | Indirizzo |
| --- | --- |
| Gioco, lingua dal browser (`x-default`) | `/` |
| Gioco in una lingua | `/it/`, `/en/`, `/fr/`, … `/zh-hans/`, `/zh-hant/`, `/ja/`, `/ko/` |
| Regole | `/rules.html`, `/fr/rules.html`, … |

- Su `/fr/` vince la lingua dell'indirizzo; la partita salvata è la stessa in
  tutte le lingue.
- Ogni pagina ha titolo e descrizione tradotti, `canonical`, `hreflang` verso
  tutte le altre lingue, Open Graph (anteprima quando si condivide il link,
  `og-image.png`) e dati strutturati schema.org (`WebApplication`).
- `sitemap.xml` elenca tutte le 32 pagine con le alternative linguistiche;
  `robots.txt` la dichiara; `not_found.html` è la pagina 404 (non indicizzata).

Le cartelle delle lingue e la sitemap **si generano** da `index.html` e
`rules.html` (le sorgenti, da modificare a mano):

```sh
node tools/build-pages.js           # dopo ogni modifica a index.html, rules.html o i18n.js
node tools/build-pages.js --check   # la CI fallisce se ci si è dimenticati
```

I file generati stanno nel repository: quello che si vede su GitHub è
esattamente il sito pubblicato.

## Dettagli per il mobile

- La griglia è il quadrato più grande che sta nello spazio libero (container
  query, con fallback su `min(100vw, 100dvh)`), senza scroll orizzontale;
  `100dvh` evita che le barre di Safari la coprano, `env(safe-area-inset-*)`
  gestisce notch e home indicator.
- `touch-action: manipulation` + meta viewport contro doppio-tap-zoom e ritardo
  di 300 ms; niente menu da long-press né selezione del testo sulla griglia.
- Input con Pointer Events (fallback a `click` solo dove mancano), quindi un
  tocco non genera mai due mosse. Il tocco si aggancia alla mossa legale più
  vicina: le celle su un telefono sono ~33 px, ma il bersaglio effettivo di
  ogni mossa supera i 44 px.
- Il numero si scrive al `pointerdown`; il `click` sintetico che segue non può
  "premere" i pulsanti della schermata di fine partita comparsa sotto il dito.

## Struttura

| File | Cosa contiene |
| --- | --- |
| `index.html` | Pagina del gioco |
| `rules.html` | Regole |
| `style.css` | Stili (tema chiaro/scuro automatico) |
| `logic.js` | Logica pura: mosse legali, stato, undo, stallo, solver. Nessun DOM |
| `i18n.js` | Traduzioni e scelta della lingua |
| `game.js` | Interfaccia: render, input, tastiera, salvataggio |
| `sw.js` | Service worker cache-first per il gioco offline |
| `manifest.json`, `icons/` | PWA |
| `it/`, `en/`, … `ko/`, `sitemap.xml` | Pagine per lingua e sitemap, generate da `tools/build-pages.js` |
| `robots.txt`, `not_found.html`, `og-image.png` | Motori di ricerca, pagina 404, anteprima per i social |
| `tools/` | Generatore delle pagine, icone e anteprima (non pubblicati) |
| `tests/` | Test (non vengono pubblicati) |
| `deploy.sh` | Upload su Neocities |

## Giocare in locale

Basta un qualsiasi server statico nella cartella del progetto, ad esempio:

```sh
python3 -m http.server 8000
# poi apri http://localhost:8000
```

(Aprire `index.html` direttamente con `file://` funziona, ma senza service
worker.)

## Test

```sh
node tests/logic.test.js
node tests/i18n.test.js
node tests/seo.test.js
```

Nessun framework: controlla le mosse legali ad angoli, bordi e centro, lo
stallo, che l'undo ripristini esattamente lo stato precedente e che esista
una soluzione da 100 partendo da ognuna delle 100 celle; per le traduzioni,
la scelta della lingua e che ogni dizionario sia completo; per il SEO, che
ogni pagina abbia titolo, descrizione, canonical, hreflang reciproci, Open
Graph e dati strutturati, senza testo italiano rimasto nelle altre lingue.

Test end-to-end facoltativo in Chromium (serve [Playwright](https://playwright.dev)):

```sh
npm install --no-save playwright && npx playwright install chromium
node tests/browser.test.js
```

Gioca partite complete con tocchi reali su viewport di telefoni, tablet e
desktop; verifica layout, tastiera, overlay, `localStorage` che lancia
eccezioni, service worker offline e console senza errori; per ogni lingua
testi e layout a 320px; zero richieste esterne e zero cookie.

## Deploy su Neocities

Ogni push su `main` lancia `.github/workflows/deploy.yml`, che esegue i test e
poi `deploy.sh`. Lo script carica solo i file del sito (niente `.git`,
`.github`, README, test o script) tramite l'API
`https://neocities.org/api/upload` e marca la cache del service worker con
l'hash del commit, così i visitatori ricevono la versione nuova.

**Secret su GitHub** (una volta sola): repository → *Settings* → *Secrets and
variables* → *Actions* → *New repository secret*, nome `NEOCITIES_API_KEY`,
valore la chiave presa da Neocities → *Settings* → *API*. Oppure:

```sh
gh secret set NEOCITIES_API_KEY --repo pabs-1/giocodel100
```

**Deploy dal tuo computer:**

```sh
export NEOCITIES_API_KEY='la-tua-chiave'
./deploy.sh
```

La chiave non va mai scritta in un file del repository.
