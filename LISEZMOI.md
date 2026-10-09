# CIO Orientation — application web (version à plat)

Tous les fichiers sont volontairement au même niveau (aucun sous-dossier), pour pouvoir
les envoyer sur GitHub par simple glisser-déposer.

- Fichiers `.jsx`, `.js`, `.css`, `index.html`, `package.json`, `vite.config.js` : l'application React (Vite)
- `index.ts` : code de la fonction serveur Supabase (déjà déployée sous le nom `rapid-responder`)
- `migration_02_transfert.sql` : migration déjà appliquée sur la base

Déploiement Vercel : importer le dépôt, Framework « Vite », aucune variable obligatoire.
