# Phase A report: audit (read-only)

Branch `redesign/ssviral-theme` (from `migration/com-deploy`, i.e. what is live on shashwatyadav.com). Nothing pushed, nothing deployed.

## Deliverables

| File | What |
|---|---|
| `ssviral-design.md` | Full SSVIRAL design extraction (tech, palette, type, spacing, header, footer, components, animation, breakpoints, icons) + the owner's decisions |
| `ssviral-audit.json` | Raw measured data for 7 SSVIRAL pages (desktop, tablet, mobile) |
| `screens/ssviral/` | 20 full-page screenshots of SSVIRAL (home, about, services, google-ads, results, contact, blog; mobile; tablet; open mobile menu) |
| `content-baseline.json` | Content snapshot of all 22 pages: title, meta, canonical, OG/Twitter, JSON-LD, headings, text by region (header/content/footer), links, images, forms, network calls, commented-out chatbot block, JS integration endpoints |
| `screens/before/` | 45 full-page screenshots of the current site (desktop 1280, mobile 375) |
| `tools/` | CDP driver, SSVIRAL extractor, page extractor, baseline runner (reused for the Phase D diff). No dependencies. |

**Baseline stability check:** a second extraction of the unchanged site matched the baseline in every field of all 22 pages (0 differences), so any difference found in Phase D is a real change.

## Design summary

SSVIRAL = custom Astro site with hand-written plain CSS (~84 KB) driven by CSS variables. White sticky header (76 px), dark navy hero, white / mist / navy alternating sections, pill buttons, 16 px-radius bordered cards, uppercase letter-spaced eyebrows, Montserrat headings + Inter body, blue-only palette (`#0058D5` primary, `#001E54` midnight, `#00BEFF` cyan accent), gradient CTA band, 5-column navy footer. Its CSS cannot be reused as is; the tokens and components are rebuilt exactly as our own `theme.css`. Details: `ssviral-design.md`.

## Page list (the 22 coded pages) and baseline facts

All 22 return 200, have exactly one H1, a self-pointing canonical, and no horizontal scroll at 375 px today. Each has the 3-part commented-out chatbot block (bubble, panel, script).

| Page | Words | Links | Images | Forms | JSON-LD |
|---|---|---|---|---|---|
| `/` | 355 | 68 | 2 | 0 | none |
| `/about` | 3,411 | 81 | 3 | contact form | Person, BreadcrumbList, FAQPage |
| `/services` | 348 | 56 | 2 | 0 | none |
| `/skills` | 505 | 54 | 15 | 0 | none |
| `/certifications` | 252 | 55 | 10 | 0 | none |
| `/contact` | 244 | 58 | 2 | contact form | none |
| `/privacy-policy`, `/terms` | 1,778 / 500 | 61 / 57 | 2 | 0 | none |
| `/portfolio/` + 7 case studies | 198 + 105 to 375 | 56 to 60 | 2 | 0 | none |
| `/courses/` (hub, Live Classes list, enrol select) | 400 | 72 | 5 | enrol form | none |
| `/courses/google-ads/`, `/meta-ads/`, `/claude-mastery/`, `/master-classes/` | 2,389 / 1,749 / 1,541 / 403 | 62 to 76 | 2 to 3 | 0 | none |
| `/meta-ads-lead-generation-master-class/` | 556 | 59 | 2 | 0 | none |

Integrations that must keep working (found in the baseline): contact form (10 fields incl. honeypot, posts to the Google Apps Script URL in `assets/js/main.js`); Live Classes `GET /classes/live-classes/api/sessions` (called by 3 pages), cookies `lc_in` / `lc_intent`, header pills (`data-lc-pill`, `data-lc-login`, `data-lc-guest`); Google Tag Manager; external hosts today: Tailwind CDN, Google Fonts, GTM (the Tailwind CDN goes away).

## SSVIRAL has, shashwatyadav.com has no matching content (not reproduced: content is locked)

- Client-logo marquee ("trust strip"); industry selector; services bento with UI illustrations; sample dashboard demo; "find your growth plan" quiz; four-steps timeline with accordion; "who we help" tabs.
- Mega menu with descriptions and an "Industries" dropdown; hero photo/poster background (SSVIRAL's own image, not ours to use).
- Enquiry form with Organisation / Industry / service chips and the "Your data" notice (your contact form has name, country code, phone, email, service, budget, message and stays as is).
- Results page filters, blog category chips (your blog has one category, handled by the blog plugin), YouTube social icon, phone-only bottom call bar.

## shashwatyadav.com has, SSVIRAL has no matching component (built from SSVIRAL primitives)

- About: biography, journey/experience timeline, 75 headings of long-form text, FAQ (JSON-LD) -> section heads, cards, `details` FAQ rows, tags.
- Skills (15 tool logos) and Certifications (10 badges) -> icon tiles / cards / chips in the SSVIRAL style.
- Case-study pages (Challenge, Strategy, Results, Visual proof) and the portfolio grid -> blog-card style cards and the dark crumb bar + hero template.
- Courses and Live Classes: upcoming-classes list, Google sign-in steps, enrol select, "No upcoming classes", Master Classes -> cards, steps, buttons, form fields; behaviour untouched.
- Header trio (Log in, Courses, Let's Connect) and the Courses dropdown -> SSVIRAL nav link + dropdown + primary / secondary pills.
- Two floating buttons (WhatsApp, call) -> SSVIRAL's blue floating button style (green removed).
- Contact success / error states, stats and badges in blue (amber and green removed per your decision).

## Findings to be aware of (no change planned; SEO and content stay exactly as they are)

- Only `/about` has structured data; the other 21 pages have none.
- Several titles are long (portfolio pages 68 to 96 characters) and `/portfolio/hospital-multi-treatment-2026/` has a 161-character description.
- The home page has 355 words only.

## Open points for Phase B (the palette decision is already made: SSVIRAL blue everywhere)

1. **Fonts:** assumed Montserrat + Inter exactly like SSVIRAL (replacing Playfair Display and Space Mono). Please confirm.
2. **Font files:** self-hosting needs a one-time download of the Montserrat and Inter `woff2` files (open-source licence). OK to download?
3. **Hero image:** SSVIRAL's hero uses a photo; yours would use SSVIRAL's navy/gradient styling without a photo (no new images, content locked) unless you supply one.
