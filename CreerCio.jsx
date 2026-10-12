import { useState } from 'react'
import { supabase, messageErreur } from './supabase'
import { Alerte, Champ } from './ui'

const VIDE = {
  nom: '',
  drena: '',
  chef_cio: '',
  telephone: '',
  telephone2: '',
  ville: '',
  adresse: '',
  email: '',
  identifiant: '',
  admin_nom: '',
  admin_prenoms: '',
  admin_telephone: '',
}

export default function CreerCio({ email, onCree, onDeconnexion }) {
  const [f, setF] = useState(VIDE)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const maj = (cle) => (e) => setF({ ...f, [cle]: e.target.value })

  const creer = async (e) => {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    const { error } = await supabase.rpc('creer_mon_cio', {
      p_nom: f.nom,
      p_identifiant: f.identifiant.trim().toLowerCase(),
      p_ville: f.ville,
      p_drena: f.drena,
      p_adresse: f.adresse,
      p_telephone: f.telephone,
      p_telephone2: f.telephone2,
      p_chef_cio: f.chef_cio,
      p_email: f.email,
      p_admin_nom: f.admin_nom,
      p_admin_prenoms: f.admin_prenoms,
      p_admin_telephone: f.admin_telephone,
    })
    setEnvoi(false)
    if (error) return setErreur(messageErreur(error))
    onCree()
  }

  return (
    <div className="ecran-centre">
      <form className="carte carte-moyenne" onSubmit={creer}>
        <div className="etape">Première connexion</div>
        <h2>Créer votre CIO</h2>
        <p className="texte-doux">
          Votre compte <strong>{email}</strong> n'est rattaché à aucun CIO. Renseignez votre centre :
          vous en deviendrez l'administrateur, et vous vous connecterez ensuite avec l'identifiant choisi ci-dessous. Vous pourrez ajouter le logo, les établissements et
          les conseillers de votre zone.
        </p>

        <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>

        <fieldset>
          <legend>Le centre</legend>
          <div className="grille-2">
            <Champ label="Nom du CIO" requis>
              <input value={f.nom} onChange={maj('nom')} placeholder="ex : CIO de Bouaké" required autoFocus />
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
              <input type="tel" value={f.telephone} onChange={maj('telephone')} />
            </Champ>
            <Champ label="Contact 2">
              <input type="tel" value={f.telephone2} onChange={maj('telephone2')} />
            </Champ>
          </div>
          <div className="grille-3">
            <Champ label="E-mail du centre">
              <input type="email" value={f.email} onChange={maj('email')} />
            </Champ>
            <Champ label="Ville">
              <input value={f.ville} onChange={maj('ville')} />
            </Champ>
            <Champ label="Adresse">
              <input value={f.adresse} onChange={maj('adresse')} />
            </Champ>
          </div>
        </fieldset>

        <fieldset>
          <legend>L'administrateur (vous)</legend>
          <div className="grille-2">
            <Champ label="Nom" requis>
              <input value={f.admin_nom} onChange={maj('admin_nom')} required />
            </Champ>
            <Champ label="Prénoms">
              <input value={f.admin_prenoms} onChange={maj('admin_prenoms')} />
            </Champ>
          </div>
          <div className="grille-2">
            <Champ
              label="Identifiant de connexion"
              requis
              aide="3 à 30 caractères : lettres minuscules, chiffres, point, tiret. Ex : admin.bouake"
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
            <Champ label="Téléphone">
              <input type="tel" value={f.admin_telephone} onChange={maj('admin_telephone')} />
            </Champ>
          </div>
        </fieldset>

        <div className="actions-formulaire">
          <button type="button" className="btn btn-discret" onClick={onDeconnexion}>
            Se déconnecter
          </button>
          <button className="btn btn-plein" disabled={envoi}>
            {envoi ? 'Création…' : 'Créer le CIO'}
          </button>
        </div>
      </form>
    </div>
  )
}
