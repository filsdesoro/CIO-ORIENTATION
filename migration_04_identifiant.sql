-- =====================================================================
--  CIO-ORIENTATION — Migration 04 : connexion par identifiant court
--  Chaque membre du personnel reçoit un identifiant unique
--  (ex : admin.bouake, soro.k) utilisé à la place de l'e-mail.
--  À exécuter une fois dans le SQL Editor.
-- =====================================================================

alter table public.personnel add column if not exists identifiant text;

-- Format : 3 à 30 caractères, minuscules, chiffres, point, tiret, tiret bas
alter table public.personnel drop constraint if exists personnel_identifiant_format;
alter table public.personnel add constraint personnel_identifiant_format
  check (identifiant is null or identifiant ~ '^[a-z0-9._-]{3,30}$');

-- Unique dans toute l'application
create unique index if not exists personnel_identifiant_unique
  on public.personnel (identifiant);
