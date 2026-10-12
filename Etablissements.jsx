import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, messageErreur, TYPES_ETAB, STATUTS_ETAB, MILIEUX, REGIMES } from './supabase'
import { Alerte, Champ, Chargement, EnTete, Modale, Vide } from './ui'
import ChampLocalite from './ChampLocalite'
import ImportEcoles from './ImportEcoles'

// Champs de la fiche établissement (alignés sur la liste officielle)
const VIDE = {
  nom: '',
  code: '',
  type: 'college',
  statut: 'public',
  milieu: '',
  regime: '',
  drena: '',
  region: '',
  departement: '',
  sous_prefecture: '',
  commune: '',
  localite: '',
  quartier: '',
  chef_etablissement: '',
  chef_contact1: '',
  chef_contact2: '',
  telephone: '',
  email: '',
  adresse: '',
}

const valeursDistinctes = (liste, cle) =>
  [...new Set(liste.map((e) => e[cle]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'))

export default function Etablissements({ profil }) {
  const estAdmin = profil.role === 'admin_cio'
  const [liste, setListe] = useState(null)
  const [affectations, setAffectations] = useState({})
  const [recherche, setRecherche] = useState('')
  const [filtreDrena, setFiltreDrena] = useState('')
  const [filtreMilieu, setFiltreMilieu] = useState('')
  const [voirInactifs, setVoirInactifs] = useState(false)
  const [importOuvert, setImportOuvert] = useState(false)
  const [edition, setEdition] = useState(null) // null | {} (nouveau) | établissement
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const [{ data, error }, { data: aff }] = await Promise.all([
      supabase.from('etablissements').select('*').order('nom').range(0, 4999),
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

  const actifs = useMemo(() => (liste ?? []).filter((e) => e.actif), [liste])
  const drenas = useMemo(() => valeursDistinctes(actifs, 'drena'), [actifs])

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return (liste ?? []).filter(
      (e) =>
        (voirInactifs || e.actif) &&
        (!filtreDrena || e.drena === filtreDrena) &&
        (!filtreMilieu || e.milieu === filtreMilieu) &&
        (!q ||
          [e.nom, e.code, e.localite, e.commune, e.sous_prefecture, e.departement, e.region, e.quartier, e.drena].some(
            (v) => (v ?? '').toLowerCase().includes(q)
          ))
    )
  }, [liste, recherche, voirInactifs, filtreDrena, filtreMilieu])

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
        sousTitre={`${actifs.length} établissement(s) actif(s) · ${drenas.length} DRENA`}
        actions={
          estAdmin && (
            <>
              <button className="btn" onClick={() => setImportOuvert(true)}>
                ⇪ Importer un fichier
              </button>
              <button className="btn btn-plein" onClick={() => setEdition({})}>
                + Ajouter un établissement
              </button>
            </>
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
            placeholder="Rechercher : nom, code, localité, commune, région…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <select value={filtreDrena} onChange={(e) => setFiltreDrena(e.target.value)}>
            <option value="">Toutes les DRENA</option>
            {drenas.map((d) => (
              <option key={d} value={d}>
                DRENA {d}
              </option>
            ))}
          </select>
          <select value={filtreMilieu} onChange={(e) => setFiltreMilieu(e.target.value)}>
            <option value="">Urbain et rural</option>
            {Object.entries(MILIEUX).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <label className="case">
            <input type="checkbox" checked={voirInactifs} onChange={(e) => setVoirInactifs(e.target.checked)} />
            Afficher les inactifs
          </label>
        </div>
        <p className="compte-resultats">{filtres.length} établissement(s) affiché(s)</p>

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
                  <th>Situation géographique</th>
                  <th>DRENA</th>
                  <th>Milieu · Régime</th>
                  <th>Chef d'établissement</th>
                  <th>Conseiller(s)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtres.map((e) => (
                  <tr key={e.id} className={e.actif ? '' : 'ligne-inactive'}>
                    <td>
                      <div className="cellule-titre">{e.nom}</div>
                      <div className="cellule-sous">
                        {[e.code && `Code ${e.code}`, TYPES_ETAB[e.type], STATUTS_ETAB[e.statut]]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </td>
                    <td>
                      {[e.localite, e.quartier].filter(Boolean).join(' — ') || '—'}
                      <div className="cellule-sous">
                        {[e.sous_prefecture && `S/P ${e.sous_prefecture}`, e.departement, e.region]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </td>
                    <td>{e.drena || '—'}</td>
                    <td>
                      {MILIEUX[e.milieu] || '—'}
                      <div className="cellule-sous">{REGIMES[e.regime] || ''}</div>
                    </td>
                    <td>
                      {e.chef_etablissement || '—'}
                      <div className="cellule-sous">
                        {[e.chef_contact1, e.chef_contact2].filter(Boolean).join(' / ')}
                      </div>
                    </td>
                    <td>
                      {affectations[e.id]?.length ? (
                        affectations[e.id].join(', ')
                      ) : (
                        <span className="etiquette etiquette-alerte">Non affecté</span>
                      )}
                    </td>
                    <td className="actions-ligne">
                      <button className="btn btn-petit" onClick={() => setEdition(e)}>
                        {estAdmin ? 'Fiche / Modifier' : 'Voir la fiche'}
                      </button>
                      {estAdmin && (
                        <button className="btn btn-petit btn-discret" onClick={() => basculerActif(e)}>
                          {e.actif ? 'Désactiver' : 'Réactiver'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {importOuvert && (
        <ImportEcoles
          cioId={profil.cio_id}
          existants={liste}
          onFermer={() => setImportOuvert(false)}
          onImporte={(msg) => {
            setImportOuvert(false)
            setInfo(msg)
            charger()
          }}
        />
      )}

      {edition && (
        <FormulaireEtablissement
          etab={edition}
          cioId={profil.cio_id}
          lectureSeule={!estAdmin}
          suggestions={{
            drena: drenas,
            region: valeursDistinctes(actifs, 'region'),
            departement: valeursDistinctes(actifs, 'departement'),
          }}
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

function FormulaireEtablissement({ etab, cioId, lectureSeule, suggestions, onFermer, onEnregistre }) {
  const nouveau = !etab.id
  const [f, setF] = useState(() =>
    Object.fromEntries(Object.keys(VIDE).map((k) => [k, etab[k] ?? VIDE[k]]))
  )
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const maj = (cle) => (e) => setF({ ...f, [cle]: e.target.value })

  const enregistrer = async (e) => {
    e.preventDefault()
    if (lectureSeule) return
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

  const listeSuggestions = (id, valeurs) => (
    <datalist id={id}>
      {valeurs.map((v) => (
        <option key={v} value={v} />
      ))}
    </datalist>
  )

  return (
    <Modale
      titre={nouveau ? 'Nouvel établissement' : lectureSeule ? etab.nom : `Fiche — ${etab.nom}`}
      onFermer={onFermer}
    >
      <form onSubmit={enregistrer}>
        <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
        <fieldset className="fiche-etab" disabled={lectureSeule}>
          <h3 className="fiche-section">Identification</h3>
          <Champ label="Nom de l'établissement" requis>
            <input value={f.nom} onChange={maj('nom')} required autoFocus={!lectureSeule} placeholder="ex : Collège Moderne de …" />
          </Champ>
          <div className="grille-2">
            <Champ label="Code (DSPS)">
              <input value={f.code} onChange={maj('code')} />
            </Champ>
            <Champ label="Type">
              <select value={f.type} onChange={maj('type')}>
                {Object.entries(TYPES_ETAB).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Champ>
          </div>
          <div className="grille-3">
            <Champ label="Statut">
              <select value={f.statut} onChange={maj('statut')}>
                {Object.entries(STATUTS_ETAB).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ label="Milieu">
              <select value={f.milieu} onChange={maj('milieu')}>
                <option value="">—</option>
                {Object.entries(MILIEUX).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ label="Régime">
              <select value={f.regime} onChange={maj('regime')}>
                <option value="">—</option>
                {Object.entries(REGIMES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Champ>
          </div>

          <h3 className="fiche-section">Situation géographique</h3>
          <div className="grille-2">
            <Champ label="DRENA">
              <input value={f.drena} onChange={maj('drena')} list="sugg-drena" />
              {listeSuggestions('sugg-drena', suggestions.drena)}
            </Champ>
            <Champ label="Région">
              <input value={f.region} onChange={maj('region')} list="sugg-region" />
              {listeSuggestions('sugg-region', suggestions.region)}
            </Champ>
          </div>
          <div className="grille-2">
            <Champ label="Département">
              <input value={f.departement} onChange={maj('departement')} list="sugg-departement" />
              {listeSuggestions('sugg-departement', suggestions.departement)}
            </Champ>
            <Champ label="Sous-préfecture">
              <input value={f.sous_prefecture} onChange={maj('sous_prefecture')} />
            </Champ>
          </div>
          <div className="grille-2">
            <Champ label="Commune">
              <input value={f.commune} onChange={maj('commune')} />
            </Champ>
            <Champ label="Quartier">
              <input value={f.quartier} onChange={maj('quartier')} />
            </Champ>
          </div>
          <Champ label="Localité (ville ou village)">
            <ChampLocalite value={f.localite} onChange={(v) => setF({ ...f, localite: v })} />
          </Champ>

          <h3 className="fiche-section">Chef d'établissement</h3>
          <Champ label="Nom et prénoms">
            <input value={f.chef_etablissement} onChange={maj('chef_etablissement')} />
          </Champ>
          <div className="grille-2">
            <Champ label="Contact 1">
              <input value={f.chef_contact1} onChange={maj('chef_contact1')} />
            </Champ>
            <Champ label="Contact 2">
              <input value={f.chef_contact2} onChange={maj('chef_contact2')} />
            </Champ>
          </div>

          <h3 className="fiche-section">Coordonnées de l'établissement</h3>
          <div className="grille-2">
            <Champ label="Téléphone">
              <input value={f.telephone} onChange={maj('telephone')} />
            </Champ>
            <Champ label="E-mail">
              <input type="email" value={f.email} onChange={maj('email')} />
            </Champ>
          </div>
          <Champ label="Adresse">
            <input value={f.adresse} onChange={maj('adresse')} />
          </Champ>
        </fieldset>
        <div className="actions-formulaire">
          <button type="button" className="btn btn-discret" onClick={onFermer}>
            {lectureSeule ? 'Fermer' : 'Annuler'}
          </button>
          {!lectureSeule && (
            <button className="btn btn-plein" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          )}
        </div>
      </form>
    </Modale>
  )
}
