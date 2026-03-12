# FTMS Dashboard

## **[Hosted on Github Pages](https://ftms.meoiswa.cat)**

A web-based dashboard for FTMS-enabled fitness machines (indoor bikes, treadmills, rowers, cross trainers, stair climbers) using the Web Bluetooth API. No app install required — runs entirely in the browser.

## Features

- **Bluetooth connectivity** — pairs with any fitness machine that exposes the [Fitness Machine Service (FTMS)](https://www.bluetooth.com/specifications/specs/fitness-machine-service-1-0/) BLE profile
- **Live dashboard** — real-time data display with a rolling 30-second chart; three modes:
  - **Live** — view data without recording
  - **Autostart** — automatically begins recording when movement is detected
  - **Recording** — active session with a live timer
- **Session history** — sessions stored locally in IndexedDB, with stats (avg power, distance, calories, etc.) and a full chart replay
- **Google Drive sync** — optional cloud backup; sessions are uploaded automatically after recording and synced on sign-in
- **Per-device field filtering** — ban noisy or broken sensors per device from the Settings page
- **Plugin system** — extensible import/export plugins (e.g. future Garmin, Strava integrations)
- **Retrofuturistic UI** — amber CRT glow aesthetic inspired by the Nissan 300ZX instrument cluster

## Supported machines

| Machine | BLE Service |
|---|---|
| Indoor Bike | Indoor Bike Data |
| Treadmill | Treadmill Data |
| Rower | Rower Data |
| Cross Trainer | Cross Trainer Data |
| Stair Climber | Stair Climber Data |

## Requirements

- A browser that supports the Web Bluetooth API (Chrome / Edge on desktop; Chrome for Android)
- An FTMS-compatible fitness machine

## Running locally

```bash
npm install
npm run dev
```

## Deploying to GitHub Pages

The included GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys automatically on every push to `main`.

**Setup:**
1. In your repo → Settings → Pages, set the source to **GitHub Actions**
2. *(Optional)* Add a `GOOGLE_CLIENT_ID` secret (Settings → Secrets → Actions) to enable Google Drive sync

The base path is set automatically from the repository name.

## Google Drive sync setup

To enable cloud sync you need a Google Cloud project with the Drive API and an OAuth 2.0 client ID:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project
2. Enable the **Google Drive API**
3. Create an **OAuth 2.0 Client ID** (Web Application type)
4. Add your deployment URL and `http://localhost:5173` to **Authorised JavaScript origins**
5. Set the client ID as the `VITE_GOOGLE_CLIENT_ID` environment variable (or GitHub secret for Pages)

Drive files are stored in a `FTMS Dashboard` folder in the user's Drive, named descriptively and gzip-compressed:
```
2026-03-07_1930_IndoorBike_<session-id>.json.gz
```

The sync index is also stored as gzip-compressed JSON:
```
index.json.gz
```

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) — build tool
- [TailwindCSS v4](https://tailwindcss.com/) — styling
- [Recharts](https://recharts.org/) — session and live charts
- [idb](https://github.com/jakearchibald/idb) — IndexedDB wrapper for local storage
- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) — BLE device communication
- [Google Identity Services](https://developers.google.com/identity) — OAuth 2.0 for Drive sync

## License

MIT
