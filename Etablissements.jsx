import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, messageErreur, TYPES_ETAB, STATUTS_ETAB } from './supabase'
import { Alerte, Champ, Chargement, EnTete, Modale, Vide } from './ui'
import ChampLocalite from './ChampLocalite'

const VIDE = {
  nom: '',
  code: '',
  type: 'college',
  statut: 'public',
  localite: '',
  chef_etablissement: '',
  telephone: '',
  email: '',
}

export default function Etablissements({ profil }) {
  const estAdmin = profil.role === 'admin_cio'
  const [liste, setListe] = useState(null)
  const [affectations, setAffectations] = useState({})
  const [recherche, setRecherche] = useState('')
  const [voirInactifs, setVoirInactifs] = useState(false)
  const [edition, setEdition] = useState(null) // null | {} (nouveau) | établissement
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const [{ data, error }, { data: aff }] = await Promise.all([
      supabase.from('etablissements').select('*').order('nom'),
      supabase.from('conseiller_etablissements').select('etablissement_id, personnel(nom, prenoms)'),
    ])
    if (error) setErreur(messageErreur(error))
    setListe(data ?? [])
    const parEtab = {}
    for (const a of aff ?? []) {
      ;(parEtab[a.etablissement_id] ??= []).push(
        `${a.personnel?.nom ?? ''} ${a.personnel?.prenoms ?? ''}`.trim()
      )
    }
    setAffectations(parEtab)
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return (liste ?? []).filter(
      (e) =>
        (voirInactifs || e.actif) &&
        (!q || [e.nom, e.code, e.localite].some((v) => (v ?? '').toLowerCase().includes(q)))
    )
  }, [liste, recherche, voirInactifs])

  const basculerActif = async (e) => {
    const { error } = await supabase.from('etablissements').update({ actif: !e.actif }).eq('id', e.id)
    if (error) return setErreur(messageErreur(error))
    setInfo(e.actif ? `« ${e.nom} » a été désactivé.` : `« ${e.nom} » a été réactivé.`)
    charger()
  }

  if (!liste) return <Chargement />

  return (
    <>
      <EnTete
        titre="Écoles"
        sousTitre={`${liste.filter((e) => e.actif).length} établissement(s) actif(s) dans la zone`}
        actions={
          estAdmin && (
            <button className="btn btn-plein" onClick={() => setEdition({})}>
              + Ajouter un établissement
            </button>
          )
        }
      />
      <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
      <Alerte type="succes" onFermer={() => setInfo('')}>
        {info}
      </Alerte>

      <div className="carte">
        <div className="filtres">
          <input
            className="recherche"
            placeholder="Rechercher par nom, code ou localité…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <label className="case">
            <input type="checkbox" checked={voirInactifs} onChange={(e) => setVoirInactifs(e.target.checked)} />
            Afficher les inactifs
          </label>
        </div>

        {filtres.length === 0 ? (
          <Vide
            titre={liste.length === 0 ? 'Aucun établissement enregistré' : 'Aucun résultat'}
            texte={
              liste.length === 0 && estAdmin
                ? 'Ajoutez les collèges et lycées suivis par votre CIO.'
                : undefined
            }
          />
        ) : (
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Établissement</th>
                  <th>Type</th>
                  <th>Chef d'établissement</th>
                  <th>Conseiller(s)</th>
                  {estAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {filtres.map((e) => (
                  <tr key={e.id} className={e.actif ? '' : 'ligne-inactive'}>
                    <td>
                      <div className="cellule-titre">{e.nom}</div>
                      <div className="cellule-sous">
                        {[e.code, e.localite, e.telephone].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </td>
                    <td>
                      {TYPES_ETAB[e.type]}
                      <div className="cellule-sous">{STATUTS_ETAB[e.statut]}</div>
                    </td>
                    <td>{e.chef_etablissement || '—'}</td>
                    <td>
                      {affectations[e.id]?.length ? (
                        affectations[e.id].join(', ')
                      ) : (
                        <span className="etiquette etiquette-alerte">Non affecté</span>
                      )}
                    </td>
                    {estAdmin && (
                      <td className="actions-ligne">
                        <button className="btn btn-petit" onClick={() => setEdition(e)}>
                          Modifier
                        </button>
                        <button className="btn btn-petit btn-discret" onClick={() => basculerActif(e)}>
                          {e.actif ? 'Désactiver' : 'Réactiver'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edition && (
        <FormulaireEtablissement
          etab={edition}
          cioId={profil.cio_id}
          onFermer={() => setEdition(null)}
          onEnregistre={(msg) => {
            setEdition(null)
            setInfo(msg)
            charger()
          }}
        />
      )}
    </>
  )
}

function FormulaireEtablissement({ etab, cioId, onFermer, onEnregistre }) {
  const nouveau = !etab.id
  const [f, setF] = useState(() => ({ ...VIDE, ...Object.fromEntries(Object.keys(VIDE).map((k) => [k, etab[k] ?? VIDE[k]])) }))
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const maj = (cle) => (e) => setF({ ...f, [cle]: e.target.value })

  const enregistrer = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    setErreur('')
    const donnees = Object.fromEntries(
      Object.entries(f).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v])
    )
    donnees.type = f.type
    donnees.statut = f.statut
    const { error } = nouveau
      ? await supabase.from('etablissements').insert({ ...donnees, cio_id: cioId })
      : await supabase.from('etablissements').update(donnees).eq('id', etab.id)
    setEnvoi(false)
    if (error) return setErreur(messageErreur(error))
    onEnregistre(nouveau ? `« ${donnees.nom} » a été ajouté.` : `« ${donnees.nom} » a été mis à jour.`)
  }

  return (
    <Modale titre={nouveau ? 'Nouvel établissement' : `Modifier — ${etab.nom}`} onFermer={onFermer}>
      <form onSubmit={enregistrer}>
        <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
        <Champ label="Nom de l'établissement" requis>
          <input value={f.nom} onChange={maj('nom')} required autoFocus placeholder="ex : Collège Moderne de …" />
        </Champ>
        <div className="grille-2">
          <Champ label="Type">
            <select value={f.type} onChange={maj('type')}>
              {Object.entries(TYPES_ETAB).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Statut">
            <select value={f.statut} onChange={maj('statut')}>
              {Object.entries(STATUTS_ETAB).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
        </div>
        <Champ label="Code de l'établissement">
          <input value={f.code} onChange={maj('code')} />
        </Champ>
        <Champ label="Localité">
          <ChampLocalite value={f.localite} onChange={(v) => setF({ ...f, localite: v })} />
        </Champ>
        <Champ label="Chef d'établissement">
          <input value={f.chef_etablissement} onChange={maj('chef_etablissement')} />
        </Champ>
        <div className="grille-2">
          <Champ label="Téléphone">
            <input value={f.telephone} onChange={maj('telephone')} />
          </Champ>
          <Champ label="E-mail">
            <input type="email" value={f.email} onChange={maj('email')} />
          </Champ>
        </div>
        <div className="actions-formulaire">
          <button type="button" className="btn btn-discret" onClick={onFermer}>
            Annuler
          </button>
          <button className="btn btn-plein" disabled={envoi}>
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modale>
  )
}
