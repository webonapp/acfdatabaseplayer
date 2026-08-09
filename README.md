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


## V28 - Deep fix PIEDE + NAZIONALITÀ

Analisi profonda:
- Nel template giallo il piede dominante è già codificato graficamente: una delle due impronte è blu.
- Usare OCR sulla parola DESTRO/SINISTRO introduceva errori inutili.
- La nazionalità veniva classificata quasi solo tramite percentuale totale dei colori, metodo fragile con bordi, JPEG e sfondi.

Fix:
- PIEDE template giallo: eliminato completamente l'OCR.
- Il software rileva direttamente il baricentro dei pixel blu:
  - impronta destra blu = DX
  - impronta sinistra blu = SX
- Se non rileva abbastanza blu, lascia il campo vuoto invece di inventare un valore.
- NAZIONALITÀ: nuovo algoritmo basato anche sulla geometria della bandiera.
- Riconosce bande verticali/orizzontali e pattern cromatici.
- Germania riconosciuta come nero/rosso/giallo orizzontale.
- Scozia riconosciuta da campo blu dominante + diagonali bianche.
- Migliorati anche Francia, Italia, Belgio, Paesi Bassi, Argentina, Spagna, Danimarca, Inghilterra e Brasile.
- Il campo nazionalità viene aggiornato esplicitamente insieme alla preview della bandiera.
- Il template storico rimane invariato.


## V29 - Fix definitivo lettura PIEDE

Analisi delle card reali fornite:
- Nelle card bianche il valore DX è colorato in BLU.
- Nelle card bianche il valore SX è colorato in GIALLO/ORO.
- Nelle card gialle il piede dominante è indicato dall'impronta BLU.

Modifiche:
- Le card bianche non usano più l'OCR come metodo principale per il piede.
- Il software conta direttamente i pixel BLU e GIALLO nella zona PIEDE:
  - giallo dominante = SX
  - blu dominante = DX
- Testato sulle card fornite di Carreras e Güler: entrambe SX hanno una forte presenza gialla e nessun blu.
- Verificato anche sul template Jensen DX: presenza blu forte e nessun giallo.
- L'OCR resta solo come fallback.
- Rimossi tutti i default automatici che trasformavano un valore non letto in DX.
- Se il piede non è riconoscibile con sicurezza, resta vuoto invece di essere classificato erroneamente.


## V30 - Nessuna nota automatica
- Rimossa completamente la nota automatica "IMPORTATO AUTOMATICAMENTE DA CARD".
- I nuovi giocatori importati dalle card vengono salvati con il campo NOTE vuoto.
- Il campo NOTE resta comunque disponibile per inserimenti manuali.


## V31 - Miglioramento lettura OCR

ALTEZZA
- Lettura multipla della zona altezza con 4 preprocess diversi.
- Ogni variante viene letta sia in PSM 6 sia in PSM 7.
- Vengono accettati solo valori plausibili tra 150 e 215 cm.
- Il valore finale viene scelto per consenso tra più letture.
- Se due letture sono in conflitto e non c'è sufficiente certezza, il campo resta vuoto invece di salvare un'altezza errata.

PUNTI DI FORZA / DEBOLI
- Crop ampliato ulteriormente su tutti i lati.
- Quattro passaggi OCR: immagine originale, filtro colore permissivo, filtro colore forte e scala di grigi.
- Viene selezionata la lettura con maggior contenuto alfabetico.
- Recupero automatico delle prime lettere perse quando un'altra passata OCR le rileva.
- Gestione dei casi tipo "F ILTRANTE" -> "FILTRANTE".

NAZIONALITÀ
- Nuovo classificatore V31 con punteggio per distribuzione spaziale dei colori.
- Il sistema confronta bande orizzontali, verticali e composizione globale.
- Aggiunti controlli di confidenza e margine rispetto alla seconda nazione candidata.
- Se il risultato è ambiguo, non viene più assegnata una nazionalità sbagliata.
- Migliorati i pattern di Germania, Scozia, Spagna, Francia, Italia, Belgio, Paesi Bassi, Argentina, Danimarca, Inghilterra, Brasile, Polonia, Ucraina, Austria, Nigeria, Irlanda, Romania e Colombia.

Il riconoscimento PIEDE della V29 resta invariato.


## V32 - Smart Reader

La lettura card è stata ricostruita come pipeline adattiva anziché affidarsi a una singola OCR.

IDENTITÀ
- Riconosce automaticamente pannello sinistro blu, chiaro o template giallo.
- Nome, cognome e squadra usano 8 letture OCR per campo (originale, scala di grigi e due binarizzazioni, PSM 6/7).
- Il miglior risultato viene scelto tramite punteggio di qualità.
- Il template bianco non viene più trattato come se avesse testo bianco.

NUMERO
- Crop allargato fino al bordo sinistro, evitando 15 -> 5.
- OCR esclusivamente numerico con PSM 6/7/11 e voto tra più letture.

ANNO
- Più letture OCR e confronto con l'età presente sulla card.
- Se l'anno è danneggiato dall'OCR, può essere ricostruito dall'età usando la convenzione del 1 marzo.
- Vengono accettati solo anni plausibili.

ALTEZZA
- Mantiene il sistema multi-pass a consenso della V31.

PUNTI DI FORZA / DEBOLI
- Il software individua prima i pixel realmente verdi o rossi.
- Calcola automaticamente il bounding box del testo, quindi non dipende da un crop troppo stretto.
- Rileva le singole righe tramite proiezione orizzontale.
- Ogni riga viene letta separatamente con tre preprocessing.
- Il risultato riga-per-riga viene confrontato con la lettura dell'intero blocco.
- Riduce drasticamente prime lettere tagliate, righe duplicate e contaminazioni tra punti di forza/deboli.

NAZIONALITÀ
- Crop più stretto sulla sola bandiera.
- Classificatore V32 con distribuzione spaziale dei colori e confidence gating.
- Aggiunto riconoscimento TURCHIA.
- Se la bandiera non è abbastanza sicura, il campo resta vuoto anziché assegnare una nazione sbagliata.

PIEDE
- Mantiene il riconoscimento deterministico a colori della V29.
- Nessun default automatico DX.

RUOLO
- Mantiene doppio passaggio OCR e non forza ATTACCANTE se incerto.


## V33 - Bandiere estese + quadrato immaginario PIEDE

PIEDE TEMPLATE GIALLO
- Implementato il "quadrato immaginario" richiesto intorno all'intero blocco PIEDE.
- Il riquadro viene analizzato pixel per pixel.
- BLU/AZZURRO dominante = DX.
- GIALLO/ORO dominante = SX.
- Se nessun colore è sufficientemente dominante, il campo resta vuoto.
- Non viene utilizzato OCR per decidere il piede nel template giallo.

NAZIONALITÀ
- Motore di riconoscimento esteso a oltre 70 nazionalità / federazioni frequenti nel calcio.
- Copertura ampliata a:
  Portogallo, Croazia, Serbia, Bosnia-Erzegovina, Slovenia, Slovacchia, Ungheria,
  Bulgaria, Russia, Svezia, Norvegia, Finlandia, Islanda, Grecia, Svizzera,
  Albania, Kosovo, Macedonia del Nord, Georgia, Armenia, Marocco, Algeria,
  Tunisia, Egitto, Senegal, Costa d'Avorio, Ghana, Camerun, Mali, Guinea,
  Nigeria, Sudafrica, Capo Verde, Gambia, Burkina Faso, Gabon, Angola,
  RD Congo, Congo, Stati Uniti, Canada, Messico, Uruguay, Paraguay, Cile,
  Perù, Ecuador, Venezuela, Bolivia, Costa Rica, Panama, Giamaica, Giappone,
  Corea del Sud, Cina, Australia, Nuova Zelanda, Iran, Iraq, Arabia Saudita,
  Qatar e Israele, oltre alle nazioni già presenti.
- Riconoscimento basato su struttura spaziale, bande, colori centrali e angoli.
- Confidence gate: in caso di dubbio il campo resta vuoto invece di assegnare una bandiera errata.


## V34 - Due tipologie card, riconoscimento strutturale

IMPORTANTE
- Il colore della fascia laterale NON viene più usato per capire il tipo di card.
- Può essere rosso, nero, blu, giallo, viola o qualsiasi colore della squadra.

TIPO 1 - senza nome e squadra
- cognome: area dedicata
- numero: area dedicata
- nazione: cerchio bandiera
- ruolo: box superiore
- altezza: box destro superiore
- piede: box destro centrale
- età/anno: box destro inferiore
- punti di forza/deboli invariati

TIPO 2 - con nome e squadra
- nome
- cognome
- squadra sotto il cognome
- numero
- nazione
- ruolo
- altezza
- piede
- età/anno
- punti di forza/deboli invariati

RICONOSCIMENTO TIPO
- Il lettore controlla il contenuto della riga SQUADRA.
- Se trova una vera riga testuale di squadra, riconosce TIPO 2.
- Se la riga squadra è vuota, riconosce TIPO 1.
- Viene usata anche evidenza da nome/cognome per evitare falsi positivi.

TESTO SU FASCIA COLORATA
- Nuovo preprocessing adattivo con soglia Otsu.
- Legge sia testo chiaro su fondo scuro sia testo scuro su fondo chiaro.
- Il colore della squadra non influenza la lettura.

PIEDE
- Un'unica regola per entrambe le tipologie.
- All'interno del box PIEDE:
  BLU/AZZURRO dominante = DX
  GIALLO/ORO dominante = SX
- Nessun OCR e nessun default automatico.

ETÀ / ANNO
- Legge il box verde e confronta età e anno di nascita.
- Se disponibile solo l'età, ricava l'anno usando la convenzione del 1 marzo.

NAZIONALITÀ
- Il classificatore esteso della V33 viene mantenuto.


## V36 - Vedi giocatori della squadra
- Attivato il pulsante VEDI GIOCATORI nella sezione SQUADRE.
- Si apre una finestra dedicata con tutti i giocatori già archiviati della squadra selezionata.
- Ricerca interna per nome, ruolo, nazionalità e caratteristiche.
- Ordinamento per alfabetico, età, piede, ruolo e nazionalità.
- MODIFICA ed ELIMINA disponibili direttamente dalla lista.


## V37 - Nuovo lettore card

Nuovo layout 2048×1149 integrato come lettore principale.

Mappatura:
- NOME: fascia sinistra sotto foto
- COGNOME: riga grande sotto nome
- SQUADRA: sotto cognome
- NUMERO: grande sotto squadra
- NAZIONALITÀ: bandiera circolare in basso a sinistra
- RUOLO: titolo in alto al centro
- ALTEZZA: box alto a destra
- PIEDE: box destro centrale
  - BLU/AZZURRO = DX
  - GIALLO/ORO = SX
- ETÀ/ANNO: box destro inferiore
- PUNTI DI FORZA: testo verde
- PUNTI DEBOLI: testo rosso

La fascia laterale può avere qualunque colore e non influenza la lettura.
Punti forza/deboli mantengono il sistema avanzato a rilevamento colore + OCR riga per riga.


## V38 - Precision Reader 2048×1152

Il layout allegato diventa il formato standard delle card.

Migliorie:
- ROI molto più strette e fisse per ogni campo.
- OCR multi-pass e voto tra letture per nome, cognome, squadra, numero, ruolo e altezza.
- Altezza accettata solo se plausibile (155–210 cm).
- Piede letto esclusivamente dal colore del valore: blu/azzurro = DX, giallo/oro = SX.
- Bandiera isolata dal colore della fascia laterale prima della classificazione.
- Età/anno con controllo di plausibilità.
- Punti di forza/deboli letti riga per riga usando prima la maschera cromatica verde/rossa.
- Nessun default automatico ATTACCANTE/DX in caso di lettura incerta.


## V39 - Precision Plus
- Numero maglia: multi-scale, PSM multipli e voto forte sui numeri a due cifre.
- Punti di forza/deboli: segmentazione per righe migliorata, più preprocessing, recupero prima lettera e deduplicazione.
- Bandiera: crop più stretto, eliminazione del bordo/ombra/fascia laterale e maschera circolare interna prima della classificazione.

## V40 - Batch Fix + Fast Precision
- Fix multi-card: un solo worker OCR condiviso per tutto il batch.
- Elaborazione sequenziale con rilascio del thread tra le card per evitare freeze.
- Supporto fino a 25 card.
- Numero maglia migliorato, incluso caso 8 vs 3.
- Punti di forza/deboli con margini orizzontali più larghi per non perdere prime/ultime lettere.
- Ridotti i passaggi OCR ridondanti per aumentare la velocità.

## V41
- Punti forza/deboli: box più largo e lettura prioritaria dell'intero blocco per non troncare prime/ultime lettere.
- Numero: crop più ampio, trattamento specifico del caso 8/3.
- Batch: un solo worker OCR condiviso, meno aggiornamenti UI e meno passaggi OCR.
- X su ogni tab giocatore per rimuovere una card dal batch dopo la lettura.

## V42 - Color Mask Reader
- Punti forza/deboli: OCR eseguito solo sui pixel verdi/rossi, tutto il resto viene cancellato prima della lettura.
- Maschera con dilatazione 1px per conservare tratti sottili e prime/ultime lettere.
- Bounding box calcolato sul testo reale e margini applicati solo dopo il filtraggio, quindi niente contaminazioni.
- Lettura blocco + righe singole con confronto finale.
- Mantiene X per rimuovere una card dal batch e batch condiviso V41.

## V43 - Nome/Cognome Precision
- ROI nome e cognome ampliate, soprattutto a sinistra.
- OCR dedicato per identità con 3 scale, 2 varianti immagine e PSM 7/13.
- Voto tra letture multiple.
- Recupero automatico fino a 3 lettere iniziali/finali perse.
- Esempio gestito: STANTINOS -> KOSTANTINOS, ODULIERAKIS -> KOULIERAKIS.
