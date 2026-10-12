import { LOCALITES, libelleLocalite, trouverLocalite } from './localites'

// Liste déroulante des localités de Côte d'Ivoire, avec recherche par saisie.
// On peut aussi taper une localité absente de la liste (village, quartier…).
export default function ChampLocalite({ value, onChange, id = 'liste-localites', placeholder }) {
  const choisie = trouverLocalite(value)

  const changer = (e) => {
    const texte = e.target.value
    const l = trouverLocalite(texte)
    // Si l'on choisit une ligne « Nom — Département, Région », on ne garde que le nom
    onChange(l && texte === libelleLocalite(l) ? l.nom : texte)
  }

  return (
    <>
      <input
        list={id}
        value={value ?? ''}
        onChange={changer}
        placeholder={placeholder ?? 'Tapez ou choisissez une localité…'}
        autoComplete="off"
      />
      <datalist id={id}>
        {LOCALITES.map((l) => (
          <option key={`${l.nom}-${l.departement}`} value={libelleLocalite(l)} />
        ))}
      </datalist>
      {choisie ? (
        <span className="champ-aide localite-info">
          Département de {choisie.departement} · Région {choisie.region === choisie.departement ? 'district autonome' : choisie.region} · District {choisie.district}
        </span>
      ) : value ? (
        <span className="champ-aide">Localité hors liste (enregistrée telle quelle).</span>
      ) : (
        <span className="champ-aide">{LOCALITES.length} localités : toutes les sous-préfectures de Côte d’Ivoire.</span>
      )}
    </>
  )
}
