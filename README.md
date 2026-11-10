# pairwise

**Heads, it's dollars. Tails, it's pesos.**

pairwise is a landing page concept for a two-currency account that holds US dollars and Philippine pesos. The page is built around a 3D scene: two coins and a metal card that move, flip and rearrange as you scroll.

**Live demo:** https://pairwise-seven-beta.vercel.app

> This is a design concept, not a real product. pairwise is not a bank or a financial service. Every rate, balance, fee and interest figure on the page is made up.

## What's on the page

- **Hero:** two coins (USD and PHP) and the card. Click a coin to flip it, or drag the card.
- **Card:** shows which balance pays for each purchase.
- **Swap:** a working USD/PHP calculator with a flat fee and a rate-lock timer.
- **Earn:** interest on both balances, with a monthly breakdown.
- **Send, Security, Plans:** the rest of the product story.

When the visitor's system asks for reduced motion, the page cuts back its animations: smooth scrolling and entrance effects are off, and live numbers update less often.

## Built with

- [three.js](https://threejs.org) for the coins, card and lighting
- [GSAP](https://gsap.com) with ScrollTrigger and MotionPathPlugin for the scroll choreography
- [Lenis](https://lenis.darkroom.engineering) for smooth scrolling
- [Vite](https://vite.dev) for dev and build

## Project layout

| File | What it does |
| --- | --- |
| [index.html](index.html) | All page markup and sections |
| [src/main.js](src/main.js) | Scroll setup, swap and earn widgets, UI behaviour |
| [src/scene.js](src/scene.js) | three.js scene and one 3D pose per section |
| [src/textures.js](src/textures.js) | Coin and card faces, drawn in code |
| [src/money.js](src/money.js) | Sample rate, fee and interest math |
| [src/style.css](src/style.css) | Styles |

## Run it

```sh
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # preview the build
npm test         # money math and 3D pose tests (node --test)
```
