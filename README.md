# Kharcha Update

A shared expense tracker for two people. Runs as one static website (no build
step), stores data in Firebase so both phones stay in sync, and installs to the
home screen like an app.

- **Hosting:** GitHub Pages (free)
- **Data + login:** Firebase — Firestore + Google sign-in (free)
- **Cost:** ₹0

---

## What you edit

Only **`config.js`**. Everything else can be left alone.

---

## One-time setup (~15 minutes, no coding)

### Part A — Firebase (the database + login)

1. Go to <https://console.firebase.google.com> and sign in with your Google
   account. Click **Add project**.
2. Name it `kharcha` (or anything). You can **disable Google Analytics** — not
   needed. Click **Create project**, wait, then **Continue**.
3. **Register the web app:**
   - On the project home, click the **`</>`** (Web) icon.
   - App nickname: `kharcha`. Do **not** tick "Firebase Hosting". Click
     **Register app**.
   - You'll see a code block with a `firebaseConfig = { ... }` object. Copy the
     values.
   - Open `config.js` in this folder and paste each value into the matching line
     (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
   - Click **Continue to console**.
4. **Turn on Google sign-in:**
   - Left menu → **Build → Authentication** → **Get started**.
   - **Sign-in method** tab → **Google** → toggle **Enable** → pick a support
     email → **Save**.
5. **Create the database:**
   - Left menu → **Build → Firestore Database** → **Create database**.
   - Choose a location near you (e.g. `asia-south1` for Mumbai). Click **Next**.
   - Start in **production mode** → **Create**.
6. **Set the security rules:**
   - In Firestore, open the **Rules** tab.
   - Delete what's there and paste the contents of `firestore.rules` from this
     folder.
   - Replace `paste_ishitas_gmail_here` with Ishita's actual Gmail (lowercase).
   - Click **Publish**.
7. **Allow your website address** (do this after Part B, once you know the URL):
   - **Authentication → Settings → Authorized domains → Add domain**.
   - Add `sparshgoyal01.github.io`.

### Part B — Put both Gmails in the app

In `config.js`, set `ALLOWED_EMAILS` to the two Google accounts that may use the
tracker:

```js
export const ALLOWED_EMAILS = [
  "sparshgoyal20@gmail.com",
  "ishitas-actual-gmail@gmail.com",
];
```

Keep this list identical to the one in `firestore.rules`.

### Part C — GitHub Pages (the hosting)

1. Go to <https://github.com/new> and create a repository named
   **`expense-tracker`**. Set it to **Public** (Pages is free on public repos).
   Don't add a README. Click **Create repository**.
2. GitHub shows a page of commands. Use the ones under **"…or push an existing
   repository from the command line"**. In this folder run:

   ```bash
   git remote add origin https://github.com/SparshGoyal01/expense-tracker.git
   git branch -M main
   git push -u origin main
   ```

3. In the repo: **Settings → Pages**. Under **Build and deployment → Source**,
   choose **Deploy from a branch**. Branch: **main**, folder: **/ (root)**.
   Click **Save**.
4. Wait ~1 minute. The page will show your live URL:

   **`https://sparshgoyal01.github.io/expense-tracker/`**

5. Go back and finish **Part A step 7** with this domain.

---

## Add to the home screen

**iPhone (Safari):** open the URL → Share button → **Add to Home Screen**.

**Android (Chrome):** open the URL → menu (⋮) → **Install app** / **Add to
Home screen**.

Ishita does the same on her phone with her own Google account.

---

## Making changes later

Edit the file, then in this folder:

```bash
git add -A
git commit -m "describe the change"
git push
```

The live site updates in under a minute. If you change app files and the phones
seem stuck on an old version, bump `kharcha-v1` to `kharcha-v2` (etc.) in
`sw.js` and push again.

---

## Backing up your data

Firebase console → Firestore → you can export the `expenses` collection.
A one-tap "Download CSV" button inside the app is a planned addition.

---

## How it's put together

| File | Job |
| --- | --- |
| `index.html` | Loads React / charts / Firebase from a CDN, then runs `app.jsx` |
| `app.jsx` | The whole app — screens, the sign-in gate, all the logic |
| `config.js` | **Your settings** (Firebase keys + allowed emails) |
| `lib/firebase.js` | Connects to your Firebase project |
| `lib/auth.js` | Google sign-in + the "only us two" check |
| `lib/storage.js` | Reads/writes expenses in Firestore, live |
| `manifest.webmanifest` | Name + icons for "add to home screen" |
| `sw.js` | Offline support |
| `firestore.rules` | The server-side lock (paste into Firebase) |
