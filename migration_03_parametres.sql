-- =====================================================================
--  CIO-ORIENTATION — Migration 03 : rubrique Paramètres
--  - Chef du CIO (DCIO), deuxième contact et logo du CIO
--  - Espace de stockage « logos » (un dossier par CIO)
--  - Suppression complète d'un CIO par son administrateur
--  À exécuter une fois dans le SQL Editor.
-- =====================================================================

-- 1. Nouveaux champs du CIO ---------------------------------------------
alter table public.cio add column if not exists chef_cio   text;   -- Directeur du CIO (DCIO)
alter table public.cio add column if not exists telephone2 text;   -- Contact 2 (telephone = Contact 1)
alter table public.cio add column if not exists logo_url   text;


-- 2. Stockage des logos ---------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576,
        array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists logos_lecture     on storage.objects;
drop policy if exists logos_ajout_admin on storage.objects;
drop policy if exists logos_modif_admin on storage.objects;
drop policy if exists logos_suppr_admin on storage.objects;

-- Lecture publique (le logo s'affiche dans l'application)
create policy logos_lecture on storage.objects for select
  using (bucket_id = 'logos');

-- Écriture : uniquement l'admin du CIO, dans le dossier de son CIO
create policy logos_ajout_admin on storage.objects for insert to authenticated
  with check (bucket_id = 'logos'
              and (storage.foldername(name))[1] = public.mon_cio()::text
              and public.mon_role() = 'admin_cio');

create policy logos_modif_admin on storage.objects for update to authenticated
  using (bucket_id = 'logos'
         and (storage.foldername(name))[1] = public.mon_cio()::text
         and public.mon_role() = 'admin_cio');

create policy logos_suppr_admin on storage.objects for delete to authenticated
  using (bucket_id = 'logos'
         and (storage.foldername(name))[1] = public.mon_cio()::text
         and public.mon_role() = 'admin_cio');


-- 3. Suppression d'un CIO -------------------------------------------------
--   Réservée à l'administrateur actif du CIO, qui doit retaper le nom exact.
--   Supprime : établissements, parcours et élèves rattachés uniquement à ce
--   CIO, personnel, comptes de connexion des autres membres, activités,
--   pondération. Le compte de l'administrateur est conservé : à sa prochaine
--   connexion, il pourra créer un nouveau CIO.
create or replace function public.supprimer_cio(p_nom_confirmation text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_cio     uuid;
  v_nom     text;
  v_etabs   uuid[];
  v_membres uuid[];
begin
  select p.cio_id, c.nom into v_cio, v_nom
    from public.personnel p join public.cio c on c.id = p.cio_id
   where p.id = v_uid and p.actif and p.role = 'admin_cio';
  if v_cio is null then
    raise exception 'Action réservée à l''administrateur du CIO';
  end if;
  if upper(trim(coalesce(p_nom_confirmation, ''))) <> upper(trim(v_nom)) then
    raise exception 'Le nom saisi ne correspond pas au nom du CIO';
  end if;

  select coalesce(array_agg(id), '{}') into v_etabs
    from public.etablissements where cio_id = v_cio;
  select coalesce(array_agg(id), '{}') into v_membres
    from public.personnel where cio_id = v_cio and id <> v_uid;

  -- Parcours dans les établissements du CIO (notes, absences… suivent)
  delete from public.inscriptions where etablissement_id = any(v_etabs);
  -- Élèves de ce CIO qui n'ont aucun parcours ailleurs
  delete from public.eleves e
   where e.etablissement_actuel_id = any(v_etabs)
     and not exists (select 1 from public.inscriptions i where i.eleve_id = e.id);
  -- Le CIO (établissements, personnel, activités, pondération suivent)
  delete from public.cio where id = v_cio;
  -- Comptes de connexion des autres membres du CIO
  delete from auth.users where id = any(v_membres);
end;
$$;

revoke execute on function public.supprimer_cio(text) from public, anon;
grant  execute on function public.supprimer_cio(text) to authenticated;
