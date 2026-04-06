# PostOp Tracker — Fix Signup Flow

## Problème
L'erreur "Edge Function returned a non-2xx status code" bloque la création de compte.
La cause : le signup dépendait d'une Edge Function (`signup-clinic`) qui n'est probablement pas déployée ou dont les secrets manquent.

## Ce qui a été corrigé

### 3 fichiers modifiés :

1. **`008_signup_fixes.sql`** — Migration Supabase
   - Ajoute une policy RLS pour permettre la création de cliniques côté client
   - Corrige la contrainte `NOT NULL` sur `photos.storage_path` (crash lors de l'ajout de photos simulées)
   - Corrige la policy d'insertion des protocol_templates

2. **`SignupClinic.jsx`** — Réécriture complète du composant
   - N'utilise PLUS l'Edge Function (plus de dépendance à déployer)
   - Utilise `supabase.auth.signUp()` directement (côté client)
   - Crée la clinique + le profil admin + le protocole par défaut directement
   - Gère le cas où la confirmation email est activée
   - Redirige automatiquement vers le dashboard après succès

3. **`AuthContext.jsx`** — Fix du bug de closure stale
   - `refreshProfile()` utilisait l'état React `user` (potentiellement null dans un handler async)
   - Maintenant utilise `supabase.auth.getSession()` directement = toujours fiable

---

## Instructions d'installation (3 étapes)

### Étape 1 : Exécuter la migration SQL

1. Ouvrir **Supabase Dashboard** → **SQL Editor** → **New Query**
2. Coller le contenu de `008_signup_fixes.sql`
3. Cliquer **Run**
4. Vérifier que la requête s'exécute sans erreur

### Étape 2 : Désactiver la confirmation email (IMPORTANT)

1. Ouvrir **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
2. Décocher **"Confirm email"** (ou "Enable email confirmations")
3. Sauvegarder

> Sans cette étape, les nouveaux utilisateurs devront confirmer leur email avant de pouvoir utiliser l'app. Pour un MVP, c'est inutilement bloquant.

### Étape 3 : Remplacer les fichiers dans votre projet

```
src/pages/SignupClinic.jsx    ← remplacer par le nouveau fichier
src/context/AuthContext.jsx   ← remplacer par le nouveau fichier
```

Puis `git add . && git commit -m "fix: signup client-side sans Edge Function" && git push`

Netlify rebuildera automatiquement.

---

## Test

1. Aller sur `/signup`
2. Entrer un nom de clinique → Continuer
3. Entrer nom admin, email, mot de passe → Créer l'espace
4. Le dashboard devrait s'afficher automatiquement
5. Vérifier dans Supabase Dashboard → Table Editor :
   - `clinics` : nouvelle ligne créée
   - `users` : nouvelle ligne avec role = 'clinic_admin'
   - `protocol_templates` : protocole par défaut créé

---

## Résumé des bugs corrigés

| Bug | Avant | Après |
|-----|-------|-------|
| Signup échoue | Edge Function non déployée → erreur 500 | Client-side direct → aucune Edge Function nécessaire |
| refreshProfile stale | Closure capture `user = null` → profil jamais chargé | Utilise `getSession()` → toujours fiable |
| Photos crash | `storage_path NOT NULL` + insertion avec null | Contrainte supprimée |
| Pas de redirect post-signup | Profile pas chargé → routing bloqué | refreshProfile + navigate('/dashboard') |
