# Platform core

A small Node/Express server that runs sites whose code lives in Firestore. Core serves
the page shell, the site's components and cloud handlers, and a root-only health check.
Site code is edited in the site itself (Ctrl+E) and stored as versions in `dev/*`.

## How a request is served

| Route | Served from |
|---|---|
| `/`, `/:view`, `/:view/:id` | Page shell (`views/`) with the site's brand from `dev/site` `site.json` |
| `/component/:name`, `/cloud/:name` | The site project `dev/site` only |
| `/project/:id`, `/project/:id/component/:name`, `/project/:id/cloud/:name` | The starred version of project `:id` (or `?v=<version id>`) |
| `/__core/health`, `/__core/install/plan` | Root or admin.all only (Bearer ID token); names only |

- **Site project:** `dev/site` (doc id and `projectId` both `site`, stage `prod`, starred). Its cloud handlers named `_<name>` run once at boot and are never served over HTTP.
- **Versions (`?v=`):** the starred version and any version with stage `prod` run for anyone. Other versions (for example stage `dev`) run only for a developer of that project, who sends `Authorization: Bearer <ID token>` (or `jwt` in the body).
- **Cloud handlers** are `js = {init(request, response){...}}`, evaluated in `cloud/auto.js` with `Fire`, `firebase`, `cloudinary`, `request`/`http`, `moment`, `aiMeter` and `settings` in scope. They run with the server's credentials, so write access to `dev/*` must stay limited to developers (see the rules template).
- **Bodies:** JSON, form and multipart bodies are parsed only on cloud routes (`bodyLimit`, default 50mb; `uploadLimitMb`, default 50). Other routes do not parse request bodies.
- **Headers:** `x-powered-by` is off. `Referrer-Policy`, HSTS on https, and `nosniff` (except on code routes) are always sent. Set `frameOptions` to `SAMEORIGIN` or `DENY` to block framing.

## Env

Required: `config` (JSON: `firebase.projectId`, `firebase.apiKey`, `firebase.authDomain`, plus title, colors), `googleJson` (service account JSON), `origin`, `systemEmail`.
Optional names and the feature each one turns on are listed in `install/manifest.json`. Missing names are reported by name (`MISSING_ENV <name>`) by the installer and by `/__core/health`. Handlers that need a key answer `503 Missing env var: <name>` instead of failing silently. Never commit values.

## New site

1. Create the Firebase project and the host app from this repo. Set the required env. With no `config`, the app shows a setup page that lists what is missing.
2. Sign in once on the site with the account that will own it.
3. Dry run, then apply, on the host (for example a one-off dyno):
   ```
   node install/apply.js --root-email <owner email>
   node install/apply.js --root-email <owner email> --apply
   ```
   This creates, only when missing: `admin/settings`, the owner's root role, `dev/site` from `install/site/` (pixel, cl_img, proxy, shortCode, swConfig, site.json, site.css, manifest.json, firebase-sw.js), and the Site Code entry on the starred admin page. Every apply writes `admin/install/log/{id}`. It never overwrites existing data.
4. To copy a full site project (shell 2 client files included) from a working site, run `node install/apply.js export --out site.json` there and `--site-from site.json` here.
5. Rules: `install/firestore.rules` is the starting ruleset. On a new project, `--rules --apply` releases it. On a project that already has rules, merge it by hand; the installer will not replace existing rules unless `--replace-rules` is passed.
6. Check `/__core/health` as root until it reports `ok`, then install product packages.

## Develop

```
npm ci
npm test
```
Tests stub Firebase; they need no network. Keep `package-lock.json` committed.
