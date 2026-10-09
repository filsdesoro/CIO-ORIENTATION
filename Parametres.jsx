import { useEffect, useState } from 'react'
import { supabase, messageErreur } from './supabase'
import { Alerte, Champ, Chargement, EnTete } from './ui'

export default function Parametres({ profil, onProfilChange }) {
  const [cio, setCio] = useState(null)
  const [pond, setPond] = useState(null)
  const [annees, setAnnees] = useState([])
  const [nouvelleAnnee, setNouvelleAnnee] = useState({ libelle: '', date_debut: '', date_fin: '' })
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')

  const chargerAnnees = async () => {
    const { data } = await supabase.from('annees_scolaires').select('*').order('date_debut', { ascending: false })
    setAnnees(data ?? [])
  }

  useEffect(() => {
    ;(async () => {
      const [c, p] = await Promise.all([
        supabase.from('cio').select('*').eq('id', profil.cio_id).single(),
        supabase.from('ponderation_orientation').select('*').eq('cio_id', profil.cio_id).maybeSingle(),
      ])
      setCio(c.data)
      setPond(p.data ?? { poids_notes: 60, poids_conduite: 10, poids_absences: 10, poids_voeux: 20 })
      chargerAnnees()
    })()
  }, [profil.cio_id])

  if (!cio || !pond) return <Chargement />

  const majCio = (cle) => (e) => setCio({ ...cio, [cle]: e.target.value })
  const majPond = (cle) => (e) => setPond({ ...pond, [cle]: e.target.value })

  const enregistrerCio = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from('cio')
      .update({
        nom: cio.nom.trim(),
        code: cio.code?.trim() || null,
        ville: cio.ville?.trim() || null,
        drena: cio.drena?.trim() || null,
        adresse: cio.adresse?.trim() || null,
        telephone: cio.telephone?.trim() || null,
        email: cio.email?.trim() || null,
      })
      .eq('id', cio.id)
    if (error) return setErreur(messageErreur(error))
    setInfo('Informations du CIO enregistrées.')
    onProfilChange()
  }

  const total = ['poids_notes', 'poids_conduite', 'poids_absences', 'poids_voeux'].reduce(
    (t, k) => t + (Number(pond[k]) || 0),
    0
  )

  const enregistrerPond = async (e) => {
    e.preventDefault()
    if (total <= 0) return setErreur('La somme des poids doit être supérieure à 0.')
    const donnees = {
      poids_notes: Number(pond.poids_notes) || 0,
      poids_conduite: Number(pond.poids_conduite) || 0,
      poids_absences: Number(pond.poids_absences) || 0,
      poids_voeux: Number(pond.poids_voeux) || 0,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('ponderation_orientation').update(donnees).eq('cio_id', cio.id)
    if (error) return setErreur(messageErreur(error))
    setInfo('Pondération du score d’orientation enregistrée.')
  }

  const definirEnCours = async (a) => {
    const { error: e1 } = await supabase.from('annees_scolaires').update({ en_cours: false }).neq('id', a.id)
    const { error: e2 } = await supabase.from('annees_scolaires').update({ en_cours: true }).eq('id', a.id)
    if (e1 || e2) return setErreur(messageErreur(e1 || e2))
    setInfo(`L'année ${a.libelle} est maintenant l'année en cours.`)
    chargerAnnees()
    onProfilChange()
  }

  const ajouterAnnee = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('annees_scolaires').insert({
      libelle: nouvelleAnnee.libelle.trim(),
      date_debut: nouvelleAnnee.date_debut || null,
      date_fin: nouvelleAnnee.date_fin || null,
    })
    if (error) return setErreur(messageErreur(error))
    setNouvelleAnnee({ libelle: '', date_debut: '', date_fin: '' })
    setInfo('Année scolaire ajoutée.')
    chargerAnnees()
  }

  return (
    <>
      <EnTete titre="Paramètres du CIO" sousTitre="Identité du centre, années scolaires et score d’orientation" />
      <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
      <Alerte type="succes" onFermer={() => setInfo('')}>
        {info}
      </Alerte>

      <div className="deux-colonnes">
        <form className="carte" onSubmit={enregistrerCio}>
          <h2 className="carte-titre">Le centre</h2>
          <Champ label="Nom du CIO" requis>
            <input value={cio.nom ?? ''} onChange={majCio('nom')} required />
          </Champ>
          <div className="grille-2">
            <Champ label="Ville">
              <input value={cio.ville ?? ''} onChange={majCio('ville')} />
            </Champ>
            <Champ label="DRENA">
              <input value={cio.drena ?? ''} onChange={majCio('drena')} />
            </Champ>
          </div>
          <div className="grille-2">
            <Champ label="Code">
              <input value={cio.code ?? ''} onChange={majCio('code')} />
            </Champ>
            <Champ label="Téléphone">
              <input value={cio.telephone ?? ''} onChange={majCio('telephone')} />
            </Champ>
          </div>
          <Champ label="Adresse">
            <input value={cio.adresse ?? ''} onChange={majCio('adresse')} />
          </Champ>
          <Champ label="E-mail">
            <input type="email" value={cio.email ?? ''} onChange={majCio('email')} />
          </Champ>
          <div className="actions-formulaire">
            <button className="btn btn-plein">Enregistrer</button>
          </div>
        </form>

        <div className="colonne">
          <form className="carte" onSubmit={enregistrerPond}>
            <h2 className="carte-titre">Score d’orientation</h2>
            <p className="texte-doux">
              Poids de chaque critère dans le score de recommandation (sur 100). Total actuel : <strong>{total}</strong>
            </p>
            <div className="grille-2">
              <Champ label="Notes / résultats">
                <input type="number" min="0" step="1" value={pond.poids_notes} onChange={majPond('poids_notes')} />
              </Champ>
              <Champ label="Vœux de l’élève">
                <input type="number" min="0" step="1" value={pond.poids_voeux} onChange={majPond('poids_voeux')} />
              </Champ>
              <Champ label="Conduite">
                <input type="number" min="0" step="1" value={pond.poids_conduite} onChange={majPond('poids_conduite')} />
              </Champ>
              <Champ label="Assiduité (absences)">
                <input type="number" min="0" step="1" value={pond.poids_absences} onChange={majPond('poids_absences')} />
              </Champ>
            </div>
            <div className="actions-formulaire">
              <button className="btn btn-plein">Enregistrer</button>
            </div>
          </form>

          <div className="carte">
            <h2 className="carte-titre">Années scolaires</h2>
            <ul className="liste-annees">
              {annees.map((a) => (
                <li key={a.id}>
                  <span>
                    <strong>{a.libelle}</strong>
                    {a.en_cours && <span className="etiquette etiquette-ok">En cours</span>}
                  </span>
                  {!a.en_cours && (
                    <button className="btn btn-petit" onClick={() => definirEnCours(a)}>
                      Définir en cours
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={ajouterAnnee} className="grille-3 ajout-annee">
              <Champ label="Nouvelle année">
                <input
                  value={nouvelleAnnee.libelle}
                  onChange={(e) => setNouvelleAnnee({ ...nouvelleAnnee, libelle: e.target.value })}
                  placeholder="2027-2028"
                  pattern="\d{4}-\d{4}"
                  required
                />
              </Champ>
              <Champ label="Début">
                <input
                  type="date"
                  value={nouvelleAnnee.date_debut}
                  onChange={(e) => setNouvelleAnnee({ ...nouvelleAnnee, date_debut: e.target.value })}
                />
              </Champ>
              <Champ label="Fin">
                <input
                  type="date"
                  value={nouvelleAnnee.date_fin}
                  onChange={(e) => setNouvelleAnnee({ ...nouvelleAnnee, date_fin: e.target.value })}
                />
              </Champ>
              <button className="btn">Ajouter</button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
