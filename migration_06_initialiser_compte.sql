-- =====================================================================
--  CIO-ORIENTATION — Migration 06 : initialisation automatique du compte
--  À la première connexion d'un compte qui n'appartient à aucun CIO,
--  une fiche CIO provisoire (« CIO à renseigner ») est créée et le compte
--  en devient l'administrateur. Toutes les rubriques sont ainsi utilisables
--  tout de suite ; la fiche se complète ensuite dans Paramètres.
-- =====================================================================

create or replace function public.initialiser_compte()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_cio   uuid;
begin
  if v_uid is null then
    raise exception 'Vous devez être connecté';
  end if;

  -- Déjà rattaché : rien à faire
  select cio_id into v_cio from public.personnel where id = v_uid;
  if v_cio is not null then
    return v_cio;
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  insert into public.cio (nom) values ('CIO à renseigner')
  returning id into v_cio;

  insert into public.personnel (id, cio_id, nom, role, email)
  values (v_uid, v_cio, upper(split_part(coalesce(v_email, 'administrateur'), '@', 1)), 'admin_cio', v_email);

  return v_cio;
end;
$$;

revoke execute on function public.initialiser_compte() from public, anon;
grant  execute on function public.initialiser_compte() to authenticated;
