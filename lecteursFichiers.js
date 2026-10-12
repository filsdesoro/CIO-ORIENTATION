// =====================================================================
//  Lecture des tableaux contenus dans un fichier Word (.docx) ou PDF.
//  Chaque lecteur renvoie un tableau de lignes : [[cellule, cellule…], …]
//  Ces bibliothèques ne sont chargées qu'au moment de l'import.
// =====================================================================

// ---------- Word (.docx) ----------
// Un .docx est une archive : on lit word/document.xml et on parcourt les tableaux.
// Sans tableau, chaque paragraphe est découpé sur les tabulations ou les « ; ».
export async function lireWord(fichier) {
  const { unzipSync, strFromU8 } = await import('fflate')
  const archive = unzipSync(new Uint8Array(await fichier.arrayBuffer()))
  const xmlBrut = archive['word/document.xml']
  if (!xmlBrut) throw new Error('Ce fichier Word ne peut pas être lu (contenu introuvable).')
  const doc = new DOMParser().parseFromString(strFromU8(xmlBrut), 'application/xml')
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

  const texte = (noeud) =>
    [...noeud.getElementsByTagNameNS(W, 'p')]
      .map((p) =>
        [...p.getElementsByTagNameNS(W, '*')]
          .map((n) => (n.localName === 't' ? n.textContent : n.localName === 'tab' ? ' ' : ''))
          .join('')
      )
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

  const lignes = []
  const tableaux = [...doc.getElementsByTagNameNS(W, 'tbl')]
  for (const tbl of tableaux) {
    // On ne garde que les lignes de premier niveau (pas celles des tableaux imbriqués)
    for (const tr of [...tbl.getElementsByTagNameNS(W, 'tr')].filter((tr) => tr.parentNode === tbl)) {
      const cellules = [...tr.childNodes].filter((n) => n.localName === 'tc').map(texte)
      if (cellules.some(Boolean)) lignes.push(cellules)
    }
  }
  if (lignes.length) return lignes

  // Pas de tableau : on découpe les paragraphes
  for (const p of doc.getElementsByTagNameNS(W, 'p')) {
    const brut = [...p.getElementsByTagNameNS(W, '*')]
      .map((n) => (n.localName === 't' ? n.textContent : n.localName === 'tab' ? '\t' : ''))
      .join('')
    if (!brut.trim()) continue
    const sep = brut.includes('\t') ? '\t' : brut.includes(';') ? ';' : null
    lignes.push(sep ? brut.split(sep).map((c) => c.trim()) : [brut.trim()])
  }
  return lignes
}

// ---------- PDF ----------
// On récupère chaque mot avec sa position, on regroupe par ligne (même hauteur),
// puis on répartit en colonnes d'après les positions des titres de la ligne d'en-tête.
export async function lirePdf(fichier, estEntete) {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await fichier.arrayBuffer()) }).promise
  const lignesTexte = [] // [{ y, morceaux: [{ x, fin, texte }] }]

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const contenu = await page.getTextContent()
    const items = contenu.items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({ x: it.transform[4], y: it.transform[5], fin: it.transform[4] + it.width, texte: it.str.trim() }))
    // Regroupement par ligne : tolérance de 3 points sur la hauteur
    const parLigne = []
    for (const it of items.sort((a, b) => b.y - a.y || a.x - b.x)) {
      const l = parLigne.find((l) => Math.abs(l.y - it.y) <= 3)
      if (l) l.morceaux.push(it)
      else parLigne.push({ y: it.y, morceaux: [it] })
    }
    parLigne.forEach((l) => l.morceaux.sort((a, b) => a.x - b.x))
    lignesTexte.push(...parLigne)
  }
  if (!lignesTexte.length) {
    throw new Error(
      'Aucun texte trouvé dans ce PDF. S’il s’agit d’un document scanné (une image), il ne peut pas être lu : utilisez la version Word ou Excel.'
    )
  }

  // Fusionne les morceaux proches (mots d'une même cellule)
  const enCellules = (l) => {
    const cellules = []
    for (const m of l.morceaux) {
      const der = cellules[cellules.length - 1]
      if (der && m.x - der.fin < 8) {
        der.texte += ' ' + m.texte
        der.fin = m.fin
      } else cellules.push({ ...m })
    }
    return cellules
  }

  // Ligne d'en-tête : la première reconnue comme telle, sinon la plus large des 15 premières
  const candidates = lignesTexte.slice(0, 15).map(enCellules)
  let iEntete = candidates.findIndex((c) => estEntete(c.map((x) => x.texte)))
  if (iEntete < 0) iEntete = candidates.reduce((best, c, i) => (c.length > candidates[best].length ? i : best), 0)
  const colonnes = candidates[iEntete].map((c) => c.x)

  // Chaque morceau va dans la colonne dont le titre commence juste avant lui
  const colonneDe = (x) => {
    let idx = 0
    for (let i = 0; i < colonnes.length; i++) if (x >= colonnes[i] - 6) idx = i
    return idx
  }

  return lignesTexte.map((l, i) => {
    if (i === iEntete) return candidates[iEntete].map((c) => c.texte)
    const ligne = colonnes.map(() => '')
    for (const c of enCellules(l)) {
      const k = colonneDe(c.x)
      ligne[k] = ligne[k] ? ligne[k] + ' ' + c.texte : c.texte
    }
    return ligne
  })
}
