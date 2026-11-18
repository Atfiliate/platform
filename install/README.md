# First install

`install/manifest.json` lists what a site needs: the required and optional env names, the base docs and collections, and the install steps. It holds names only, never values.

## Check
- `GET /__core/health`: env and data checks, with named errors.
- `GET /__core/install/plan`: read-only plan.
- Both need a Bearer ID token from a `root` or `admin.all` account.

## Install
`POST /__core/install/apply` with JSON:
- `{}` or `{"dryRun": true}`: lists what would be created (`wouldCreate`) and writes nothing.
- `{"dryRun": false, "confirm": "apply"}`: creates whatever is missing, in manifest order. If a required env name is missing, it stops before any write (`ENV_INCOMPLETE`).

Every write is create-if-missing, so the installer never overwrites an existing doc and running it again is a no-op. These are the steps:
1. `env`: manual. Set the required env names on the host app.
2. `settings`: `admin/settings`, with `domain` taken from env `origin`.
3. `roles`: `roles/{uid}` gets `root: true`, but only while the roles collection is empty.
4. `manageGroup`: `acl/db/groups/manage`.
5. `commTemplates`: manual. Copy the email templates.
6. `siteProject`: a starred `dev/{vid}` with `projectId: 'site'`, built from `install/site/package.json`. If one already exists, it is left alone and the response lists any files that differ (`differs`).
7. `products`: product packages go through the code-change process.

Each apply writes `admin/install/log/{logId}`, which lists the docs it created.

## Rollback
`POST /__core/install/rollback` with `{"logId": "<id>"}` (dry run) or `{"logId": "<id>", "dryRun": false, "confirm": "rollback"}`.
- Deletes only docs that install created and that were never changed afterwards.
- Changed docs are kept and reported.

## Who can run it
- A `root` or `admin.all` account.
- On a brand-new site, while `roles` is still empty: any signed-in user who also sends header `X-Install-Key` matching env `installKey`. Remove `installKey` after the first install.
