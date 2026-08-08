# Player Analysis Database

Architettura:
- Frontend statico su GitHub Pages
- Database PostgreSQL su Supabase
- Supabase JS nel browser
- RLS attivo

## 1. Crea il progetto Supabase
Vai su Supabase, crea un progetto e apri SQL Editor.
Copia/incolla tutto il contenuto di `supabase_setup.sql` ed eseguilo.

## 2. Configura la web app
Nel progetto Supabase apri "Connect" oppure Settings > API Keys.
Copia:
- Project URL
- Publishable key

Apri `config.js` e sostituisci i due placeholder.

NON usare una Secret key / service_role nel browser.

## 3. Autenticazione
Le policy del database sono già impostate per utenti `authenticated`.
Prima della pubblicazione operativa va aggiunta la schermata login Supabase Auth.
Questo evita di rendere pubblico il database giocatori.

## 4. GitHub Pages
Crea un repository GitHub.
Carica tutti i file di questa cartella nella root.
In GitHub:
Settings > Pages > Deploy from a branch > main / root

GitHub genererà l'URL pubblico della web app.

## Ricerca
La ricerca globale cerca anche dentro:
- punti di forza
- punti deboli
- nome/cognome
- squadra
- ruolo
- posizione
- nazionalità
- note

## Età
Nel database viene salvato soltanto l'anno di nascita.
L'app considera convenzionalmente il compleanno al 1° marzo e calcola automaticamente l'età.

## Prossimi moduli consigliati
1. Login Supabase Auth
2. Foto giocatore compresse in Supabase Storage
3. Posizione cliccabile sul campo
4. Storico delle analisi per partita/data
5. Generatore della card grafica e download PNG/PDF
