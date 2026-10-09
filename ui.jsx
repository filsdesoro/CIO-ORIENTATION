import { useEffect } from 'react'

export function Champ({ label, children, aide, requis }) {
  return (
    <label className="champ">
      <span className="champ-label">
        {label}
        {requis && <span className="requis"> *</span>}
      </span>
      {children}
      {aide && <span className="champ-aide">{aide}</span>}
    </label>
  )
}

export function Alerte({ type = 'erreur', children, onFermer }) {
  if (!children) return null
  return (
    <div className={`alerte alerte-${type}`} role={type === 'erreur' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onFermer && (
        <button type="button" className="alerte-fermer" onClick={onFermer} aria-label="Fermer">
          ×
        </button>
      )}
    </div>
  )
}

export function Modale({ titre, onFermer, children, large }) {
  useEffect(() => {
    const echap = (e) => e.key === 'Escape' && onFermer()
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [onFermer])

  return (
    <div className="modale-fond" onMouseDown={(e) => e.target === e.currentTarget && onFermer()}>
      <div className={`modale ${large ? 'modale-large' : ''}`} role="dialog" aria-modal="true">
        <div className="modale-entete">
          <h2>{titre}</h2>
          <button type="button" className="btn-icone" onClick={onFermer} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="modale-corps">{children}</div>
      </div>
    </div>
  )
}

export function Vide({ titre, texte, action }) {
  return (
    <div className="vide">
      <div className="vide-tampon">∅</div>
      <h3>{titre}</h3>
      {texte && <p>{texte}</p>}
      {action}
    </div>
  )
}

export function Chargement({ texte = 'Chargement…' }) {
  return (
    <div className="chargement">
      <span className="spinner" aria-hidden="true" />
      {texte}
    </div>
  )
}

export function EnTete({ titre, sousTitre, actions }) {
  return (
    <div className="page-entete">
      <div>
        <h1>{titre}</h1>
        {sousTitre && <p className="sous-titre">{sousTitre}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
