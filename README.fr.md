# Interface Inverter Dashboard

[English](README.md) · [Русский](README.ru.md) · [Українська](README.uk.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Nederlands](README.nl.md)

Le [guide visuel du processus et des résultats](docs/process-and-results.md) (en anglais) présente le comportement implémenté, les étapes de livraison, la couverture des clés de traduction et les limites des vérifications.

Interface Vue commune aux tableaux de bord Python et Go : énergie, alertes Victron, commandes Home Assistant et tarifs électriques. Pour une utilisation normale, installez un backend et ouvrez son adresse. Ce dépôt ne contient ni courtier MQTT ni serveur autonome.

- [Python / FastAPI](https://github.com/victron-venus/inverter-dashboard)
- [Go](https://github.com/victron-venus/inverter-dashboard-go)

## Fonctionnalités

Les mesures du réseau, de la consommation, du solaire et de la batterie distinguent zéro mesuré et donnée absente. Les six modes ESS, les commandes du contrôleur, Water et la consigne exigent un état récent et les capacités du backend. Les boutons Home viennent de la configuration ; les appareils inactifs sont masqués. Active Loads, graphiques et alertes suivent les règles communes avec Desktop.

![Architecture](docs/assets/architecture.svg)

## Développement

Utilisez la version de Node déclarée dans la CI actuelle et le fichier de verrouillage. Vite démarre généralement sur le port 5173. Les données nécessitent un backend et les routes `/api/*` et `/ws` de même origine ; Vite seul ne connecte pas un onduleur. Pour installer un service complet, consultez les guides Python ou Go.

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm run lint
npm test
npm run build:all
```

## Réglages et langues

Settings regroupe langue, visibilité, tarifs et notifications. English, Русский, Українська, Deutsch, Français et Nederlands sont disponibles. Le choix explicite prime sur la langue du navigateur ; l’anglais sert de repli. Les noms d’appareils personnalisés restent inchangés. Les identifiants et paramètres de connexion restent côté serveur.

## Alertes et historique

L’âge d’une alerte provient de l’heure de l’événement, pas de sa réception après reconnexion. Une heure inconnue ne devient pas « à l’instant ». Les mesures absentes produisent des interruptions dans le graphique. Le tampon de session contient au maximum 1800 points ; ce n’est pas une archive quotidienne persistante. Les notifications système exigent le consentement du navigateur et Web Push côté serveur. Un test accepté ne prouve pas l’affichage par le système.

![Event lifecycle](docs/assets/event-lifecycle.svg)

## Déploiement et sécurité

La compilation produit `dist/` pour l’application et `dist-lib/` pour la bibliothèque. Un backend installé doit intégrer le paquet vérifié puis être reconstruit et déployé. Desktop conserve son propre code et ses fonctions natives. Gardez les entités Home privées dans des réglages exclus de Git. Ne placez aucun jeton IGW/Cloudflare dans `VITE_*` et ne désactivez pas TLS.

```sh
VITE_PUBLIC_MODE=true npm run build:spa
```

## Dépannage

Page inaccessible : vérifiez DNS, VPN, TLS et ingress. Données anciennes : examinez séparément navigateur → backend → IGW → Cerbo. Commande désactivée : vérifiez état, fraîcheur et capacités sans retirer les protections. Pour une notification absente, distinguez inscription et livraison réelle.

## Documentation

- [README (English)](README.md)
- [Wiki / configuration / troubleshooting (English)](docs/wiki/Home.md)
- [Localization (English)](docs/localization.md)
- [Tariffs (English)](docs/electricity-tariffs.md)
- [HTTPS (English)](deploy/https/README.md)
- [Contributing (English)](CONTRIBUTING.md)
- [Security (English)](SECURITY.md)
- [Release policy (English)](RELEASING.md)
- [MIT License](LICENSE)
