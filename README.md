# Player Analysis Database V2

Versione GitHub Pages + Supabase.

Modifiche V2:
- Footer viola dimezzato; credits piccoli in basso a destra.
- Rimossa Ricerca Globale dal menu laterale.
- Player Database allineato a sinistra con logo a destra.
- Piede: solo DX / SX.
- Ruolo: DIFENSORE / CENTROCAMPISTA / ATTACCANTE.
- Tutti i pulsanti di navigazione attivi.
- Pagina GIOCATORI con ordinamento per alfabetico, età, piede, ruolo, nazionalità.
- Pagina SQUADRE e STATISTICHE attive.
- Importazione card con OCR nel browser tramite Tesseract.js.
- L'immagine originale non viene salvata: serve solo per estrarre i dati e viene eliminata dalla memoria temporanea.
- Se la squadra letta non esiste, può essere creata automaticamente al salvataggio.
- I dati riconosciuti vengono mostrati per controllo prima dell'archiviazione.

Per aggiornare GitHub Pages, sostituisci i file del repository con quelli di questa cartella e fai Commit.


## V8
- OCR ricalibrato per il template fisso: zone precise e segmentazione per colore, senza correzione linguistica.
- Drag & drop diretto nella dashboard: apre il controllo dati e avvia automaticamente la lettura.
- Menu nazionalità completo con bandiere emoji, senza file esterno.


## V10 - Login email + password

La web app ora richiede obbligatoriamente una sessione Supabase Auth.

Configurazione Supabase consigliata:
1. Authentication > Providers > Email: abilita Email provider.
2. Disabilita Anonymous Sign-Ins.
3. Authentication > Users: crea manualmente l'utente autorizzato con email e password.
4. Mantieni le policy RLS per il ruolo `authenticated`.
5. Non inserire password nel codice, su GitHub o in `config.js`.

Il frontend usa `supabase.auth.signInWithPassword()`.
La sessione viene conservata dal client Supabase nel browser e il logout usa `supabase.auth.signOut()`.


## V11 - Importazione multipla card
- È possibile selezionare o trascinare più card contemporaneamente.
- La lettura OCR della singola card NON è stata modificata.
- Le card vengono processate in sequenza per evitare blocchi del browser.
- Dopo la lettura è possibile scorrere le card, correggere i dati e:
  - archiviare la card corrente;
  - archiviare tutte le card in batch.
- Le immagini originali restano temporanee nel browser e non vengono archiviate.


## V12 - Authentication fix

Correzioni:
- Login email/password completamente collegato a `supabase.auth.signInWithPassword`.
- Rimossi riferimenti visivi a Supabase dalla schermata di login.
- Nessun accesso anonimo.
- Lettura/scrittura database consentita solo con sessione autenticata.
- Gestione sessione scaduta e logout.
- Messaggi di errore login più chiari.
- Cache aggiornata per evitare che GitHub Pages carichi JavaScript vecchio.

### Supabase
In Authentication:
1. Providers > Email: abilita Email.
2. Users: crea l'utente con email/password oppure invita/crea l'utente.
3. Se usi la creazione manuale, assicurati che l'utente risulti confermato.
4. Lascia le policy RLS `authenticated` sulle tabelle.
5. Anonymous Sign-Ins può restare disattivato.


## V14
- Rimossa duplicazione account nella sidebar.
- Campi giocatore in maiuscolo durante digitazione e salvataggio.
- Fix nazionalità: riconoscimento card, select con bandiera, salvataggio e riapertura.
- Multi-card: selezione/drag di più immagini.
- Ogni card è gestita in una tab stile Chrome.
- Ogni giocatore viene archiviato singolarmente, con possibilità di modificare la card prima di salvarla.
- Il lettore OCR e le regioni della card restano invariati rispetto alla versione funzionante.


## V15
- Nel form MODIFICA GIOCATORE il campo SQUADRA non è più un semplice menu a tendina.
- Ora puoi scrivere manualmente il nome della squadra oppure selezionare uno dei suggerimenti esistenti.
- Se digiti una squadra nuova, viene creata automaticamente nel database e assegnata al giocatore.


## V16
- Possibilità di modificare una squadra.
- È modificabile anche il NOME DELLA SQUADRA.
- Modificabili nazione e competizione.
- Possibilità di eliminare una squadra intera.
- Se contiene giocatori, viene mostrato un avviso e, dopo conferma, vengono eliminati anche i giocatori associati.


## V17 - Login fix
- Corretto un errore di sintassi JavaScript che bloccava l'intero app.js e rendeva inattivi ACCEDI e MOSTRA.
- Ripristinato il funzionamento del login email/password.
- Ripristinato il pulsante MOSTRA / NASCONDI password.
- Rimossa la frase sotto LOGIN richiesta dall'utente.
- Controllo sintattico JavaScript eseguito prima della creazione dello ZIP.


## V18 - Login hard fix
- ACCEDI viene collegato all'inizio di app.js, prima degli altri moduli della web app.
- MOSTRA/NASCONDI ha anche un fallback inline indipendente dal resto del JavaScript.
- Aggiunto cache-busting `?v=18` a config.js e app.js.
- Il service worker elimina le vecchie cache durante l'aggiornamento.
- Aggiunta segnalazione visibile degli errori JavaScript nella schermata login.
- Sintassi app.js verificata con Node prima di generare il pacchetto.


## V19 - Import click fix
- Corretto il click su IMPORTA CARD nel menu sinistro.
- Corretto il click sul riquadro Importa Card della Dashboard.
- Aggiunto pulsante SCEGLI FILE nel riquadro Dashboard.
- Il drag & drop continua a funzionare.
- Il selettore supporta più file.
- Cache busting aggiornato a v19.
- Sintassi JavaScript verificata prima dello ZIP.


## V20 - Import click + persistent login
- Corretto il vero ID del riquadro Dashboard: `dashboardImportBtn`.
- Il pulsante IMPORTA CARD della sidebar apre direttamente il selettore file.
- Il riquadro Dashboard apre il selettore file con un click e continua ad accettare drag & drop.
- Anche IMPORTA CARD nella pagina Giocatori e Impostazioni apre il selettore.
- Rimossa una seconda assegnazione `.onclick` che sovrascriveva il comportamento corretto.
- Sessione Supabase impostata esplicitamente con `persistSession: true` e `localStorage`.
- Refresh pagina: la sessione viene recuperata automaticamente senza richiedere un nuovo login.
- Refresh automatico del token se vicino alla scadenza.
- Cache aggiornata a V20.
- Sintassi JavaScript verificata con Node.


## V21 - Deep fix
Analisi completa del codice V20.

Problemi reali trovati:
- Il codice chiamava `selectFiles`, `resetImport` e `processBatchCards`, ma queste funzioni non esistevano più.
- La finestra Importa Card aveva markup HTML corrotto e controlli residui.
- Il click dipendeva da `input.click()` JavaScript; ora usa il comportamento HTML nativo `<label for="cardFile">`.
- Il ripristino sessione poteva riportare alla login in caso di errore del database, anche con sessione valida.
- Il Service Worker poteva mantenere vecchie versioni di app.js.

Correzioni:
- Un solo file picker globale.
- Click nativo funzionante da sidebar, Dashboard, Giocatori, Impostazioni e finestra Importa.
- Drag & drop e click confluiscono nella stessa pipeline.
- Controller import completamente ricostruito.
- Multi-card con tab e archiviazione singola mantenuto.
- OCR e regioni di lettura NON modificati.
- Sessione Supabase persistente con chiave stabile e migrazione dalla V20.
- Refresh non forza più il login se la sessione è ancora valida.
- Service Worker disattivato e cache precedenti eliminate.
- Validazione JavaScript e controllo HTML eseguiti prima dello ZIP.

## V22 - Multi-card OCR fix
- Il batch OCR usa un solo worker Tesseract condiviso per tutte le card.
- Evita creazione/distruzione ripetuta di 8+ worker, causa probabile degli errori multipli.
- La lettura OCR e le coordinate del template non sono state modificate.
- Se una card fallisce, le altre continuano.
- In caso di errore viene mostrato anche il dettaglio tecnico della prima eccezione.
- Sintassi JavaScript verificata con Node.


## V23 - CARD_REGIONS fix
- Corretto l'errore runtime `CARD_REGIONS is not defined`.
- Ripristinate ESATTAMENTE le coordinate del lettore card della versione funzionante.
- Nessuna modifica alle zone OCR o alla logica di lettura approvata.
- Multi-card mantenuto.
- Cache aggiornata a V23.
- Sintassi JavaScript verificata prima dello ZIP.


## V24 - Precisione OCR
- Allargate leggermente le aree di cognome, nome, squadra, punti di forza e punti deboli per non tagliare la prima lettera.
- Corretto il filtro che eliminava una lettera iniziale separata dall'OCR: `J ENSEN` ora viene ricostruito come `JENSEN`.
- Stesso recupero applicato ai testi di punti di forza/deboli.
- Ruolo non più fisso su ATTACCANTE.
- Riconoscimento robusto DIFENSORE / CENTROCAMPISTA / ATTACCANTE con secondo passaggio OCR dedicato se necessario.
- Se il ruolo non è leggibile, resta vuoto invece di inventare ATTACCANTE.
- Multi-card mantenuto.


## V25 - Nazionalità
- Corrette le bandiere che in Chrome venivano mostrate come bandiera nera.
- INGHILTERRA, SCOZIA, GALLES e IRLANDA DEL NORD usano un fallback 🇬🇧 compatibile con Chrome/macOS invece delle subdivision emoji non supportate.
- I campi NAZIONALITÀ sono ora ricercabili: basta iniziare a digitare il nome della nazione.
- Il menu dei suggerimenti viene filtrato automaticamente dal browser.
- La bandiera compare anche a sinistra del campo una volta scelta la nazione.
- Il database continua a salvare solo il nome pulito della nazionalità, senza emoji.
- Ricerca nazionalità aggiunta anche al filtro Dashboard.


## V26 - Secondo layout card
- Supportato il nuovo template con pannello sinistro giallo.
- Nel nuovo template viene letto il COGNOME grande sotto la foto.
- NOME, SQUADRA e NUMERO restano vuoti perché non sono presenti sulla card e possono essere inseriti manualmente prima dell'archiviazione.
- PIEDE: `DESTRO` = DX, `SINISTRO` = SX.
- Il template storico DX/SX continua a funzionare.
- Ruolo letto da DIFENSORE / CENTROCAMPISTA / ATTACCANTE e non viene più forzato su ATTACCANTE se il testo non è leggibile.
- Riconoscimento bandiere completamente potenziato, con pattern specifici per Scozia, Germania, Danimarca, Inghilterra, Francia, Italia, Paesi Bassi, Belgio, Spagna, Brasile e Argentina.
- OCR multi-card mantenuto.


## V27 - Fix lettura template giallo
- Corrette le coordinate reali del secondo template 2048×1152.
- PIEDE: la zona ora comprende realmente la scritta DESTRO / SINISTRO.
- DESTRO = DX, SINISTRO = SX.
- Rimosso il default automatico DX: se il piede non è leggibile il campo resta vuoto.
- Migliorati i punti di forza e punti deboli con crop più ampio e soglie colore meno aggressive.
- Migliorato fortemente il riconoscimento bandiera.
- Il crop della bandiera gialla è stato ristretto alla sola bandiera circolare, evitando lo sfondo giallo.
- Pattern specifici ottimizzati per Germania e Scozia sulle card fornite.
- Se la nazionalità non è sufficientemente sicura, resta vuota invece di assegnarne una errata.
- Il template storico resta supportato.
