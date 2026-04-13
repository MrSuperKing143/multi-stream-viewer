# Multi Stream Viewer

Multi Stream Viewer is a browser-based Twitch multiview workspace for watching and managing several live channels at the same time. It gives you a shared canvas for draggable, resizable player windows, a single synchronized chat panel, and persistent local settings so your viewing layout is restored when you come back. The app is built with Next.js and exports as a static site, so it can be hosted without a backend.

> **Disclaimer**: Most of this project was generated using AI, with minor human review and adjustments.

## Stack

- Next.js 16 App Router
- TypeScript
- SCSS
- Twitch official player embed script for video players
- Client-side only embed logic
- `react-rnd` for draggable and resizable player windows
- `localStorage` persistence for layout, settings, streams, and chat selection

## Features

- Add multiple Twitch channels and arrange them freely on a shared canvas
- Overlap player windows and control stacking direction from the Settings stream list
- Dedicated per-player controls section above the chat panel
- Single active chat panel with previous, next, dropdown, and sync-to-selected controls
- Sidebar actions for adding streams and opening settings
- Optional snap-to-grid, configurable grid size, and visible grid overlay
- Local persistence for streams, layout, selected player, active chat, audio preferences, and grid settings
- Static export output with no API routes, backend, or server actions

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build Static Export

```bash
npm run typecheck
npm run build
```

The static site is emitted to `out/`.

Host the contents of `out/` on any static web host.

## Twitch Parent Domains

Twitch embeds require allowed `parent` hostnames.

This app resolves parent domains from two sources:

- Default config: `lib/twitch-config.ts`
- Optional build-time env var: `NEXT_PUBLIC_TWITCH_PARENTS`

Example:

```bash
NEXT_PUBLIC_TWITCH_PARENTS=localhost,mydomain.com,preview.mydomain.com
```

Notes:

- The app automatically includes the current browser hostname at runtime.
- Add every hostname you plan to serve the static export from, especially production and preview domains.
- If Twitch players or chat fail to load on a deployed host, the parent domain list is the first thing to verify.

## Scripts

- `npm run dev` starts the Next.js dev server
- `npm run build` creates the static export in `out/`
- `npm run export` is an alias for `npm run build`
- `npm run typecheck` runs TypeScript checks
- `npm run lint` runs ESLint

## Persistence

The app stores viewer state in `localStorage`, including:

- stream list
- player position and size
- z-order derived from the stream list order
- selected player
- selected chat stream
- default chat stream
- mute, volume, and paused intent
- grid visibility, snap mode, grid size, and stream stacking direction

## Project Notes

- Video players are created via `new Twitch.Player(...)` from `https://player.twitch.tv/js/embed/v1.js`
- The Twitch script is loaded once through the shared loader in `lib/twitch-script-loader.ts`
- Each player window owns only its own `Twitch.Player` instance and cleans it up on unmount or reload
- Chat uses Twitch’s static-compatible embed URL inside an iframe
