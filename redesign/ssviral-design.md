# SSVIRAL design system (audit of https://ssviral.in)

Audited on 2026-11-17, read-only. Pages: Home, About, Services, Services / Google Ads, Results, Contact, Blog (7 pages, each at 1440 px; Home and
Services also at 768 px; all at 375 px). Raw data: `redesign/ssviral-audit.json`. Screenshots: `redesign/screens/ssviral/` (full page, `-part2`,
`-part3` when the page is taller than 15,000 px; `home-mobile-menu-open.jpg` shows the open mobile menu). Tools: `redesign/tools/`.

This describes SSVIRAL's *design* (values, layout, behaviour). None of its text, logo, names, testimonials or numbers is to be reused.

## 1. Technology: can its CSS be reused directly?

| Question | Answer |
|---|---|
| Framework | **Astro** static site (not WordPress). 2,155 `data-astro-cid-*` attributes on the home page. No jQuery. |
| CSS | **Hand-written plain CSS, not Tailwind.** 5 inline `<style>` blocks, about **84 KB**, 679 rules on the home page, no external stylesheet. Global rules plus per-component rules whose selectors are scoped with `[data-astro-cid-xxxx]`. |
| Design tokens | Defined as **CSS custom properties on `:root`** (`--ss-*`, `--font-*`, `--sp-*`, `--radius-*`, `--container`, `--section-pad`, `--header-h`), so the *tokens* transfer one to one. |
| Fonts | **Montserrat** (600, 700, 800) and **Inter** (400, 600), self-hosted `woff2`, `font-display: swap`. |
| JS | Small, per-component scripts (IntersectionObserver reveal, mega menu, tabs, quiz, dashboard demo). No library. |
| Verdict | The CSS **cannot be copied as is** (scoped selectors, SSVIRAL-specific widgets, 84 KB, not ours to reuse). It **can be rebuilt exactly**: same tokens, same component rules, written as our own `theme.css`. The shashwatyadav.com static pages use the Tailwind Play CDN today; the redesign should drop that dependency (about 100 KB of JS compiled in the browser) and use one plain stylesheet. |

## 2. Colour palette

| Token | Hex | Used for |
|---|---|---|
| `--ss-cyan` | `#00BEFF` | Eyebrow labels and links on dark backgrounds, icon accents, gradient start |
| `--ss-signal` | `#0081FE` | Gradient middle, hover border on tiles |
| `--ss-blue` | `#0058D5` | **Primary**: buttons, links, focus ring, active nav, icons |
| `--ss-navy` | `#003187` | Button hover, borders on dark, gradient end |
| `--ss-midnight` | `#001E54` | Hero, dark sections, footer, breadcrumb bar |
| `--ss-card-dark` | `#002A6E` | Cards on dark sections |
| `--ss-ink` | `#0B0D12` | Headings, nav text |
| `--ss-slate` | `#5B6475` | Body text (the most used colour) |
| `--ss-mist` | `#EEF4FB` | Alternate section background, hover wash, icon tile background, code/notice boxes |
| `--ss-white` | `#FFFFFF` | Page and card background |
| `--ss-border` | `#DCE4F0` | All 1 px borders (cards, inputs, header, FAQ rows) |
| `--ss-gradient` | `linear-gradient(135deg, #00BEFF 0%, #0081FE 45%, #003187 100%)` | CTA bands |

Other values in use: hero overlay `linear-gradient(90deg, rgba(0,30,84,.82) 0%, rgba(0,30,84,.55) 45%, rgba(0,30,84,.08) 100%)`; divider
`linear-gradient(90deg, #DCE4F0, #fff, #DCE4F0)`; heading text-shadow on photo heroes `0 2px 16px #00143c99`; text on dark `#EEF4FB`.
There is **no amber, green or any second accent**: SSVIRAL is blue only.

## 3. Typography

Heading font **Montserrat**, body font **Inter**. Body: 16 px / 1.55, colour slate.

| Role | Desktop | Mobile (≤ 767 px) | Notes |
|---|---|---|---|
| H1 (page heroes) | 44 px / 1.1, 800, -0.02em | 32 px | Home hero H1 is 64 px / 67 px (a page-specific size) |
| H2 large (`.h2-lg`, section headings) | 44 px / 1.1, 800, -0.02em | 28 px | Max width 760 px, left aligned (centred variant exists) |
| H2 | 28 px / 1.2, 700 | 24 px | |
| H3 (card titles) | 20 px / 1.3, 700 (22 px in some tiles) | 18 px | |
| H4 | 14 px, 700, uppercase, +0.04em | | "What you get" style labels |
| Eyebrow | Montserrat 13 px, 600, **uppercase, letter-spacing 0.3em**, blue (cyan on dark) | 12 px | Above every section heading |
| Lead paragraph | Inter 18 px / 1.55 | 17 px (16 px inside `main .section-head`) | |
| Nav link | Inter 15 px, 600, ink | | |
| Button | Inter 15 px, 600, line-height 1.2 | 13 px in tight bars | |
| Footer heading | Montserrat 13 px, 600, uppercase, 0.3em, cyan | | |
| Footer link | Inter 15 px, 400, mist | | |
| Tag / chip text | 12 px, 600, uppercase (+0.06em) / 13–14 px, 600 | | |

Weights used: 400, 600, 700, 800 (900 on 4 elements). Sizes in use: 12, 13, 14, 15, 16, 18, 19, 20, 22, 32, 44, 64 px.

## 4. Spacing, layout, radius, shadow

- **Spacing scale** (`--sp-1`..`--sp-9`): 4, 8, 12, 16, 24, 32, 48, 72, 96 px. Common gaps: 6, 8, 10, 12, 16, 24, 32, 48 px.
- **Container**: `max-width: 1240px`, centred, side padding `--gutter` = **32 px** (16 px at ≤ 767 px). Narrow text blocks: 640 / 680 / 760 / 820 / 880 px.
- **Section padding** (`--section-pad`): 96 px top and bottom on desktop (72 px for bands), **56 px** at ≤ 767 px (40 px inside `main`). Section heading block: bottom margin 48 px (24 px on mobile).
- **Radius**: cards 16 px (`--radius-card`), tiles / inputs / nav links 10 px (`--radius-tile`), buttons and chips fully round 999 px (`--radius-pill`), icon avatars 50 %.
- **Borders**: 1 px `#DCE4F0` everywhere (1.5 px on chips and buttons); 1 px `#003187` on dark cards.
- **Shadows** (soft, blue-tinted, used sparingly): `0 12px 40px rgba(0,30,84,.08)` (cards), `0 16px 48px rgba(0,30,84,.08)`, hover tile `0 16px 40px rgba(0,88,213,.14)`, floating button `0 8px 24px #001e5440`, modal-like `0 30px 80px rgba(0,0,0,.35)`.
- **Grid**: `.grid-2` / `.grid-3` / `.grid-4`; at ≤ 1023 px they become 2 columns, at ≤ 767 px 1 column. Footer grid `1.5fr 1fr 1fr .8fr 1.3fr` (3 columns ≤ 1099 px, 2 columns ≤ 767 px), gap 32 px.
- **Page rhythm**: sections alternate **white → mist → white → midnight (dark)**; each page ends with the gradient CTA band, then the footer.

## 5. Header

- **White**, `position: sticky; top: 0; z-index: 100`, 1 px bottom border `#DCE4F0`, no shadow. Height **77 px** desktop/tablet and **65 px** phone as measured (`--header-h` is 76 px / 64 px, plus the 1 px border; also used for anchor offsets).
- **No change on scroll** (measured at 0 and 1,200 px: same height, background and shadow). Sticky only.
- Layout: logo left (image 140 × 73 px, links to `/`), nav links, one **primary pill button** on the right ("Get a Free Growth Audit": blue `#0058D5`, white text, 12 px 22 px padding, hover navy `#003187`).
- Nav links: Inter 15 px / 600, ink; padding 8 px 12 px, radius 10 px; **hover = mist background + blue text**; open dropdown rotates the chevron 180 degrees.
- **Mega menu** ("Services"): 3 columns (Be found / Get leads / Build brand), each item has an icon tile, title and one-line description. **Dropdown** ("Industries"): simple list. Hover/focus rows turn mist.
- **Collapses at ≤ 1099 px** to a burger button (`.menu-toggle`, `aria-controls="site-nav"`, label "Open menu").
- **Mobile menu** (see `screens/ssviral/home-mobile-menu-open.jpg`): the burger is an outlined 44 px rounded-square button that turns into an **X** when open. The menu is a full-width white panel, fixed, `z-index: 99`, starting under the header (~748 px tall at 375 px), `body { overflow: hidden }` while open. Rows are bold ink text (larger than the desktop nav) separated by 1 px `#DCE4F0` lines; **Services and Industries are collapsed accordions** with a chevron that opens their sub-links; the CTA is a full-width blue pill below the list.
- Skip link ("skip to content") exists and appears on focus.

## 6. Footer

- Background **midnight `#001E54`**, text mist `#EEF4FB`, padding 72 px 0 32 px (48 px top on phones, extra bottom space so the fixed call bar does not cover it). Height ~466 px.
- **Five columns**: brand block (logo on a white rounded tile, one-line description, primary pill button) | **Services** (7 links) | **Industries** (5) | **Company** (5) | **Contact** (phone, WhatsApp, email, city, each with a 16 px cyan icon, then 3 social icon tiles: Instagram, LinkedIn, YouTube, 44 px rounded squares in `#002A6E`).
- Column headings: Montserrat 13 px, uppercase, 0.3em letter-spacing, **cyan**. Links: Inter 15 px, mist, hover white + underline.
- **Bottom bar**: 1 px top border, "© 2026 …" left, "Privacy Policy" and "Terms" right.
- Next to the enquiry form a small "Your data" notice box (mist background, 14 px) states how details are used.

## 7. Components

| Component | Spec |
|---|---|
| **Breadcrumb bar** | Full-width midnight strip above inner-page heroes (`.crumb-bar`, padding 16 px 0 0), small breadcrumb links. |
| **Hero (home)** | Full viewport (`min-height: 100svh - header`), midnight with a **photographic poster image** and the left-to-right navy overlay; eyebrow (cyan), H1 64 px white, lead 18 px mist, then 3 buttons (primary, secondary white, ghost outline). Padding 96 px. |
| **Hero (inner pages)** | Midnight, padding 48 px top / 96 px bottom, eyebrow + H1 + lead, no image. |
| **Section heading** | Eyebrow (13 px, 0.3em, blue) + H2 large + optional lead (18 px). Block max-width 760 px. |
| **Card** | White, 1 px `#DCE4F0`, radius 16, padding 32 (24 on phones). On dark sections: `#002A6E` with `#003187` border and mist text. Card title H3 20 px / 700; text slate 16 px; optional "Explore →" link (blue, 600). |
| **Bento / tile card** | Card with a top row (icon tile left, dot-tag right), title, text, a small abstract UI illustration, and a link. One tile is dark. **Hover: lifts 4 px**, border turns `#0081FE`, blue shadow; the arrow nudges 3 px right. |
| **Icon tile** | 48 × 48 px, radius 10, mist background (white on mist sections, `#003187` on dark), 20–24 px stroke icon in blue (cyan on dark). |
| **Tag** | Pill, 12 px / 600 / uppercase, navy text on mist background. "Dot tag": 6 px cyan dot + uppercase label. Dashed-border variant (blue, `1px dashed`) for sample labels. |
| **Chip** (filters, checkboxes) | Pill, 1.5 px `#DCE4F0` border, min-height 44 px, 14 px / 600, ink text; hover border turns blue; selected has blue border. |
| **Buttons** | All pills, min-height 44 px, 15 px / 600, padding 12 × 22, 1.5 px border, 8 px icon gap. **Primary** blue / white text, hover navy. **Secondary** white / midnight text, hover mist. **Outline** white / blue text + blue border, hover mist. **Ghost on dark** transparent / white text + white border, hover navy. Transition `background-color, color, border-color .2 s`. Full width on phones inside button rows. Focus: 3 px blue outline, 3 px offset (cyan on dark backgrounds). |
| **Forms** | Labels slate 16 px; inputs/selects/textarea white, 1 px `#DCE4F0`, radius 10, padding 12 × 14, 16 px Inter; **focus**: border blue + `0 0 0 3px #EEF4FB` ring, no outline. Checkbox accent colour blue, 20 px. Submit is a primary pill. A mist "Your data" box sits above it. |
| **FAQ accordion** | Native `<details>/<summary>`; rows separated by 1 px `#DCE4F0`; summary padding 24 px 0, flex, 16 px gap; answer padding-bottom 24 px, max 760 px; the "+" toggle rotates 45° when open. No JS. |
| **Stat / metric** | `metric-label`: Inter 16 px / 600, ink, 12 px top margin, inside cards on the Results page (12 on the page). The Results page script bundle contains counter-related code, but the audited page shows labels rather than animated big numbers. |
| **Testimonials** | None found on the audited pages (SSVIRAL shows case-study cards on `/results/`, not quotes). |
| **CTA band** | Gradient `--ss-gradient`, padding 96 px (72 / 56 on phones); white H2 with a soft text shadow, white secondary button + outline button; on the home page a white enquiry-form card sits on the right. |
| **Blog card** | White card, 16:9 cover image, category in small caps, H2 18–20 px link, excerpt, "date · N min read". Hover: border turns blue; title turns blue. 3-column grid → 2 → 1. Category chips + pager above/below. |
| **Floating action** | Round 56 px blue button bottom-right (`wa-float`, hover navy, `0 8px 24px` shadow). The stylesheet also defines a phone-only fixed **bottom call bar** (white, 1 px top border, two flexible buttons) that stays hidden until it is given `.show` (slides up with a .25 s transition); on phones the round button sits at 84 px from the bottom. |
| **Logo/trust strip** | Marquee of client logos, 40 s linear infinite, white fade masks on both edges (8 % wide); plays only while its `.play` state is on. |

## 8. Animation and interaction

- **Scroll reveal** (`.rv`): elements start `opacity: 0; translateY(18px)` and transition to normal over **0.6 s** when they enter the viewport (IntersectionObserver adds/removes `.rv-wait`). Content is visible without JS.
- **Hover**: nav link wash `.2 s`; buttons `.2 s`; cards/tiles `transform .25 s, box-shadow .25 s, border-color .25 s` (lift 2–4 px); option chips lift 2 px; arrows slide 3 px.
- **Keyframes** (9): `slide` (marquee), `pIn`, `qIn` (small fade/slide-ins in the quiz and dashboard demo), `grow`, `rise`, `wide`, `draw`, `fade` (the animated dashboard chart: bars grow, line draws).
- **Reduced motion**: 2 `prefers-reduced-motion` blocks switch these off.
- `html { scroll-behavior: smooth; scroll-padding-top: header + 16px }`.
- Interactive widgets on the home page only: industry selector, services bento tabs, dashboard demo, "find your growth plan" quiz, four-steps timeline. Each is its own small script.

## 9. Breakpoints and mobile layout

| Breakpoint | What changes |
|---|---|
| ≤ 1099 px | Header collapses to the burger menu; footer 5 → 3 columns. |
| ≤ 1023 px | `.grid-3`/`.grid-4` → 2 columns. |
| ≥ 1024 px | The four-steps timeline becomes a 4-column row (it is an accordion below that). |
| ≤ 767 px | One column; H1 32 px, H2 28 px; section padding 56 px (40 px in `main`); cards padding 24 px; buttons full width in rows; footer 2 columns; fixed bottom call bar; round floating button moves to bottom 84 px. |

No horizontal scroll at 375 px on any audited page (checked). Mobile heights at 375 px: Home 32,142 px, About 8,700, Services 10,158, Google Ads 11,372, Results 7,210, Contact 4,425, Blog 4,999.

## 10. Icons and images

- **Icons**: inline SVG, stroke style (Lucide/Feather-like), 16–18 px in buttons and links, 20–24 px in icon tiles; 110 inline SVGs on the home page. An icon font class also exists (`fa-`/`icon-` detected) but inline SVG is the norm. Chevrons, arrows, phone, WhatsApp bubble, mail, map pin, Instagram/LinkedIn/YouTube.
- **Images**: WebP, explicit `width`/`height`, `loading="lazy"` on 5 of 7 images, `<picture>` for the hero, cover-fit 16:9 for blog and case cards, an SVG illustration for the dashboard, logo as a 140 px WebP. Radius 16 on large media tiles, none on full-bleed hero art.
- **Style**: flat, abstract "UI mockup" illustrations inside cards (search result lines, phone/site wireframe, bar chart) in the blue palette; one dark photo (globe/network) for the hero.

## 11. What this means for the rebuild (Phase B input)

1. Re-create the **tokens** (sections 2–4; desktop value / ≤ 767 px value: `--gutter` 32 / 16 px, `--section-pad` 96 / 56 px, `--header-h` 76 / 64 px) as CSS variables in one `theme.css`; no Tailwind, no CDN.
2. Re-create the **components** (section 7) as our own classes (`.btn`, `.card`, `.tag`, `.chip`, `.eyebrow`, `.section-head`, `.band`, `.faq`, form fields, header, footer, crumb bar, reveal).
3. Self-host Montserrat (600/700/800) and Inter (400/600) as `woff2` with `font-display: swap`, preload the two most used files. Montserrat and Inter are both open-source (SIL OFL), so they can be self-hosted; the font files have to be downloaded once (your OK needed at Phase B).
4. Header height 77 px / 65 px; the existing pages' `pt-` offsets must be replaced by `position: sticky` flow (no fixed header, so no content jump).
5. Two of Shashwat's current style elements have no SSVIRAL equivalent and need a decision (see the report): the **amber / green accents** and the **Playfair Display / Space Mono** fonts.

## 12. Decisions made by the site owner (2026-11-17)

- **Palette: SSVIRAL's blue palette exactly, everywhere, including every button and call to action.** The current amber (`#F59E0B`, "Let's Connect" and submit buttons), green (`#1E8449`, "Courses" pill, stat badges) and WhatsApp green (`#25D366`) are removed. Primary buttons are `#0058D5` (hover `#003187`), secondary white / outline, ghost on dark; the floating WhatsApp and call buttons use SSVIRAL's blue floating-button style.
- **Content is locked**: no text, heading, link, image, alt text, meta, canonical or JSON-LD changes. Layout and styling only.
- Still to confirm (Phase B start): the fonts (assumed: Montserrat + Inter exactly as SSVIRAL, replacing Playfair Display / Space Mono), and the one-time download of the font files for self-hosting.
