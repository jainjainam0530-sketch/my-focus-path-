# Backend Hosting Research — 13 August 2026

## Verified Findings

Render’s official documentation states that a Free Web Service can host dynamic Node.js applications, receives a unique `onrender.com` subdomain, and has managed TLS with HTTP-to-HTTPS redirection. It also states that Free Web Services spin down after 15 minutes without inbound traffic and can take about a minute to restart on the next request.

Render source URLs:
- https://render.com/docs/free
- https://render.com/docs/web-services
- https://render.com/docs/custom-domains

Railway’s official public-networking documentation states that a service can generate a Railway-provided domain and receives automatically provisioned and renewed SSL certificates. Railway’s pricing/free-trial terms must be reviewed separately before use.

Railway source URL:
- https://docs.railway.com/networking/public-networking

## Recommended Trial Path

Use a Render Free Web Service for a testing-only backend address such as `https://focuspath-api.onrender.com`. Its managed TLS meets the HTTPS requirement for Meta’s OAuth redirect URI. Do not use this temporary setup as a production guarantee: idle spin-down can delay the OAuth callback, and the application also needs a persistent compatible database.

## Required Callback Shape

`https://YOUR-RENDER-SERVICE.onrender.com/auth/instagram/callback`

## Sources

[1] https://render.com/docs/free
[2] https://render.com/docs/web-services
[3] https://render.com/docs/custom-domains
[4] https://docs.railway.com/networking/public-networking
