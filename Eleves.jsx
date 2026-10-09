import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, messageErreur, NIVEAUX, LIBELLES_NIVEAUX } from './supabase'
import { Alerte, Champ, Chargement, EnTete, Modale, Vide } from './ui'

export default function Eleves({ profil, annee }) {
  const [eleves, setEleves] = useState(null)
  const [etabs, setEtabs] = useState([])
  const [filtreEtab, setFiltreEtab] = useState('')
  const [filtreNiveau, setFiltreNiveau] = useState('')
  const [recherche, setRecherche] = useState('')
  const [ajout, setAjout] = useState(false)
  const [transfert, setTransfert] = useState(false)
  const [fiche, setFiche] = useState(null)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const [acc, e, el] = await Promise.all([
      supabase.rpc('etablissements_accessibles'),
      supabase.from('etablissements').select('id, nom').eq('actif', true).order('nom'),
      supabase
        .from('eleves')
        .select('id, matricule, nom, prenoms, sexe, date_naissance, quartier, etablissement_actuel_id, inscriptions(id, annee_id, niveau, classe, redoublant)')
        .order('nom')
        .order('prenoms')
        .limit(2000),
    ])
    const err = [acc, e, el].find((r) => r.error)
    if (err) setErreur(messageErreur(err.error))
    const ids = new Set((acc.data ?? []).map((x) => (typeof x === 'string' ? x : Object.values(x)[0])))
    setEtabs((e.data ?? []).filter((x) => ids.has(x.id)))
    setEleves(el.data ?? [])
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const nomEtab = (id) => etabs.find((e) => e.id === id)?.nom ?? '—'
  const inscriptionAnnee = (el) => el.inscriptions?.find((i) => i.annee_id === annee?.id)

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return (eleves ?? []).filter((el) => {
      if (filtreEtab && el.etablissement_actuel_id !== filtreEtab) return false
      if (filtreNiveau && inscriptionAnnee(el)?.niveau !== filtreNiveau) return false
      if (q && ![el.nom, el.prenoms, el.matricule].some((v) => (v ?? '').toLowerCase().includes(q)))
        return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eleves, recherche, filtreEtab, filtreNiveau, annee])

  if (!eleves) return <Chargement />

  const peutAjouter = etabs.length > 0

  return (
    <>
      <EnTete
        titre="Élèves"
        sousTitre={`${eleves.length} élève(s) suivi(s) · inscriptions ${annee?.libelle ?? ''}`}
        actions={
          peutAjouter && (
            <>
              <button className="btn" onClick={() => setTransfert(true)}>
                Accueillir un élève transféré
              </button>
              <button className="btn btn-plein" onClick={() => setAjout(true)}>
                + Nouvel élève
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
            placeholder="Nom, prénoms ou matricule…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <select value={filtreEtab} onChange={(e) => setFiltreEtab(e.target.value)}>
            <option value="">Tous les établissements</option>
            {etabs.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}
              </option>
            ))}
          </select>
          <select value={filtreNiveau} onChange={(e) => setFiltreNiveau(e.target.value)}>
            <option value="">Tous les niveaux</option>
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>
                {LIBELLES_NIVEAUX[n]}
              </option>
            ))}
          </select>
        </div>

        {filtres.length === 0 ? (
          <Vide
            titre={eleves.length === 0 ? 'Aucun élève enregistré' : 'Aucun élève ne correspond'}
            texte={
              !peutAjouter
                ? "Vous n'avez accès à aucun établissement pour l'instant."
                : eleves.length === 0
                  ? 'Ajoutez un premier élève avec son inscription pour l’année en cours.'
                  : undefined
            }
          />
        ) : (
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom et prénoms</th>
                  <th>Sexe</th>
                  <th>Établissement actuel</th>
                  <th>Niveau {annee?.libelle}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtres.map((el) => {
                  const ins = inscriptionAnnee(el)
                  return (
                    <tr key={el.id}>
                      <td className="mono">{el.matricule}</td>
                      <td>
                        <div className="cellule-titre">
                          {el.nom} {el.prenoms}
                        </div>
                        {el.quartier && <div className="cellule-sous">{el.quartier}</div>}
                      </td>
                      <td>{el.sexe ?? '—'}</td>
                      <td>{nomEtab(el.etablissement_actuel_id)}</td>
                      <td>
                        {ins ? (
                          <>
                            {LIBELLES_NIVEAUX[ins.niveau]}
                            {ins.classe ? ` · ${ins.classe}` : ''}
                            {ins.redoublant && <span className="etiquette etiquette-alerte">Redoublant</span>}
                          </>
                        ) : (
                          <span className="etiquette etiquette-alerte">Non inscrit</span>
                        )}
                      </td>
                      <td className="actions-ligne">
                        <button className="btn btn-petit" onClick={() => setFiche(el)}>
                          Parcours
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ajout && (
        <FormulaireEleve
          etabs={etabs}
          annee={annee}
          profil={profil}
          onFermer={() => setAjout(false)}
          onCree={(msg) => {
            setAjout(false)
            setInfo(msg)
            charger()
          }}
        />
      )}
      {transfert && (
        <FormulaireTransfert
          etabs={etabs}
          annee={annee}
          onFermer={() => setTransfert(false)}
          onFait={(msg) => {
            setTransfert(false)
            setInfo(msg)
            charger()
          }}
        />
      )}
      {fiche && <FicheParcours eleve={fiche} onFermer={() => setFiche(null)} />}
    </>
  )
}

function SelectNiveau({ value, onChange, requis }) {
  return (
    <select value={value} onChange={onChange} required={requis}>
      <option value="">— Choisir —</option>
      {NIVEAUX.map((n) => (
        <option key={n} value={n}>
          {LIBELLES_NIVEAUX[n]}
        </option>
      ))}
    </select>
  )
}

function FormulaireEleve({ etabs, annee, profil, onFermer, onCree }) {
  const [f, setF] = useState({
    matricule: '',
    nom: '',
    prenoms: '',
    sexe: '',
    date_naissance: '',
    lieu_naissance: '',
    quartier: '',
    telephone: '',
    etablissement_id: etabs.length === 1 ? etabs[0].id : '',
    niveau: '',
    classe: '',
    redoublant: false,
  })
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const maj = (cle) => (e) =>
    setF({ ...f, [cle]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const creer = async (e) => {
    e.preventDefault()
    setErreur('')
    if (!annee) return setErreur("Aucune année scolaire n'est marquée « en cours ».")
    setEnvoi(true)
    const vide = (v) => (v ?? '').trim() || null
    const { data: el, error } = await supabase
      .from('eleves')
      .insert({
        matricule: f.matricule.trim().toUpperCase(),
        nom: f.nom.trim().toUpperCase(),
        prenoms: f.prenoms.trim(),
        sexe: f.sexe || null,
        date_naissance: f.date_naissance || null,
        lieu_naissance: vide(f.lieu_naissance),
        quartier: vide(f.quartier),
        telephone: vide(f.telephone),
        etablissement_actuel_id: f.etablissement_id,
        created_by: profil.id,
      })
      .select('id')
      .single()
    if (error) {
      setEnvoi(false)
      if (error.code === '23505')
        return setErreur(
          'Ce matricule existe déjà. Si l’élève vient d’un autre établissement, utilisez « Accueillir un élève transféré ».'
        )
      return setErreur(messageErreur(error))
    }
    const { error: errIns } = await supabase.from('inscriptions').insert({
      eleve_id: el.id,
      etablissement_id: f.etablissement_id,
      annee_id: annee.id,
      niveau: f.niveau,
      classe: vide(f.classe),
      redoublant: f.redoublant,
    })
    setEnvoi(false)
    if (errIns) {
      await supabase.from('eleves').delete().eq('id', el.id)
      return setErreur(messageErreur(errIns))
    }
    onCree(`${f.nom.toUpperCase()} ${f.prenoms} a été enregistré(e).`)
  }

  return (
    <Modale titre="Nouvel élève" onFermer={onFermer} large>
      <form onSubmit={creer}>
        <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
        <fieldset>
          <legend>Identité</legend>
          <div className="grille-3">
            <Champ label="Matricule" requis>
              <input value={f.matricule} onChange={maj('matricule')} required autoFocus />
            </Champ>
            <Champ label="Nom" requis>
              <input value={f.nom} onChange={maj('nom')} required />
            </Champ>
            <Champ label="Prénoms" requis>
              <input value={f.prenoms} onChange={maj('prenoms')} required />
            </Champ>
          </div>
          <div className="grille-3">
            <Champ label="Sexe">
              <select value={f.sexe} onChange={maj('sexe')}>
                <option value="">—</option>
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
              </select>
            </Champ>
            <Champ label="Date de naissance">
              <input type="date" value={f.date_naissance} onChange={maj('date_naissance')} />
            </Champ>
            <Champ label="Lieu de naissance">
              <input value={f.lieu_naissance} onChange={maj('lieu_naissance')} />
            </Champ>
          </div>
          <div className="grille-2">
            <Champ label="Quartier">
              <input value={f.quartier} onChange={maj('quartier')} />
            </Champ>
            <Champ label="Téléphone">
              <input value={f.telephone} onChange={maj('telephone')} />
            </Champ>
          </div>
        </fieldset>
        <fieldset>
          <legend>Inscription {annee?.libelle}</legend>
          <Champ label="Établissement" requis>
            <select value={f.etablissement_id} onChange={maj('etablissement_id')} required>
              <option value="">— Choisir —</option>
              {etabs.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom}
                </option>
              ))}
            </select>
          </Champ>
          <div className="grille-3">
            <Champ label="Niveau" requis>
              <SelectNiveau value={f.niveau} onChange={maj('niveau')} requis />
            </Champ>
            <Champ label="Classe">
              <input value={f.classe} onChange={maj('classe')} placeholder="ex : 3e 2" />
            </Champ>
            <label className="case case-alignee">
              <input type="checkbox" checked={f.redoublant} onChange={maj('redoublant')} />
              Redoublant
            </label>
          </div>
        </fieldset>
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

function FormulaireTransfert({ etabs, annee, onFermer, onFait }) {
  const [f, setF] = useState({
    matricule: '',
    etablissement_id: etabs.length === 1 ? etabs[0].id : '',
    niveau: '',
    classe: '',
  })
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const maj = (cle) => (e) => setF({ ...f, [cle]: e.target.value })

  const transferer = async (e) => {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    const { error } = await supabase.rpc('transferer_eleve', {
      p_matricule: f.matricule,
      p_etablissement_id: f.etablissement_id,
      p_niveau: f.niveau || null,
      p_classe: f.classe || null,
    })
    setEnvoi(false)
    if (error) {
      if (error.message?.includes('Could not find the function'))
        return setErreur('La base doit d’abord être mise à jour (migration 02 du transfert).')
      return setErreur(messageErreur(error))
    }
    onFait(`L'élève ${f.matricule.toUpperCase()} a été accueilli(e) avec tout son historique.`)
  }

  return (
    <Modale titre="Accueillir un élève transféré" onFermer={onFermer}>
      <form onSubmit={transferer}>
        <p className="texte-doux">
          L'élève est déjà enregistré dans un autre établissement. Saisissez son matricule : il sera
          rattaché à votre établissement et vous retrouverez tout son parcours.
        </p>
        <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
        <Champ label="Matricule" requis>
          <input value={f.matricule} onChange={maj('matricule')} required autoFocus />
        </Champ>
        <Champ label="Établissement d'accueil" requis>
          <select value={f.etablissement_id} onChange={maj('etablissement_id')} required>
            <option value="">— Choisir —</option>
            {etabs.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}
              </option>
            ))}
          </select>
        </Champ>
        <div className="grille-2">
          <Champ label={`Niveau ${annee?.libelle ?? ''}`} aide="Laissez vide pour ne pas toucher à l'inscription de l'année.">
            <SelectNiveau value={f.niveau} onChange={maj('niveau')} />
          </Champ>
          <Champ label="Classe">
            <input value={f.classe} onChange={maj('classe')} />
          </Champ>
        </div>
        <div className="actions-formulaire">
          <button type="button" className="btn btn-discret" onClick={onFermer}>
            Annuler
          </button>
          <button className="btn btn-plein" disabled={envoi}>
            {envoi ? 'Transfert…' : 'Accueillir l’élève'}
          </button>
        </div>
      </form>
    </Modale>
  )
}

function FicheParcours({ eleve, onFermer }) {
  const [parcours, setParcours] = useState(null)

  useEffect(() => {
    supabase
      .from('inscriptions')
      .select('id, niveau, classe, redoublant, annees_scolaires(libelle, date_debut), etablissements(nom), resultats_annuels(moyenne_annuelle, decision, rang, effectif_classe)')
      .eq('eleve_id', eleve.id)
      .then(({ data }) => {
        const tri = (data ?? []).sort((a, b) =>
          (b.annees_scolaires?.date_debut ?? '').localeCompare(a.annees_scolaires?.date_debut ?? '')
        )
        setParcours(tri)
      })
  }, [eleve.id])

  const res = (i) => (Array.isArray(i.resultats_annuels) ? i.resultats_annuels[0] : i.resultats_annuels)

  return (
    <Modale titre={`${eleve.nom} ${eleve.prenoms}`} onFermer={onFermer} large>
      <div className="fiche-entete">
        <span className="mono">{eleve.matricule}</span>
        {eleve.sexe && <span>{eleve.sexe === 'F' ? 'Fille' : 'Garçon'}</span>}
        {eleve.date_naissance && <span>Né(e) le {new Date(eleve.date_naissance).toLocaleDateString('fr-FR')}</span>}
      </div>
      <h3 className="section-titre">Parcours scolaire</h3>
      {!parcours ? (
        <Chargement />
      ) : parcours.length === 0 ? (
        <p className="texte-doux">Aucune inscription enregistrée.</p>
      ) : (
        <ol className="frise">
          {parcours.map((i) => {
            const r = res(i)
            return (
              <li key={i.id}>
                <div className="frise-annee">{i.annees_scolaires?.libelle}</div>
                <div className="frise-contenu">
                  <strong>
                    {LIBELLES_NIVEAUX[i.niveau]}
                    {i.classe ? ` · ${i.classe}` : ''}
                  </strong>
                  {i.redoublant && <span className="etiquette etiquette-alerte">Redoublant</span>}
                  <div className="cellule-sous">{i.etablissements?.nom}</div>
                  {r && (
                    <div className="frise-resultat">
                      {r.moyenne_annuelle != null && <>Moyenne {Number(r.moyenne_annuelle).toFixed(2)}/20</>}
                      {r.rang && <> · Rang {r.rang}{r.effectif_classe ? `/${r.effectif_classe}` : ''}</>}
                      {r.decision && <> · {r.decision.replace('_', ' ')}</>}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
      <p className="texte-doux note-bas">
        Notes, absences, entretiens et orientation arriveront dans la prochaine version de la fiche.
      </p>
    </Modale>
  )
}
