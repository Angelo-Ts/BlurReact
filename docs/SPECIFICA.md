Sviluppa un’estensione Microsoft Edge per oscurare selettivamente elementi delle pagine web

Voglio sviluppare un’estensione per Microsoft Edge, compatibile con Manifest V3, usando TypeScript. Il popup non deve necessariamente usare React. Compatibilita con i siti React e persistenza dopo ogni refresh sono requisiti fondamentali.

L’obiettivo principale è permettere all’utente di selezionare visivamente elementi presenti in qualsiasi pagina web e applicare loro un effetto visivo, in particolare per poter registrare lo schermo senza mostrare determinate informazioni.

L’estensione deve essere progettata come un prodotto completo e funzionante, non come una demo o un semplice prototipo.

⸻

1. OBIETTIVO PRINCIPALE

L’utente deve poter:

1. cliccare sull’icona dell’estensione Edge;
2. entrare in una modalità di selezione;
3. muovere il mouse sopra gli elementi della pagina;
4. vedere quale elemento sta per essere selezionato tramite un bordo/overlay di evidenziazione;
5. cliccare sull’elemento;
6. applicare immediatamente l’effetto attualmente selezionato;
7. continuare a selezionare altri elementi senza dover premere CTRL, SHIFT o altri tasti;
8. premere ESC per uscire dalla modalità di selezione;
9. usare un pulsante Fine per terminare la selezione.

L’effetto deve essere applicato immediatamente, senza necessità di ricaricare la pagina.

⸻

2. EFFETTI DISPONIBILI

Implementare almeno questi effetti:

Blur

Sfocatura dell’elemento.

Deve essere disponibile un controllo di intensità.

Strong Blur

Sfocatura molto più forte rispetto a Blur.

Deve essere disponibile un controllo di intensità.

Pixel

Effetto pixelizzazione.

Deve essere disponibile un controllo per la quantità/dimensione dei pixel.

Oscura

L’elemento rimane presente nella pagina ma il suo contenuto visivo viene coperto/oscurato.

Deve essere possibile scegliere, se tecnicamente appropriato, intensità/opacità.

NASCONDI

Questo effetto è diverso da “Oscura”.

L’elemento deve diventare effettivamente invisibile/non mostrato.

Tuttavia l’estensione deve continuare a conoscere l’identità dell’elemento e deve poterlo ripristinare successivamente.

⸻

3. EFFETTI PURAMENTE VISIVI

L’estensione deve modificare solamente la presentazione visiva della pagina.

Non deve modificare:

* il contenuto originale del sito;
* il testo sorgente;
* i dati dell’utente;
* il funzionamento delle applicazioni web;
* link e pulsanti, quando possibile;
* il comportamento JavaScript della pagina.

L’idea è:

Pagina originale
↓
CSS / overlay dell’estensione
↓
Schermata visualizzata dall’utente
↓
Registrazione dello schermo

Il sito deve continuare a funzionare normalmente mentre l’effetto è applicato.

Prestare particolare attenzione a non rompere layout, scrolling, eventi mouse/touch o interazioni della pagina.

⸻

4. SELEZIONE DEGLI ELEMENTI DOM

Questa è una parte fondamentale.

Quando l’utente muove il mouse sopra una pagina, l’estensione deve identificare un elemento utile e visibile.

NON deve semplicemente selezionare sempre il nodo DOM più profondo.

Esempio:

DIV
 ├── H2
 └── P
      └── STRONG

Se il mouse passa sopra il testo contenuto nello STRONG, non voglio necessariamente ritrovarmi a selezionare STRONG.

L’estensione deve cercare di determinare un elemento semanticamente/visivamente utile.

Per esempio:

Elemento individuato
        ↓
       P
        ↑
       H2
        ↑
       DIV

L’interfaccia dovrebbe consentire, quando necessario, di risalire tra gli elementi genitore.

Implementare quindi un sistema di DOM ancestor navigation.

Quando un elemento viene evidenziato, mostrare eventualmente un piccolo indicatore del tipo:

P
↑ H2
↑ DIV

o un’interfaccia equivalente che permetta all’utente di scegliere il livello desiderato.

L’obiettivo è evitare che una pagina complessa renda selezionabili centinaia di piccoli nodi inutili.

⸻

5. ELEMENTI SUPPORTATI

La selezione deve funzionare sul maggior numero possibile di elementi HTML.

Supportare almeno:

* div
* span
* p
* h1
* h2
* h3
* h4
* h5
* h6
* img
* video
* audio
* a
* button
* input
* textarea
* select
* form
* ul
* ol
* li
* table
* tr
* td
* th
* svg
* canvas
* article
* section
* header
* footer
* nav
* main
* aside

e altri elementi HTML quando opportuno.

Prestare attenzione agli elementi con:

* display: contents
* position: fixed
* position: sticky
* overflow
* trasformazioni CSS
* elementi sovrapposti
* elementi con pointer-events
* elementi generati dinamicamente.

⸻

6. ELEMENTI DINAMICI E REACT

Questa è una delle funzionalità più importanti.

L’estensione deve funzionare correttamente anche sui siti moderni basati su:

* React
* Vue
* Angular
* Next.js
* altri framework SPA/dinamici.

Non bisogna assumere che un elemento DOM rimanga sempre lo stesso.

React può:

* rimuovere un elemento;
* ricrearlo;
* sostituirlo;
* modificare i suoi attributi;
* modificare il contenuto;
* cambiare il layout.

L’effetto applicato dall’utente deve quindi poter essere riapplicato automaticamente.

Utilizzare MutationObserver dove appropriato.

Architettura concettuale:

Pagina caricata
      ↓
Carica regole salvate
      ↓
Cerca elementi
      ↓
Elemento trovato?
    ↙       ↘
   SÌ       NO
   ↓         ↓
Applica    Osserva DOM
effetto       ↓
          React crea/
          ricrea elemento
               ↓
          Identifica elemento
               ↓
          Applica effetto

L’implementazione deve essere efficiente e non causare un uso eccessivo della CPU.

Evitare di riesaminare inutilmente l’intero DOM ad ogni mutazione.

⸻

7. SPA E NAVIGAZIONE INTERNA

L’estensione deve funzionare anche con applicazioni SPA.

Esempio:

example.com
      ↓
/home
      ↓
/profile
      ↓
/settings

Se la navigazione avviene senza un vero reload della pagina, l’estensione deve essere in grado di rilevarla e aggiornare le regole.

Gestire, dove appropriato:

* history.pushState
* history.replaceState
* popstate
* cambiamenti di URL;
* cambiamenti importanti del DOM.

Non assumere che una navigazione SPA comporti necessariamente un nuovo document load.

⸻

8. PERSISTENZA REALE

Questa è una funzionalità CRITICA.

Se l’utente oscura un elemento:

Elemento X
↓
Blur 10

l’effetto deve rimanere applicato anche dopo:

* refresh;
* chiusura e riapertura della pagina;
* navigazione;
* ritorno sulla pagina;
* ricreazione dell’elemento da parte di React.

NON salvare semplicemente un riferimento DOM.

Un riferimento come:

element

non è sufficiente perché il DOM viene ricreato.

⸻

9. IDENTIFICAZIONE STABILE DEGLI ELEMENTI

Per ogni elemento selezionato creare una regola persistente contenente quante più informazioni utili possibile.

Per esempio:

{
  "origin": "https://example.com",
  "path": "/profile",
  "effect": "blur",
  "intensity": 15,
  "selector": "...",
  "attributes": {},
  "domPath": "...",
  "textFingerprint": "...",
  "structureFingerprint": "..."
}

NON usare necessariamente esattamente questa struttura: progettare un sistema robusto migliore se necessario.

L’identificazione deve utilizzare una combinazione di informazioni, per esempio:

* ID;
* classi;
* attributi;
* data-* attributes;
* ARIA attributes;
* tag name;
* posizione nella struttura;
* relazione con elementi genitori;
* testo, quando appropriato;
* struttura interna;
* caratteristiche visive;
* selector CSS robusto;
* XPath solo se realmente utile;
* altri fingerprint.

Non affidarsi esclusivamente al testo, perché il testo può cambiare.

Non affidarsi esclusivamente alle classi, perché framework come React possono generare classi instabili.

Creare un sistema di scoring/confidence per determinare quanto è affidabile una corrispondenza.

Esempio concettuale:

ID stabile                  +100
data-testid stabile          +80
attributo stabile            +50
struttura genitore            +30
tag                           +10
testo simile                  +20
posizione DOM                 +10

I valori sono solo un esempio: progettare un algoritmo appropriato.

Se ci sono più possibili candidati, scegliere solamente un elemento quando la confidenza supera una soglia ragionevole.

Evitare assolutamente di applicare una regola al primo elemento casuale che assomiglia al precedente.

⸻

10. GESTIONE DEGLI ELEMENTI NON ANCORA PRESENTI

Se una regola salvata non trova immediatamente il relativo elemento:

NON eliminarla.

Conservarla e continuare a cercare.

Questo è fondamentale per React/SPA.

Esempio:

Regola salvata
     ↓
Elemento non trovato
     ↓
Mantieni regola
     ↓
MutationObserver
     ↓
Nuovi elementi DOM
     ↓
Tentativo di matching
     ↓
Match trovato
     ↓
Applica effetto

⸻

11. SITI E URL

Progettare un sistema di scope delle regole.

Deve essere possibile distinguere almeno:

origin
hostname
pathname

e, se utile, query parameters.

Esempio:

example.com/profile

non dovrebbe necessariamente applicare la stessa regola a:

example.com/settings

a meno che l’utente abbia configurato la regola per farlo.

Prevedere una modalità per:

* solo questa pagina;
* tutto il sito;
* eventualmente pattern URL personalizzati.

⸻

12. GESTIONE DEI CAMBIAMENTI

Se l’utente modifica l’intensità dell’effetto:

Blur 10
↓
Blur 25

la modifica deve essere immediatamente visibile.

La nuova configurazione deve essere salvata.

Dopo un refresh deve essere mantenuto:

Blur 25

⸻

13. RIPRISTINO

L’utente deve poter rimuovere una regola.

Per esempio:

Elemento oscurato
↓
Ripristina
↓
Elemento originale

Il ripristino deve:

* rimuovere l’effetto;
* aggiornare lo storage;
* impedire che l’effetto venga nuovamente applicato;
* funzionare anche dopo eventuali ricreazioni del DOM.

Prevedere inoltre:

* ripristina elemento;
* ripristina tutti gli elementi della pagina;
* eventualmente ripristina tutte le regole del sito.

⸻

14. STORAGE

Utilizzare lo storage dell’estensione appropriato, preferibilmente:

chrome.storage.local

o API equivalenti supportate da Edge.

Non utilizzare localStorage della pagina web come storage principale.

Le informazioni devono appartenere all’estensione e non al sito.

Gestire correttamente:

* lettura;
* scrittura;
* aggiornamento;
* cancellazione;
* migrazione futura dello schema;
* eventuali errori di storage.

⸻

15. UI DELL’ESTENSIONE

Creare un’interfaccia semplice e moderna.

Nel popup dell’estensione mostrare almeno:

[ Avvia selezione ]
Effetto:
[ Blur ▼ ]
Intensità:
[──────●────]
[ Fine ]

La UI può essere migliorata liberamente, purché rimanga semplice.

Durante la modalità selezione deve essere presente un’interfaccia/toolbar che permetta di:

* vedere l’effetto corrente;
* cambiare effetto;
* modificare intensità;
* terminare la modalità selezione.

L’interfaccia di selezione deve essere separata visivamente dalla pagina e non deve interferire con gli elementi selezionabili.

⸻

16. HIGHLIGHT DELL’ELEMENTO

Quando il mouse passa sopra un elemento candidato:

mostrare un overlay di selezione.

L’overlay deve:

* avere un bordo chiaramente visibile;
* seguire le dimensioni dell’elemento;
* aggiornarsi quando l’elemento cambia posizione;
* funzionare con scrolling;
* funzionare con elementi fixed/sticky;
* non interferire con gli eventi mouse.

Usare eventualmente:

pointer-events: none;

per l’overlay.

⸻

17. EFFETTI TRAMITE CSS

Preferire un sistema basato su CSS/classi generate dall’estensione.

Esempio concettuale:

.extension-blur {
    filter: blur(...);
}
.extension-pixel {
    ...
}
.extension-hidden {
    ...
}

NON modificare direttamente gli inline style del sito se non strettamente necessario.

Se è necessario modificare proprietà inline, progettare un sistema che salvi e ripristini correttamente lo stato precedente.

L’estensione non deve distruggere CSS già presenti nel sito.

⸻

18. OSCURAMENTO E REGISTRAZIONE SCHERMO

L’obiettivo principale è permettere all’utente di registrare lo schermo.

Pertanto gli effetti devono essere applicati in modo che siano realmente visibili nella resa grafica della pagina e quindi nella registrazione dello schermo.

Non fare affidamento esclusivamente su modifiche invisibili al rendering.

Per “Oscura”, utilizzare una soluzione visivamente affidabile.

Per esempio, può essere utilizzato un overlay assolutamente posizionato/fisso sopra l’elemento, purché:

* segua l’elemento;
* non blocchi l’interazione;
* venga aggiornato durante scrolling/layout changes;
* venga ricreato quando necessario.

⸻

19. IMMAGINI, VIDEO E CANVAS

Prestare particolare attenzione a:

* immagini;
* video;
* canvas;
* SVG.

Gli effetti devono essere applicabili quando tecnicamente possibile.

Per elementi complessi, usare la soluzione CSS/overlay più affidabile.

⸻

20. IFRAME

Gestire gli iframe nel limite delle API browser.

Un iframe cross-origin non può essere manipolato arbitrariamente dal documento principale.

NON fingere che sia possibile.

Prevedere invece l’utilizzo dei content script nei frame quando consentito dalle permission e dalla configurazione dell’estensione.

Configurare correttamente, quando appropriato:

all_frames

e le relative permission.

Per iframe cross-origin non accessibili, documentare chiaramente il limite.

⸻

21. SHADOW DOM

Supportare Shadow DOM quando tecnicamente possibile.

Considerare:

* Shadow DOM open;
* attraversamento dei shadow root accessibili;
* elementi dentro componenti web.

Per Shadow DOM closed, rispettare le limitazioni della piattaforma e non tentare hack non affidabili.

⸻

22. SICUREZZA E ISOLAMENTO

Seguire le best practice delle estensioni Manifest V3.

Separare correttamente:

* service worker;
* content script;
* popup HTML/CSS/TypeScript (React facoltativo);
* eventuali script di pagina;
* CSS dell’estensione.

Evitare di eseguire codice arbitrario proveniente dalle pagine.

Non usare eval.

Non usare codice remoto.

Seguire la Content Security Policy di Manifest V3.

Richiedere solamente le permission necessarie.

⸻

23. PERFORMANCE

La pagina potrebbe contenere migliaia di elementi.

L’estensione NON deve:

* scansionare continuamente tutto il DOM;
* creare centinaia di MutationObserver;
* eseguire querySelectorAll dell’intero documento ad ogni mutazione;
* causare lag durante scrolling;
* consumare inutilmente CPU.

Progettare:

* debounce/throttle;
* caching;
* matching incrementale;
* MutationObserver filtrato;
* aggiornamento efficiente degli overlay;
* cleanup corretto degli observer;
* cleanup degli event listener.

⸻

24. ARCHITETTURA

Progettare un’architettura chiara.

Indicativamente:

Extension
│
├── manifest.json
│
├── service-worker
│
├── content/
│   ├── selector
│   ├── matcher
│   ├── effects
│   ├── overlay
│   ├── persistence
│   ├── mutation-observer
│   └── navigation-observer
│
├── popup/
│   └── UI HTML/CSS/TypeScript (React facoltativo)
│
└── shared/
    ├── types
    ├── storage
    └── utilities

La struttura può essere modificata se esiste una soluzione migliore.

⸻

25. COMUNICAZIONE TRA COMPONENTI

Definire messaggi tipizzati tra:

Popup
    ↕
Content Script
    ↕
Service Worker

Esempi:

START_SELECTION
STOP_SELECTION
SET_EFFECT
SET_INTENSITY
ELEMENT_SELECTED
REMOVE_RULE
RESTORE_ALL
GET_RULES

Usare TypeScript per tipizzare i messaggi.

⸻

26. GESTIONE ERRORI

L’estensione deve gestire correttamente:

* pagina non accessibile;
* chrome:// / edge://;
* PDF viewer;
* iframe non accessibile;
* elementi scomparsi;
* DOM modificato;
* storage non disponibile;
* selector non più valido;
* più elementi candidati;
* navigazione SPA.

Non deve andare in crash se una regola non può essere applicata.

⸻

27. DEBUGGING

Prevedere logging utile durante lo sviluppo.

Per esempio:

[Extension]
Rule loaded
Rule matched
Rule confidence: 94%
Element recreated
Effect reapplied
Rule unresolved

Il logging deve poter essere facilmente disattivato o ridotto nella build finale.

⸻

28. BUILD

Il progetto deve essere realmente compilabile.

Fornire:

* package.json;
* configurazione TypeScript;
* configurazione bundler;
* manifest.json;
* sorgenti completi;
* CSS;
* asset necessari;
* istruzioni di build.

Comandi desiderati, se appropriati:

npm install
npm run build

La cartella risultante deve poter essere caricata in Edge tramite:

edge://extensions

→ Modalità sviluppatore
→ Carica estensione non pacchettizzata.

⸻

29. TEST

Creare test o almeno una strategia di test per verificare:

Test base

* selezione elemento;
* applicazione Blur;
* applicazione Pixel;
* Oscura;
* Nascondi;
* rimozione effetto.

Persistenza

* refresh;
* chiusura/riapertura;
* navigazione;
* ritorno sulla pagina.

React

Testare una pagina React che:

crea elemento
↓
rimuove elemento
↓
ricrea elemento

e verificare che la regola venga riapplicata.

SPA

Testare:

/home
/profile
/settings

senza reload completo.

DOM dinamico

Testare elementi aggiunti tramite:

appendChild()

e tramite rendering React.

Elementi complessi

Testare:

* immagini;
* video;
* iframe;
* SVG;
* canvas;
* Shadow DOM.

⸻

30. REQUISITO FONDAMENTALE

Non voglio una semplice implementazione che “funziona finché la pagina non cambia”.

Il problema principale da risolvere è:

Come identificare in modo affidabile un elemento visivo nel DOM e ritrovarlo dopo che il DOM è stato modificato o completamente ricreato?

La soluzione deve quindi essere progettata intorno a:

STABLE ELEMENT IDENTIFICATION
+
PERSISTENT RULES
+
ROBUST MATCHING
+
MUTATION OBSERVATION
+
SPA NAVIGATION DETECTION

Queste cinque componenti sono fondamentali.

⸻

31. PRIORITÀ

In caso di conflitto tra funzionalità, dare priorità a:

1. affidabilità della selezione;
2. persistenza;
3. riconoscimento dopo DOM changes;
4. compatibilità React/SPA;
5. effetti visivi corretti;
6. performance;
7. UI.

È preferibile avere meno funzionalità ma implementate correttamente piuttosto che molte funzionalità fragili.

⸻

32. COSA DEVE PRODURRE L’AI CODING AGENT

Non limitarti a descrivere come implementare il progetto.

Crea effettivamente il progetto completo, con tutti i file necessari.

Per ogni parte importante:

* implementa il codice;
* spiega brevemente le decisioni architetturali;
* indica eventuali limiti inevitabili delle API di Edge;
* includi istruzioni per avviare e compilare il progetto.

Alla fine verifica mentalmente l’intero flusso:

Installazione
     ↓
Apertura pagina
     ↓
Click estensione
     ↓
Modalità selezione
     ↓
Hover elemento
     ↓
Highlight
     ↓
Click
     ↓
Effetto immediato
     ↓
Salvataggio regola
     ↓
Refresh
     ↓
Ricerca elemento
     ↓
Elemento trovato
     ↓
Effetto ripristinato

E soprattutto:

React ricrea elemento
        ↓
MutationObserver
        ↓
Matching
        ↓
Elemento riconosciuto
        ↓
Effetto nuovamente applicato

L’implementazione finale deve essere funzionante, compilabile, mantenibile e pronta per essere caricata come estensione Microsoft Edge Manifest V3.
