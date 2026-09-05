# Maître Ilhem ABSI ANANE — Portfolio Avocate · Premium v2

Site portfolio premium pour **Maître Ilhem ABSI ANANE**, avocate au Barreau de Djerba, spécialiste en droit privé.

Refonte inspirée des sites de cabinets primés sur Awwwards (Kohen Avocats, Joseph Law,
Kümmerlein, Hafnia Law…) : direction artistique « cabinet de luxe » — encre profonde,
or, crème, typographie éditoriale serif (Cormorant Garamond + Jost).

## ✨ Expérience

- **Preloader cinématique** — monogramme, compteur 0 → 100 %, révélation en rideau
- **Défilement inertiel** — smooth scroll Lenis (fallback natif si CDN indisponible)
- **Titre héro masqué** — révélation ligne par ligne + soulignement doré animé
- **Manifesto mot-à-mot** — le texte s'illumine au fil du défilement
- **Expertises façon Awwwards** — liste éditoriale avec **aperçu photo flottant** qui suit le curseur
- **La Méthode** — accompagnement en 4 étapes (Écoute, Analyse, Stratégie, Défense)
- **FAQ** — accordéon élégant, 5 questions essentielles
- **Footer monumental** — nom géant en contour or, **horloge locale de Tunis en direct**
- **Curseur personnalisé** avec étiquette « Voir » sur les expertises
- **Boutons magnétiques**, grain de film global, marquees, compteurs animés,
  barres de langues, parallaxe, header compact, menu mobile plein écran

## 🗂 Structure

```
├── index.html          # Page unique (Hero, Stats, Profil, Expertises, Valeurs,
│                       #   Parcours, Méthode, Contact, FAQ, CTA, Footer)
├── css/style.css       # Design system complet (variables, composants, responsive)
├── js/main.js          # Moteur d'interactions (vanilla, zéro dépendance obligatoire)
└── assets/img/         # Portrait, cabinet, 5 visuels d'expertises, favicon SVG
```

## 🚀 Utilisation

Site 100 % statique — ouvrez `index.html` ou servez le dossier :

```bash
python3 -m http.server 8000
```

Déploiement : Vercel / Netlify / GitHub Pages (préréglage statique, **aucun build**).

## 📝 À personnaliser

Coordonnées (placeholders) : section `#contact` de `index.html` + `mailto:` dans `js/main.js`.
Réponses de la FAQ : section `.faq` de `index.html`.
Lenis (optionnel) : servi via CDN `unpkg.com/lenis` — le site reste pleinement fonctionnel sans.