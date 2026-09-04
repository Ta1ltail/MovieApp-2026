# BingeTime 🎬

A responsive movie & TV series browsing app built with **React 19 + Vite 8 + Tailwind CSS 4**, powered by the [TMDB API](https://developers.themoviedb.org/3).

## Features

- **Home** — featured hero carousel + mixed Movies/TV trending feed with pagination.
- **Movies / TV Series** — dedicated browse pages with category tabs and genre/year/rating filters.
- **Search** — global navbar search with live suggestions and per-page search with results.
- **Details** — backdrop hero, cast strip, seasons & episodes (TV), and "More Like This" recommendations.
- **Video player** — multiple embed servers with server fallback and prev/next episode controls.
- **Login / Register** — prototype auth on a dedicated `/login` page (see below).
- **Theming** — instant dark/light toggle, persisted to `localStorage`.
- **Keyboard shortcuts** — press `/` to search, `?` for the shortcuts dialog.

## Getting started

```bash
npm install
cp .env.example .env   # then add your VITE_TMDB_API_KEY
npm run dev
```

## Scripts

| Script            | What it does                          |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Start the Vite dev server             |
| `npm run build`   | Production build to `dist/`           |
| `npm run preview` | Preview the production build locally  |
| `npm run lint`    | ESLint over `src/`                    |

## Environment

| Variable              | Required | Purpose                     |
| --------------------- | -------- | --------------------------- |
| `VITE_TMDB_API_KEY`   | Yes      | TMDB API bearer token (v3)  |

## Authentication (prototype)

Auth is a deliberate prototype: the `/login` page validates input client-side and
stores a demo session in `localStorage`. No credentials are verified, stored or
sent anywhere. To wire up real auth, swap the bodies of `login`/`register`/`logout`
in `src/contexts/AuthContext.jsx` for real API calls — the UI doesn't need to change.

## Project structure

```
src/
  components/   Reusable UI (cards, carousel, player, modals, icons…)
  contexts/     Auth + theme providers
  hooks/        Data/browsing hooks (media browser, mixed feed, debounce…)
  lib/          TMDB API layer, response cache, shared helpers
  pages/        Route-level pages (Home, Browse, Details, Login)
  index.css     All styling (design tokens + component styles)
```

## Deployment

The app is a static SPA. `vercel.json` rewrites all routes to `index.html` so
deep links (e.g. `/movie/123`) work on Vercel — the same rewrite is needed on
any static host.
