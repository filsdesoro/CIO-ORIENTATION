import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
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

  // Sans CIO, on ouvre Paramètres en premier (les autres rubriques restent visibles)
  useEffect(() => {
    if (profil === null) setPage('parametres')
  }, [profil])

  const deconnexion = async () => {
    await supabase.auth.signOut()
    setProfil(undefined)
  }

  if (session === undefined) return <Chargement texte="Ouverture…" />
  if (!session) return <Login />
  if (profil === undefined) return <Chargement texte="Chargement de votre profil…" />

  // Compte sans CIO : on entre directement dans l'application, sur Paramètres,
  // où l'administrateur renseigne puis enregistre la fiche de son CIO.
  if (profil === null) {
    const profilProvisoire = {
      id: session.user.id,
      nom: (session.user.email || 'Administrateur').split('@')[0],
      prenoms: '',
      role: 'admin_cio',
      actif: true,
      cio: null,
      cio_id: null,
      sansCio: true,
    }
    return (
      <Layout profil={profilProvisoire} page={page} setPage={setPage} onDeconnexion={deconnexion}>
        {page === 'parametres' ? (
          <Parametres profil={profilProvisoire} annee={annee} onProfilChange={chargerProfil} />
        ) : (
          <AvantCio rubrique={page} onParametres={() => setPage('parametres')} />
        )}
      </Layout>
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

const NOMS_RUBRIQUES = {
  tableau: 'Tableau de bord',
  etablissements: 'Écoles',
  personnel: 'Personnels',
  eleves: 'Élèves',
}

// Rubrique ouverte avant l'enregistrement de la fiche du CIO
function AvantCio({ rubrique, onParametres }) {
  return (
    <>
      <div className="page-entete">
        <div>
          <h1>{NOMS_RUBRIQUES[rubrique] ?? 'Rubrique'}</h1>
        </div>
      </div>
      <div className="carte">
        <div className="vide">
          <div className="vide-tampon">⚙</div>
          <h3>Enregistrez d’abord la fiche de votre CIO</h3>
          <p>Cette rubrique sera disponible dès que le nom du CIO aura été enregistré dans Paramètres.</p>
          <button className="btn btn-plein" onClick={onParametres}>
            Aller à Paramètres
          </button>
        </div>
      </div>
    </>
  )
}
