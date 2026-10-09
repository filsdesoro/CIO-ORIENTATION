import { useState } from 'react'
import { supabase, messageErreur } from './supabase'
import { Alerte, Champ } from './ui'

const VIDE = {
  nom: '',
  ville: '',
  drena: '',
  adresse: '',
  telephone: '',
  email: '',
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
    const { error } = await supabase.rpc('creer_cio', {
      p_nom: f.nom,
      p_ville: f.ville,
      p_drena: f.drena,
      p_adresse: f.adresse,
      p_telephone: f.telephone,
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
          vous en deviendrez l'administrateur et pourrez ensuite ajouter les établissements et les
          conseillers de votre zone.
        </p>

        <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>

        <fieldset>
          <legend>Le centre</legend>
          <Champ label="Nom du CIO" requis>
            <input value={f.nom} onChange={maj('nom')} placeholder="ex : CIO de Bouaké" required />
          </Champ>
          <div className="grille-2">
            <Champ label="Ville">
              <input value={f.ville} onChange={maj('ville')} />
            </Champ>
            <Champ label="DRENA de rattachement">
              <input value={f.drena} onChange={maj('drena')} placeholder="ex : DRENA Bouaké 1" />
            </Champ>
          </div>
          <Champ label="Adresse">
            <input value={f.adresse} onChange={maj('adresse')} />
          </Champ>
          <div className="grille-2">
            <Champ label="Téléphone du centre">
              <input value={f.telephone} onChange={maj('telephone')} />
            </Champ>
            <Champ label="E-mail du centre">
              <input type="email" value={f.email} onChange={maj('email')} />
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
          <Champ label="Téléphone">
            <input value={f.admin_telephone} onChange={maj('admin_telephone')} />
          </Champ>
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
