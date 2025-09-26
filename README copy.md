# Internal Rules Library (React + Vite)

A free, local-first mini system (Lex.uz style) to manage your bank's internal rules (Policies, Procedures, Regulations). 
It runs entirely in the browser, saving to `localStorage`, and supports versioning, comparisons, comments, and JSON import/export.

## Features
- Create/update items with required sections by type
- Version history with one-click snapshots
- Compared Table (section-by-section) + inline diff highlights
- Comments per document
- Search and filters (Type, Department, Status)
- Import/Export full library as JSON
- No server required

## Quick Start (Local)
1. Install Node.js 18+ from https://nodejs.org
2. Open terminal in this folder and run:
   ```bash
   npm install
   npm run dev
   ```
3. Open the URL shown (usually http://localhost:5173).

## Build for Production
```bash
npm run build
npm run preview   # to test the built files locally
```

## Deploy to GitHub Pages
1. Edit `vite.config.js` and set:
   ```js
   export default defineConfig({
     plugins: [react()],
     base: '/aymokhirakhon-max/'   // <-- set this
   })
   ```
2. Create a new repo on GitHub (name = `aymokhirakhon-max`), push this project.
3. Run:
   ```bash
   npm run build
   ```
   Then copy the contents of `dist/` into a `/docs` folder in your repo, commit and push.
4. In GitHub → **Settings → Pages**: choose **Deploy from branch**, branch `main`, folder `/docs`.
5. Your app appears at `https://<username>.github.io/aymokhirakhon-max/`.

## Notes
- Everything is saved to your browser storage; to share with others, use **Export JSON** and send the file.
- For multi-user (bank-wide) use, you can later add a small backend (Postgres + API) and move data off localStorage.
