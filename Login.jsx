import { useState } from 'react'
import { supabase, messageErreur } from './supabase'
import { Alerte, Champ } from './ui'

// Nom de la fonction serveur qui retrouve le compte à partir de l'identifiant
const FONCTION_CONNEXION = 'connexion'

export default function Login() {
  const [identifiant, setIdentifiant] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [voirMotDePasse, setVoirMotDePasse] = useState(false)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const connexion = async (e) => {
    e.preventDefault()
    setErreur('')
    const saisie = identifiant.trim().toLowerCase()
    if (!saisie || !motDePasse) return setErreur('Saisissez votre identifiant et votre mot de passe.')
    setEnvoi(true)

    // Un e-mail reste accepté : connexion directe
    if (saisie.includes('@')) {
      const { error } = await supabase.auth.signInWithPassword({ email: saisie, password: motDePasse })
      setEnvoi(false)
      if (error) setErreur(messageErreur(error).replace('E-mail', 'Identifiant'))
      return
    }

    // Identifiant court : la fonction serveur vérifie et renvoie la session
    const { data, error } = await supabase.functions.invoke(FONCTION_CONNEXION, {
      body: { identifiant: saisie, password: motDePasse },
    })
    if (error || !data?.access_token) {
      let msg = 'Identifiant ou mot de passe incorrect.'
      try {
        const corps = await error?.context?.json?.()
        if (corps?.error) msg = corps.error
      } catch {
        /* message par défaut */
      }
      if (error?.message?.includes('Failed to send')) msg = 'Connexion impossible. Vérifiez votre accès internet.'
      setEnvoi(false)
      return setErreur(msg)
    }
    const { error: errSession } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
    setEnvoi(false)
    if (errSession) setErreur(messageErreur(errSession))
  }

  return (
    <div className="login">
      <aside className="login-panneau">
        <div className="login-marque">
          <span className="logo-pastille">CIO</span>
          <span>Centre d'Information et d'Orientation</span>
        </div>
        <div className="login-accroche">
          <h1>Suivre chaque élève, établissement par établissement.</h1>
          <p>
            Parcours scolaire, entretiens, vœux et décisions d'orientation de toute votre zone,
            réunis au même endroit.
          </p>
        </div>
        <div className="login-bandes" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </aside>

      <main className="login-formulaire">
        <form onSubmit={connexion} className="carte carte-etroite">
          <h2>Connexion</h2>
          <p className="texte-doux">Accès réservé au personnel du CIO et des établissements.</p>
          <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>
          <Champ label="Identifiant">
            <input
              type="text"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="ex : admin.bouake"
              required
              autoFocus
            />
          </Champ>
          <Champ label="Mot de passe">
            <div className="champ-mot-de-passe">
              <input
                type={voirMotDePasse ? 'text' : 'password'}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="btn-voir"
                onClick={() => setVoirMotDePasse(!voirMotDePasse)}
                aria-label={voirMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {voirMotDePasse ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </Champ>
          <button className="btn btn-plein btn-bloc" disabled={envoi}>
            {envoi ? 'Connexion…' : 'Se connecter'}
          </button>
          <p className="login-aide">Identifiant ou mot de passe oublié ? Contactez l'administrateur de votre CIO.</p>
        </form>
      </main>
    </div>
  )
}
