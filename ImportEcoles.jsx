import { useMemo, useRef, useState } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import { supabase, messageErreur, TYPES_ETAB, STATUTS_ETAB, MILIEUX } from './supabase'
import { Alerte, Modale } from './ui'
import { trouverLocalite } from './localites'

// ---------------------------------------------------------------------
//  Import d'une liste d'écoles depuis un fichier Excel (.xlsx), CSV,
//  Word (.docx) ou PDF (tableau).
//  1. lecture du fichier   2. reconnaissance des colonnes
//  3. aperçu et contrôle   4. enregistrement (les doublons sont ignorés)
// ---------------------------------------------------------------------

// Champs de l'école et mots-clés qui permettent de reconnaître les colonnes
const CHAMPS = [
  { cle: 'nom', libelle: "Nom de l'école", requis: true, mots: ['nom', 'etablissement', 'ecole', 'denomination', 'libelle'] },
  { cle: 'code', libelle: 'Code (DSPS)', mots: ['code', 'matricule', 'dsps'] },
  { cle: 'drena', libelle: 'DRENA', mots: ['drena', 'dren', 'direction regionale'] },
  { cle: 'region', libelle: 'Région', mots: ['region'] },
  { cle: 'departement', libelle: 'Département', mots: ['departement'] },
  { cle: 'sous_prefecture', libelle: 'Sous-préfecture', mots: ['sous-prefecture', 'sous prefecture', 'sous_prefecture', 'sousprefecture', 's/p'] },
  { cle: 'commune', libelle: 'Commune', mots: ['commune'] },
  { cle: 'localite', libelle: 'Localité', mots: ['localite', 'ville', 'village', 'lieu'] },
  { cle: 'quartier', libelle: 'Quartier', mots: ['quartier'] },
  { cle: 'milieu', libelle: 'Milieu (urbain / rural)', mots: ['milieu', 'zone'] },
  { cle: 'regime', libelle: 'Régime (mixte, filles…)', mots: ['regime'] },
  { cle: 'type', libelle: 'Type (collège, lycée…)', mots: ['type', 'cycle', 'ordre', 'categorie', 'niveau'] },
  { cle: 'statut', libelle: 'Statut (public / privé)', mots: ['statut', 'public', 'prive', 'secteur'] },
  { cle: 'chef_etablissement', libelle: "Chef d'établissement", mots: ['chef', 'directeur', 'proviseur', 'principal', 'responsable'] },
  { cle: 'chef_contact1', libelle: 'Contact 1 du chef', mots: ['contact 1', 'contact1', 'tel 1', 'telephone 1'] },
  { cle: 'chef_contact2', libelle: 'Contact 2 du chef', mots: ['contact 2', 'contact2', 'tel 2', 'telephone 2'] },
  { cle: 'telephone', libelle: "Téléphone de l'école", mots: ['tel', 'telephone', 'contact', 'cel', 'portable'] },
  { cle: 'email', libelle: 'E-mail', mots: ['mail', 'courriel'] },
]

const sansAccents = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

// Lecture d'un CSV (séparateur ; ou , — guillemets gérés)
function lireCsv(texte) {
  const premiere = texte.split(/\r?\n/)[0] ?? ''
  const sep = (premiere.match(/;/g) ?? []).length >= (premiere.match(/,/g) ?? []).length ? ';' : ','
  const lignes = []
  let ligne = []
  let cellule = ''
  let guillemets = false
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') {
        cellule += '"'
        i++
      } else if (c === '"') guillemets = false
      else cellule += c
    } else if (c === '"') guillemets = true
    else if (c === sep) {
      ligne.push(cellule)
      cellule = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++
      ligne.push(cellule)
      lignes.push(ligne)
      ligne = []
      cellule = ''
    } else cellule += c
  }
  if (cellule || ligne.length) {
    ligne.push(cellule)
    lignes.push(ligne)
  }
  return lignes
}

// Trouve la ligne d'en-tête : parmi les 15 premières lignes, celle qui contient
// le plus de titres reconnus (un titre de document au-dessus est ainsi ignoré)
function trouverEntete(lignes) {
  let meilleure = 0
  let score = -1
  for (let i = 0; i < Math.min(lignes.length, 15); i++) {
    const cells = lignes[i].map(sansAccents).filter(Boolean)
    if (cells.length < 2) continue
    const n = cells.filter((c) => CHAMPS.some((ch) => ch.mots.some((m) => c.includes(m)))).length
    if (n > score) {
      score = n
      meilleure = i
    }
  }
  return meilleure
}

// Une ligne ressemble à un en-tête si au moins 2 de ses cellules sont des titres connus
function estEntete(cellules) {
  return (
    cellules.map(sansAccents).filter((c) => CHAMPS.some((ch) => ch.mots.some((m) => c.includes(m)))).length >= 2
  )
}

// Associe automatiquement chaque champ à une colonne du fichier.
// Les champs les plus précis passent d'abord (« Nom du chef » → chef,
// « Code établissement » → code), le nom de l'école en dernier.
const ORDRE_ASSOCIATION = [
  'chef_etablissement', 'chef_contact1', 'chef_contact2', 'email', 'telephone', 'code', 'drena',
  'sous_prefecture', 'departement', 'region', 'commune', 'quartier', 'milieu', 'regime', 'localite',
  'statut', 'type', 'nom',
]

function associerColonnes(entetes) {
  const pris = new Set()
  const assoc = {}
  for (const cle of ORDRE_ASSOCIATION) {
    const champ = CHAMPS.find((c) => c.cle === cle)
    const idx = entetes.findIndex(
      (h, i) => !pris.has(i) && sansAccents(h) && champ.mots.some((m) => sansAccents(h).includes(m))
    )
    assoc[cle] = idx
    if (idx >= 0) pris.add(idx)
  }
  return assoc
}

function deviner(cle, valeur) {
  const v = sansAccents(valeur)
  if (cle === 'statut') {
    if (!v) return 'public'
    if (v.includes('confess') || v.includes('cathol') || v.includes('islam') || v.includes('protest') || v.includes('methodist'))
      return 'prive_confessionnel'
    if (v.includes('priv')) return 'prive_laic'
    return 'public'
  }
  if (cle === 'type') {
    if (v.includes('techn')) return 'technique'
    if (v.includes('profes') || v.includes('formation')) return 'professionnel'
    if (v.includes('college') && v.includes('lycee')) return 'college_lycee'
    if (v.includes('lycee')) return 'lycee'
    return 'college'
  }
  if (cle === 'milieu') {
    if (v.startsWith('rur')) return 'rural'
    if (v.startsWith('urb')) return 'urbain'
    return null
  }
  if (cle === 'regime') {
    if (!v) return null
    if (v.includes('fille')) return 'filles'
    if (v.includes('garcon')) return 'garcons'
    return 'mixte'
  }
  return valeur
}

// Le type peut aussi se lire dans le nom (« Lycée Moderne… », « Collège… »)
function typeDepuisNom(nom) {
  const v = sansAccents(nom)
  if (v.startsWith('lycee professionnel') || v.includes('formation professionnelle')) return 'professionnel'
  if (v.startsWith('lycee technique')) return 'technique'
  if (v.startsWith('lycee')) return 'lycee'
  if (v.startsWith('college')) return 'college'
  return null
}

export default function ImportEcoles({ cioId, existants, onFermer, onImporte }) {
  const [nomFichier, setNomFichier] = useState('')
  const [entetes, setEntetes] = useState([])
  const [lignes, setLignes] = useState([])
  const [assoc, setAssoc] = useState({})
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [lecture, setLecture] = useState(false)
  const champFichier = useRef(null)

  const lireFichier = async (e) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    setErreur('')
    setLecture(true)
    try {
      let brutes
      if (/\.csv$/i.test(fichier.name) || fichier.type === 'text/csv') {
        brutes = lireCsv(await fichier.text())
      } else if (/\.docx$/i.test(fichier.name)) {
        const { lireWord } = await import('./lecteursFichiers')
        brutes = await lireWord(fichier)
      } else if (/\.pdf$/i.test(fichier.name)) {
        const { lirePdf } = await import('./lecteursFichiers')
        brutes = await lirePdf(fichier, estEntete)
      } else if (/\.xlsx$/i.test(fichier.name)) {
        // Toutes les feuilles du classeur : on prend la première qui contient des données
        const feuilles = await readXlsxFile(fichier)
        const feuille = feuilles.find((f) => (f.data ?? []).filter((l) => l.some((c) => c != null && c !== '')).length > 1)
        brutes = feuille?.data ?? []
      } else {
        return setErreur(
          'Format non reconnu. Utilisez un fichier Excel (.xlsx), Word (.docx), PDF ou CSV. Un ancien fichier .xls ou .doc doit d’abord être réenregistré en .xlsx ou .docx (Fichier → Enregistrer sous).'
        )
      }
      brutes = brutes
        .map((l) => l.map((c) => (c instanceof Date ? c.toLocaleDateString('fr-FR') : String(c ?? '').trim())))
        .filter((l) => l.some((c) => c !== ''))
      if (brutes.length < 2) return setErreur('Le fichier ne contient pas assez de lignes.')
      const iEntete = trouverEntete(brutes)
      const ent = brutes[iEntete]
      setNomFichier(fichier.name)
      setEntetes(ent)
      setLignes(brutes.slice(iEntete + 1))
      setAssoc(associerColonnes(ent))
    } catch (err) {
      setErreur('Impossible de lire ce fichier : ' + (err?.message || err))
    } finally {
      setLecture(false)
    }
  }

  const nomsExistants = useMemo(() => new Set(existants.map((e) => sansAccents(e.nom))), [existants])

  // Écoles prêtes à être enregistrées
  const ecoles = useMemo(() => {
    if (!lignes.length || assoc.nom < 0) return []
    const vues = new Set()
    return lignes
      .map((l) => {
        const val = (cle) => (assoc[cle] >= 0 ? String(l[assoc[cle]] ?? '').trim() : '')
        const nom = val('nom')
        if (!nom) return null
        const loc = val('localite')
        const ecole = {
          nom,
          code: val('code') || null,
          localite: loc ? trouverLocalite(loc)?.nom ?? loc : null,
          type: assoc.type >= 0 && val('type') ? deviner('type', val('type')) : typeDepuisNom(nom) ?? 'college',
          statut: deviner('statut', val('statut')),
          drena: val('drena') || null,
          region: val('region') || null,
          departement: val('departement') || null,
          sous_prefecture: val('sous_prefecture') || null,
          commune: /^-+$/.test(val('commune')) ? null : val('commune') || null,
          quartier: val('quartier') || null,
          milieu: deviner('milieu', val('milieu')),
          regime: deviner('regime', val('regime')),
          chef_etablissement: val('chef_etablissement') || null,
          chef_contact1: val('chef_contact1') || null,
          chef_contact2: val('chef_contact2') || null,
          telephone: val('telephone') || null,
          email: val('email') || null,
        }
        const cle = sansAccents(nom)
        ecole.doublon = nomsExistants.has(cle) || vues.has(cle)
        vues.add(cle)
        return ecole
      })
      .filter(Boolean)
  }, [lignes, assoc, nomsExistants])

  const aImporter = ecoles.filter((e) => !e.doublon)

  const importer = async () => {
    setErreur('')
    setEnvoi(true)
    const donnees = aImporter.map(({ doublon, ...e }) => ({ ...e, cio_id: cioId }))
    let total = 0
    for (let i = 0; i < donnees.length; i += 200) {
      const { error } = await supabase.from('etablissements').insert(donnees.slice(i, i + 200))
      if (error) {
        setEnvoi(false)
        return setErreur(`${total} école(s) enregistrée(s), puis erreur : ${messageErreur(error)}`)
      }
      total += Math.min(200, donnees.length - i)
    }
    setEnvoi(false)
    onImporte(
      `${total} école(s) importée(s)` +
        (ecoles.length - aImporter.length ? `, ${ecoles.length - aImporter.length} ignorée(s) car déjà présente(s).` : '.')
    )
  }

  const telechargerModele = () => {
    const contenu =
      '﻿' +
      [
        'Nom;Code DSPS;DRENA;Région;Département;Sous-préfecture;Commune;Localité;Quartier;Milieu;Régime;Type;Statut;Chef d’établissement;Contact 1;Contact 2;Téléphone;E-mail',
        'Collège Moderne Katiola;000798;KATIOLA;HAMBOL;KATIOLA;KATIOLA;KATIOLA;KATIOLA;PEDIAKAHA;Urbain;Mixte;Collège;Public;;;;;',
        'Collège Moderne de Niediekaha;198002;KATIOLA;HAMBOL;NIAKARAMADOUGOU;NIEDIEKAHA;;NIEDIEKAHA;;Rural;Mixte;Collège;Public;;;;;',
      ].join('\r\n')
    const url = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'modele-import-ecoles.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modale titre="Importer des écoles" onFermer={onFermer} large>
      <Alerte onFermer={() => setErreur('')}>{erreur}</Alerte>

      <div className="import-depot">
        <div>
          <strong>{nomFichier || 'Choisissez votre fichier'}</strong>
          <p className="texte-doux">
            <b>Excel</b>, <b>Word</b> ou <b>PDF</b> (ou CSV) contenant un tableau avec une ligne d’en-tête
            (Nom, Code, DRENA, Région, Localité, Milieu…). Les colonnes sont reconnues automatiquement ; vérifiez l’aperçu avant
            d’importer.
          </p>
        </div>
        <div className="import-boutons">
          <button
            type="button"
            className="btn btn-plein"
            onClick={() => champFichier.current?.click()}
            disabled={lecture}
          >
            {lecture ? 'Lecture du fichier…' : nomFichier ? 'Choisir un autre fichier' : 'Choisir un fichier'}
          </button>
          <button type="button" className="btn btn-discret" onClick={telechargerModele}>
            Télécharger un modèle
          </button>
        </div>
        <input ref={champFichier} type="file" accept=".xlsx,.csv,.docx,.pdf" onChange={lireFichier} hidden />
      </div>

      {entetes.length > 0 && (
        <>
          <h3 className="section-titre">Colonnes reconnues</h3>
          <div className="import-colonnes">
            {CHAMPS.map((c) => (
              <label key={c.cle} className="champ">
                <span className="champ-label">
                  {c.libelle}
                  {c.requis && <span className="requis"> *</span>}
                </span>
                <select
                  value={assoc[c.cle] ?? -1}
                  onChange={(e) => setAssoc({ ...assoc, [c.cle]: Number(e.target.value) })}
                >
                  <option value={-1}>— Aucune —</option>
                  {entetes.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Colonne ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {assoc.nom < 0 ? (
            <Alerte>Indiquez quelle colonne contient le nom de l’école.</Alerte>
          ) : (
            <>
              <h3 className="section-titre">
                Aperçu : {aImporter.length} école(s) à importer
                {ecoles.length - aImporter.length > 0 && (
                  <span className="etiquette etiquette-alerte">
                    {ecoles.length - aImporter.length} déjà présente(s), ignorée(s)
                  </span>
                )}
              </h3>
              <div className="tableau-defilant import-apercu">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Localité</th>
                      <th>DRENA</th>
                      <th>Milieu</th>
                      <th>Type</th>
                      <th>Statut</th>
                      <th>Chef</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ecoles.slice(0, 50).map((e, i) => (
                      <tr key={i} className={e.doublon ? 'ligne-inactive' : ''}>
                        <td>
                          <div className="cellule-titre">{e.nom}</div>
                          {e.code && <div className="cellule-sous">{e.code}</div>}
                        </td>
                        <td>{e.localite || '—'}</td>
                        <td>{e.drena || '—'}</td>
                        <td>{MILIEUX[e.milieu] || '—'}</td>
                        <td>{TYPES_ETAB[e.type]}</td>
                        <td>{STATUTS_ETAB[e.statut]}</td>
                        <td>{e.chef_etablissement || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ecoles.length > 50 && <p className="texte-doux">… et {ecoles.length - 50} autre(s).</p>}
            </>
          )}
        </>
      )}

      <div className="actions-formulaire">
        <button type="button" className="btn btn-discret" onClick={onFermer}>
          Annuler
        </button>
        <button
          type="button"
          className="btn btn-plein"
          onClick={importer}
          disabled={envoi || aImporter.length === 0}
        >
          {envoi ? 'Importation…' : `Importer ${aImporter.length || ''} école(s)`}
        </button>
      </div>
    </Modale>
  )
}
