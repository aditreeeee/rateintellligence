# RateIQ — Rate Intelligence Platform (Frontend)

A frontend-only, enterprise-grade Rate Intelligence Platform built with React (Vite), semantic HTML5 and modern CSS (glassmorphism, CSS variables, Grid/Flexbox). No backend, no auth, no API calls — architected so ASP.NET (.NET 8+), SQL Server 2022, and an HMS integration can be dropped in later with minimal changes.

## Running locally

```bash
npm install
npm run dev
```

## Data model

```
Company
 └─ Property        (immutable Property ID — must match the future HMS Property ID)
     ├─ Rooms        (unique name per Property)
     │   └─ Rate Plans   (unique meal plan per Room)
     │       └─ Occupancy rates (Single / Double / Triple / Quad)
     └─ Notes / Benchmark flag
```

One Company owns many Properties. One Property can be marked as the **Benchmark Property** — the "our property" reference used throughout Rate Comparison, Calendar and Dashboard analytics.

## Structure

```
src/
  context/DataContext.jsx   Single shared in-memory data store (companies, properties, rooms,
                            rate plans, master data, competitors) — every page reads/writes here.
  context/ToastContext.jsx  Toast notification system
  components/shell/         Sidebar (nav-only), Topbar, AppShell layout
  components/ui/            PageHeader, Modal, EmptyState, floating-label form fields
  pages/
    Dashboard.jsx           Analytics & summaries only
    properties/             Property Management (list + add/edit + notes + benchmark selector)
    rooms/                  Room Management — left filter panel selects Property
    rateplans/              Rate Plan Management — left filter panel selects Property → Room
    calendar/                Rate Calendar — left filter panel selects Property → Rooms → Meal Plans
    comparison/               Rate Comparison (future module UI) — Benchmark vs Competitor properties
    masterdata/               Master Data — meal plans, occupancies, currencies, amenities, taxes, etc.
    settings/                 Company/ownership + "Coming in Future Release" placeholders
  data/*.json               Mock data — swap for real ASP.NET REST endpoints later
```

## Backend-ready design

- Every entity carries flat IDs matching a plausible SQL Server schema (`id`, `propertyId`, `roomId`, timestamps).
- The Property ID is generated once, displayed read-only everywhere after creation, and is intended to be the primary key shared with the HMS.
- Uniqueness rules (room name per property, rate plan per room) are enforced in the UI and flagged visually — final enforcement will move to SQL Server constraints.
- No scraping, user management, or API integration screens are implemented — those areas are explicit "Coming in Future Release" placeholders pending HMS/ASP.NET integration.
- Icons via [lucide-react](https://lucide.dev).
