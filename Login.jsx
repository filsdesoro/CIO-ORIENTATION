import { useState } from 'react'
import { supabase, messageErreur } from './supabase'
import { Alerte, Champ } from './ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const connexion = async (e) => {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: motDePasse,
    })
    setEnvoi(false)
    if (error) setErreur(messageErreur(error))
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
          <Champ label="Adresse e-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              autoFocus
            />
          </Champ>
          <Champ label="Mot de passe">
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Champ>
          <button className="btn btn-plein" disabled={envoi}>
            {envoi ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </main>
    </div>
  )
}
