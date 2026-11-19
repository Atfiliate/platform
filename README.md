# Platform core

A small Node/Express server that runs sites whose code lives in Firestore. Core serves
the page shell, the site's components and cloud handlers, and a root-only health check.
Site code is edited in the site itself (Ctrl+E) and stored as versions in `dev/*`.

## How a request is served

| Route | Served from |
|---|---|
| `/`, `/:view`, `/:view/:id` | Page shell (`views/`) with the site's brand from `dev/site` `site.json` |
| `/component/:name`, `/cloud/:name` | The site project `dev/site` only. A missing site project serves nothing (no fixed-id or other fallback). |
| `/project/:id`, `/project/:id/component/:name`, `/project/:id/cloud/:name` | The starred version of project `:id` (or `?v=<version id>`). An unknown or malformed `?v=` (reserved `__name__` ids, anything outside `A-Z a-z 0-9 _ -`, over 128 chars) returns 404 `X-Core-Error: VERSION_NOT_FOUND`, and a malformed project id returns 404 `PROJECT_NOT_FOUND`, before the cache or Firestore is read; a missing component returns 404 `COMPONENT_NOT_FOUND`. |
| `/__core/health`, `/__core/install/plan` | Root or admin.all only (Bearer ID token); names only |
| `/__core/settings?scope=site\|studio\|sites` (GET; POST `{values}` or `{host, site}`) | Settings for the admin page (Bearer ID token): `site` and `sites` need root, admin.all or admin.settings; `studio` needs root, admin.all or admin.studio. Every save is validated on the server and logged by name. |

- **Site project:** `dev/site` (doc id and `projectId` both `site`, stage `prod`, starred). Its cloud handlers named `__<name>` (double underscore) run once at boot.
- **Startup handlers:** a cloud handler named `__<name>` in any project is never served: `/cloud/__<name>` and `/project/:id/cloud/__<name>` return 404 with `X-Core-Error: STARTUP_NOT_SERVED`. Only `dev/site` runs them, at boot, as `js = {init(){...}}` with no request. A single `_<name>` handler is a normal endpoint, like any other name.
- **Versions (`?v=`):** the starred version and any version with stage `prod` run for anyone. Other versions (for example stage `dev`) run only for a developer of that project, who sends `Authorization: Bearer <ID token>` (or `jwt` in the body).
- **Cloud handlers** are `js = {init(request, response){...}}`, evaluated in `cloud/auto.js`. `request` and `response` are the Express objects. They run with the server's credentials, so write access to `dev/*` must stay limited to developers (see the rules template).
- **Component names** are matched exactly, and the content type comes from the extension only (`.json`, `.css`, `.js`/`.mjs`, `.html`). The old `name_ext` forms are not served.
- **Realtime Database:** not used. `Fire` is Firestore only.

## Handler scope

Firebase Admin SDK 14, modular API only. There is no `firebase` global and no namespaced API (`firebase.firestore()`, `firebase.auth()`, `admin.messaging()` and the like do not exist).

| Name | What it is |
|---|---|
| `getApps`, `getApp`, `initializeApp`, `cert` | `firebase-admin/app` |
| `getFirestore`, `FieldValue`, `FieldPath`, `Timestamp`, `GeoPoint` | `firebase-admin/firestore` (`getFirestore(getApp(), '<db id>')` for a named database) |
| `getAuth` | `firebase-admin/auth` |
| `getMessaging` | `firebase-admin/messaging`: use `send`, `sendEach`, `sendEachForMulticast` (the legacy `sendToDevice`/`sendMulticast` APIs are gone) |
| `getStorage` | `firebase-admin/storage` |
| `Fire`, `cloudinary`, `moment`, `aiMeter`, `settings` | Core helpers (`settings` is the request host's subSite entry or the env config) |
| `siteSetting(name, request?)` | A typed setting (see Site settings). With `request`, the sub-site's override wins. Studio names resolve from `admin/studio` |
| `studioSetting(name)` | A typed studio setting from `admin/studio` |
| `config` | This request host's page config (settings mode: merged, see Page config) |
| `systemEmail` | This request host's sender address, or `null` (named `SETTING_MISSING systemEmail` in health) |
| `http(options)` | Core HTTP helper (`cloud/http.js`), built on `fetch`. Returns a promise; no callbacks or streams. |

`http(options)` takes `url` (or `uri`), `method`, `qs`, `headers`, `json`, `body`, `form` (arrays repeat the key), `formData`, `auth` (`{bearer}` or `{user, pass}`), `timeout`, `encoding: null` (resolve a Buffer), `resolveWithFullResponse`, `simple` and `followRedirect`. A non-2xx reply rejects with `{name: 'StatusCodeError', statusCode, error: <body>}` unless `simple: false`. Any other option throws `HTTP_OPTION_UNSUPPORTED`. The `request` and `request-promise` packages are not installed.

An unhandled promise rejection in a handler is logged and does not stop the server.
- **Bodies:** JSON, form and multipart bodies are parsed only on cloud routes (`bodyLimit`, default 50mb; `uploadLimitMb`, default 50). Other routes do not parse request bodies.
- **Headers:** `x-powered-by` is off. `Referrer-Policy`, HSTS on https, and `nosniff` (except on code routes) are always sent. Set `frameOptions` to `SAMEORIGIN` or `DENY` to block framing.

## Site settings

Non-secret settings live in one Firestore doc, `admin/settings`, and are edited in the admin page. Secrets stay in env. A setting is never read from env, and an env var is never read as a setting.

- `values`: `{<name>: <value>}`, typed.
- `schema`: the site's own definitions, `{<name>: {type, label, group, help, options, min, max, pattern, maxLength, required, default, public, env}}`. Types: `string`, `text`, `number`, `integer`, `boolean`, `enum`, `list`, `url` (https only), `email`, `json`. `env` records the env var a setting replaced (documentation only). Core definitions are in `install/settings.schema.json`, and a site definition cannot reuse a core name.
- `valuesMeta` and `admin/settings/log/*`: who saved which names, and when.

Core watches the doc, so a save takes effect at once, without a restart. Handlers call `siteSetting('<name>')`. It returns the stored value, else the definition's `default`, else `null` for an optional setting. Otherwise it throws a named error (`code`, `setting`): `SETTINGS_NOT_READY`, `SETTING_UNKNOWN`, `SETTING_MISSING` (required, no value and no default) or `SETTING_INVALID` (the stored value fails its type). `/__core/health` lists the same problems by name.

Definitions may also carry `section` (heading in the admin tab), `description` (the (i) text), `client` (a page config path such as `gapi.clientId`; `firebase`, `origin`, `environment`, `site`, `host`, `domain` and `email` are reserved) and `override` (a sub-site may set it). `group` is the admin tab.

Three docs, three scopes:

- `admin/settings`: the main site (General, Branding, Sign-in, Integrations, Messaging, plus product tabs from the site schema). Core definitions are in `install/settings.schema.json`.
- `admin/studio`: studio settings, all definitions in its own `schema` map.
- `admin/settings/sites/{host}`: one doc per sub-site, `{host, domain, enabled, overrides, meta}`. `overrides` holds only `override` settings, typed. `meta` (creator, custom-domain/SSL status, email domain, notes) is private: the admin page shows it, the page config never gets it.

### Page config

`configSource` (core setting) picks where the page config comes from:

- `env` (default; sites not migrated yet): the env `config` JSON, then site.json brand/theme (shell 2), then the legacy `admin/settings.subSite[host]` entry (its private records are left out), then the project page title. Handlers get the env config.
- `settings`: env gives only `config.firebase`. Then, later wins: schema defaults, `admin/settings` values, the sub-site's overrides, the project page title/description. `origin` is env `origin` on the main site and the sub-site's own domain on a sub-site. Only definitions with a `client` path reach `window.config`. Handlers get the same config for their host plus `config.email` (the host's `systemEmail`).

`/__core/health` lists leftovers by name in settings mode: `CONFIG_ENV_UNUSED config.<key>`, `ENV_UNUSED systemEmail`, `LEGACY_SUBSITE_MAP`, `LEGACY_FIELD admin/settings.domain`, `SITE_JSON_BRAND_UNUSED`.

Core settings (tabs): General `configSource`, `environment`, `title`, `description`, `homeGroup`; Branding `logo`, `tagline`, `favicon`, `icons`, `colorPrimary`, `colorSecondary`, `css`; Sign-in `login`; Integrations `stripePublishableKey`, `cloudinaryCloudName`, `cloudinaryUploadPreset`, `googleClientId`, `googleApiKey`, `googleMapsKey`, `pushPublicKey`; Messaging `systemEmail`. `environment` = `beta` adds a red BETA bar at the top and bottom of every page shell and a thin red frame that never takes clicks.

## Env

Required: `config` (JSON: `firebase.projectId`, `firebase.apiKey`, `firebase.authDomain`; sites on `configSource` env also keep page fields here), `googleJson` (service account JSON), `origin`. `systemEmail` is required in env only while `configSource` is `env`; in settings mode it is a setting.
Optional names and the feature each one turns on are listed in `install/manifest.json`. Missing names are reported by name (`MISSING_ENV <name>`) by the installer and by `/__core/health`. Handlers that need a key answer `503 Missing env var: <name>` instead of failing silently. Never commit values.

## New site

1. Create the Firebase project and the host app from this repo. Set the required env. With no `config`, the app shows a setup page that lists what is missing.
2. Sign in once on the site with the account that will own it.
3. Dry run, then apply, on the host (for example a one-off dyno):
   ```
   node install/apply.js --root-email <owner email> --title "<site name>" --system-email <sender address>
   node install/apply.js --root-email <owner email> --title "<site name>" --system-email <sender address> --apply
   ```
   This creates, only when missing: `admin/settings` (configSource `settings`, with the title and sender given; the rest is set in the admin settings tabs), `admin/studio`, the owner's root role, `dev/site` from `install/site/` (pixel, cl_img, proxy, shortCode, swConfig, site.json, site.css, manifest.json, firebase-sw.js), and the Site Code entry on the starred admin page. Every apply writes `admin/install/log/{id}`. It never overwrites existing data.
4. To copy a full site project (shell 2 client files included) from a working site, run `node install/apply.js export --out site.json` there and `--site-from site.json` here.
5. Rules: `install/firestore.rules` is the starting ruleset. On a new project, `--rules --apply` releases it. On a project that already has rules, merge it by hand; the installer will not replace existing rules unless `--replace-rules` is passed.
6. Check `/__core/health` as root until it reports `ok`, then install product packages.
7. Branding, sign-in, integrations and the sender live in the admin page's settings tabs. Add sub-sites from its Sub-sites tab: host and domain, then the custom domain and SSL, the email domain, branding overrides (empty fields inherit the main site) and the home group.

## Develop

```
npm ci
npm test
```
Tests stub the modular Firebase Admin entry points (requiring the `firebase-admin` root fails the tests); they need no network. Node 24 (`engines`). `npm audit` should report 0. Install scripts are reviewed in `allowScripts` (the `protobufjs` and `@firebase/util` postinstalls are denied: one only prints a version warning, the other writes web-SDK defaults the server never uses). Keep `package-lock.json` committed.
