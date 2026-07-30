# Static assets

Files here are served at the site root by Vite (e.g. `public/auth-bg.jpg` → `/auth-bg.jpg`).

## Auth background image

The Login and Register pages use `/auth-bg.jpg` as the left-panel background
(the "African network / connection" visual). To use your own image, save it as:

    frontend/public/auth-bg.jpg

Until that file exists, the pages fall back to a dark "earth-at-night" image
loaded from Unsplash, with a dark overlay so white text stays readable.
