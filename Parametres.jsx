import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, messageErreur } from './supabase'
import { Alerte, Champ, Chargement, EnTete, LogoCio, Modale } from './ui'

const CHAMPS_CIO = ['nom', 'drena', 'chef_cio', 'telephone', 'telephone2', 'ville', 'adresse', 'email', 'logo_url']
const TAILLE_MAX_LOGO = 1024 * 1024 // 1 Mo
const TYPES_LOGO = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

// Chemin du fichier dans l'espace de stockage « logos » à partir de son URL publique
function cheminLogo(url) {
  if (!url) return null
  const repere = '/object/public/logos/'
  const i = url.indexOf(repere)
  return i === -1 ? null : decodeURIComponent(url.slice(i + repere.length).split('?')[0])
}

async function retirerFichierLogo(url) {
  const chemin = cheminLogo(url)
  if (chemin) await supabase.storage.from('logos').remove([chemin])
}

export default function Parametres({ profil, onProfilChange }) {
  const [cio, setCio] = useState(null)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')

  const chargerCio = useCallback(async () => {
    const { data, error } = await supabase.from('cio').select('*').eq('id', profil.cio_id).single()
    if (error) setErreur(messageErreur(error))
    setCio(data)
  }, [profil.cio_id])

  useEffect(() => {
    chargerCio()
  }, [chargerCio])

  if (!cio) return <Chargement />

  return (
    <>
      <EnTete titre="Paramètres" sousTitre="Identité du CIO, score d’orientation et années scolaires" />
      <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
      <Alerte type="succes" onFermer={() => setInfo('')}>
        {info}
      </Alerte>

      <IdentiteCio
        cio={cio}
        onEnregistre={async () => {
          setInfo('Les informations du CIO ont été enregistrées.')
          await chargerCio()
          onProfilChange()
        }}
        onSupprime={onProfilChange}
        setErreur={setErreur}
      />

      <div className="deux-colonnes deux-colonnes-egales">
        <Ponderation cioId={cio.id} setErreur={setErreur} setInfo={setInfo} />
        <Annees setErreur={setErreur} setInfo={setInfo} onProfilChange={onProfilChange} />
      </div>
    </>
  )
}

/* =====================================================================
   Identité du CIO : lecture → Modifier → Enregistrer / Annuler ; Supprimer
   ===================================================================== */
function IdentiteCio({ cio, onEnregistre, onSupprime, setErreur }) {
  const [edition, setEdition] = useState(false)
  const [f, setF] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [envoiLogo, setEnvoiLogo] = useState(false)
  const [suppression, setSuppression] = useState(false)
  const logoTemporaire = useRef(null) // logo envoyé pendant l'édition, pas encore enregistré
  const champFichier = useRef(null)

  const ouvrirEdition = () => {
    setF(Object.fromEntries(CHAMPS_CIO.map((k) => [k, cio[k] ?? ''])))
    logoTemporaire.current = null
    setEdition(true)
  }

  const annuler = async () => {
    if (logoTemporaire.current) await retirerFichierLogo(logoTemporaire.current)
    logoTemporaire.current = null
    setEdition(false)
  }

  const maj = (cle) => (e) => setF({ ...f, [cle]: e.target.value })

  const choisirLogo = async (e) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    if (!TYPES_LOGO.includes(fichier.type)) return setErreur('Le logo doit être une image PNG, JPG, WEBP ou SVG.')
    if (fichier.size > TAILLE_MAX_LOGO) return setErreur('Le logo ne doit pas dépasser 1 Mo.')

    setEnvoiLogo(true)
    const ext = (fichier.name.split('.').pop() || 'png').toLowerCase()
    const chemin = `${cio.id}/logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(chemin, fichier, {
      contentType: fichier.type,
      upsert: false,
    })
    setEnvoiLogo(false)
    if (error) {
      return setErreur(
        error.message?.includes('Bucket not found')
          ? 'L’espace de stockage des logos n’existe pas encore : exécutez la migration 03 dans Supabase.'
          : messageErreur(error)
      )
    }
    if (logoTemporaire.current) await retirerFichierLogo(logoTemporaire.current)
    const { data } = supabase.storage.from('logos').getPublicUrl(chemin)
    logoTemporaire.current = data.publicUrl
    setF((prec) => ({ ...prec, logo_url: data.publicUrl }))
  }

  const retirerLogo = async () => {
    if (logoTemporaire.current) await retirerFichierLogo(logoTemporaire.current)
    logoTemporaire.current = null
    setF({ ...f, logo_url: '' })
  }

  const enregistrer = async (e) => {
    e.preventDefault()
    setErreur('')
    if (!f.nom.trim()) return setErreur('Le nom du CIO est obligatoire.')
    setEnvoi(true)
    const donnees = Object.fromEntries(
      CHAMPS_CIO.map((k) => [k, typeof f[k] === 'string' ? f[k].trim() || null : f[k] ?? null])
    )
    const { error } = await supabase.from('cio').update(donnees).eq('id', cio.id)
    setEnvoi(false)
    if (error) {
      return setErreur(
        error.message?.includes('chef_cio') || error.message?.includes('telephone2') || error.message?.includes('logo_url')
          ? 'La base doit d’abord être mise à jour : exécutez la migration 03 dans Supabase.'
          : messageErreur(error)
      )
    }
    // L'ancien logo n'est plus utilisé : on libère le fichier
    if (cio.logo_url && cio.logo_url !== donnees.logo_url) await retirerFichierLogo(cio.logo_url)
    logoTemporaire.current = null
    setEdition(false)
    onEnregistre()
  }

  /* ---------- Mode lecture ---------- */
  if (!edition) {
    return (
      <section className="carte fiche-cio">
        <div className="fiche-cio-entete">
          <LogoCio url={cio.logo_url} nom={cio.nom} />
          <div className="fiche-cio-titre">
            <span className="etape">Identité du CIO</span>
            <h2>{cio.nom}</h2>
            <p className="texte-doux">{cio.drena || 'DRENA non renseignée'}</p>
          </div>
          <div className="fiche-cio-actions">
            <button className="btn btn-plein" onClick={ouvrirEdition}>
              Modifier
            </button>
            <button className="btn btn-danger" onClick={() => setSuppression(true)}>
              Supprimer
            </button>
          </div>
        </div>

        <dl className="fiche-cio-infos">
          <Info libelle="Nom du CIO" valeur={cio.nom} />
          <Info libelle="DRENA du CIO" valeur={cio.drena} />
          <Info libelle="Chef du CIO (DCIO)" valeur={cio.chef_cio} />
          <Info libelle="Contact 1" valeur={cio.telephone} tel />
          <Info libelle="Contact 2" valeur={cio.telephone2} tel />
          <Info libelle="E-mail" valeur={cio.email} />
          <Info libelle="Ville" valeur={cio.ville} />
          <Info libelle="Adresse" valeur={cio.adresse} />
        </dl>

        {suppression && (
          <SuppressionCio cio={cio} onFermer={() => setSuppression(false)} onSupprime={onSupprime} />
        )}
      </section>
    )
  }

  /* ---------- Mode édition ---------- */
  return (
    <form className="carte fiche-cio" onSubmit={enregistrer}>
      <h2 className="carte-titre">Modifier l’identité du CIO</h2>

      <div className="logo-edition">
        <LogoCio url={f.logo_url} nom={f.nom} />
        <div>
          <div className="champ-label">Logo du CIO</div>
          <p className="champ-aide">PNG, JPG, WEBP ou SVG · 1 Mo maximum · de préférence carré</p>
          <div className="logo-boutons">
            <button
              type="button"
              className="btn btn-petit"
              onClick={() => champFichier.current?.click()}
              disabled={envoiLogo}
            >
              {envoiLogo ? 'Envoi…' : f.logo_url ? 'Changer le logo' : 'Ajouter un logo'}
            </button>
            {f.logo_url && (
              <button type="button" className="btn btn-petit btn-discret" onClick={retirerLogo}>
                Supprimer le logo
              </button>
            )}
          </div>
          <input
            ref={champFichier}
            type="file"
            accept={TYPES_LOGO.join(',')}
            onChange={choisirLogo}
            hidden
          />
        </div>
      </div>

      <div className="grille-2">
        <Champ label="Nom du CIO" requis>
          <input value={f.nom} onChange={maj('nom')} required autoFocus />
        </Champ>
        <Champ label="DRENA du CIO">
          <input value={f.drena} onChange={maj('drena')} placeholder="ex : DRENA Bouaké 1" />
        </Champ>
      </div>
      <Champ label="Chef du CIO (DCIO)">
        <input value={f.chef_cio} onChange={maj('chef_cio')} placeholder="Nom et prénoms du directeur" />
      </Champ>
      <div className="grille-2">
        <Champ label="Contact 1">
          <input type="tel" value={f.telephone} onChange={maj('telephone')} placeholder="ex : 07 00 00 00 00" />
        </Champ>
        <Champ label="Contact 2">
          <input type="tel" value={f.telephone2} onChange={maj('telephone2')} />
        </Champ>
      </div>
      <div className="grille-3">
        <Champ label="E-mail">
          <input type="email" value={f.email} onChange={maj('email')} />
        </Champ>
        <Champ label="Ville">
          <input value={f.ville} onChange={maj('ville')} />
        </Champ>
        <Champ label="Adresse">
          <input value={f.adresse} onChange={maj('adresse')} />
        </Champ>
      </div>

      <div className="actions-formulaire">
        <button type="button" className="btn btn-discret" onClick={annuler} disabled={envoi}>
          Annuler
        </button>
        <button className="btn btn-plein" disabled={envoi || envoiLogo}>
          {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

function Info({ libelle, valeur, tel }) {
  return (
    <div className="info">
      <dt>{libelle}</dt>
      <dd>
        {valeur ? (
          tel ? (
            <a href={`tel:${valeur.replace(/\s/g, '')}`}>{valeur}</a>
          ) : (
            valeur
          )
        ) : (
          <span className="texte-vide">Non renseigné</span>
        )}
      </dd>
    </div>
  )
}

/* ---------- Suppression du CIO ---------- */
function SuppressionCio({ cio, onFermer, onSupprime }) {
  const [saisie, setSaisie] = useState('')
  const [compte, setCompte] = useState(null)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('etablissements').select('id', { count: 'exact', head: true }),
      supabase.from('eleves').select('id', { count: 'exact', head: true }),
      supabase.from('personnel').select('id', { count: 'exact', head: true }),
    ]).then(([e, el, p]) => setCompte({ etabs: e.count ?? 0, eleves: el.count ?? 0, membres: p.count ?? 0 }))
  }, [])

  const correspond = saisie.trim().toUpperCase() === cio.nom.trim().toUpperCase()

  const supprimer = async () => {
    setErreur('')
    setEnvoi(true)
    const { error } = await supabase.rpc('supprimer_cio', { p_nom_confirmation: saisie })
    if (error) {
      setEnvoi(false)
      return setErreur(
        error.message?.includes('Could not find the function')
          ? 'La base doit d’abord être mise à jour : exécutez la migration 03 dans Supabase.'
          : messageErreur(error)
      )
    }
    if (cio.logo_url) await retirerFichierLogo(cio.logo_url).catch(() => {})
    onSupprime()
  }

  return (
    <Modale titre="Supprimer le CIO" onFermer={onFermer}>
      <div className="zone-danger">
        <strong>Cette action est définitive.</strong> Seront supprimés :
        <ul>
          <li>le CIO « {cio.nom} » et son logo ;</li>
          <li>{compte ? compte.etabs : '…'} établissement(s) et tous leurs parcours d’élèves ;</li>
          <li>{compte ? compte.eleves : '…'} élève(s) suivi(s), avec notes, absences, entretiens et décisions ;</li>
          <li>
            {compte ? Math.max(0, compte.membres - 1) : '…'} compte(s) de conseillers et points focaux.
          </li>
        </ul>
        Votre propre compte est conservé : à la prochaine connexion, vous pourrez créer un nouveau CIO.
      </div>
      <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
      <Champ label={`Pour confirmer, tapez le nom du CIO : ${cio.nom}`}>
        <input value={saisie} onChange={(e) => setSaisie(e.target.value)} autoFocus autoComplete="off" />
      </Champ>
      <div className="actions-formulaire">
        <button type="button" className="btn btn-discret" onClick={onFermer}>
          Annuler
        </button>
        <button className="btn btn-danger-plein" onClick={supprimer} disabled={!correspond || envoi}>
          {envoi ? 'Suppression…' : 'Supprimer définitivement'}
        </button>
      </div>
    </Modale>
  )
}

/* =====================================================================
   Pondération du score d'orientation
   ===================================================================== */
function Ponderation({ cioId, setErreur, setInfo }) {
  const [pond, setPond] = useState(null)

  useEffect(() => {
    supabase
      .from('ponderation_orientation')
      .select('*')
      .eq('cio_id', cioId)
      .maybeSingle()
      .then(({ data }) =>
        setPond(data ?? { poids_notes: 60, poids_conduite: 10, poids_absences: 10, poids_voeux: 20 })
      )
  }, [cioId])

  if (!pond) return <div className="carte"><Chargement /></div>

  const majPond = (cle) => (e) => setPond({ ...pond, [cle]: e.target.value })
  const total = ['poids_notes', 'poids_conduite', 'poids_absences', 'poids_voeux'].reduce(
    (t, k) => t + (Number(pond[k]) || 0),
    0
  )

  const enregistrer = async (e) => {
    e.preventDefault()
    if (total <= 0) return setErreur('La somme des poids doit être supérieure à 0.')
    const { error } = await supabase
      .from('ponderation_orientation')
      .update({
        poids_notes: Number(pond.poids_notes) || 0,
        poids_conduite: Number(pond.poids_conduite) || 0,
        poids_absences: Number(pond.poids_absences) || 0,
        poids_voeux: Number(pond.poids_voeux) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('cio_id', cioId)
    if (error) return setErreur(messageErreur(error))
    setInfo('Pondération du score d’orientation enregistrée.')
  }

  return (
    <form className="carte" onSubmit={enregistrer}>
      <h2 className="carte-titre">Score d’orientation</h2>
      <p className="texte-doux">
        Poids de chaque critère dans le score de recommandation. Total actuel : <strong>{total}</strong>
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
  )
}

/* =====================================================================
   Années scolaires
   ===================================================================== */
function Annees({ setErreur, setInfo, onProfilChange }) {
  const [annees, setAnnees] = useState([])
  const [nouvelle, setNouvelle] = useState({ libelle: '', date_debut: '', date_fin: '' })

  const charger = useCallback(async () => {
    const { data } = await supabase.from('annees_scolaires').select('*').order('date_debut', { ascending: false })
    setAnnees(data ?? [])
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const definirEnCours = async (a) => {
    const { error: e1 } = await supabase.from('annees_scolaires').update({ en_cours: false }).neq('id', a.id)
    const { error: e2 } = await supabase.from('annees_scolaires').update({ en_cours: true }).eq('id', a.id)
    if (e1 || e2) return setErreur(messageErreur(e1 || e2))
    setInfo(`L'année ${a.libelle} est maintenant l'année en cours.`)
    charger()
    onProfilChange()
  }

  const ajouter = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('annees_scolaires').insert({
      libelle: nouvelle.libelle.trim(),
      date_debut: nouvelle.date_debut || null,
      date_fin: nouvelle.date_fin || null,
    })
    if (error) return setErreur(messageErreur(error))
    setNouvelle({ libelle: '', date_debut: '', date_fin: '' })
    setInfo('Année scolaire ajoutée.')
    charger()
  }

  return (
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
      <form onSubmit={ajouter} className="grille-3 ajout-annee">
        <Champ label="Nouvelle année">
          <input
            value={nouvelle.libelle}
            onChange={(e) => setNouvelle({ ...nouvelle, libelle: e.target.value })}
            placeholder="2027-2028"
            pattern="\d{4}-\d{4}"
            required
          />
        </Champ>
        <Champ label="Début">
          <input
            type="date"
            value={nouvelle.date_debut}
            onChange={(e) => setNouvelle({ ...nouvelle, date_debut: e.target.value })}
          />
        </Champ>
        <Champ label="Fin">
          <input
            type="date"
            value={nouvelle.date_fin}
            onChange={(e) => setNouvelle({ ...nouvelle, date_fin: e.target.value })}
          />
        </Champ>
        <button className="btn">Ajouter</button>
      </form>
    </div>
  )
}
