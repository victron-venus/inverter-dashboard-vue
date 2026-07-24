# inverter-dashboard-vue

Shared Vue 3 frontend SPA and reusable UI component library for Victron Venus ecosystem dashboards.

## Overview

This project provides a modern, reactive web UI that can be embedded into multiple backend implementations:

| Backend | Technology | Repository |
|---------|------------|------------|
| [inverter-dashboard](https://github.com/victron-venus/inverter-dashboard) | Python / FastAPI | Docker, NAS |
| [inverter-dashboard-go](https://github.com/victron-venus/inverter-dashboard-go) | Go / MQTT | Cerbo GX |

The Vue SPA (`dist/`) can be served by any backend that provides MQTT data via WebSocket.

## Features

- **Real-time dashboard** with live MQTT data via WebSocket
- **Interactive ECharts** charts for solar, battery, and grid data
- **Multi-language support**: English, German, Dutch, French, Ukrainian
- **Responsive design** with Tailwind CSS v4
- **Mobile-friendly** viewport and touch support

## Tech Stack

- Vue 3 (Composition API + `<script setup>`)
- TypeScript 6
- Vite 8 (with Library Mode for component exports)
- Tailwind CSS v4
- ECharts (via vue-echarts)
- vue-i18n for localization
- Vitest for unit testing

## Scripts

```bash
# Development
npm run dev          # Start dev server

# Build
npm run build:spa    # Build SPA (dist/)
npm run build:lib    # Build component library (build.lib/)
npm run build:all     # Build both

# Testing
npm run test         # Run tests once
npm run test:watch   # Watch mode
npm run test:coverage # With coverage

# Type checking
npm run typecheck    # TypeScript check
```

## Architecture

```
src/
├── components/       # Vue components (BatterySolarPanel, SidePanel, etc.)
├── composables/     # Composables (useMqtt, useChart, useConnection, useHA)
├── i18n/            # Translations (en, de, nl, fr, uk)
├── types/           # TypeScript types
├── App.vue          # Main application
└── static/         # Static assets (dist/ after build)
```

### Component Hierarchy

```
App.vue
├── AppHeader.vue
├── ChartPanel.vue
│   ├── LineChart.ts (ECharts wrapper)
│   └── DailyStats.vue
├── SidePanel.vue
│   ├── BatteryDisplay.vue
│   ├── LoadsTable.vue
│   └── StatusBar.vue
└── ConsoleLog.vue
```

## Embedding

### inverter-dashboard (Python)

The compiled `dist/` is mounted at `/static`:

```python
from fastapi.staticfiles import StaticFiles

app.mount("/static", StaticFiles(directory="inverter_dashboard/static/dist"))
```

### inverter-dashboard-go (Go)

The `dist/` is embedded via `//go:embed`:

```go
//go:embed internal/html/vue-ui
var vueFS embed.FS
```

## i18n

Translations are in `src/i18n/`. To add a new language:

1. Create `src/i18n/{lang}.ts`
2. Export a messages object
3. Add to `src/i18n/index.ts`

## Testing

```bash
npm run test          # Run all tests
npm run test:watch     # Watch for changes
npm run test:coverage  # Generate coverage report
```

Test files use Vitest + @vue/test-utils + Happy DOM.

## CI/CD

- **TypeScript check**: `npm run typecheck`
- **Tests**: `npm run test`
- **Build**: `npm run build:all`
- **Release**: Tags trigger GitHub Actions to build and publish assets

## Related Projects

- [inverter-control](https://github.com/victron-venus/inverter-control) - Victron ESS Grid-Zero Controller
- [inverter-desktop](https://github.com/victron-venus/inverter-desktop) - Tauri Desktop App
- [inverter-monitoring](https://github.com/victron-venus/inverter-monitoring) - Telegraf/InfluxDB/Grafana Stack
- [dbus-mqtt-battery](https://github.com/victron-venus/dbus-mqtt-battery) - JBD BMS to D-Bus Bridge

## License

MIT