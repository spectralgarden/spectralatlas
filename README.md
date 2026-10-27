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

## Astrocartography calculations

Spectral Atlas converts the entered local birth date and time to UTC using the location's time zone and the date-specific UTC offset (including daylight saving time when an IANA time zone is available). Legacy longitude-estimated offsets that match the location are resolved to an IANA time zone from the coordinates; manually entered offsets that differ from the longitude estimate remain fixed. It then uses [Astronomy Engine](https://github.com/cosinekitty/astronomy) to calculate geocentric planetary positions, sidereal time, and the ecliptic obliquity for that moment. Those values are projected onto the globe to map the planets' Midheaven (MC), Imum Coeli (IC), Ascendant (ASC), and Descendant (DSC) lines. **In Mundo** maps where planets physically culminate, reach the nadir, rise, or set; **In Zodiaco** maps locations where a planet aligns with the corresponding relocated chart angle in zodiacal longitude. New installations default to In Mundo for standard Astro.com comparisons; a previously saved method choice is retained.

Chiron's position uses JPL's J2000 osculating orbital elements with a Keplerian propagation approximation; its heliocentric and geocentric vectors are transformed between coordinate frames before map projection. The app also derives planetary aspects and harmonic lines, latitude-based planetary parans, line intersections, and optional fixed-star parans and local-space bearings. Relocation charts recalculate angles and house placements for a destination. Location scores estimate nearby planetary influences by distance, then apply the app's interpretive weights for life categories; these are exploratory astrology interpretations, not scientifically validated predictions. Transit maps repeat the position and line calculations for a selected date and compare them with natal lines.

Paran calculations retain valid latitude bands in both hemispheres and keep distinct angle combinations separate. On the map, nearby paran bands are visually grouped according to zoom level; the Paran Explorer retains the individual results.

The optional **Geodetic** map projection is off by default and can be enabled in the expanded search filters. It maps 0° Aries to 0° terrestrial longitude. In Zodiaco, planetary lines follow fixed longitude meridians based on zodiacal longitude (assuming zero ecliptic latitude); these MC/IC meridians can differ from standard physical-sky astrocartography, especially for planets far from the ecliptic. Use Mundo when comparing standard astrocartography lines with Astro.com. In Mundo, planetary rising and setting paths curve by latitude to reflect the local horizon.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and deploys the site to GitHub Pages whenever changes are pushed to `main` (and can also be started manually). In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.

The Pages build uses relative asset URLs, so it works both for user sites and project sites served from a repository subpath. No server or API key is needed to host the static site.
