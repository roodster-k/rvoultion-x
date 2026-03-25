# Rvolution X — Site Web

Site statique HTML/CSS/JS. Design dark premium pour chirurgiens plasticiens belges.

## Stack
- HTML5 / CSS3 / Vanilla JS
- Fonts : Syne + DM Sans (Google Fonts)
- Déploiement : Netlify (via GitHub)

## Structure
```
/
├── index.html            ← One-pager principal
├── merci.html            ← Page post-formulaire
├── 404.html              ← Erreur personnalisée
├── mentions-legales.html ← RGPD (obligatoire)
├── _headers              ← Sécurité HTTP Netlify
├── _redirects            ← Redirections Netlify
├── robots.txt
├── sitemap.xml
├── site.webmanifest
└── assets/
    ├── css/style.css
    ├── js/main.js
    ├── js/faq-smart.js
    ├── images/            ← Ajouter : kevin.webp, og-image.jpg (1200x630)
    └── icons/             ← Ajouter : favicon-32x32.png, apple-touch-icon.png, icon-192x192.png
```

## Déploiement GitHub → Netlify

### 1. Créer le repo GitHub
```bash
git init
git add .
git commit -m "Initial commit — Rvolution X"
git remote add origin https://github.com/TON_USERNAME/rvolutionx.git
git push -u origin main
```

### 2. Connecter Netlify
1. Se connecter sur [netlify.com](https://netlify.com)
2. "Add new site" → "Import an existing project"
3. Choisir GitHub → sélectionner `rvolutionx`
4. Build settings :
   - **Base directory** : (laisser vide)
   - **Build command** : (laisser vide)
   - **Publish directory** : `.` (point)
5. Cliquer "Deploy site"

### 3. Configurer le domaine
- Dans Netlify : Site settings → Domain management → Add custom domain
- Pointer `www.rvolutionx.be` vers Netlify via votre registrar DNS

### 4. À ajouter manuellement
- `assets/images/kevin.webp` — votre photo (optimisée WebP)
- `assets/images/og-image.jpg` — 1200×630px pour les partages sociaux
- `assets/icons/` — générer via [realfavicongenerator.net](https://realfavicongenerator.net)

### 5. Formulaire Netlify
Le formulaire est déjà configuré avec `data-netlify="true"`.
Dans Netlify → Forms : les soumissions arriveront automatiquement.
Activer les notifications email dans : Site → Forms → Notifications.

## Checklist post-déploiement
- [ ] Tester [securityheaders.com](https://securityheaders.com)
- [ ] Tester [pagespeed.web.dev](https://pagespeed.web.dev)
- [ ] Soumettre sitemap.xml dans Google Search Console
- [ ] Vérifier le formulaire en production
- [ ] Ajouter la photo kevin.webp et l'og-image.jpg
- [ ] Générer et ajouter les favicons

## Mettre à jour le site
```bash
# Modifier les fichiers localement, puis :
git add .
git commit -m "Mise à jour : [description]"
git push
# Netlify redéploie automatiquement en < 30 secondes
```
