# FocusPath Backend — Free HTTPS Test Deployment on Render

**Purpose:** Obtain a stable public HTTPS callback address for Meta Instagram Business Login without buying a custom domain.

> **Important:** This is a testing path, not a production guarantee. Render Free Web Services can spin down after 15 minutes of inactivity and may take about a minute to wake on the next request. They receive a stable `onrender.com` subdomain with managed TLS, which is suitable for testing a Meta redirect URI, but a paid persistent host is recommended before relying on it for regular publishing.[1] [2]

## What You Get Without Buying a Domain

After deployment, Render assigns an address similar to:

```text
https://focuspath-api.onrender.com
```

Render manages the TLS certificate and redirects HTTP traffic to HTTPS. No separate SSL purchase, certificate upload, DNS record, or custom domain is required for this initial path.[2]

The Meta callback URL will be:

```text
https://focuspath-api.onrender.com/auth/instagram/callback
```

Replace `focuspath-api` with the exact Render service name chosen during deployment.

## Before Creating the Render Service

The GitHub repository’s server has two non-optional runtime dependencies:

| Requirement | Why it is needed | Status needed before real Instagram connection |
| --- | --- | --- |
| MySQL-compatible `DATABASE_URL` | The connection, drafts, tokens, and user records are stored in database tables. | Required |
| App authentication configuration | The existing FocusPath server uses its original app-authentication configuration for protected mobile API calls. | Required |
| Instagram server secrets | Meta app ID, Meta app secret, redirect URI, encryption key, and scheduler secret are kept server-side. | Required |

A Render URL by itself does not make the full app functional. It only provides the public HTTPS endpoint. Do **not** enter the Meta redirect URL until the health check works and the required variables are configured.

## Render Steps

### 1. Create a Render Account

Open [Render](https://dashboard.render.com/register) and sign in with GitHub. This permits Render to read the `jainjainam0530-sketch/my-focus-path-` repository without copying secrets into GitHub.

### 2. Create a Web Service

In the Render dashboard, select **New → Web Service**, connect GitHub if prompted, and select the FocusPath repository. Use the following values.

| Render field | Value |
| --- | --- |
| Name | `focuspath-api` — or another unique lower-case name |
| Region | Singapore, if it is nearest to you |
| Branch | `main` |
| Runtime | Node |
| Build Command | `corepack enable && pnpm install --frozen-lockfile && pnpm build` |
| Start Command | `pnpm start` |
| Instance Type | Free |
| Health Check Path | `/api/health` |

Render’s Node web services bind to the `PORT` environment variable. The current FocusPath server already reads `PORT`, so no port value needs to be added manually.[2]

### 3. Add Server Environment Variables

Open the newly created service’s **Environment** page. Add the following server-side values. Mark all secrets as secret values and never place them in the Expo/mobile client configuration.

| Variable | Source or value |
| --- | --- |
| `NODE_VERSION` | `22.13.0` |
| `DATABASE_URL` | MySQL-compatible production database URL — required before use |
| `JWT_SECRET` | Generate with `openssl rand -base64 32` |
| `VITE_APP_ID` | Existing FocusPath application ID |
| `OAUTH_SERVER_URL` | Existing FocusPath authentication server URL |
| `OWNER_OPEN_ID` | Existing FocusPath owner ID, if used |
| `INSTAGRAM_APP_ID` | Meta dashboard → Instagram business login settings |
| `INSTAGRAM_APP_SECRET` | Meta dashboard → Instagram business login settings |
| `INSTAGRAM_TOKEN_ENCRYPTION_KEY` | Generate with `openssl rand -base64 32` |
| `INSTAGRAM_SCHEDULER_SECRET` | Generate with `openssl rand -hex 32` |
| `EXPO_PUBLIC_APP_URL` | `manusfocuspath://` for the current native application scheme |

Do not set `INSTAGRAM_REDIRECT_URI` until the first deploy completes and Render shows the final service URL.

### 4. Deploy and Check HTTPS

Select **Create Web Service**. When the deploy finishes, Render displays the service URL. Open this address in a browser and append `/api/health`:

```text
https://YOUR-RENDER-NAME.onrender.com/api/health
```

A successful response contains `ok: true`. This confirms that the public HTTPS server is reachable.

### 5. Finish the Meta Redirect URL

Add this environment variable in Render:

```text
INSTAGRAM_REDIRECT_URI=https://YOUR-RENDER-NAME.onrender.com/auth/instagram/callback
```

Save the environment variable and redeploy. In the Meta App Dashboard, open **Instagram → API setup with Instagram login → Set up Instagram business login** and enter the **exact same** callback URL. The value must match character-for-character, including whether a trailing slash is present.[3]

### 6. Test Safely

After Meta accepts the redirect URI, open the FocusPath mobile app and use the **Content → Connect Instagram** action. Use one image post with a public HTTPS JPEG URL as the first publishing test.

## Free-Service Limits

Render’s free web service can stop after 15 minutes without traffic. The next request wakes it, which can take around a minute.[1] The Instagram authorization code remains valid for an hour, so this may still work for testing, but it is not ideal for regular use. Render also documents monthly usage limits and possible suspension on limit exhaustion.[1]

Use this no-cost path to prove the integration. For real publishing, token refresh, and a reliable OAuth callback, move to a persistent paid service or a platform-native deployment that can keep the application backend and database continuously available.

## References

[1]: https://render.com/docs/free "Render — Deploy for Free"
[2]: https://render.com/docs/web-services "Render — Web Services"
[3]: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login "Meta — Business Login for Instagram"
