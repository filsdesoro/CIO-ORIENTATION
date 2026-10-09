import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Chargement } from './components/ui'
import Login from './pages/Login'
import CreerCio from './pages/CreerCio'
import Layout from './components/Layout'
import TableauDeBord from './pages/TableauDeBord'
import Etablissements from './pages/Etablissements'
import Personnel from './pages/Personnel'
import Eleves from './pages/Eleves'
import Parametres from './pages/Parametres'

const PAGES = {
  tableau: TableauDeBord,
  etablissements: Etablissements,
  personnel: Personnel,
  eleves: Eleves,
  parametres: Parametres,
}

function pageInitiale() {
  const h = window.location.hash.replace('#', '')
  return PAGES[h] ? h : 'tableau'
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = vérification en cours
  const [profil, setProfil] = useState(undefined)
  const [annee, setAnnee] = useState(null)
  const [page, setPage] = useState(pageInitiale)

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
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase
        .from('personnel')
        .select('*, cio(*), etab:etablissements!personnel_etablissement_id_fkey(nom)')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabase
        .from('annees_scolaires')
        .select('*')
        .eq('en_cours', true)
        .order('date_debut', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    setProfil(p ?? null)
    setAnnee(a ?? null)
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
  if (profil === undefined) return <Chargement texte="Chargement de votre profil…" />
  if (profil === null)
    return <CreerCio email={session.user.email} onCree={chargerProfil} onDeconnexion={deconnexion} />

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
