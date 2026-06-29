# Latevzn

A personal photography reflection journal you can install on your phone and use
offline. It's a small web app built with plain HTML, CSS, and JavaScript — no
build step and no installation on your computer. You host it for free with
GitHub Pages.

This first version is the **basic shell**: a home screen listing the guide's
sections, with a placeholder screen for each. The real features come later.

## How to view it on your phone (GitHub Pages)

GitHub can serve this app as a real website. You only set this up once.

1. On GitHub, open this repository and click the **Settings** tab (top right).
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, pick **`claude/latevzn-app-shell-w2h0f6`** and the folder
   **`/ (root)`**, then click **Save**.
5. Wait about a minute, then refresh the Pages screen. GitHub will show a link
   like:

   ```
   https://<your-username>.github.io/Latevzn-App/
   ```

6. Open that link on your phone's web browser. You should see **Latevzn** with
   the list of sections.

> Tip: When you later finish the app, you can switch the Pages **Branch** to
> `main` so the public version only updates when you're ready.

## How to install it on your phone

Once the page opens in your phone browser:

- **iPhone (Safari):** tap the **Share** button → **Add to Home Screen**.
- **Android (Chrome):** tap the **⋮** menu → **Add to Home screen** /
  **Install app**.

It then appears as an app icon. After you've opened it once, it also works
**offline** — you can open it with no internet connection.

## What's inside (for reference)

| File | What it does |
| --- | --- |
| `index.html` | The page the browser loads first. |
| `css/styles.css` | The look and feel (colours, spacing, light/dark). |
| `js/data.js` | **The list of sections** — edit here to rename or reorder them. |
| `js/router.js` | Decides which screen to show. |
| `js/app.js` | Draws the screens and turns on offline support. |
| `sw.js` | The "service worker" that makes it work offline. |
| `manifest.webmanifest` | Lets the app be installed on a phone. |
| `icons/` | The app icons (placeholder "L" — swap these later). |

## Changing the sections

Open `js/data.js`. Each section is one entry with a `title` (the name you see)
and a short `blurb`. Edit the titles, reorder the list, or change the blurbs —
the home screen updates automatically.

## What's next

Future versions will add the actual journaling features and save your entries
on your device using IndexedDB (via the Dexie library). None of that is built
yet — this is just the shell.
