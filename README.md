# Harmless Monitor

Data Loss Prevention (DLP) front-end monitoring dashboard for tracking network traffic anomalies and data exfiltration flows.

## Features

- Real-time flow exfiltration anomaly dashboard (`flowAnalysis.ts`)
- Geolocation IP resolution (`geoResolve.ts`)
- Configurable alert threshold management views

## Tech Stack

- TypeScript
- React
- Vite
- Tailwind CSS

## Project Structure

- `dlp-frontend/src/DLPDashboard.tsx` - Main analytical dashboard view
- `dlp-frontend/src/utils/` - Flow analysis and geolocation helper modules

## Installation

```bash
git clone https://github.com/harmless-bot/harmlessmonitor.git
cd harmlessmonitor/dlp-frontend
npm install
npm run dev
```

## Scripts

- `npm run dev` - Launch local Vite dev server
- `npm run build` - Generate production bundle

## Contributing

Check formatting with ESLint before opening pull requests.

## License

MIT License.
