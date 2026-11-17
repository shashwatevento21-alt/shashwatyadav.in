// Structured data for the 22 static pages: ONE JSON-LD graph per page, injected before </head>, built only from what the page itself says.
// Entity ids match Rank Math's blog graph (https://shashwatyadav.com/#person, /#website) so Google sees one Person/Organization and one WebSite.
//   node redesign/tools/build-schema.mjs          (run after pages.mjs / build-home.mjs; idempotent)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOT = 'https://shashwatyadav.com';
const ID = { person: ROOT + '/#person', website: ROOT + '/#website', business: ROOT + '/#professionalservice', school: ROOT + '/#the-digital-school' };
const LANG = 'en-US';

// ---------- facts that already appear on the site (About page, footer, Contact)
const FACTS = {
  name: 'Shashwat Yadav',
  image: ROOT + '/assets/images/shashwat-yadav-performance-marketing-expert.webp',
  phone: '+91 70001 98366',
  email: 'shashwatyadav012345@gmail.com',
  sameAs: ['https://www.linkedin.com/in/shashwat-yadav-9258bb131', 'https://www.instagram.com/shashwat.ai.seo'],
  address: { '@type': 'PostalAddress', addressLocality: 'Raipur', addressRegion: 'Chhattisgarh', addressCountry: 'IN' },
};

// ---------- small HTML helpers
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…');
const text = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const read = (f) => fs.readFileSync(path.join(repo, f), 'utf8').replace(/\r\n/g, '\n');
const first = (html, re) => { const m = html.match(re); return m ? decode(m[1]).replace(/\s+/g, ' ').trim() : ''; };

// ---------- the 22 pages (file -> canonical path); breadcrumb trails are [label, path]
const xml = read('sitemap-pages.xml');
const paths = [...xml.matchAll(/<loc>https:\/\/shashwatyadav\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
const fileFor = (p) => (p === '/' ? 'index.html' : p.endsWith('/') ? p.slice(1) + 'index.html' : p.slice(1) + '.html');
const NAV = { '/about': 'About', '/services': 'Services', '/skills': 'Skills', '/portfolio/': 'Portfolio', '/certifications': 'Certifications', '/contact': 'Contact', '/privacy-policy': 'Privacy Policy', '/terms': 'Terms of Use', '/courses/': 'Courses' };

function pageInfo(p) {
  const html = read(fileFor(p));
  return {
    p, html, url: ROOT + p,
    title: first(html, /<title>([\s\S]*?)<\/title>/),
    description: first(html, /<meta name="description" content="([^"]*)"/),
    canonical: first(html, /<link rel="canonical" href="([^"]*)"/),
    h1: first(html, /<h1[^>]*>([\s\S]*?)<\/h1>/),
  };
}

const crumbsFor = (pi) => {
  const p = pi.p;
  if (p === '/') return null;
  if (NAV[p]) return [['Home', '/'], [NAV[p], p]].concat(p === '/courses/' ? [] : []);
  if (p.startsWith('/courses/')) return [['Home', '/'], ['Courses', '/courses/'], [pi.h1, p]];
  if (p.startsWith('/portfolio/')) return [['Home', '/'], ['Portfolio', '/portfolio/'], [pi.h1, p]];
  if (p === '/meta-ads-lead-generation-master-class/') return [['Home', '/'], ['Courses', '/courses/'], ['Master Classes', '/courses/master-classes/'], [pi.h1, p]];
  return [['Home', '/'], [pi.h1, p]];
};

// ---------- shared nodes
const personNode = () => ({
  '@type': ['Person', 'Organization'], '@id': ID.person, name: FACTS.name, url: ROOT + '/', image: FACTS.image,
  jobTitle: 'Ad Performance Marketing Head', worksFor: { '@type': 'Organization', name: 'The Digital Agency' },
  address: FACTS.address, telephone: FACTS.phone, email: FACTS.email, sameAs: FACTS.sameAs,
  alumniOf: { '@type': 'EducationalOrganization', name: 'Shankar Charya Technical Campus' },
  knowsAbout: ['Performance marketing', 'Meta Ads', 'Google Ads', 'LinkedIn Ads', 'Lead generation', 'Google Tag Manager', 'GA4', 'Meta Pixel', 'Conversion tracking', 'Technical SEO', 'Local SEO', 'Google Business Profile', 'GEO and AI search optimisation', 'WordPress', 'Elementor', 'Claude Code', 'n8n', 'AI agents'],
});
const websiteNode = () => ({ '@type': 'WebSite', '@id': ID.website, url: ROOT, name: FACTS.name, publisher: { '@id': ID.person }, inLanguage: LANG });
const pageType = (p) => (p === '/about' ? ['WebPage', 'AboutPage'] : p === '/contact' ? ['WebPage', 'ContactPage'] : p === '/portfolio/' || p === '/courses/' ? ['WebPage', 'CollectionPage'] : 'WebPage');

function build(pi) {
  const { p, url } = pi;
  const g = [personNode(), websiteNode()];
  const webpage = { '@type': pageType(p), '@id': url + '#webpage', url, name: pi.title, description: pi.description, isPartOf: { '@id': ID.website }, inLanguage: LANG };
  const crumbs = crumbsFor(pi);
  if (crumbs) {
    g.push({ '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: crumbs.map(([name, cp], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ROOT + cp })) });
    webpage.breadcrumb = { '@id': url + '#breadcrumb' };
  }
  g.push(webpage);
  const html = pi.html;

  if (p === '/') {
    webpage.about = { '@id': ID.business };
    g.push({
      '@type': ['ProfessionalService', 'LocalBusiness'], '@id': ID.business, name: FACTS.name, url: ROOT + '/', description: pi.description, image: FACTS.image,
      telephone: FACTS.phone, email: FACTS.email, address: FACTS.address, sameAs: FACTS.sameAs, founder: undefined,
      knowsAbout: ['Performance marketing', 'Google Ads', 'Meta Ads', 'SEO', 'GEO and AI search optimisation', 'WordPress'],
    });
  }
  if (p === '/about') {
    webpage.about = { '@id': ID.person }; webpage.mainEntity = { '@id': ID.person };
    // the FAQ already on the page (its JSON-LD is kept as written; every question is visible on the page)
    const old = [...read('redesign/originals/about.html').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((x) => x['@type'] === 'FAQPage');
    if (old) g.push({ '@type': 'FAQPage', '@id': url + '#faq', isPartOf: { '@id': url + '#webpage' }, inLanguage: LANG, mainEntity: old.mainEntity });
  }
  if (p === '/skills') webpage.about = { '@id': ID.person };
  if (p === '/contact') {
    webpage.about = { '@id': ID.person };
    g[0].contactPoint = { '@type': 'ContactPoint', telephone: FACTS.phone, email: FACTS.email, contactType: 'customer service' };
  }
  if (p === '/services') {
    const svcs = [...html.matchAll(/<div class="card svc-row[^"]*">[\s\S]*?<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => ({ name: text(m[1]), description: text(m[2]) }));
    svcs.forEach((s, i) => g.push({ '@type': 'Service', '@id': url + '#service-' + (i + 1), name: s.name, serviceType: s.name, description: s.description, url, provider: { '@id': ID.person }, areaServed: undefined }));
    webpage.mainEntity = { '@type': 'ItemList', itemListElement: svcs.map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@id': url + '#service-' + (i + 1) } })) };
  }
  if (p === '/courses/') {
    const cards = [...html.matchAll(/<article data-course="([^"]+)"[^>]*>\s*<a href="([^"]+)" class="course-link">[\s\S]*?<h3>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => ({ slug: m[1], href: m[2], name: text(m[3]), description: text(m[4]) }));
    webpage.mainEntity = { '@type': 'ItemList', itemListElement: cards.map((c, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Course', '@id': ROOT + (c.href.endsWith('/') ? c.href : c.href + '/') + '#course', url: ROOT + (c.href.endsWith('/') ? c.href : c.href + '/') } })) };
  }
  if (/^\/courses\/[^/]+\/$/.test(p) || p === '/meta-ads-lead-generation-master-class/') {
    const body = text(html.replace(/<head>[\s\S]*?<\/head>/, ''));
    const hours = (body.match(/(\d+) hours in total/) || [])[1] || (/3-hour/.test(body) && p.startsWith('/meta') ? '3' : '') || (/3 hours each/.test(body) ? '3' : '');
    const course = { '@type': 'Course', '@id': url + '#course', name: pi.h1, description: pi.description, url, provider: { '@id': ID.school }, inLanguage: undefined, hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', instructor: { '@id': ID.person }, courseWorkload: hours ? 'PT' + hours + 'H' : undefined } };
    g.push(course, schoolNode());
    webpage.mainEntity = { '@id': url + '#course' };
  }
  if (p === '/portfolio/') {
    const cards = [...html.matchAll(/<a href="(\/portfolio\/[^"]+)" class="portfolio-card[^"]*"[\s\S]*?<h3>([\s\S]*?)<\/h3>/g)].map((m) => ({ href: m[1], name: text(m[2]) }));
    webpage.mainEntity = { '@type': 'ItemList', itemListElement: cards.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: ROOT + c.href + '/', name: c.name })) };
  }
  if (/^\/portfolio\/.+\/$/.test(p)) {
    const industry = first(html, /<span class="eyebrow">([\s\S]*?)<\/span>/);
    const meta = first(html, /<p class="hero-meta">([\s\S]*?)<\/p>/);
    const range = meta.match(/([A-Z][a-z]+) (\d{4}) [–-] ([A-Z][a-z]+) (\d{4})/);
    const MO = { January: '01', February: '02', March: '03', April: '04', May: '05', June: '06', July: '07', August: '08', September: '09', October: '10', November: '11', December: '12' };
    const work = { '@type': ['CreativeWork', 'Article'], '@id': url + '#casestudy', headline: pi.h1, name: pi.h1, description: pi.description, url, author: { '@id': ID.person }, publisher: { '@id': ID.person }, inLanguage: LANG, about: industry || undefined, temporalCoverage: range && MO[range[1]] && MO[range[3]] ? `${range[2]}-${MO[range[1]]}/${range[4]}-${MO[range[3]]}` : undefined, isPartOf: { '@id': url + '#webpage' } };
    g.push(work); webpage.mainEntity = { '@id': url + '#casestudy' };
  }
  return { '@context': 'https://schema.org', '@graph': JSON.parse(JSON.stringify(g)) }; // JSON round trip drops the undefined fields
}
function schoolNode() { return { '@type': 'Organization', '@id': ID.school, name: 'The Digital School' }; }

// graph pieces repeated on a page (e.g. the school node on a course page) are kept once
const dedupe = (graph) => { const seen = new Set(); return graph['@graph'].filter((n) => !n['@id'] || (!seen.has(n['@id']) && seen.add(n['@id']))); };

const out = {};
for (const p of paths) {
  const pi = pageInfo(p);
  const graph = build(pi); graph['@graph'] = dedupe(graph);
  let html = pi.html;
  html = html.replace(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/g, ''); // the old blocks (About) are folded into the graph
  html = html.replace('</head>', `  <script type="application/ld+json" id="site-schema">${JSON.stringify(graph)}</script>\n</head>`);
  fs.writeFileSync(path.join(repo, fileFor(p)), html);
  out[p] = graph;
}
fs.writeFileSync(path.join(repo, 'redesign', 'schema-graphs.json'), JSON.stringify(out, null, 1));
console.log('schema written for', paths.length, 'pages;', Object.values(out).reduce((n, g) => n + g['@graph'].length, 0), 'nodes');
