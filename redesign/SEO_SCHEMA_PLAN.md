# Structured data plan and results (branch `seo/structured-data`, not deployed)

## How it works
`redesign/tools/build-schema.mjs` builds one JSON-LD graph per page from the page's own HTML and injects it before `</head>` (id `site-schema`).
It is idempotent and runs after the page builders. `redesign/tools/validate-schema.mjs` checks it. `redesign/schema-graphs.json` holds the graphs.

## One entity graph (same ids as Rank Math on the blog)
- `https://shashwatyadav.com/#person`, types `["Person","Organization"]`, name Shashwat Yadav: the same node Rank Math prints on blog pages.
- `https://shashwatyadav.com/#website`: same as Rank Math.
- Static pages add facts that are already on the site to the Person node: job title, employer, Raipur/Chhattisgarh/IN address, phone, email, LinkedIn and Instagram, alma mater, skills (all from About/footer).
- Not done yet: the blog's Person node (printed by Rank Math) has only the name. To make it identical, fill in Rank Math > Titles & Meta > Local SEO (name, URL, phone, address, social profiles). This is a settings change, not code.

## Per page
| Page | Nodes added |
|---|---|
| All 22 | Person, WebSite, WebPage (url = canonical, name = title, description = meta description), BreadcrumbList (not on Home) |
| Home | ProfessionalService + LocalBusiness: name, url, image, phone, email, address (Raipur, Chhattisgarh, IN; no street, no hours, no price range), sameAs |
| About | AboutPage; the existing 16-question FAQPage (all 16 questions and answers are visible on the page) folded into the graph; the old 3 separate blocks removed |
| Services | 5 Service nodes (name and description from the page, provider = Person) |
| Courses hub | CollectionPage with an ItemList of the 4 courses (ids only) |
| Course pages (3) + Master Classes + master class landing | Course (name, description, provider The Digital School, CourseInstance online with instructor and workload from "N hours in total" / "3 hours") |
| Portfolio index | CollectionPage + ItemList of the 7 case studies |
| 7 case studies | CreativeWork + Article: headline, description, author, publisher, industry (`about`), `temporalCoverage` only when the page gives a month range |
| Contact | ContactPage + ContactPoint (phone, email) |
| Others | Skills, Certifications, Privacy, Terms: WebPage + breadcrumb |

Deliberately NOT added: Event (no real dates are on any static page; sessions come from the Live Classes app), ratings, reviews, prices, offers, opening hours, geo coordinates, publish/modified dates.

## Things you should decide
1. **Case-study dates.** The pages show a campaign period ("March 2026 - August 2026") but no publish date. I used `temporalCoverage` and no `datePublished`. If you want a publish date, give me the dates to use.
2. **About page Person `url`.** It used to be `/about`; now every page uses the site root so there is one entity. The About page is the `mainEntity` of its AboutPage.
3. **Home says "6+ Years Experience"** while About says 4+ years. The schema avoids both. You may want to fix the visible Home text (content change, not done).
4. **Home LocalBusiness has no street address**, so Google may flag a "recommended field" warning. Only the city and region are published on the site.
5. **Titles/descriptions:** `redesign/SEO_TITLES_PROPOSED.md` (nothing applied).

## Checks run
- JSON parse, required fields per type, every `@id` reference resolves, no duplicate ids, WebPage url = canonical, every Service/Course/CreativeWork/FAQ text is literally on its page, no ratings/reviews/prices/dates: 22 pages, 111 nodes, 0 errors, 0 warnings.
- Content diff against the live site with JSON-LD excluded: 22 pages, 0 differences (visible text, headings, links, images, forms unchanged).

## Rich Results Test (after deploy; the tool fetches live URLs)
https://search.google.com/test/rich-results?url=
- https://shashwatyadav.com/about (FAQ)
- https://shashwatyadav.com/ (local business)
- https://shashwatyadav.com/courses/ (course list)
- https://shashwatyadav.com/courses/google-ads/ (Course)
- https://shashwatyadav.com/courses/meta-ads/
- https://shashwatyadav.com/courses/claude-mastery/
- https://shashwatyadav.com/courses/master-classes/
- https://shashwatyadav.com/meta-ads-lead-generation-master-class/
- https://shashwatyadav.com/services (Service)
- https://shashwatyadav.com/portfolio/hospital-multi-treatment-2026/ (Article)
- https://shashwatyadav.com/contact (ContactPage)
- https://shashwatyadav.com/best-search-engine-marketing-agency-in-raipur/ (blog, BlogPosting + breadcrumb)
Also https://validator.schema.org/ for the full graph. Before deploy, paste any page's JSON from `redesign/schema-graphs.json` into the "Code" tab.
