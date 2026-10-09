-- =====================================================================
--  CIO-ORIENTATION — Migration 02 : transfert d'élève avec inscription
--  À exécuter une fois dans le SQL Editor.
-- =====================================================================

drop function if exists public.transferer_eleve(text, uuid);

create or replace function public.transferer_eleve(
  p_matricule        text,
  p_etablissement_id uuid,
  p_niveau           text default null,
  p_classe           text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id    uuid;
  v_annee uuid;
begin
  if p_etablissement_id not in (select public.etablissements_accessibles()) then
    raise exception 'Établissement non autorisé pour cet utilisateur';
  end if;
  select id into v_id from public.eleves
   where upper(trim(matricule)) = upper(trim(p_matricule));
  if v_id is null then
    raise exception 'Aucun élève trouvé avec ce matricule';
  end if;

  update public.eleves set etablissement_actuel_id = p_etablissement_id where id = v_id;

  if p_niveau is not null then
    select a.id into v_annee from public.annees_scolaires a
     where a.en_cours order by a.date_debut desc nulls last limit 1;
    if v_annee is not null then
      insert into public.inscriptions (eleve_id, etablissement_id, annee_id, niveau, classe)
      values (v_id, p_etablissement_id, v_annee, p_niveau, nullif(trim(p_classe), ''))
      on conflict (eleve_id, annee_id) do update
        set etablissement_id = excluded.etablissement_id,
            niveau           = excluded.niveau,
            classe           = coalesce(excluded.classe, public.inscriptions.classe);
    end if;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.transferer_eleve(text, uuid, text, text) from public, anon;
grant  execute on function public.transferer_eleve(text, uuid, text, text) to authenticated;
