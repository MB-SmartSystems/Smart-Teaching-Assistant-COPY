# Smart Teaching Assistant (COPY)

Entwicklungsversion der Schüler-Management App für den Proberaum.

## Über das Projekt

Diese COPY-Version verwendet die Baserow-Testdatenbank (ID: 238) mit separaten Tabellen für sichere Entwicklung ohne Auswirkungen auf die Live-Daten.

### Datenbank-Konfiguration
- **Database:** 238 "Schlagzeugunterricht COPY"
- **Schülerdatenbank:** Tabelle 853
- **Preiserhöhungen:** Tabelle 854
- **Kommunikation:** Tabelle 855
- **Flex-Karten:** Tabelle 856
- **Unterrichtseinheiten:** Tabelle 857

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Auto-Switch zu aktuellem Schüler (5 Min vor Unterricht)
- Offline-Modus für Datennachtragung mit Sync
- Unterrichtsfortschritt Updates (Buch/Seite/Übung)
- Geburtstags-Alerts
- Lead-Management + Kalender-Integration
- Zahlungsstatus manuell erfassen
- PIN-Authentifizierung
- Mobile-first Design für Proberaum

## Tech Stack

- Next.js 14 + PWA Setup
- Baserow API Integration
- Tailwind CSS (Mobile-first)
- Google Calendar API
- PWA für Offline-Support
- Vercel Deployment

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.# Updated Thu Feb 19 13:56:17 UTC 2026
# Timestamp: Thu Feb 19 23:18:07 UTC 2026
