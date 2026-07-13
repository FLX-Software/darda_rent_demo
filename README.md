# FLX Rent

**Digitale Werkzeug- und Produktverwaltung für die Darda GmbH**

FLX Rent ist eine vollständige Webanwendung zur Verwaltung, Vermietung und Planung industrieller Werkzeuge, Maschinen und Vorführprodukte der Darda GmbH. Die Software ist **keine Fahrzeugvermietung** – sie ist speziell für Abbruchzangen, Spaltzangen, Anbaugeräte und Hydraulikaggregate konzipiert.

## Funktionen

- **Dashboard** mit KPIs, Warnungen und Schnellaktionen
- **Ressourcenplanung** mit verschiebbaren Zeitbalken (dnd-kit)
- **Kalender** mit Drag-and-Drop
- **Produktverwaltung** mit QR-Codes, Zubehör und Dokumenten
- **Buchungen** mit automatischer Verfügbarkeitsprüfung
- **Kundenverwaltung** mit Historie
- **Messen & Demos** mit Checklisten
- **Ausgabe & Rückgabe** mit Zustandsdokumentation
- **Schadensaufnahme** mit Bildergalerie und Markern
- **Wartungen** mit Fälligkeitsüberwachung
- **Standortverwaltung** mit Bewegungshistorie
- **Berichte** mit Recharts-Diagrammen
- **Rollenbasierte Berechtigungen** und Audit-Log
- **Benachrichtigungen** (intern, E-Mail vorbereitet)

## Technologie-Stack

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui-Komponenten
- PostgreSQL + Prisma ORM
- NextAuth.js (Credentials)
- Zod + React Hook Form
- dnd-kit, Recharts, Lucide Icons

## Voraussetzungen

- Node.js 20+
- Docker (für PostgreSQL) oder lokale PostgreSQL-Instanz
- npm

## Installation

### 1. Repository klonen und Abhängigkeiten installieren

```bash
npm install
```

### 2. Umgebungsvariablen einrichten

```bash
cp .env.example .env
```

Passen Sie bei Bedarf `DATABASE_URL` und `NEXTAUTH_SECRET` an.

### 3. PostgreSQL starten

```bash
docker compose up -d
```

### 4. Datenbank initialisieren

```bash
npm run db:push
npm run db:seed
```

### 5. Entwicklungsserver starten

```bash
npm run dev
```

Die Anwendung ist unter [http://localhost:3000](http://localhost:3000) erreichbar.

## Demo-Logins

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Administrator | admin@darda.de | admin123 |
| Disposition | disposition@darda.de | dispo123 |
| Lager | lager@darda.de | lager123 |
| Außendienst | aussendienst@darda.de | aussen123 |
| Service | service@darda.de | service123 |
| Lesend | lesen@darda.de | lesen123 |

## Beispielprodukt

Die **Darda MC300 Zange** ist als Haupt-Beispieldatensatz angelegt:

- Inventarnummer: `DARDA-MC300-001`
- Seriennummer: `MC300-DEMO-001`
- Mietpreis: 350,00 €/Tag
- Standort: Hauptlager Blumberg

Produktbild: Ersetzen Sie `public/products/mc300.svg` durch Ihr Bild als `public/products/mc300.png`.

## QR-Code

Jedes Produkt hat einen eindeutigen QR-Code. Beim Scannen öffnet sich:

```
http://localhost:3000/qr/FLX-RENT-DARDA-MC300-001
```

## Projektstruktur

```
src/
├── app/
│   ├── (app)/          # Geschützte App-Seiten
│   ├── api/            # API-Routen (Auth, Uploads)
│   ├── login/          # Login-Seite
│   └── qr/             # Mobile QR-Produktseite
├── components/
│   ├── layout/         # App-Shell, Navigation
│   ├── planning/       # Ressourcenplanung
│   ├── calendar/       # Kalender
│   ├── products/       # Produkt-Komponenten
│   ├── shared/         # Wiederverwendbare UI
│   └── ui/             # shadcn/ui-Basis
└── lib/
    ├── actions/        # Server Actions
    ├── auth.ts         # NextAuth-Konfiguration
    ├── availability.ts # Verfügbarkeitsprüfung
    ├── prisma.ts       # Datenbank-Client
    └── ...
prisma/
├── schema.prisma       # Datenmodell
└── seed.ts             # Beispieldaten
```

## Architektur

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js App │────▶│ PostgreSQL  │
│  (React UI) │     │ Server Actions│     │   (Prisma)  │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────▼───────┐
                    │ Dateispeicher │
                    │ (lokal / S3) │
                    └──────────────┘
```

## Nützliche Befehle

```bash
npm run dev          # Entwicklungsserver
npm run build        # Produktions-Build
npm run db:studio    # Prisma Studio (Datenbank-GUI)
npm run db:seed      # Beispieldaten neu laden
docker compose down  # PostgreSQL stoppen
```

## Lizenz

Proprietär – FLX Software für Darda GmbH
