# Phase D report (branch redesign/ssviral-theme)

- Content diff (titles, meta, canonicals, JSON-LD, headings, text, links, image src+alt, forms): 22 pages, 0 differences (redesign/diff-report.md). Exclusions: skip link, Courses dropdown labels, aria-labels.
- Tailwind: removed from all 22 pages. assets/css/style.css and assets/js/tailwind-config.js are kept ONLY because the live blog plugin still loads them (retire them in Phase E with the blog header/footer update).
- Widths 375 / 768 / 1280: no horizontal scroll on any page; mobile menu opens and closes (redesign/phase-d-report.json). Screenshots in redesign/screens/after/ (desktop, mobile, tablet) and side-by-side sheets in redesign/screens/side-by-side/.
- Internal links and images (50 unique): all 200 (blog/app checked on the live site).
- Tests: header 28/28, forms 40/40, Live Classes (mock app) 32/32.
- Performance (own harness, mobile 375, median of 3, no throttling; redesign/perf-report.json): Home FCP/LCP 1208 -> 580 ms, long-task time 784 -> 250 ms; Courses 1100 -> 412 ms, 607 -> 154 ms; case study 924 -> 1112 ms (long tasks 596 -> 0). Third-party hosts: Tailwind CDN and Google Fonts gone.
- Lighthouse itself was not run: it needs an npm download that was held for approval.
