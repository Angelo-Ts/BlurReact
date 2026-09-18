# BlurReact — beta per Microsoft Edge

Estensione Manifest V3 per selezionare più elementi e oscurarli con **Blur, Strong Blur, Pixel, Oscura o Nascondi**. Le regole vengono salvate sul dispositivo e riapplicate dopo refresh, riapertura del browser, navigazione e ricreazione dei nodi React.

Il popup usa HTML/CSS/TypeScript; React è usato nella pagina di test.

## Installazione senza compilare

1. Scarica lo ZIP dalla cartella [release](release) di questo branch ed estrailo in una cartella stabile.
2. Apri `edge://extensions` e attiva **Modalità sviluppatore**.
3. Premi **Carica estensione non pacchettizzata** e seleziona la cartella estratta contenente `manifest.json`, `background.js` e `content.js`.
4. Ricarica le schede già aperte e apri il popup dell’estensione.

Se usi il progetto locale compilato, seleziona **`dist`**. Non caricare `public`: contiene solo i file statici, quindi manca `background.js` e Edge segnala un errore.

Per aggiornare, sostituisci i file nella stessa cartella, premi **Ricarica** nella scheda dell’estensione e ricarica il sito. Non disinstallare l’estensione: la disinstallazione cancella le regole salvate. Conservare cartella e profilo evita di creare una seconda installazione.

## Uso

- Scegli effetto, intensità e ambito: **Questa pagina** oppure **Tutto il sito**.
- Premi **Avvia selezione multipla**, poi clicca gli elementi senza Ctrl o Shift. Attendi il messaggio di salvataggio.
- Usa **↑ Genitore / ↓ Figlio** o i tasti freccia per cambiare livello; premi **Fine** o **Esc** per terminare.
- Nella toolbar, effetto e intensità aggiornano gli elementi scelti nella sessione corrente. Dal popup puoi modificare o ripristinare ogni regola, la pagina o il sito.
- Nascondi conserva lo spazio nel layout. Oscura applica una copertura opaca mantenendo le interazioni.
- L’interruttore **Oscuramenti attivi** sospende o riattiva contemporaneamente tutte le regole senza eliminarle. Lo stato dell’interruttore resta salvato dopo refresh e riavvio.

«Questa pagina» comprende percorso, query e hash. «Tutto il sito» riguarda la stessa origine (protocollo, dominio e porta), non tutti i domini visitati. Le regole degli iframe sono riferite all’origine del frame.

## Sviluppo e verifiche

Richiede Node.js 22 o successivo, npm e Microsoft Edge installato.

```sh
npm ci
npm run build
npm test
npm run package
```

`build` genera `dist`; `package` crea ZIP e checksum SHA-256 in `release`. I test caricano l’estensione reale in un profilo Edge temporaneo e usano una pagina React sulle porte locali 4173 e 4174. Il profilo personale non viene modificato.

Per modificare i sorgenti: `npm run dev`. Per il laboratorio React: `npm run fixture`, quindi visita `http://127.0.0.1:4173/profile`.

## Stato della beta e limiti

La beta non è ancora stabile. Stato dei test e problemi noti: [docs/BETA.md](docs/BETA.md). Il branch di prova rimane separato da `main` fino alla verifica e ai riscontri dell’utente.

Le regole persistono finché non vengono rimosse o cancellati i dati dell’estensione. Se il sito cambia tutti gli identificatori o presenta elementi indistinguibili, il motore conserva la regola senza applicarla a un elemento casuale. Pagine interne di Edge, store protetti, PDF e Shadow DOM chiusi hanno limiti di accesso.

Gli effetti modificano il rendering, non eliminano i dati dal DOM. Blur e Pixel non garantiscono la riservatezza assoluta; per copertura opaca usare Oscura o Nascondi e verificare prima di registrare. Non viene garantita l’assenza di un frame scoperto durante il caricamento iniziale dello storage asincrono.

Nessuna telemetria o codice remoto. Le regole restano nello storage locale dell’estensione.

## Segnalare un problema

Indica versione Edge e beta, sito/percorso, effetto e ambito, passaggi, risultato atteso e osservato. Specifica se compare subito, dopo refresh, navigazione o riavvio. Screenshot solo se utili, evitando dati riservati.

Vedi anche [architettura](docs/ARCHITETTURA.md) e [specifica](docs/SPECIFICA.md).
