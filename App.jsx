import { useCallback, useEffect, useState } from 'react'
import { supabase, messageErreur } from './supabase'
import { Chargement } from './ui'
import Login from './Login'
import Layout from './Layout'
import TableauDeBord from './TableauDeBord'
import Etablissements from './Etablissements'
import Personnel from './Personnel'
import Eleves from './Eleves'
import Parametres from './Parametres'

const PAGES = {
  tableau: TableauDeBord,
  parametres: Parametres,
  etablissements: Etablissements,
  personnel: Personnel,
  eleves: Eleves,
}

function pageInitiale() {
  const h = window.location.hash.replace('#', '')
  return PAGES[h] ? h : 'tableau'
}

const SELECTION_PROFIL = '*, cio(*), etab:etablissements!personnel_etablissement_id_fkey(nom)'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = vérification en cours
  const [profil, setProfil] = useState(undefined)
  const [annee, setAnnee] = useState(null)
  const [page, setPage] = useState(pageInitiale)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const chargerProfil = useCallback(async () => {
    if (!session) {
      setProfil(undefined)
      return
    }
    setErreur('')
    const lireProfil = () =>
      supabase.from('personnel').select(SELECTION_PROFIL).eq('id', session.user.id).maybeSingle()

    const [{ data: p }, { data: a }] = await Promise.all([
      lireProfil(),
      supabase
        .from('annees_scolaires')
        .select('*')
        .eq('en_cours', true)
        .order('date_debut', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    setAnnee(a ?? null)

    if (p) {
      setProfil(p)
      return
    }

    // Première connexion : une fiche CIO provisoire est créée automatiquement,
    // pour que toutes les rubriques soient utilisables tout de suite.
    const { error } = await supabase.rpc('initialiser_compte')
    if (error) {
      setErreur(messageErreur(error))
      setProfil(null)
      return
    }
    const { data: p2 } = await lireProfil()
    setProfil(p2 ?? null)
  }, [session])

  useEffect(() => {
    chargerProfil()
  }, [chargerProfil])

  useEffect(() => {
    window.location.hash = page
  }, [page])

  const deconnexion = async () => {
    await supabase.auth.signOut()
    setProfil(undefined)
  }

  if (session === undefined) return <Chargement texte="Ouverture…" />
  if (!session) return <Login />
  if (profil === undefined) return <Chargement texte="Chargement de votre espace…" />

  if (profil === null) {
    return (
      <div className="ecran-centre">
        <div className="carte carte-etroite">
          <h2>Espace indisponible</h2>
          <p className="texte-doux">
            Votre espace n'a pas pu être préparé. {erreur && <>Détail : {erreur}</>}
          </p>
          <div className="actions-formulaire">
            <button className="btn btn-discret" onClick={deconnexion}>
              Se déconnecter
            </button>
            <button className="btn btn-plein" onClick={chargerProfil}>
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!profil.actif) {
    return (
      <div className="ecran-centre">
        <div className="carte carte-etroite">
          <h2>Compte désactivé</h2>
          <p>Votre compte a été désactivé par l'administrateur du CIO.</p>
          <button className="btn" onClick={deconnexion}>
            Se déconnecter
          </button>
        </div>
      </div>
    )
  }

  const Page = PAGES[page] ?? TableauDeBord
  return (
    <Layout profil={profil} page={page} setPage={setPage} onDeconnexion={deconnexion}>
      <Page profil={profil} annee={annee} setPage={setPage} onProfilChange={chargerProfil} />
    </Layout>
  )
}
