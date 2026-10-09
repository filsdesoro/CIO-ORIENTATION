import { useEffect, useState } from 'react'
import { supabase, NIVEAUX, LIBELLES_NIVEAUX, TYPES_ETAB } from '../lib/supabase'
import { Chargement, EnTete, Vide, Alerte } from '../components/ui'

export default function TableauDeBord({ profil, annee, setPage }) {
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let actif = true
    ;(async () => {
      const estConseil = ['admin_cio', 'conseiller'].includes(profil.role)
      const [acc, etabs, eleves, stats, perso, entretiens, activites] = await Promise.all([
        supabase.rpc('etablissements_accessibles'),
        supabase.from('etablissements').select('id, nom, type, localite').eq('actif', true).order('nom'),
        supabase.from('eleves').select('id', { count: 'exact', head: true }),
        annee
          ? supabase.from('v_stats_etablissements').select('*').eq('annee_id', annee.id)
          : Promise.resolve({ data: [] }),
        profil.role === 'admin_cio'
          ? supabase.from('personnel').select('id, role').eq('actif', true)
          : Promise.resolve({ data: [] }),
        estConseil && annee
          ? supabase
              .from('entretiens')
              .select('id', { count: 'exact', head: true })
              .gte('date_entretien', annee.date_debut ?? '1900-01-01')
              .lte('date_entretien', annee.date_fin ?? '2999-12-31')
          : Promise.resolve({ count: null }),
        annee
          ? supabase
              .from('activites_information')
              .select('nb_garcons, nb_filles')
              .gte('date_activite', annee.date_debut ?? '1900-01-01')
              .lte('date_activite', annee.date_fin ?? '2999-12-31')
          : Promise.resolve({ data: [] }),
      ])
      if (!actif) return
      const err = [acc, etabs, eleves, stats].find((r) => r.error)
      if (err) setErreur(err.error.message)

      const ids = new Set((acc.data ?? []).map((x) => (typeof x === 'string' ? x : Object.values(x)[0])))
      const mesEtabs = (etabs.data ?? []).filter((e) => ids.has(e.id))

      const parEtab = {}
      const parNiveau = Object.fromEntries(NIVEAUX.map((n) => [n, { f: 0, g: 0 }]))
      for (const s of stats.data ?? []) {
        const e = (parEtab[s.etablissement_id] ??= { effectif: 0, filles: 0, garcons: 0, admis: 0 })
        e.effectif += s.effectif
        e.filles += s.filles
        e.garcons += s.garcons
        e.admis += s.admis
        if (parNiveau[s.niveau]) {
          parNiveau[s.niveau].f += s.filles
          parNiveau[s.niveau].g += s.garcons
        }
      }
      const personnel = perso.data ?? []
      setDonnees({
        etabs: mesEtabs,
        nbEleves: eleves.count ?? 0,
        parEtab,
        parNiveau,
        nbConseillers: personnel.filter((p) => p.role === 'conseiller').length,
        nbFocaux: personnel.filter((p) => p.role === 'point_focal').length,
        nbEntretiens: entretiens.count,
        participants: (activites.data ?? []).reduce((t, a) => t + a.nb_garcons + a.nb_filles, 0),
        nbActivites: (activites.data ?? []).length,
      })
    })()
    return () => {
      actif = false
    }
  }, [profil, annee])

  if (!donnees) return <Chargement />

  const inscritsAnnee = Object.values(donnees.parEtab).reduce((t, e) => t + e.effectif, 0)
  const maxNiveau = Math.max(1, ...Object.values(donnees.parNiveau).map((n) => n.f + n.g))
  const portee =
    profil.role === 'admin_cio'
      ? 'Vue d’ensemble de la zone'
      : profil.role === 'conseiller'
        ? 'Vos établissements suivis'
        : 'Votre établissement'

  return (
    <>
      <EnTete
        titre="Tableau de bord"
        sousTitre={`${portee} · Année scolaire ${annee?.libelle ?? 'non définie'}`}
      />
      <Alerte>{erreur}</Alerte>

      <section className="tuiles">
        <Tuile valeur={donnees.etabs.length} libelle="Établissements" onClick={() => setPage('etablissements')} />
        <Tuile valeur={donnees.nbEleves} libelle="Élèves suivis" detail={`${inscritsAnnee} inscrits cette année`} onClick={() => setPage('eleves')} />
        {profil.role === 'admin_cio' && (
          <Tuile
            valeur={donnees.nbConseillers}
            libelle="Conseillers"
            detail={`${donnees.nbFocaux} point(s) focal(aux)`}
            onClick={() => setPage('personnel')}
          />
        )}
        {donnees.nbEntretiens !== null && (
          <Tuile valeur={donnees.nbEntretiens} libelle="Entretiens cette année" />
        )}
        <Tuile
          valeur={donnees.nbActivites}
          libelle="Séances d'information"
          detail={`${donnees.participants} participant(s)`}
        />
      </section>

      {donnees.etabs.length === 0 ? (
        <div className="carte">
          <Vide
            titre="Aucun établissement pour l'instant"
            texte={
              profil.role === 'admin_cio'
                ? 'Commencez par enregistrer les établissements de votre zone.'
                : "Aucun établissement ne vous a encore été affecté par l'administrateur du CIO."
            }
            action={
              profil.role === 'admin_cio' && (
                <button className="btn btn-plein" onClick={() => setPage('etablissements')}>
                  Ajouter un établissement
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="deux-colonnes">
          <section className="carte">
            <h2 className="carte-titre">Effectifs par établissement</h2>
            <div className="tableau-defilant">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Établissement</th>
                    <th className="num">Inscrits</th>
                    <th className="num">Filles</th>
                    <th className="num">Garçons</th>
                    <th className="num">Admis</th>
                  </tr>
                </thead>
                <tbody>
                  {donnees.etabs.map((e) => {
                    const s = donnees.parEtab[e.id] ?? { effectif: 0, filles: 0, garcons: 0, admis: 0 }
                    return (
                      <tr key={e.id}>
                        <td>
                          <div className="cellule-titre">{e.nom}</div>
                          <div className="cellule-sous">
                            {TYPES_ETAB[e.type]}
                            {e.localite ? ` · ${e.localite}` : ''}
                          </div>
                        </td>
                        <td className="num">{s.effectif}</td>
                        <td className="num">{s.filles}</td>
                        <td className="num">{s.garcons}</td>
                        <td className="num">{s.admis}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="carte">
            <h2 className="carte-titre">Répartition par niveau</h2>
            <div className="legende">
              <span className="pastille pastille-f" /> Filles
              <span className="pastille pastille-g" /> Garçons
            </div>
            <div className="barres">
              {NIVEAUX.map((n) => {
                const { f, g } = donnees.parNiveau[n]
                return (
                  <div className="barre-ligne" key={n}>
                    <span className="barre-label">{LIBELLES_NIVEAUX[n]}</span>
                    <div className="barre-piste">
                      <div className="barre-f" style={{ width: `${(f / maxNiveau) * 100}%` }} title={`${f} filles`} />
                      <div className="barre-g" style={{ width: `${(g / maxNiveau) * 100}%` }} title={`${g} garçons`} />
                    </div>
                    <span className="barre-total">{f + g}</span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </>
  )
}

function Tuile({ valeur, libelle, detail, onClick }) {
  const Balise = onClick ? 'button' : 'div'
  return (
    <Balise className={`tuile ${onClick ? 'tuile-cliquable' : ''}`} onClick={onClick}>
      <span className="tuile-valeur">{valeur}</span>
      <span className="tuile-libelle">{libelle}</span>
      {detail && <span className="tuile-detail">{detail}</span>}
    </Balise>
  )
}
