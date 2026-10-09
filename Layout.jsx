import { useState } from 'react'
import { LIBELLES_ROLES } from './supabase'

const MENU = [
  { id: 'tableau', libelle: 'Tableau de bord', icone: '◧' },
  { id: 'etablissements', libelle: 'Établissements', icone: '▦' },
  { id: 'eleves', libelle: 'Élèves', icone: '◉' },
  { id: 'personnel', libelle: 'Personnel', icone: '◎', roles: ['admin_cio'] },
  { id: 'parametres', libelle: 'Paramètres du CIO', icone: '⚙', roles: ['admin_cio'] },
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
        <span className="barre-titre">{profil.cio?.nom}</span>
      </header>

      <nav className={`sidebar ${menuOuvert ? 'ouverte' : ''}`}>
        <div className="sidebar-cio">
          <span className="logo-pastille">CIO</span>
          <div>
            <div className="sidebar-nom">{profil.cio?.nom}</div>
            <div className="sidebar-sous">{profil.cio?.drena || profil.cio?.ville || '—'}</div>
          </div>
        </div>

        <ul className="menu">
          {items.map((m) => (
            <li key={m.id}>
              <button className={page === m.id ? 'actif' : ''} onClick={() => aller(m.id)}>
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
