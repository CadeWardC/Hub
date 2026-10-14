# Syncing Task & Schedule with Directus

The app keeps everything in the browser and syncs tasks, events and protocols to
one Directus collection. Each item is a row:

| field     | type       | meaning                                            |
|-----------|------------|----------------------------------------------------|
| `id`      | string, PK | id made by the app                                 |
| `kind`    | string     | `task`, `event` or `protocol`                      |
| `data`    | json       | the whole item                                     |
| `updated` | bigInteger | last change in ms; the newest copy wins            |
| `deleted` | boolean    | kept after a delete so other devices remove it too |

Running protocols (timers in progress) stay on the device that started them.

## 1. Create the collection

From the repo root, with an **admin** token (used only on your machine):

```bash
DIRECTUS_URL=https://api.opcw032522.uk DIRECTUS_ADMIN_TOKEN=xxxx node TaskSchedule/directus-setup.mjs
```

Or put `DIRECTUS_URL` and `DIRECTUS_ADMIN_TOKEN` in the repo-root `.env` (it is
gitignored) and run `node TaskSchedule/directus-setup.mjs`. You can also create
the collection by hand in the Data Model settings using the table above (set
`id` as a manually entered string primary key).

## 2. Make a limited sync user

The app is a public static site, so it must never hold an admin token.

1. **Settings → Access Policies → Create**: name it "Task & Schedule sync", no
   app access, no admin access. Add `taskschedule_items` with **Create, Read,
   Update** (and Delete if you like) set to *All Access*.
   (On Directus 10, do the same on a **Role** under Settings → Roles.)
2. **User Directory → Create user**: e.g. `taskschedule-sync`, give it that
   policy (or role).
3. Open the user, scroll to **Token**, generate one, copy it, then **Save**.

## 3. Allow the app's origin (CORS)

The app is served from `https://cadewardc.github.io`, so Directus must allow
that origin. In the Directus environment (keep any origins other apps need),
then restart Directus:

```
CORS_ENABLED=true
CORS_ORIGIN=https://cadewardc.github.io,https://cadel4d.github.io
```

Add `http://localhost:8765` too if you want to sync from the local preview.

## 4. Build the passphrase-locked config

Put the sync user's token in the repo-root `.env` (gitignored):

```
DIRECTUS_URL=https://api.opcw032522.uk
DIRECTUS_SYNC_TOKEN=paste-the-sync-token-here
TASKSCHEDULE_PASSPHRASE=empty brain
```

Then run `node TaskSchedule/make-sync-config.mjs`. It writes
`TaskSchedule/sync-config.js` with the token encrypted (PBKDF2 + AES-GCM) by the
passphrase. Commit and push that file; the passphrase itself never leaves `.env`.
Re-run it whenever the token or passphrase changes.

## 5. Unlock on each device

The first time the app opens on a device it asks for the passphrase (capitals
and extra spaces don't matter). After that the token is saved on that device
and sync runs on its own: on open, after every change, every 2 minutes while
open, and when the connection returns. The cloud dot is amber while locked,
green when synced and red on errors (tap it to see the message). Disconnect in
the same dialog forgets the token on that device.

Without `sync-config.js`, the dialog's "Server and token" section still lets you
paste a URL and token by hand.
