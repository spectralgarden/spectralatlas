# Spectral Atlas

Professional astrocartography, relocation astrology, and locational mapping by Spectral Garden.

## Run locally

**Prerequisite:** Node.js 20.19 or later.

```sh
npm install
npm run dev
```

Vite prints the local preview URL (usually `http://localhost:3000`).

## Build

```sh
npm run build
npm run preview
```

The static site is generated in `dist/`.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and deploys the site to GitHub Pages whenever changes are pushed to `main` (and can also be started manually). In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.

The Pages build uses relative asset URLs, so it works both for user sites and project sites served from a repository subpath. No server or API key is needed to host the static site.
