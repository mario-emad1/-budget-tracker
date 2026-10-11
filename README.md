# Budget Tracker

A mobile-first personal finance tracker built with React, Vite, Tailwind CSS, React Router, Recharts, and localStorage.

## Local development

```bash
npm install
npm run dev
```

Run the checks:

```bash
npm test
npm run lint
npm run build
```

## Deploy to GitHub and Vercel

1. Create an empty repository on GitHub.
2. From `D:\Finance web`, initialize Git and push the project:

   ```bash
   git init
   git add .
   git commit -m "Build Budget Tracker"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```

3. Open [vercel.com](https://vercel.com), choose **Add New Project**, and import the GitHub repository.
4. Keep the detected framework as Vite. Use:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Select **Deploy**.

`vercel.json` rewrites all routes to `index.html`, so refreshing a React Router page works after deployment.

## Data

Budget Tracker stores data locally in the browser. Use **Settings → Export JSON** regularly for backups before clearing browser data or changing devices. Import the JSON backup on another device to restore it.
