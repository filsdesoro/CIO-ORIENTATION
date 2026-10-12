-- =====================================================================
--  CIO-ORIENTATION — Migration 05 : création du CIO avec identifiant
--  creer_mon_cio enregistre en une fois : le CIO (avec DCIO et contact 2)
--  et l'administrateur avec son identifiant de connexion.
--  (remplace creer_cio, qui reste en place mais n'est plus utilisée)
-- =====================================================================

create or replace function public.creer_mon_cio(
  p_nom             text,
  p_identifiant     text,
  p_ville           text default null,
  p_drena           text default null,
  p_adresse         text default null,
  p_telephone       text default null,
  p_telephone2      text default null,
  p_chef_cio        text default null,
  p_email           text default null,
  p_admin_nom       text default null,
  p_admin_prenoms   text default null,
  p_admin_telephone text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_ident text := lower(trim(coalesce(p_identifiant, '')));
  v_cio   uuid;
begin
  if v_uid is null then
    raise exception 'Vous devez être connecté pour créer un CIO';
  end if;
  if exists (select 1 from public.personnel where id = v_uid) then
    raise exception 'Votre compte est déjà rattaché à un CIO';
  end if;
  if coalesce(trim(p_nom), '') = '' then
    raise exception 'Le nom du CIO est obligatoire';
  end if;
  if v_ident !~ '^[a-z0-9._-]{3,30}$' then
    raise exception 'Identifiant invalide : 3 à 30 caractères (lettres minuscules, chiffres, . - _)';
  end if;
  if exists (select 1 from public.personnel where identifiant = v_ident) then
    raise exception 'Cet identifiant est déjà utilisé';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  insert into public.cio (nom, ville, drena, adresse, telephone, telephone2, chef_cio, email)
  values (trim(p_nom), nullif(trim(p_ville), ''), nullif(trim(p_drena), ''),
          nullif(trim(p_adresse), ''), nullif(trim(p_telephone), ''),
          nullif(trim(p_telephone2), ''), nullif(trim(p_chef_cio), ''),
          nullif(trim(p_email), ''))
  returning id into v_cio;

  insert into public.personnel (id, cio_id, nom, prenoms, role, telephone, email, identifiant)
  values (v_uid, v_cio,
          coalesce(nullif(trim(p_admin_nom), ''), split_part(coalesce(v_email, 'admin'), '@', 1)),
          nullif(trim(p_admin_prenoms), ''), 'admin_cio',
          nullif(trim(p_admin_telephone), ''), v_email, v_ident);

  return v_cio;
end;
$$;

revoke execute on function public.creer_mon_cio(text, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant  execute on function public.creer_mon_cio(text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;
