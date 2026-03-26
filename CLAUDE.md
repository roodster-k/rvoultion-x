# RVolution X - Project Context

## Project Overview
Building the RVolution X (RVX) website from scratch as a static site hosted on GitHub and deployed via Netlify.
Branch: `claude/setup-github-netlify-F8ErU`

## Design Direction
- Dark futuristic theme (neutral-950 background, indigo/cyan/emerald accents)
- Tailwind CSS via CDN + custom CSS in `css/style.css`
- Inter font family, modern bento grid layouts, glassmorphism effects
- Animated background orbs, fade-in animations, gradient text
- Inspired by the HTML template provided by the user (see conversation)

## Site Structure (5 pages)
1. **index.html** - Homepage: hero, services overview, bento features grid, CTA sections
2. **services.html** - Services detail + Smart FAQ (interactive: asks user needs, recommends best service)
3. **projects.html** - Portfolio/case studies showcase
4. **about.html** - Team, mission, values
5. **contact.html** - Contact form + info

## Shared Resources
- `css/style.css` - Custom animations, blob keyframes, shared styles
- `js/app.js` - Mobile nav, smart FAQ logic, scroll animations, intersection observer
- `img/` - Image assets directory
- `netlify.toml` - Netlify deploy config
- `_redirects` - Netlify URL redirects

## Key Features
- **Smart FAQ** on services page: interactive questionnaire that analyzes user needs and recommends the most suitable RVX service
- **Responsive** mobile-first design
- **Performance** optimized static site (no framework, CDN delivery)
- **Modern UI** with bento grids, glassmorphism, animated orbs

## Tech Stack
- HTML5 + Tailwind CSS (CDN) + Vanilla JS
- Netlify for hosting (auto-deploy from GitHub)
- No build step required

## Brand Info
- Company: RVolution X (RVX)
- Tagline: "Architecting the future of web"
- Services: Web Development, Digital Strategy, AI-Driven Solutions, Cloud Infrastructure
- Colors: Indigo (#6366f1), Cyan (#22d3ee), Emerald (#10b981) on dark backgrounds

## Current Progress
Check the todo list in the conversation. If session resets, continue from where files were last created/modified.
Priority: create all 5 HTML pages, css/style.css, js/app.js, netlify.toml, then commit & push.
