# BlurReact

Estensione Microsoft Edge Manifest V3 per oscurare selettivamente elementi delle pagine web.

## Stato

Specifica iniziale: i sorgenti dell’estensione non sono ancora presenti.

## Requisiti prioritari

- Compatibilità con pagine React, inclusi rerender, smontaggio e ricreazione degli elementi, rendering asincrono e navigazione SPA.
- Persistenza delle regole in `chrome.storage.local`: ripristino automatico degli effetti dopo ogni refresh, chiusura e riapertura della pagina e ricreazione del DOM, finché l’utente non rimuove la regola.
- React non è obbligatorio per il popup: HTML/CSS/TypeScript sono ammessi.
- Le regole senza corrispondenza restano salvate per quando l’elemento torna disponibile.
- Identificazione stabile e valutazione della confidenza per evitare corrispondenze ambigue.

La specifica completa è in [docs/SPECIFICA.md](docs/SPECIFICA.md). Queste precisazioni prevalgono su eventuali formulazioni discordanti del prompt originario.

## Verifica richiesta

Testare selezione, salvataggio, refresh completo, riapertura, modifica dell’intensità, ripristino, ricreazione React e navigazione SPA prima di dichiarare il prodotto pronto.

Il requisito del 100% è un obiettivo di accettazione, non una compatibilità già verificata. Documentare limiti delle API del browser e contenuti non accessibili o non identificabili univocamente. Verificare separatamente persistenza delle regole e possibili esposizioni transitorie durante il caricamento.
