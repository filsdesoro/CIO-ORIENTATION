-- =====================================================================
--  CIO-ORIENTATION — Migration 07 : fiche établissement complète
--  Champs alignés sur la liste officielle des établissements (Code DSPS,
--  Région, Département, Sous-préfecture, Commune, Localité, Quartier,
--  DRENA, Milieu, Statut, Régime) + chef d'établissement et coordonnées.
-- =====================================================================

alter table public.etablissements add column if not exists region          text;
alter table public.etablissements add column if not exists departement     text;
alter table public.etablissements add column if not exists sous_prefecture text;
alter table public.etablissements add column if not exists commune         text;
alter table public.etablissements add column if not exists quartier        text;
alter table public.etablissements add column if not exists drena           text;
alter table public.etablissements add column if not exists milieu          text;
alter table public.etablissements add column if not exists regime          text;
alter table public.etablissements add column if not exists chef_contact1   text;
alter table public.etablissements add column if not exists chef_contact2   text;
alter table public.etablissements add column if not exists adresse         text;

alter table public.etablissements drop constraint if exists etablissements_milieu_check;
alter table public.etablissements add constraint etablissements_milieu_check
  check (milieu is null or milieu in ('urbain', 'rural'));

alter table public.etablissements drop constraint if exists etablissements_regime_check;
alter table public.etablissements add constraint etablissements_regime_check
  check (regime is null or regime in ('mixte', 'garcons', 'filles'));

create index if not exists idx_etab_drena on public.etablissements (cio_id, drena);
create index if not exists idx_etab_code  on public.etablissements (cio_id, code);
