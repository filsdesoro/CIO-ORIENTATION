# CIO Orientation — application web

Application du Centre d'Information et d'Orientation : suivi de plusieurs établissements d'une zone,
du personnel (conseillers, points focaux) et du parcours des élèves.

## Contenu

| Élément | Rôle |
|---|---|
| `src/` | Application React (Vite) |
| `migration_02_transfert.sql` | Mise à jour de la base : le transfert d'un élève met aussi à jour son inscription de l'année |
| `supabase/functions/creer-membre/index.ts` | Fonction serveur : l'administrateur crée les comptes des conseillers et points focaux |

## Mise en place (une seule fois)

1. **Base de données** — Supabase → SQL Editor → nouvelle requête → coller `migration_02_transfert.sql` → Run.
2. **Fonction serveur** — Supabase → Edge Functions → *Deploy a new function* → *Via Editor* →
   nom : `creer-membre` → coller tout le contenu de `supabase/functions/creer-membre/index.ts` → Deploy.
3. **Inscriptions publiques** — Authentication → Sign In / Providers → décocher *Allow new users to sign up*.

## Lancer en local

```bash
npm install
npm run dev
```

## Déployer sur Vercel

1. Pousser ce dossier sur un nouveau dépôt GitHub.
2. Vercel → *Add New Project* → importer le dépôt (Framework : Vite, détecté automatiquement).
3. Aucune variable d'environnement n'est obligatoire : l'URL et la clé publique du projet Supabase
   sont déjà dans `src/lib/supabase.js`. On peut les remplacer par `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_ANON_KEY` (voir `.env.example`).

## Rôles

- **Administrateur CIO** — crée le CIO à sa première connexion, gère établissements, personnel,
  affectations, années scolaires et pondération du score d'orientation. Voit toute la zone.
- **Conseiller d'orientation** — voit et gère les élèves des établissements qui lui sont affectés.
- **Point focal** — voit et gère les élèves de son seul établissement.
