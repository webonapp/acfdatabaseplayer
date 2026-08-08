-- PLAYER ANALYSIS DATABASE
-- Esegui tutto questo file nel Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  country text default '',
  competition text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  team_id uuid not null references public.teams(id) on delete restrict,
  number smallint,
  role text default '',
  position text default '',
  height smallint,
  foot text default 'DX' check (foot in ('DX','SX','AMB')),
  birth_year smallint,
  nationality text default '',
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists players_team_id_idx on public.players(team_id);
create index if not exists players_birth_year_idx on public.players(birth_year);
create index if not exists players_role_idx on public.players(role);
create index if not exists players_nationality_idx on public.players(nationality);
create index if not exists players_strengths_gin_idx on public.players using gin(strengths);
create index if not exists players_weaknesses_gin_idx on public.players using gin(weaknesses);

alter table public.teams enable row level security;
alter table public.players enable row level security;

-- Versione iniziale: accesso consentito soltanto agli utenti autenticati.
-- Quando aggiungeremo login, queste policy proteggeranno il database.
drop policy if exists "authenticated read teams" on public.teams;
drop policy if exists "authenticated write teams" on public.teams;
drop policy if exists "authenticated read players" on public.players;
drop policy if exists "authenticated write players" on public.players;

create policy "authenticated read teams"
on public.teams for select
to authenticated
using (true);

create policy "authenticated write teams"
on public.teams for all
to authenticated
using (true)
with check (true);

create policy "authenticated read players"
on public.players for select
to authenticated
using (true);

create policy "authenticated write players"
on public.players for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, update, delete on public.players to authenticated;

-- Dati iniziali
insert into public.teams(name,country,competition)
values
 ('Deportivo La Coruña','Spagna','LaLiga Hypermotion'),
 ('Fiorentina','Italia','Serie A'),
 ('Juventus','Italia','Serie A'),
 ('Inter','Italia','Serie A')
on conflict (name) do nothing;

insert into public.players(first_name,last_name,team_id,number,role,position,height,foot,birth_year,nationality,strengths,weaknesses)
select
 'Jonathan Asp','Jensen',t.id,18,'Attaccante','Centro-destra',182,'DX',2006,'Danimarca',
 array['Gioca tra le linee','Dribbling 1 vs 1','Filtranti'],
 array['Duelli corpo a corpo','Scopre palla in conduzione']
from public.teams t
where t.name='Deportivo La Coruña'
and not exists (
  select 1 from public.players p
  where p.first_name='Jonathan Asp' and p.last_name='Jensen'
);
