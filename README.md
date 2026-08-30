# Deriv Dynamic Digit Analyzer — Installable PWA

This package turns the V4 analyzer into an installable Progressive Web App.

## iPhone / iPad
1. Host these files on an HTTPS website.
2. Open the site in Safari.
3. Tap Share.
4. Choose Add to Home Screen.
5. Open the new Deriv Analyzer icon.

## Android
1. Host the files on an HTTPS website.
2. Open the site in Chrome.
3. Choose Install app / Add to Home screen.

## PC
Open the HTTPS site in Chrome/Edge and choose Install app from the browser menu.

## Important
- A service worker/PWA normally requires HTTPS (localhost is also allowed for development).
- The app still needs internet access for the live Deriv WebSocket stream.
- Offline mode caches the interface but cannot provide live ticks without connectivity.
- The current app remains analysis/paper-trading only; it does not submit real-money orders.
