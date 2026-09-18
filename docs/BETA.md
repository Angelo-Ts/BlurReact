# Verifica beta 1.0.0-beta.1

## Verifica finale della beta, 18 settembre 2026

- Build TypeScript/esbuild riuscita.
- **11 test end-to-end su 11 superati** con l’estensione caricata in Microsoft Edge **153.0.4234.32** su Windows.
- Verificati: selezione multipla, refresh, chiusura e riapertura del browser, remount React, nodo assente e ricreato, navigazione SPA e ambiti URL, aggiornamento intensità, ripristino, Shadow DOM aperto, iframe cross-origin, stili inline `!important`, scritture concorrenti, popup e resa grafica di Pixel/Oscura.
- Corretto il difetto dei video con controlli nativi: una superficie temporanea di selezione intercetta il clic senza modificare i controlli. Verificati video in riproduzione, audio, selezioni ripetute senza duplicati, resa opaca tramite screenshot e persistenza dopo refresh.
- Verificati anche immagini, SVG, testo inline, elementi fissi, scrolling e `display:contents`.
- Comando di verifica: `npm test`. Lo ZIP viene ricostruito dai medesimi sorgenti con `npm run package`, controllando i file richiesti dal manifest e il contenuto byte per byte dopo estrazione.

La PR resta in bozza per i test dell’utente. Questa verifica non dimostra compatibilità universale con ogni sito React o ogni modalità multimediale.

## Prova manuale richiesta

1. Caricare la cartella `dist` o lo ZIP estratto tramite `edge://extensions`.
2. Scegliere almeno due elementi su un sito React reale, terminare la selezione e controllare gli effetti.
3. Ricaricare, cambiare percorso e tornare, chiudere e riaprire Edge nello stesso profilo.
4. Modificare l’intensità e verificare nuovamente dopo refresh.
5. Ripristinare una regola, ricaricare e verificare che l’effetto non ritorni.
6. Segnalare sito, effetto, ambito, passaggi e versione Edge in caso di problema.
