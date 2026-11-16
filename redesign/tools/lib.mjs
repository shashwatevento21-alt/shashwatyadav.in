// Shared page-shell converter for the restyle. Takes an ORIGINAL page (redesign/originals/...) and returns the new page: the head keeps every
// SEO tag and page asset (only fonts / Tailwind / style.css are swapped for the shared theme), the old header and footer are replaced by the
// shared partials, the floating buttons move to the end, and the commented-out chatbot blocks stay verbatim. The page content in between is
// supplied by the caller (kept as is, or rebuilt from the original's parsed text).
import fs from 'node:fs';

export const root = new URL('../../', import.meta.url);
export const read = (p) => fs.readFileSync(new URL(p, root), 'utf8').replace(/\r\n/g, '\n');
export const tag = (s) => s.replace(/\s+/g, ' ').trim();
export const stripComment = (s) => s.replace(/^<!--[\s\S]*?-->\n/, '');
export const part = (n) => stripComment(read(`redesign/partials/${n}.html`));

const HEAD_DROP = [
  /[ \t]*<!-- Premium Fonts import from Google Fonts -->\n/, /[ \t]*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n/, /[ \t]*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\n/,
  /[ \t]*<link href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>\n/, /[ \t]*<!-- Tailwind CSS Play CDN -->\n/, /[ \t]*<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\n/,
  /[ \t]*<script src="\/assets\/js\/tailwind-config\.js[^"]*"><\/script>\n/, /[ \t]*<link rel="stylesheet" href="\/assets\/css\/style\.css[^"]*">\n/,
];

/** @param {string} orig original page html  @param {{active?:string, content:(parts)=>string, head?:(head)=>string, extraScripts?:string[]}} o */
export function convertShell(orig, o) {
  orig = orig.replace(/\r\n/g, '\n');
  // ---- head
  let head = orig.slice(0, orig.indexOf('</head>'));
  for (const re of HEAD_DROP) head = head.replace(re, '');
  for (const left of [/cdn\.tailwindcss\.com/, /tailwind-config/, /fonts\.googleapis\.com/, /fonts\.gstatic\.com/, /assets\/css\/style\.css/]) if (left.test(head)) throw new Error('head still references ' + left);
  if (o.head) head = o.head(head);
  const headAssets = part('head').replace(/<!--[\s\S]*?-->\n?/g, '').trim().split('\n').map((l) => '  ' + l.trim()).join('\n');
  // the theme goes before the page's own stylesheets, so those can build on it
  const block = '  <!-- Shared design layer: self-hosted fonts and the theme stylesheet -->\n' + headAssets + '\n';
  const firstCss = head.search(/[ \t]*<link rel="stylesheet"/);
  head = firstCss >= 0 ? head.slice(0, firstCss) + block + head.slice(firstCss) : head.replace(/\n+$/, '\n') + '\n' + block;

  // ---- verbatim pieces
  const gtm = orig.match(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/)[0];
  const chat = (kind) => orig.match(new RegExp('<!-- CHATBOT-OFF-START \\(' + kind + '\\)[\\s\\S]*?CHATBOT-OFF-END -->'))[0];

  // ---- content region: after the old header, before the old footer
  const navStart = orig.indexOf('<nav id="navbar"');
  const navEnd = orig.indexOf('</nav>', navStart) + '</nav>'.length;
  const footStart = orig.search(/<!-- FOOTER -->|<footer/);
  const footEnd = orig.indexOf('</footer>') + '</footer>'.length;
  if (navStart < 0 || footStart < 0 || footEnd < footStart) throw new Error('header/footer markers not found');
  const content = orig.slice(navEnd, footStart);
  const tail = orig.slice(footEnd, orig.indexOf('</body>'));
  // scripts after the footer: keep all except the (commented-out) chatbot block and the stray blank lines
  const tailScripts = (tail.replace(/<!-- CHATBOT-OFF-START \(script\)[\s\S]*?CHATBOT-OFF-END -->/, '').match(/<script\b[\s\S]*?<\/script>/g) || []);

  let header = part('header');
  if (o.active) {
    const re = new RegExp('<a class="nav-link" href="' + o.active.replace(/[/.]/g, '\\$&') + '">');
    if (!re.test(header)) throw new Error('active nav link not found: ' + o.active);
    header = header.replace(re, '<a class="nav-link" href="' + o.active + '" aria-current="page">');
  }
  let floating = part('floating').trim();
  floating = floating.replace(/<\/div>$/, '  ' + chat('bubble').replace(/\n/g, '\n  ') + '\n</div>');

  const body = o.content({ content, orig, tail });
  return `${head}</head>
<body>
${gtm}

${header.trim()}

${body.trim()}

${part('footer').trim()}

${floating}

${chat('panel')}

<script src="/assets/js/theme.js?v=1" defer></script>
${tailScripts.join('\n')}
${(o.extraScripts || []).join('\n')}
${chat('script')}
</body>
</html>
`;
}

/** All distinct inline svg fragments of a block, normalised to the shared .icon style (stroke icons keep their paths). */
export function svgList(block) {
  return [...block.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/g)].map((m) => {
    const open = m[0].match(/<svg\b[^>]*>/)[0];
    const filled = /fill="currentColor"/.test(open);
    const inner = m[0].replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>$/, '');
    return (filled ? '<svg class="icon icon-fill" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' : '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">') + inner + '</svg>';
  });
}

export function write(file, html) { fs.writeFileSync(new URL(file, root), html); }

/** Re-class markup with ordered [regex, newClass|null] rules (first match wins; null drops the class attribute). Returns {html, unknown}. */
export function mapClasses(html, rules) {
  const unknown = new Set();
  const out = html.replace(/\bclass="([^"]*)"/g, (m, c) => {
    const k = c.replace(/\s+/g, ' ').trim();
    for (const [re, to] of rules) if (re.test(k)) return to === null ? '' : `class="${typeof to === 'function' ? to(k) : to}"`;
    unknown.add(k);
    return m;
  }).replace(/<(\w+) +>/g, '<$1>').replace(/ +>/g, '>');
  return { html: out, unknown: [...unknown] };
}

/** The closing call-to-action banner that several pages share: an h2 and 1-3 buttons (tel, WhatsApp, a page link) -> the gradient .cta band. */
export function ctaBand(block) {
  const h2 = tag(block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)[1]);
  const links = [...block.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => {
    const href = m[1].match(/href="([^"]*)"/)[1];
    const svg = (m[2].match(/<svg\b[\s\S]*?<\/svg>/) || [''])[0];
    const label = tag(m[2].replace(/<svg\b[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ''));
    return { href, blank: /target="_blank"/.test(m[1]), svg: svg ? svgList(svg)[0] : '', label };
  });
  return `<section class="cta">
    <div class="container">
      <h2>${h2}</h2>
      <div class="btn-row">
${links.map((l, i) => `        <a class="btn ${i === 0 ? 'btn-secondary' : 'btn-ghost-dark'}" href="${l.href}"${l.blank ? ' target="_blank"' : ''}>${l.svg}${l.svg ? '' : ''}${l.label}</a>`).join('\n')}
      </div>
    </div>
  </section>`;
}

/** An inner-page hero from an eyebrow, h1 and optional lead. */
export function hero({ eyebrow, h1, lead, id }) {
  return `<section class="hero"${id ? ` id="${id}"` : ''}>
    <div class="container">
${eyebrow ? `      <p class="eyebrow">${eyebrow}</p>\n` : ''}      <h1>${h1}</h1>
${lead ? `      <p class="lead">${lead}</p>\n` : ''}    </div>
  </section>`;
}

/** Text of the first match of a regex group, whitespace-collapsed. */
export const grab = (s, re) => { const m = s.match(re); if (!m) throw new Error('not found: ' + re); return tag(m[1]); };
