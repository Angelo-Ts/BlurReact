# Architettura

## Flusso

Il content script parte a `document_start` in ciascun frame HTTP/HTTPS autorizzato. Carica le regole da `chrome.storage.local`, cerca gli elementi e registra un observer per il documento e per ogni ShadowRoot aperto scoperto. Il service worker è l’unico autore delle modifiche allo storage e serializza i comandi: due selezioni simultanee in frame o schede diverse non si sovrascrivono.

Le regole salvano origine, percorso/query/hash, ambito, effetto, intensità e identità dell’elemento. L’identità combina attributi stabili, struttura, parentela, percorso DOM, classi non generate e hash del testo. Non vengono salvati valori dei campi né testo della pagina in chiaro. Gli identificatori e gli attributi possono comunque contenere dati del sito; tutto rimane nello storage locale dell’estensione.

## Matching React

Ogni regola mantiene un insieme di candidati. Al caricamento viene costruito il primo insieme; successivamente vengono esplorati solo i sottoalberi aggiunti e ricontrollati i candidati già noti. Non si sostituiscono metodi React e non si modificano contenuti o handler della pagina. Il listener di `webNavigation` e il controllo leggero dell’URL rilevano pushState, replaceState, popstate e variazioni del frammento.

Gli attributi forti incompatibili escludono il candidato. Si applica una regola solo sopra la soglia e con un margine sul secondo candidato. Un nodo mancante o ambiguo non causa la cancellazione della regola. Una pagina che cambia contemporaneamente tutti gli identificatori e la struttura potrebbe richiedere una nuova selezione: non è possibile dedurne un’identità certa.

Gli host Shadow DOM aperti sono risolti con una catena di identità; gli host di custom element aggiunti prima di `attachShadow()` vengono ricontrollati. I componenti chiusi non sono attraversati. Frame cross-origin autorizzati ricevono un content script autonomo e regole riferite alla propria origine.

## Rendering e ripristino

Gli effetti sono applicati tramite un attributo dell’estensione e un foglio di stile dedicato, senza sovrascrivere gli stili inline del sito. Blur e Strong Blur usano filtri CSS; Pixel usa un filtro SVG di campionamento su griglia e dilatazione; Oscura usa un riempimento opaco del rettangolo del filtro SVG. Nascondi usa `visibility:hidden`, conservando lo spazio occupato. `display:contents` viene gestito applicando il filtro ai figli con un box visivo.

Il filtro segue il rendering del browser, inclusi scroll, trasformazioni, overflow e posizionamento fixed/sticky. Oscura non intercetta gli eventi della pagina; Nascondi rende invece il contenuto invisibile e non interagibile. La rimozione di una regola elimina il relativo marcatore e CSS, conservando le modifiche allo stile fatte nel frattempo dal sito.

La toolbar è isolata in Shadow DOM. Durante la selezione, i clic destinati alla selezione vengono intercettati; dopo Fine/Esc, vengono rimossi i listener di selezione. L’overlay usa un solo requestAnimationFrame, attivo solo durante la selezione.

## Permessi

- `storage`: regole persistenti sul dispositivo.
- `webNavigation`: navigazione SPA e inventario frame.
- `activeTab`: URL e controllo della pagina aperta dal popup.
- host HTTP/HTTPS: riapplicazione automatica anche quando il popup è chiuso e dopo la riapertura del browser.

Nessuna telemetria, richiesta di rete dell’estensione, codice remoto, `eval` o accesso ai cookie. React è una dipendenza esclusivamente della pagina di test, non della build distribuita.

## Limiti

La persistenza riguarda il profilo del browser: disinstallazione, cancellazione dei dati dell’estensione o uso di un altro profilo non conservano le regole. Le pagine interne del browser, gli store protetti e il lettore PDF possono impedire l’iniezione. Frame privi di autorizzazioni e Shadow DOM chiuso non possono essere manipolati dall’interno.

Questo strumento modifica il rendering, non rimuove i dati dal DOM e non protegge da chi può ispezionare la pagina. Blur e Pixel non garantiscono l’irrecuperabilità dei contenuti. Usare Oscura/Nascondi per copertura totale. Lo storage è asincrono: non si promette l’assenza assoluta di un frame non oscurato durante il caricamento iniziale. Verificare il risultato prima di registrare o condividere lo schermo.

## Riferimenti ufficiali

- [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [webNavigation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)
- [SVG feTile](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feTile)
