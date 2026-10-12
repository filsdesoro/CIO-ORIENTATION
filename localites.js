// =====================================================================
//  Localités de Côte d'Ivoire : les 510 sous-préfectures (et les communes
//  d'Abidjan), classées par district, région et département.
//  Source : liste des sous-préfectures de Côte d'Ivoire (Wikipédia, RGPH 2014).
//  Format de chaque ligne : District|Région|Département|localité1,localité2,…
// =====================================================================

const DONNEES = `
Abidjan|Abidjan|Abidjan|Abobo,Adjamé,Attécoubé,Cocody,Plateau,Yopougon,Koumassi,Marcory,Port-Bouët,Treichville,Bingerville,Brofodoumé,Anyama,Songon
Yamoussoukro|Yamoussoukro|Yamoussoukro|Attiégouakro,Lolobo,Yamoussoukro,Kossou
Bas-Sassandra|Gbôklé|Fresco|Dahiri,Fresco,Gbagbam
Bas-Sassandra|Gbôklé|Sassandra|Dakpadou,Grihiri,Lobakuya,Médon,Sago,Sassandra
Bas-Sassandra|Nawa|Buyo|Buyo,Dapéoua
Bas-Sassandra|Nawa|Guéyo|Dabouyo,Guéyo
Bas-Sassandra|Nawa|Méagui|Gnanmangui,Méagui,Oupoyo
Bas-Sassandra|Nawa|Soubré|Grand-Zattry,Liliyo,Okrouyo,Soubré
Bas-Sassandra|San-Pédro|San-Pédro|Doba,Dogbo,Gabiadji,Grand-Béréby,San-Pédro
Bas-Sassandra|San-Pédro|Tabou|Dapo-Iboké,Djamandioké,Djouroutou,Grabo,Olodio,Tabou
Comoé|Indénié-Djuablin|Abengourou|Abengourou,Amélékia,Aniassué,Ebilassokro,Niablé,Yakassé-Féyassé,Zaranou
Comoé|Indénié-Djuablin|Agnibilékrou|Agnibilékrou,Akoboissué,Damé,Duffrébo,Tanguélan
Comoé|Indénié-Djuablin|Bettié|Bettié,Diamarakro
Comoé|Sud-Comoé|Aboisso|Aboisso,Adaou,Adjouan,Ayamé,Bianouan,Kouakro,Maféré,Yaou
Comoé|Sud-Comoé|Adiaké|Adiaké,Assinie-Mafia,Etuéboué
Comoé|Sud-Comoé|Grand-Bassam|Bongo,Bonoua,Grand-Bassam
Comoé|Sud-Comoé|Tiapoum|Noé,Nouamou,Tiapoum
Denguélé|Folon|Kaniasso|Goulia,Kaniasso,Mahandiana-Sokourani
Denguélé|Folon|Minignan|Kimbirila-Nord,Minignan,Sokoro,Tienko
Denguélé|Kabadougou|Gbéléban|Gbéléban,Samango,Seydougou
Denguélé|Kabadougou|Madinani|Fengolo,Madinani,N'Goloblasso
Denguélé|Kabadougou|Odienné|Bako,Bougousso,Dioulatièdougou,Odienné,Tiémé
Denguélé|Kabadougou|Samatiguila|Kimbirila-Sud,Samatiguila
Denguélé|Kabadougou|Séguélon|Gbongaha,Séguélon
Gôh-Djiboua|Gôh|Gagnoa|Bayota,Dahiépa-Kéhi,Dignago,Dougroupalégnaoa,Doukouyo,Gagnoa,Galebre-Galébouo,Gnagbodougnoa,Guibéroua,Ouragahio,Sérihio,Yopohué
Gôh-Djiboua|Gôh|Oumé|Diégonéfla,Guépahouo,Oumé,Tonla
Gôh-Djiboua|Lôh-Djiboua|Divo|Chiépo,Didoko,Divo,Hiré,Nébo,Ogoudou,Zégo
Gôh-Djiboua|Lôh-Djiboua|Guitry|Dairo-Didizo,Guitry,Lauzoua,Yocoboué
Gôh-Djiboua|Lôh-Djiboua|Lakota|Djidji,Gagoré,Goudouko,Lakota,Niambézaaria,Zikisso
Lacs|Bélier|Didiévi|Boli,Didiévi,Molonou-Blé,Raviart,Tié-N'Diékro
Lacs|Bélier|Djékanou|Bonikro,Djékanou
Lacs|Bélier|Tiébissou|Lomokankro,Molonou,Tiébissou,Yakpabo-Sakassou
Lacs|Bélier|Toumodi|Angoda,Kokumbo,Kpouèbo,Toumodi
Lacs|Iffou|Daoukro|Akpassanou,Ananda,Daoukro,Ettrokro,N'Gattakro,Ouellé,Samanza
Lacs|Iffou|M'Bahiakro|Bonguéra,Kondossou,M'Bahiakro
Lacs|Iffou|Prikro|Anianou,Famienkro,Koffi-Amonkro,Nafana,Prikro
Lacs|Moronou|Arrah|Arrah,Kotobi,Krégbé
Lacs|Moronou|Bongouanou|Andé,Assié-Koumassi,Bongouanou,N'Guessankro
Lacs|Moronou|M'Batto|Anoumaba,Assahara,M'Batto,Tiémélékro
Lacs|N'Zi|Bocanda|Bengassou,Bocanda,Kouadioblékro,N'Zécrézessou
Lacs|N'Zi|Dimbokro|Abigui,Diangokro,Dimbokro,Nofou
Lacs|N'Zi|Kouassi-Kouassikro|Kouassi-Kouassikro,Mékro
Lagunes|Agnéby-Tiassa|Agboville|Aboudé,Ananguié,Agboville,Attobrou,Azaguié,Céchi,Grand-Morié,Guessiguié,Loviguié,Oress-Krobou,Rubino
Lagunes|Agnéby-Tiassa|Sikensi|Gomon,Sikensi
Lagunes|Agnéby-Tiassa|Taabo|Pacobo,Taabo
Lagunes|Agnéby-Tiassa|Tiassalé|Gbolouville,Morokro,N'Douci,Tiassalé
Lagunes|Grands-Ponts|Dabou|Dabou,Lopou,Toupah
Lagunes|Grands-Ponts|Grand-Lahou|Ahouanou,Bacanda,Ebonou,Grand-Lahou,Toukouzou
Lagunes|Grands-Ponts|Jacqueville|Attoutou,Jacqueville
Lagunes|La Mé|Adzopé|Adzopé,Agou,Annépé,Assikoi,Bécédi-Brignan,Yakassé-Mé
Lagunes|La Mé|Akoupé|Afféry,Akoupé,Bécouéfin
Lagunes|La Mé|Alépé|Aboisso-Comoé,Alépé,Allosso,Danguira,Oghlwapo
Lagunes|La Mé|Yakassé-Attobrou|Abongoua,Biéby,Yakassé-Attobrou
Montagnes|Cavally|Bloléquin|Bloléquin,Diboké,Doké,Tinhou,Zéaglo
Montagnes|Cavally|Guiglo|Bédy-Goazon,Guiglo,Kaadé,Nizahon
Montagnes|Cavally|Taï|Taï,Zagné
Montagnes|Cavally|Toulépleu|Bakoubli,Méo,Nézobly,Péhé,Tiobly,Toulépleu
Montagnes|Guémon|Bangolo|Bangolo,Béoué-Zibiao,Bléniméouin,Diéouzon,Gohouo-Zagna,Guinglo-Tahouaké,Kahin-Zarabaon,Zéo,Zou
Montagnes|Guémon|Duékoué|Bagohouo,Duékoué,Gbapleu,Guéhiébly,Guézon
Montagnes|Guémon|Facobly|Facobly,Guézon,Koua,Sémien,Tiény-Séably
Montagnes|Guémon|Kouibly|Kouibly,Nidrou,Ouyably-Gnondrou,Totrodrou
Montagnes|Tonkpi|Biankouma|Biankouma,Blapleu,Gbangbégouiné,Gbonné,Gouiné,Kpata,Santa
Montagnes|Tonkpi|Danané|Daleu,Danané,Gbon-Houyé,Kouan-Houlé,Mahapleu,Séileu,Zonneu
Montagnes|Tonkpi|Man|Bogouiné,Fagnampleu,Gbangbégouiné-Yati,Logoualé,Man,Podiagouiné,Sandougou-Soba,Sangouiné,Yapleu,Zagoué,Ziogouiné
Montagnes|Tonkpi|Sipilou|Sipilou,Yorodougou
Montagnes|Tonkpi|Zouan-Hounien|Banneu,Bin-Houyé,Goulaleu,Téapleu,Yelleu,Zouan-Hounien
Sassandra-Marahoué|Haut-Sassandra|Daloa|Bédiala,Daloa,Gadouan,Gboguhé,Gonaté,Zaïbo
Sassandra-Marahoué|Haut-Sassandra|Issia|Boguédia,Iboguhé,Issia,Nahio,Namané,Saïoua,Tapéguia
Sassandra-Marahoué|Haut-Sassandra|Vavoua|Bazra-Nattis,Dananon,Dania,Kétro-Bassam,Séitifla,Vavoua
Sassandra-Marahoué|Haut-Sassandra|Zoukougbeu|Domangbeu,Grégbeu,Guessabo,Zoukougbeu
Sassandra-Marahoué|Marahoué|Bouaflé|Bégbessou,Bonon,Bouaflé,N'Douffoukankro,Pakouabo,Tibéita,Zaguiéta
Sassandra-Marahoué|Marahoué|Gohitafla|Gohitafla,Iriéfla,Maminigui
Sassandra-Marahoué|Marahoué|Sinfra|Bazré,Kononfla,Kouétinfla,Sinfra
Sassandra-Marahoué|Marahoué|Zuénoula|Kanzra,Vouéboufla,Zanzra,Zuénoula
Savanes|Bagoué|Boundiali|Baya,Boundiali,Ganaoni,Kasséré,Siempurgo
Savanes|Bagoué|Kouto|Blességué,Gbon,Kolia,Kouto,Sianhala
Savanes|Bagoué|Tengréla|Débété,Kanakono,Papara,Tengréla
Savanes|Poro|Dikodougou|Boron,Dikodougou,Guiembé
Savanes|Poro|Korhogo|Dassoungboho,Kanoroba,Karakoro,Kiémou,Kombolokoura,Komborodougou,Koni,Korhogo,Lataha,Nafoun,Napiéolédougou,N'Ganon,Niofoin,Sirasso,Sohouo,Tioroniaradougou
Savanes|Poro|M'Bengué|Bougou,Katiali,Katogo,M'Bengué
Savanes|Poro|Sinématiali|Bouakaha,Kagbolodougou,Sédiego,Sinématiali
Savanes|Tchologo|Ferkessédougou|Ferkessédougou,Koumbala,Togoniéré
Savanes|Tchologo|Kong|Bilimono,Kong,Nafana,Sikolo
Savanes|Tchologo|Ouangolodougou|Diawala,Kaouara,Niellé,Ouangolodougou,Toumoukoro
Vallée du Bandama|Gbêkê|Béoumi|Ando-Kékrénou,Béoumi,Bodokro,Kondrobo,Lolobo,Marabadiassa,N'Guessankro
Vallée du Bandama|Gbêkê|Botro|Botro,Diabo,Krofoinsou,Languibonou
Vallée du Bandama|Gbêkê|Bouaké|Bouaké-Ville,Bouaké-SP,Bounda,Brobo,Mamini,N'Djébonouan
Vallée du Bandama|Gbêkê|Sakassou|Ayaou-Sran,Dibri-Assirikro,Sakassou,Toumodi-Sakassou
Vallée du Bandama|Hambol|Dabakala|Bassawa,Boniérédougou,Dabakala,Foumbolo,Niéméné,Satama-Sokoro,Satama-Sokoura,Sokala-Sobara,Tendéné-Bambarasso,Yaossédougou
Vallée du Bandama|Hambol|Katiola|Fronan,Katiola,Timbé
Vallée du Bandama|Hambol|Niakaramandougou|Arikokaha,Badikaha,Niakaramandougou,Niédiékaha,Tafiré,Tortiya
Woroba|Bafing|Koro|Booko,Borotou,Koro,Mahandougou,Niokosso
Woroba|Bafing|Ouaninou|Gbélo,Gouékan,Koonan,Ouaninou,Saboudougou,Santa
Woroba|Bafing|Touba|Dioman,Foungbesso,Guintéguéla,Touba
Woroba|Béré|Dianra|Dianra,Dianra-Village
Woroba|Béré|Kounahiri|Kongasso,Kounahiri
Woroba|Béré|Mankono|Bouandougou,Mankono,Marandallah,Sarhala,Tiéningboué
Woroba|Worodougou|Kani|Djibrosso,Fadiadougou,Kani,Morondo
Woroba|Worodougou|Séguéla|Bobi-Diarabana,Dualla,Kamalo,Massala,Séguéla,Sifié,Worofla
Zanzan|Bounkani|Bouna|Bouko,Bouna,Ondéfidouo,Youndouo
Zanzan|Bounkani|Doropo|Danoa,Doropo,Kalamon,Niamoué
Zanzan|Bounkani|Nassian|Bogofa,Kakpin,Koutouba,Nassian,Sominassé
Zanzan|Bounkani|Téhini|Gogo,Téhini,Tougbo
Zanzan|Gontougo|Bondoukou|Appimandoum,Bondo,Bondoukou,Gouméré,Laoudi-Ba,Pinda-Boroko,Sapli-Sépingo,Sorobango,Tabagne,Tagadi,Taoudi,Yézimala
Zanzan|Gontougo|Koun-Fao|Boahia,Kokomian,Kouassi-Datékro,Koun-Fao,Tankessé,Tienkoikro
Zanzan|Gontougo|Sandégué|Bandakagni-Tomora,Dimandougou,Sandégué,Yorobodi
Zanzan|Gontougo|Tanda|Amanvi,Diamba,Tanda,Tchédio
Zanzan|Gontougo|Transua|Assuéfry,Kouassia-Niaguini,Transua
`

export const LOCALITES = DONNEES.trim()
  .split('\n')
  .flatMap((ligne) => {
    const [district, region, departement, liste] = ligne.split('|')
    return liste.split(',').map((nom) => ({ nom, departement, region, district }))
  })
  .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

// Libellé complet affiché dans la liste : « Nom — Département (Région) »
export function libelleLocalite(l) {
  const zone = l.region === l.departement ? l.region : `${l.departement}, ${l.region}`
  return `${l.nom} — ${zone}`
}

// Retrouve une localité à partir du texte saisi (nom seul ou libellé complet)
export function trouverLocalite(texte) {
  const t = (texte || '').trim().toLowerCase()
  if (!t) return null
  return (
    LOCALITES.find((l) => libelleLocalite(l).toLowerCase() === t) ||
    LOCALITES.find((l) => l.nom.toLowerCase() === t) ||
    null
  )
}
