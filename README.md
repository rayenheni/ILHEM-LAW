# Maître Absi Elhem — Portfolio Avocate

Site portfolio premium pour **Maître Absi Elhem**, avocate au Barreau de Tunis, spécialiste en droit privé.

Refonte haute couture du site d'origine (`portfolio-elhem.vercel.app`) avec une direction artistique
« cabinet d'avocats de luxe » : encre profonde, or, crème, typographie éditoriale serif.

## ✨ Fonctionnalités

- **Préloader** élégant avec monogramme balance de justice
- **Curseur personnalisé** (point + anneau magnétique, desktop uniquement)
- **Barre de progression de lecture** dorée
- **Header fixe** qui se compacte au défilement + lien actif automatique
- **Menu mobile** plein écran animé
- **Révélations au scroll** (IntersectionObserver, décalages en cascade)
- **Compteurs animés** (250+ dossiers, 5+ années, 92% réussite, 100% satisfaits)
- **Barres de compétences linguistiques** animées
- **Parallaxe douce** sur les visuels
- **Timeline de parcours** (formation + expérience avec accordéon « Voir détails »)
- **Formulaire de contact** avec validation inline et génération d'e-mail pré-rempli (mailto)
- **Marquee** défilant des domaines du droit
- Respect de `prefers-reduced-motion`, SEO complet (Open Graph, meta description, favicon SVG)

## 🗂 Structure

```
├── index.html          # Page unique (sections : Hero, Stats, Profil, Expertises,
│                       #   Valeurs/Cabinet, Parcours, Contact, CTA, Footer)
├── css/style.css       # Design system complet (variables, composants, responsive)
├── js/main.js          # Interactions (vanilla JS, zéro dépendance)
└── assets/img/         # Portrait, visuel cabinet, favicon SVG
```

## 🚀 Utilisation

Site 100 % statique — ouvrez `index.html` ou servez le dossier :

```bash
python3 -m http.server 8000
```

## 📝 À personnaliser

Les coordonnées (téléphone, email, adresse) sont des espaces réservés faciles à remplacer :
- `index.html` → section `#contact` (cartes + `mailto:` dans `js/main.js`)
- Police : Cormorant Garamond (titres) + Jost (texte), via Google Fonts
