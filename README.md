# Darts Tracker

A premium, offline-first web application for tracking 501 dart matches. Built to run flawlessly on mobile devices as a Progressive Web App (PWA), keeping you in the zone with fast, responsive inputs, audio feedack, and an elegant glassmorphism design.

## Features
- **501 Match Engine**: Tracks scores, validates busts, counts legs/sets, and calculates rolling averages.
- **Offline First**: Installs via PWA so you can take it to the garage or basement without WiFi.
- **Mobile Optimized**: Designed down to 420px width for iPhone/Android one-handed use while holding darts. 
- **Subtle Audio Cues**: Quick clicks, error buzzes, and success chimes instantly communicate state without requiring you to look down.

## Development Setup

1. `npm install`
2. `npm run dev` (Starts the Vite local server)

## GitHub Pages Deployment

This project uses **GitHub Actions** to automatically build and deploy the app to GitHub Pages.

**To enable this on your repository:**
1. Push your code to the `main` or `master` branch.
2. Go to your repository on GitHub.
3. Navigate to **Settings > Pages**.
4. Under the **Build and deployment** section, change the **Source** dropdown from *Deploy from a branch* to **GitHub Actions**.
5. Give it a minute or two. You can watch the progress in the **Actions** tab at the top of your repository. 
6. Once the action finishes, your app will be live at `https://<your-username>.github.io/darts/`.

*(Note: The `vite.config.ts` has been configured with `base: "/darts/"` specifically so assets load correctly on this URL).*
