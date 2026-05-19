# laothdev

Terminal-style portfolio (Arch Linux TTY aesthetic).

## Live site

After GitHub Pages is enabled, the site is available at:

https://laothrs.github.io/laothdev/

## Local preview

Open `index.html` in a browser, or run:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

## Deploy

Pushes to `main` trigger the GitHub Actions workflow (`.github/workflows/deploy.yml`) and deploy to GitHub Pages automatically.

**Repository settings:** Settings → Pages → Build and deployment → Source: **GitHub Actions**
