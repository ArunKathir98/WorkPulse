# WorkPulse

A to-do board with columns you define. Google sign-in only, and all data is saved as one JSON
file in a hidden app folder in the user's own Google Drive. No backend, no database, no cost.

Stack: Vite, React, React Router (hash routing), Tailwind, dnd-kit, lucide-react, PWA.

## 1. Get a Google Client ID (free, about 5 minutes)

1. Go to https://console.cloud.google.com and create a project.
2. **APIs & Services > Library**: search for **Google Drive API** and click **Enable**.
3. **APIs & Services > OAuth consent screen** (called "Google Auth Platform" in newer consoles):
   - User type **External**, fill in app name and your email.
   - Add the scope `https://www.googleapis.com/auth/drive.appdata` (plus `openid`, `email`, `profile`).
   - These scopes are all non-sensitive, so **no Google verification is needed**.
   - Click **Publish app** so that anyone with a Google account can sign in.
     (While in "Testing" only the test users you list can sign in.)
4. **Credentials > Create credentials > OAuth client ID > Web application**:
   - **Authorized JavaScript origins**: `http://localhost:5173` and your deployed origin,
     for example `https://yourname.github.io` (origin only, no path, no trailing slash).
   - Leave redirect URIs empty.
5. Copy the Client ID.

## 2. Run locally

```bash
npm install
cp .env.example .env     # then paste your Client ID into .env
npm run dev              # http://localhost:5173
```

## 3. Deploy for free

**GitHub Pages (workflow included)**
1. Push this folder to a GitHub repo on the `main` branch.
2. Settings > Pages > Source: **GitHub Actions**.
3. Settings > Secrets and variables > Actions > **Variables** > add `VITE_GOOGLE_CLIENT_ID`.
4. Push again (or run the workflow). Add `https://<user>.github.io` to the authorized origins in step 1.4.

**Vercel or Netlify**: import the repo, build command `npm run build`, output `dist`, add the
env var `VITE_GOOGLE_CLIENT_ID`, and add the resulting URL to the authorized origins.

The Client ID is not a secret. It is visible in any web app that uses Google sign-in.

## 4. Use it on a phone

Open the deployed URL on the phone, then:
- **Android Chrome**: menu > *Install app* / *Add to Home screen*.
- **iPhone Safari**: Share > *Add to Home Screen*.

On touch screens, **press and hold a card for a moment, then drag**. A quick swipe still scrolls.
Columns scroll sideways. Use the grip icon in a column header to move it, or the arrows in Settings.

## How it works

- `src/lib/google.js` uses Google Identity Services (token flow) with the `drive.appdata` scope.
- `src/lib/drive.js` reads and writes `lanes-data.json` in the Drive appDataFolder.
- `src/context/DataContext.jsx` keeps state in memory, saves to Drive 0.8 s after the last change
  (and immediately when the tab is hidden), and keeps a local copy as an offline fallback.
- Access tokens last about an hour. The app renews them silently; if the browser blocks that, a
  banner offers **Reconnect Google**.

Data shape:

```json
{
  "settings": { "theme": "dark", "columns": [{ "id": "c_1", "title": "To do", "icon": "ListTodo", "type": "list" }] },
  "items":    [{ "id": "t_1", "text": "Call the bank", "columnId": "c_1", "createdAt": 0, "fields": {} }],
  "profile":  { "displayName": "", "customPicture": null }
}
```

Column types: `list` holds draggable tasks. `date`, `text` and `number` add a field to every task
(edited in the task dialog and shown as a chip on the card).

## Limits to know about

- Google-only login, so there is no registration or change-password screen.
- Sorting is per column and only for the current session; drag order is what gets saved.
- Two devices editing at the same moment follow last-write-wins.
