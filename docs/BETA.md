# Verifica beta 1.0.0-beta.1

## Prima verifica, 18 settembre 2026

- Build TypeScript/esbuild riuscita.
- 9 test end-to-end su 10 superati con l’estensione caricata in Microsoft Edge.
- Verificati: selezione multipla, refresh, chiusura e riapertura del browser, remount React, nodo assente e ricreato, navigazione SPA e ambiti URL, aggiornamento intensità, ripristino, Shadow DOM aperto, iframe cross-origin, stili inline `!important`, scritture concorrenti, popup e resa grafica di Pixel/Oscura.
- Problema aperto: nel test multimediale, il video con controlli nativi non risulta coperto nella schermata catturata. Il test distingue ora la mancata selezione dal mancato rendering dell’effetto.

La PR resta in bozza per i test dell’utente. Questa verifica non dimostra compatibilità universale con ogni sito React o ogni modalità multimediale.

## Prova manuale richiesta

1. Caricare la cartella `dist` o lo ZIP estratto tramite `edge://extensions`.
2. Scegliere almeno due elementi su un sito React reale, terminare la selezione e controllare gli effetti.
3. Ricaricare, cambiare percorso e tornare, chiudere e riaprire Edge nello stesso profilo.
4. Modificare l’intensità e verificare nuovamente dopo refresh.
5. Ripristinare una regola, ricaricare e verificare che l’effetto non ritorni.
6. Segnalare sito, effetto, ambito, passaggi e versione Edge in caso di problema.
