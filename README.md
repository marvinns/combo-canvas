# Combo Canvas

Combo Canvas is a Vite + React app for writing card-combo lines and turning them into visual step breakdowns.

## Local development

```bash
npm install
npm run dev
```

## Temporary phone access

For a temporary public URL during development, run the app locally and expose it with Cloudflare Tunnel:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
cloudflared tunnel --protocol http2 --url http://localhost:5173
```

## Permanent deploy with GitHub Pages

This repo includes a GitHub Actions workflow that deploys the app to GitHub Pages on every push to `main`.

Expected site URL:

```text
https://marvinns.github.io/combo-canvas/
```

One-time GitHub setup:

1. Push the latest code to `main`.
2. Open the GitHub repo settings.
3. Go to `Settings` -> `Pages`.
4. Under `Build and deployment`, set `Source` to `GitHub Actions`.

After that, every push to `main` will publish a new version automatically.
