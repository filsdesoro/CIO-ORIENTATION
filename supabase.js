import { createClient } from '@supabase/supabase-js'

// Clés publiques du projet CIO-ORIENTATION (sans risque côté navigateur :
// la sécurité des données est assurée par les règles RLS de la base).
// Elles peuvent être remplacées par des variables d'environnement Vercel.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://tseqjsulgitmgecskqzx.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IODk-ORPz4dEeqAyEKmuXw_c9DTL515'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Traduit les erreurs techniques les plus courantes en messages clairs
export function messageErreur(error) {
  if (!error) return ''
  const msg = error.message || String(error)
  if (msg.includes('Invalid login credentials')) return 'E-mail ou mot de passe incorrect.'
  if (msg.includes('Email not confirmed')) return "Ce compte n'est pas encore confirmé."
  if (error.code === '23505' || msg.includes('duplicate key')) return 'Cet enregistrement existe déjà.'
  if (error.code === '42501' || msg.includes('row-level security'))
    return "Vous n'avez pas les droits pour cette action."
  if (msg.includes('Failed to fetch')) return 'Connexion impossible. Vérifiez votre accès internet.'
  return msg
}

export const LIBELLES_ROLES = {
  admin_cio: 'Administrateur CIO',
  conseiller: "Conseiller d'orientation",
  point_focal: 'Point focal établissement',
}

export const TYPES_ETAB = {
  college: 'Collège',
  lycee: 'Lycée',
  college_lycee: 'Collège-Lycée',
  technique: 'Lycée technique',
  professionnel: 'Formation professionnelle',
}

export const STATUTS_ETAB = {
  public: 'Public',
  prive_laic: 'Privé laïc',
  prive_confessionnel: 'Privé confessionnel',
}

export const NIVEAUX = ['6e', '5e', '4e', '3e', '2nde', '1ere', 'Tle']
export const LIBELLES_NIVEAUX = {
  '6e': '6e', '5e': '5e', '4e': '4e', '3e': '3e', '2nde': '2nde', '1ere': '1ère', Tle: 'Terminale',
}
