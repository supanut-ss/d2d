# drivetodev website

A responsive React website built with Vite. The two static entry pages are:

- `/` — the drivetodev home page
- `/pimsaduak.html` — the PimSaduak concept page

## Development

Install dependencies with `npm ci`, then run `npm run dev` to start Vite.

Run `npm run build` to create the production site in `dist/`, or `npm run preview` to serve that build locally.

The local `deploy-single-host.ps1` wrapper builds the site and publishes the contents of `dist/` to the main host.
