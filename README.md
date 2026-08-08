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
