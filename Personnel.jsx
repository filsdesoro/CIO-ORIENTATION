import { useCallback, useEffect, useState } from 'react'
import { supabase, messageErreur, LIBELLES_ROLES } from './supabase'
import { Alerte, Champ, Chargement, EnTete, Modale, Vide } from './ui'

// Nom (slug) de la fonction serveur déployée sur Supabase pour créer les comptes
const FONCTION_MEMBRE = 'rapid-responder'

export default function Personnel({ profil }) {
  const [membres, setMembres] = useState(null)
  const [etabs, setEtabs] = useState([])
  const [affect, setAffect] = useState({}) // conseiller_id -> [etablissement_id]
  const [ajout, setAjout] = useState(false)
  const [affectation, setAffectation] = useState(null)
  const [identifiantDe, setIdentifiantDe] = useState(null)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const [p, e, a] = await Promise.all([
      supabase
        .from('personnel')
        .select('*, etab:etablissements!personnel_etablissement_id_fkey(nom)')
        .order('role')
        .order('nom'),
      supabase.from('etablissements').select('id, nom').eq('actif', true).order('nom'),
      supabase.from('conseiller_etablissements').select('conseiller_id, etablissement_id'),
    ])
    const err = [p, e, a].find((r) => r.error)
    if (err) setErreur(messageErreur(err.error))
    setMembres(p.data ?? [])
    setEtabs(e.data ?? [])
    const m = {}
    for (const x of a.data ?? []) (m[x.conseiller_id] ??= []).push(x.etablissement_id)
    setAffect(m)
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const nomEtab = (id) => etabs.find((e) => e.id === id)?.nom ?? '?'

  const basculerActif = async (m) => {
    const { error } = await supabase.from('personnel').update({ actif: !m.actif }).eq('id', m.id)
    if (error) return setErreur(messageErreur(error))
    setInfo(`${m.nom} a été ${m.actif ? 'désactivé' : 'réactivé'}.`)
    charger()
  }

  if (!membres) return <Chargement />

  return (
    <>
      <EnTete
        titre="Personnel"
        sousTitre="Conseillers d'orientation et points focaux des établissements"
        actions={
          <button className="btn btn-plein" onClick={() => setAjout(true)}>
            + Ajouter un membre
          </button>
        }
      />
      <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
      <Alerte type="succes" onFermer={() => setInfo('')}>
        {info}
      </Alerte>

      <div className="carte">
        {membres.length <= 1 ? (
          <Vide
            titre="Vous êtes seul pour l'instant"
            texte="Ajoutez les conseillers d'orientation du CIO et, si besoin, un point focal par établissement."
          />
        ) : null}
        <div className="tableau-defilant">
          <table className="tableau">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Identifiant</th>
                <th>Rôle</th>
                <th>Établissement(s)</th>
                <th>Contact</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {membres.map((m) => (
                <tr key={m.id} className={m.actif ? '' : 'ligne-inactive'}>
                  <td>
                    <div className="cellule-titre">
                      {m.nom} {m.prenoms}
                    </div>
                    {m.id === profil.id && <span className="etiquette">Vous</span>}
                  </td>
                  <td>
                    {m.identifiant ? (
                      <span className="mono identifiant">{m.identifiant}</span>
                    ) : (
                      <span className="etiquette etiquette-alerte">À définir</span>
                    )}
                    <button className="btn-lien" onClick={() => setIdentifiantDe(m)}>
                      {m.identifiant ? 'modifier' : 'définir'}
                    </button>
                  </td>
                  <td>
                    <span className={`etiquette etiquette-${m.role}`}>{LIBELLES_ROLES[m.role]}</span>
                  </td>
                  <td>
                    {m.role === 'admin_cio' && <span className="texte-doux">Toute la zone</span>}
                    {m.role === 'point_focal' && (m.etab?.nom ?? '—')}
                    {m.role === 'conseiller' &&
                      (affect[m.id]?.length ? (
                        affect[m.id].map(nomEtab).join(', ')
                      ) : (
                        <span className="etiquette etiquette-alerte">Aucun</span>
                      ))}
                  </td>
                  <td>
                    <div>{m.email || '—'}</div>
                    <div className="cellule-sous">{m.telephone}</div>
                  </td>
                  <td className="actions-ligne">
                    {m.role === 'conseiller' && (
                      <button className="btn btn-petit" onClick={() => setAffectation(m)}>
                        Affectations
                      </button>
                    )}
                    {m.id !== profil.id && (
                      <button className="btn btn-petit btn-discret" onClick={() => basculerActif(m)}>
                        {m.actif ? 'Désactiver' : 'Réactiver'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {ajout && (
        <FormulaireMembre
          etabs={etabs}
          onFermer={() => setAjout(false)}
          onCree={(msg) => {
            setAjout(false)
            setInfo(msg)
            charger()
          }}
        />
      )}

      {identifiantDe && (
        <FormulaireIdentifiant
          membre={identifiantDe}
          onFermer={() => setIdentifiantDe(null)}
          onEnregistre={(nouveau) => {
            setInfo(`Identifiant de ${identifiantDe.nom} : ${nouveau}`)
            setIdentifiantDe(null)
            charger()
          }}
        />
      )}

      {affectation && (
        <FormulaireAffectation
          membre={affectation}
          etabs={etabs}
          actuels={affect[affectation.id] ?? []}
          onFermer={() => setAffectation(null)}
          onEnregistre={() => {
            setInfo(`Affectations de ${affectation.nom} mises à jour.`)
            setAffectation(null)
            charger()
          }}
        />
      )}
    </>
  )
}

function ListeEtablissements({ etabs, choisis, setChoisis }) {
  if (etabs.length === 0)
    return <p className="texte-doux">Aucun établissement actif. Ajoutez-en d'abord dans « Établissements ».</p>
  const basculer = (id) =>
    setChoisis(choisis.includes(id) ? choisis.filter((x) => x !== id) : [...choisis, id])
  return (
    <div className="liste-cases">
      {etabs.map((e) => (
        <label key={e.id} className="case">
          <input type="checkbox" checked={choisis.includes(e.id)} onChange={() => basculer(e.id)} />
          {e.nom}
        </label>
      ))}
    </div>
  )
}

function FormulaireMembre({ etabs, onFermer, onCree }) {
  const [f, setF] = useState({
    nom: '',
    prenoms: '',
    identifiant: '',
    email: '',
    telephone: '',
    password: '',
    role: 'conseiller',
    etablissement_id: '',
  })
  const [choisis, setChoisis] = useState([])
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const maj = (cle) => (e) => setF({ ...f, [cle]: e.target.value })

  const creer = async (e) => {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    const { data, error } = await supabase.functions.invoke(FONCTION_MEMBRE, {
      body: { ...f, etablissements: f.role === 'conseiller' ? choisis : [] },
    })
    setEnvoi(false)
    if (error) {
      let msg = error.message
      try {
        const corps = await error.context?.json?.()
        if (corps?.error) msg = corps.error
      } catch {
        /* message par défaut */
      }
      if (msg.includes('Failed to send') || msg.includes('not found'))
        msg = `La fonction serveur « ${FONCTION_MEMBRE} » est introuvable sur Supabase.`
      return setErreur(msg)
    }
    if (data?.error) return setErreur(data.error)
    onCree(
      `Compte créé pour ${f.nom}. Identifiant : ${f.identifiant} — communiquez-lui cet identifiant et son mot de passe.`
    )
  }

  return (
    <Modale titre="Ajouter un membre du personnel" onFermer={onFermer}>
      <form onSubmit={creer}>
        <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
        <Champ label="Rôle">
          <select value={f.role} onChange={maj('role')}>
            <option value="conseiller">Conseiller d'orientation</option>
            <option value="point_focal">Point focal établissement</option>
            <option value="admin_cio">Administrateur CIO</option>
          </select>
        </Champ>
        <div className="grille-2">
          <Champ label="Nom" requis>
            <input value={f.nom} onChange={maj('nom')} required autoFocus />
          </Champ>
          <Champ label="Prénoms">
            <input value={f.prenoms} onChange={maj('prenoms')} />
          </Champ>
        </div>
        <Champ
          label="Identifiant de connexion"
          requis
          aide="3 à 30 caractères : lettres minuscules, chiffres, point, tiret. Ex : soro.k"
        >
          <input
            value={f.identifiant}
            onChange={(e) => setF({ ...f, identifiant: e.target.value.toLowerCase().replace(/\s/g, '') })}
            pattern="[a-z0-9._\-]{3,30}"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </Champ>
        <div className="grille-2">
          <Champ label="E-mail" aide="Facultatif">
            <input type="email" value={f.email} onChange={maj('email')} />
          </Champ>
          <Champ label="Téléphone">
            <input value={f.telephone} onChange={maj('telephone')} />
          </Champ>
        </div>
        <Champ label="Mot de passe initial" requis aide="8 caractères minimum. La personne pourra le garder ou le faire changer.">
          <input type="text" value={f.password} onChange={maj('password')} minLength={8} required autoComplete="off" />
        </Champ>

        {f.role === 'point_focal' && (
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
        )}
        {f.role === 'conseiller' && (
          <div className="champ">
            <span className="champ-label">Établissements suivis</span>
            <ListeEtablissements etabs={etabs} choisis={choisis} setChoisis={setChoisis} />
          </div>
        )}

        <div className="actions-formulaire">
          <button type="button" className="btn btn-discret" onClick={onFermer}>
            Annuler
          </button>
          <button className="btn btn-plein" disabled={envoi}>
            {envoi ? 'Création…' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </Modale>
  )
}

function FormulaireAffectation({ membre, etabs, actuels, onFermer, onEnregistre }) {
  const [choisis, setChoisis] = useState(actuels)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const enregistrer = async () => {
    setEnvoi(true)
    setErreur('')
    const aRetirer = actuels.filter((id) => !choisis.includes(id))
    const aAjouter = choisis.filter((id) => !actuels.includes(id))
    if (aRetirer.length) {
      const { error } = await supabase
        .from('conseiller_etablissements')
        .delete()
        .eq('conseiller_id', membre.id)
        .in('etablissement_id', aRetirer)
      if (error) {
        setEnvoi(false)
        return setErreur(messageErreur(error))
      }
    }
    if (aAjouter.length) {
      const { error } = await supabase
        .from('conseiller_etablissements')
        .insert(aAjouter.map((id) => ({ conseiller_id: membre.id, etablissement_id: id })))
      if (error) {
        setEnvoi(false)
        return setErreur(messageErreur(error))
      }
    }
    setEnvoi(false)
    onEnregistre()
  }

  return (
    <Modale titre={`Établissements suivis par ${membre.nom}`} onFermer={onFermer}>
      <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
      <ListeEtablissements etabs={etabs} choisis={choisis} setChoisis={setChoisis} />
      <div className="actions-formulaire">
        <button type="button" className="btn btn-discret" onClick={onFermer}>
          Annuler
        </button>
        <button className="btn btn-plein" onClick={enregistrer} disabled={envoi}>
          {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

function FormulaireIdentifiant({ membre, onFermer, onEnregistre }) {
  const [valeur, setValeur] = useState(membre.identifiant ?? '')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const enregistrer = async (e) => {
    e.preventDefault()
    setErreur('')
    const nouveau = valeur.trim().toLowerCase()
    if (!/^[a-z0-9._-]{3,30}$/.test(nouveau))
      return setErreur('3 à 30 caractères : lettres minuscules, chiffres, point, tiret ou tiret bas.')
    setEnvoi(true)
    const { error } = await supabase.from('personnel').update({ identifiant: nouveau }).eq('id', membre.id)
    setEnvoi(false)
    if (error) {
      if (error.code === '23505') return setErreur('Cet identifiant est déjà utilisé.')
      if (error.code === '23514') return setErreur('Format invalide.')
      return setErreur(messageErreur(error))
    }
    onEnregistre(nouveau)
  }

  return (
    <Modale titre={`Identifiant de ${membre.nom}`} onFermer={onFermer}>
      <form onSubmit={enregistrer}>
        <p className="texte-doux">
          C'est avec cet identifiant (et son mot de passe) que la personne se connecte.
        </p>
        <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
        <Champ label="Identifiant de connexion" requis aide="Ex : soro.k, admin.bouake, focal.dares">
          <input
            value={valeur}
            onChange={(e) => setValeur(e.target.value.toLowerCase().replace(/\s/g, ''))}
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
          />
        </Champ>
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
