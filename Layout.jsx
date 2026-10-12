import { useState } from 'react'
import { LIBELLES_ROLES } from './supabase'
import { LogoCio } from './ui'

// Rubriques, dans l'ordre de la fiche « Projet »
const MENU = [
  { id: 'tableau', libelle: 'Tableau de bord', icone: '◧' },
  { id: 'parametres', libelle: 'Paramètres', icone: '⚙', roles: ['admin_cio'] },
  { id: 'etablissements', libelle: 'Écoles', icone: '▦' },
  { id: 'personnel', libelle: 'Personnels', icone: '◎', roles: ['admin_cio'] },
  { id: 'eleves', libelle: 'Élèves', icone: '◉' },
]

export default function Layout({ profil, page, setPage, onDeconnexion, children }) {
  const [menuOuvert, setMenuOuvert] = useState(false)
  const items = MENU.filter((m) => !m.roles || m.roles.includes(profil.role))

  const aller = (id) => {
    setPage(id)
    setMenuOuvert(false)
  }

  return (
    <div className="app">
      <header className="barre-mobile">
        <button className="btn-icone" onClick={() => setMenuOuvert(!menuOuvert)} aria-label="Menu">
          ☰
        </button>
        <LogoCio url={profil.cio?.logo_url} nom={profil.cio?.nom} petit />
        <span className="barre-titre">{profil.cio?.nom || 'Nouveau CIO'}</span>
      </header>

      <nav className={`sidebar ${menuOuvert ? 'ouverte' : ''}`}>
        <div className="sidebar-cio">
          <LogoCio url={profil.cio?.logo_url} nom={profil.cio?.nom} petit />
          <div>
            <div className="sidebar-nom">{profil.cio?.nom || 'Nouveau CIO'}</div>
            <div className="sidebar-sous">{profil.cio?.drena || profil.cio?.ville || '—'}</div>
          </div>
        </div>

        <ul className="menu">
          {items.map((m) => (
            <li key={m.id}>
              <button
                className={page === m.id ? 'actif' : ''}
                onClick={() => aller(m.id)}
              >
                <span className="menu-icone" aria-hidden="true">
                  {m.icone}
                </span>
                {m.libelle}
              </button>
            </li>
          ))}
        </ul>

        <div className="sidebar-pied">
          <div className="utilisateur">
            <div className="avatar">{(profil.nom || '?').slice(0, 1)}</div>
            <div>
              <div className="utilisateur-nom">
                {profil.nom} {profil.prenoms}
              </div>
              {profil.identifiant && <div className="utilisateur-identifiant">@{profil.identifiant}</div>}
              <div className="utilisateur-role">
                {LIBELLES_ROLES[profil.role]}
                {profil.role === 'point_focal' && profil.etab?.nom
                  ? ` · ${profil.etab.nom}`
                  : ''}
              </div>
            </div>
          </div>
          <button className="btn btn-discret btn-bloc" onClick={onDeconnexion}>
            Se déconnecter
          </button>
        </div>
      </nav>
      {menuOuvert && <div className="sidebar-voile" onClick={() => setMenuOuvert(false)} />}

      <main className="contenu">{children}</main>
    </div>
  )
}
