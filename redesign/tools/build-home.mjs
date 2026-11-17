// Builds the restyled index.html from the ORIGINAL page (redesign/originals/index.html): every text, link and image is parsed out of the
// original markup (nothing is retyped), then laid out with the new components. Re-runnable.
import fs from 'node:fs';
const root = new URL('../../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8').replace(/\r\n/g, '\n');
const orig = read('redesign/originals/index.html');
const part = (n) => read(`redesign/partials/${n}.html`).replace(/^<!--[\s\S]*?-->\n/, '');
const tag = (s) => s.replace(/\s+/g, ' ').trim();

// ---------- head: keep everything, swap fonts / Tailwind / style.css for the shared theme
let head = orig.slice(0, orig.indexOf('</head>'));
const drop = [
  /[ \t]*<!-- Premium Fonts import from Google Fonts -->\n/, /[ \t]*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n/, /[ \t]*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\n/,
  /[ \t]*<link href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>\n/, /[ \t]*<!-- Tailwind CSS Play CDN -->\n/, /[ \t]*<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\n/,
  /[ \t]*<script src="\/assets\/js\/tailwind-config\.js[^"]*"><\/script>\n/, /[ \t]*<link rel="stylesheet" href="\/assets\/css\/style\.css[^"]*">\n/,
];
for (const re of drop) { if (!re.test(head)) throw new Error('head line not found: ' + re); head = head.replace(re, ''); }
const headAssets = part('head').replace(/<!--[\s\S]*?-->\n?/g, '').trim().split('\n').map((l) => '  ' + l.trim()).join('\n');
head = head.replace(/\n+$/, '\n') + '\n  <!-- Shared design layer: self-hosted fonts and the theme stylesheet -->\n' + headAssets + '\n';

// ---------- pieces of the original that survive verbatim
const gtmNoscript = orig.match(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/)[0];
const chat = (kind) => orig.match(new RegExp('<!-- CHATBOT-OFF-START \\(' + kind + '\\)[\\s\\S]*?CHATBOT-OFF-END -->'))[0];
const mainJs = orig.match(/<script src="\/assets\/js\/main\.js[^"]*"><\/script>/)[0];

// ---------- content: parsed from the original
const content = orig.slice(orig.indexOf('<!-- HERO'), orig.indexOf('<!-- FOOTER -->'));
const svgs = [...content.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/g)].map((m) => {
  const filled = /fill="currentColor"/.test(m[0].match(/<svg\b[^>]*>/)[0]);
  const inner = m[0].replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>$/, '');
  return (filled ? '<svg class="icon icon-fill" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' : '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">') + inner + '</svg>';
});
if (svgs.length !== 14) throw new Error('expected 14 svgs, found ' + svgs.length);

const heroTag = tag(content.match(/<span class="text-xs font-mono text-primary\/80">([\s\S]*?)<\/span>/)[1]);
const h1 = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1];
const h1a = h1.match(/^\s*([\s\S]*?)<br\/>/)[1].trim();
const h1b = h1.match(/<span class="text-gradient-hero">([\s\S]*?)<\/span>/)[1].trim();
const lead = tag(content.match(/<p class="text-base md:text-lg text-text-body[^>]*>([\s\S]*?)<\/p>/)[1]);
const heroLinks = [...content.matchAll(/<a href="(\/services|\/contact)" class="(?:group )?px-8 py-3[^>]*>\s*(?:<span>)?([\s\S]*?)(?:<\/span>)?\s*(?:<svg[\s\S]*?<\/svg>)?\s*<\/a>/g)].map((m) => ({ href: m[1], label: tag(m[2].replace(/<[^>]+>/g, '')) }));
if (heroLinks.length !== 2) throw new Error('hero links ' + heroLinks.length);

const stats = [...content.matchAll(/<div class="count-up [^"]*"([^>]*)>([\s\S]*?)<\/div>\s*<div class="text-\[10px\][^>]*>([\s\S]*?)<\/div>/g)].map((m) => ({ attrs: m[1].trim(), value: m[2].trim(), label: m[3].trim() }));
if (stats.length !== 4) throw new Error('stats ' + stats.length);

const sectionHead = (marker) => { const seg = content.slice(content.indexOf(marker)); return { eyebrow: tag(seg.match(/<span class="text-xs font-mono text-primary">([\s\S]*?)<\/span>/)[1]), h2: tag(seg.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)[1]) }; };
const servicesHead = sectionHead('<!-- SERVICES SNAPSHOT -->');
const casesHead = sectionHead('<!-- CASE STUDY TEASERS -->');
const industriesH2 = tag(content.slice(content.indexOf('<!-- FEATURED CLIENTS')).match(/<h2[^>]*>([\s\S]*?)<\/h2>/)[1]);

const servicesBlock = content.slice(content.indexOf('<!-- SERVICES SNAPSHOT -->'), content.indexOf('<!-- FEATURED CLIENTS'));
const services = [...servicesBlock.matchAll(/<a href="(\/skills[^"]*)" class="p-6[^>]*>([\s\S]*?)<\/a>/g)].map((m) => {
  const body = m[2];
  const list = body.match(/<ul[^>]*>([\s\S]*?)<\/ul>/);
  const para = body.match(/<p class="text-sm text-text-body">([\s\S]*?)<\/p>/);
  return { href: m[1], h3: tag(body.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)[1]), items: list ? [...list[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => tag(x[1])) : null, para: para ? tag(para[1]) : null };
});
if (services.length !== 7) throw new Error('services ' + services.length);
const moreLink = servicesBlock.match(/<a href="(\/skills)" class="inline-flex[^>]*>\s*<span>([\s\S]*?)<\/span>/);
const industries = [...content.matchAll(/<div class="px-5 py-2 rounded-full[^>]*>([\s\S]*?)<\/div>/g)].map((m) => tag(m[1]));
if (industries.length !== 9) throw new Error('industries ' + industries.length);
const casesBlock = content.slice(content.indexOf('<!-- CASE STUDY TEASERS -->'), content.indexOf('<!-- FINAL CTA BANNER -->'));
const cases = [...casesBlock.matchAll(/<a href="(\/portfolio\/[^"]+)" class="group[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], tag: tag(m[2].match(/<span class="inline-block[^>]*>([\s\S]*?)<\/span>/)[1]), h3: tag(m[2].match(/<h3[^>]*>([\s\S]*?)<\/h3>/)[1]), p: tag(m[2].match(/<p class="text-sm text-text-body mt-1">([\s\S]*?)<\/p>/)[1]) }));
if (cases.length !== 3) throw new Error('cases ' + cases.length);
const ctaBlock = content.slice(content.indexOf('<!-- FINAL CTA BANNER -->'));
const ctaH2 = tag(ctaBlock.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)[1]);
const ctaLinks = [...ctaBlock.matchAll(/<a href="([^"]+)"([^>]*)class="flex items-center gap-2 px-8 py-3[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/g)].map((m) => ({ href: m[1], blank: /target="_blank"/.test(m[2]), label: tag(m[3]) }));
if (ctaLinks.length !== 2) throw new Error('cta links ' + ctaLinks.length);

// ---------- new markup
const svcIcon = [1, 2, 3, 4, 5, 6, 7];
const caseIcon = [9, 10, 11];
const out = [];
out.push(`<section class="hero hero-home" id="hero">
    <div class="container">
      <p class="eyebrow">${heroTag}</p>
      <h1>${h1a}<br>
        <span class="hl">${h1b}</span></h1>
      <p class="lead">${lead}</p>
      <div class="btn-row">
        <a class="btn btn-primary" href="${heroLinks[0].href}">${heroLinks[0].label} ${svgs[0]}</a>
        <a class="btn btn-ghost-dark" href="${heroLinks[1].href}">${heroLinks[1].label}</a>
      </div>
    </div>
  </section>`);
out.push(`<section class="section bg-mist">
    <div class="container">
      <div class="grid-stats">
${stats.map((s) => `        <div class="metric rv">
          <div class="metric-value count-up" ${s.attrs}>${s.value}</div>
          <div class="metric-label">${s.label}</div>
        </div>`).join('\n')}
      </div>
    </div>
  </section>`);
out.push(`<section class="section">
    <div class="container">
      <div class="section-head rv">
        <p class="eyebrow">${servicesHead.eyebrow}</p>
        <h2 class="h2-lg">${servicesHead.h2}</h2>
      </div>
      <div class="grid grid-3">
${services.map((s, i) => `        <a class="tile${i === 6 ? ' dark' : ''} rv" href="${s.href}">
          <span class="icon-tile">${svgs[svcIcon[i]]}</span>
          <h3>${s.h3}</h3>
${s.items ? `          <ul class="ticks">\n${s.items.map((x) => `            <li>${x}</li>`).join('\n')}\n          </ul>` : `          <p>${s.para}</p>`}
        </a>`).join('\n')}
      </div>
      <a class="card-link more-link" href="${moreLink[1]}">${tag(moreLink[2])} ${svgs[8]}</a>
    </div>
  </section>`);
out.push(`<section class="section bg-mist">
    <div class="container">
      <div class="section-head rv"><h2 class="h2-lg">${industriesH2}</h2></div>
      <ul class="chips rv">
${industries.map((x) => `        <li class="chip static">${x}</li>`).join('\n')}
      </ul>
    </div>
  </section>`);
out.push(`<section class="section">
    <div class="container">
      <div class="section-head rv">
        <p class="eyebrow">${casesHead.eyebrow}</p>
        <h2 class="h2-lg">${casesHead.h2}</h2>
      </div>
      <div class="grid grid-3">
${cases.map((c, i) => `        <a class="post rv" href="${c.href}">
          <div class="media">${svgs[caseIcon[i]]}</div>
          <div class="body">
            <span class="tag">${c.tag}</span>
            <h3>${c.h3}</h3>
            <p class="excerpt">${c.p}</p>
          </div>
        </a>`).join('\n')}
      </div>
    </div>
  </section>`);
out.push(`<section class="cta">
    <div class="container">
      <h2>${ctaH2}</h2>
      <div class="btn-row">
        <a class="btn btn-secondary" href="${ctaLinks[0].href}">${svgs[12]}${ctaLinks[0].label}</a>
        <a class="btn btn-ghost-dark" href="${ctaLinks[1].href}"${ctaLinks[1].blank ? ' target="_blank"' : ''}>${svgs[13]}${ctaLinks[1].label}</a>
      </div>
    </div>
  </section>`);

const header = part('header').replace('<a class="nav-link" href="/">Home</a>', '<a class="nav-link" href="/" aria-current="page">Home</a>');
let floating = part('floating').trim(); // the commented-out chatbot bubble stays inside the floating group, where it was
floating = floating.replace(/<\/div>$/, '  ' + chat('bubble').replace(/\n/g, '\n  ') + '\n</div>');

const html = `${head}</head>
<body>
${gtmNoscript}

${header.trim()}

<main id="main">
  ${out.join('\n\n  ')}
</main>

${part('footer').trim()}

${floating}

${chat('panel')}

<script src="/assets/js/theme.js?v=1" defer></script>
${mainJs}
${chat('script')}
</body>
</html>
`;
fs.writeFileSync(new URL('index.html', root), html);
console.log('index.html written:', html.length, 'bytes; svgs', svgs.length, 'services', services.length, 'cases', cases.length);
