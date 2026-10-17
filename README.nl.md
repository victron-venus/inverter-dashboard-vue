# Inverter Dashboard-interface

[English](README.md) · [Русский](README.ru.md) · [Українська](README.uk.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Nederlands](README.nl.md)

De [visuele gids over proces en resultaten](docs/process-and-results.md) (in het Engels) beschrijft het geïmplementeerde gedrag, de leveringsstappen, de volledigheid van vertaalsleutels en de beperkingen van de controles.

Gedeelde Vue-interface voor de Python- en Go-dashboards: energiegegevens, Victron-waarschuwingen, Home Assistant-bediening en stroomtarieven. Installeer voor normaal gebruik een backend en open het adres daarvan. Deze repository bevat geen MQTT-broker of zelfstandige server.

- [Python / FastAPI](https://github.com/victron-venus/inverter-dashboard)
- [Go](https://github.com/victron-venus/inverter-dashboard-go)

## Functies

Net-, verbruiks-, zonne- en batterijmetingen onderscheiden gemeten nul van ontbrekende gegevens. De zes ESS-modi, controllerknoppen, Water-bediening en setpoint vereisen actuele gegevens en ondersteuning van de backend. Home-knoppen komen uit de configuratie; inactieve apparaten blijven verborgen. Active Loads, grafieken en waarschuwingen volgen de gedeelde Desktop-regels.

![Architecture](docs/assets/architecture.svg)

## Ontwikkelomgeving

Gebruik de Node-versie uit de huidige CI en het lockbestand. Vite start gewoonlijk op poort 5173. Livegegevens vereisen een backend met `/api/*` en `/ws` op dezelfde origin; Vite verbindt zelf geen omvormer. Gebruik de Python- of Go-handleiding voor een volledige installatie.

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

## Instellingen en talen

Settings bevat taal, zichtbaarheid, tarieven en meldingen. English, Русский, Українська, Deutsch, Français en Nederlands zijn beschikbaar. Een expliciete keuze gaat voor de browsertaal; Engels is de terugvaltaal. Zelf ingestelde apparaatnamen blijven ongewijzigd. Verbindingsgegevens en tokens blijven op de server.

## Waarschuwingen en geschiedenis

De leeftijd van een banner komt van het gebeurtenistijdstip, niet van ontvangst na opnieuw verbinden. Een onbekend tijdstip wordt niet „zojuist”. Ontbrekende metingen veroorzaken gaten in de grafiek. De sessiebuffer bevat maximaal 1800 punten en is geen blijvend dagarchief. Systeemmeldingen vereisen browsertoestemming en Web Push op de server. Een geaccepteerde test bewijst nog geen zichtbare OS-melding.

![Event lifecycle](docs/assets/event-lifecycle.svg)

## Uitrollen en veiligheid

De build maakt `dist/` voor de toepassing en `dist-lib/` voor de bibliotheek. Geïnstalleerde backends moeten de gecontroleerde bundel opnemen, opnieuw worden gebouwd en uitgerold. Desktop heeft eigen broncode en native functies. Bewaar persoonlijke Home-entiteiten in instellingen die Git negeert. Zet geen IGW-/Cloudflare-tokens in `VITE_*` en schakel TLS-controle niet uit.

```sh
VITE_PUBLIC_MODE=true npm run build:spa
```

## Problemen oplossen

Pagina onbereikbaar: controleer DNS, VPN-routes, TLS en ingress. Verouderde gegevens: onderzoek browser → backend → IGW → Cerbo afzonderlijk. Knop uitgeschakeld: controleer status, actualiteit en ondersteuning zonder beveiligingen te verwijderen. Controleer bij ontbrekende systeemmeldingen registratie en echte aflevering apart.

## Documentatie

- [README (English)](README.md)
- [Wiki / configuration / troubleshooting (English)](docs/wiki/Home.md)
- [Localization (English)](docs/localization.md)
- [Tariffs (English)](docs/electricity-tariffs.md)
- [HTTPS (English)](deploy/https/README.md)
- [Contributing (English)](CONTRIBUTING.md)
- [Security (English)](SECURITY.md)
- [Release policy (English)](RELEASING.md)
- [MIT License](LICENSE)
