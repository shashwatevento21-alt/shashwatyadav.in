// Evaluated inside a rendered page (see audit-ssviral.mjs). Returns plain JSON: design tokens, typography, layout, header/footer,
// component styles, interaction rules, animations and tech fingerprints. Read-only: it never changes the page.
() => {
  const out = {};
  const num = (v) => parseFloat(v) || 0;
  const toHex = (c) => {
    if (!c) return null;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return c;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    const a = p.length > 3 ? p[3] : 1;
    if (a === 0) return null;
    const h = (n) => Math.round(n).toString(16).padStart(2, '0');
    return '#' + h(p[0]) + h(p[1]) + h(p[2]) + (a < 1 ? ' @' + a.toFixed(2) : '');
  };
  const hist = (map, key) => { if (key == null || key === '') return; map[key] = (map[key] || 0) + 1; };
  const top = (map, n = 25) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ value: k, count: v }));
  const cs = (el) => getComputedStyle(el);
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = cs(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };

  // ---- stylesheets: variables, font faces, keyframes, media queries, interaction rules
  const vars = {}, fontFaces = [], keyframes = [], media = {}, interactive = [], transitions = {}, animations = {}, maxWidths = {};
  let ruleCount = 0, sheetCount = 0, sheetBytes = 0;
  const walk = (list, cond) => {
    for (const r of list) {
      try {
        if (r instanceof CSSMediaRule) { media[r.conditionText] = (media[r.conditionText] || 0) + 1; walk(r.cssRules, r.conditionText); }
        else if (r instanceof CSSSupportsRule || (typeof CSSLayerBlockRule !== 'undefined' && r instanceof CSSLayerBlockRule) || (typeof CSSContainerRule !== 'undefined' && r instanceof CSSContainerRule)) walk(r.cssRules, cond);
        else if (r instanceof CSSFontFaceRule) fontFaces.push({ family: r.style.getPropertyValue('font-family').replace(/["']/g, ''), weight: r.style.getPropertyValue('font-weight'), style: r.style.getPropertyValue('font-style'), display: r.style.getPropertyValue('font-display'), range: (r.style.getPropertyValue('unicode-range') || '').slice(0, 40), src: (r.style.getPropertyValue('src').match(/[\w.-]+\.(woff2|woff|ttf|otf)/g) || []).join(',') });
        else if (r instanceof CSSKeyframesRule) keyframes.push({ name: r.name, css: r.cssText.replace(/\s+/g, ' ').slice(0, 260) });
        else if (r instanceof CSSStyleRule) {
          ruleCount++;
          const sel = r.selectorText || '';
          const st = r.style;
          if (/:root|^html$|^body$|^html,|^\*/.test(sel)) for (let i = 0; i < st.length; i++) { const p = st[i]; if (p.startsWith('--')) vars[p] = st.getPropertyValue(p).trim(); }
          if (/:hover|:focus|:active|:disabled|:checked|:focus-visible|:focus-within|\[open\]|\[aria-expanded|\.open|\.is-open|\.scrolled|\.active/.test(sel)) interactive.push({ sel: sel.slice(0, 120), css: st.cssText.replace(/\s+/g, ' ').slice(0, 220), media: cond || '' });
          const tr = st.getPropertyValue('transition'); if (tr) hist(transitions, tr);
          const an = st.getPropertyValue('animation'); if (an) hist(animations, an);
          const mw = st.getPropertyValue('max-width'); if (mw && /px|rem|ch/.test(mw)) hist(maxWidths, mw);
          if (r.cssRules && r.cssRules.length) walk(r.cssRules, cond);
        }
      } catch (e) { /* skip */ }
    }
  };
  for (const sh of document.styleSheets) { try { sheetCount++; walk(sh.cssRules, ''); } catch (e) { /* cross-origin */ } }
  document.querySelectorAll('style').forEach((s) => { sheetBytes += s.textContent.length; });
  out.stylesheets = { sheets: sheetCount, inlineStyleTags: document.querySelectorAll('style').length, inlineStyleBytes: sheetBytes, linkedStylesheets: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href), rules: ruleCount };
  out.cssVariables = vars;
  out.fontFaces = fontFaces;
  out.keyframes = keyframes;
  out.mediaQueries = top(media, 20);
  out.transitions = top(transitions, 15);
  out.animationsDeclared = top(animations, 15);
  out.declaredMaxWidths = top(maxWidths, 12);
  out.interactionRules = interactive.slice(0, 160);

  // ---- computed histograms over every visible element
  const colors = {}, bgs = {}, borders = {}, gradients = {}, shadows = {}, radii = {}, families = {}, sizes = {}, weights = {}, gaps = {}, pads = {}, textShadows = {};
  const els = [...document.body.querySelectorAll('*')].filter((e) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'PATH', 'LINE', 'CIRCLE', 'RECT', 'POLYLINE', 'POLYGON', 'G', 'DEFS', 'USE', 'SOURCE'].includes(e.tagName.toUpperCase()));
  for (const e of els) {
    if (!visible(e)) continue;
    const s = cs(e);
    if (e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) { hist(colors, toHex(s.color)); hist(families, s.fontFamily.split(',')[0].replace(/["']/g, '').trim()); hist(sizes, s.fontSize); hist(weights, s.fontWeight); }
    hist(bgs, toHex(s.backgroundColor));
    if (num(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none') hist(borders, num(s.borderTopWidth) + 'px ' + toHex(s.borderTopColor));
    if (s.backgroundImage && s.backgroundImage.includes('gradient')) hist(gradients, s.backgroundImage.slice(0, 200));
    if (s.boxShadow && s.boxShadow !== 'none') hist(shadows, s.boxShadow);
    if (s.borderTopLeftRadius && s.borderTopLeftRadius !== '0px') hist(radii, s.borderTopLeftRadius);
    if ((s.display === 'grid' || s.display === 'flex') && s.gap && s.gap !== 'normal') hist(gaps, s.gap);
    if (e.tagName === 'SECTION') hist(pads, s.paddingTop + ' / ' + s.paddingBottom);
  }
  out.histograms = { textColors: top(colors, 14), backgrounds: top(bgs, 16), borders: top(borders, 8), gradients: top(gradients, 10), shadows: top(shadows, 10), radii: top(radii, 10), fontFamilies: top(families, 6), fontSizes: top(sizes, 18), fontWeights: top(weights, 8), gaps: top(gaps, 12), sectionPadding: top(pads, 8) };

  // ---- typography of the main text roles
  const textStyle = (el) => { if (!el) return null; const s = cs(el); return { text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60), family: s.fontFamily.split(',')[0].replace(/["']/g, ''), size: s.fontSize, weight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, color: toHex(s.color), transform: s.textTransform, marginTop: s.marginTop, marginBottom: s.marginBottom }; };
  const firstVisible = (sel) => [...document.querySelectorAll(sel)].find(visible) || null;
  const typo = {};
  for (const [k, sel] of Object.entries({ body: 'body', h1: 'h1', h2: 'main h2', h3: 'main h3', h4: 'main h4', h5: 'h5', h6: 'h6', p: 'main p', lead: '[class*=lead]', eyebrow: '[class*=eyebrow]', navLink: 'header nav a', headerCta: 'header a[class*=btn], header .btn', button: 'main a[class*=btn], main button[class*=btn], .btn', footerHeading: 'footer h2, footer h3, footer h4, footer strong', footerLink: 'footer li a', small: 'small, [class*=meta]', label: 'label', input: 'input, textarea' })) typo[k] = textStyle(firstVisible(sel));
  out.typography = typo;

  // ---- layout: container, sections, vertical rhythm
  const containers = {};
  document.querySelectorAll('[class*=container], [class*=wrap]').forEach((e) => { if (!visible(e)) return; const s = cs(e); hist(containers, `${e.className.toString().split(' ')[0]} | max-width:${s.maxWidth} | width:${Math.round(e.getBoundingClientRect().width)}px | padding:${s.paddingLeft}`); });
  out.containers = top(containers, 8);
  out.viewport = { width: innerWidth, height: innerHeight, docHeight: document.documentElement.scrollHeight, bodyBg: toHex(cs(document.body).backgroundColor), htmlBg: toHex(cs(document.documentElement).backgroundColor) };
  out.sections = [...document.querySelectorAll('main > *, body > section, main section')].filter(visible).filter((e, i, a) => a.indexOf(e) === i).slice(0, 40).map((e, i) => {
    const s = cs(e); const h = e.querySelector('h1,h2,h3');
    return { i, tag: e.tagName.toLowerCase(), id: e.id || '', cls: e.className.toString().replace(/astro-\w+/g, '').trim().slice(0, 70), heading: h ? h.textContent.trim().replace(/\s+/g, ' ').slice(0, 70) : '', bg: toHex(s.backgroundColor) || (s.backgroundImage !== 'none' ? 'image/gradient' : null), padY: s.paddingTop + ' / ' + s.paddingBottom, height: Math.round(e.getBoundingClientRect().height) };
  });

  // ---- header
  const header = document.querySelector('header') || document.querySelector('[class*=header]');
  const hdr = (h) => { if (!h) return null; const s = cs(h); const r = h.getBoundingClientRect(); return { tag: h.tagName.toLowerCase(), cls: h.className.toString().replace(/astro-\w+/g, '').trim(), position: s.position, top: s.top, height: Math.round(r.height), rectTop: Math.round(r.top), bg: toHex(s.backgroundColor), backdrop: s.backdropFilter, shadow: s.boxShadow, borderBottom: s.borderBottom, zIndex: s.zIndex, transition: s.transition.slice(0, 120), padding: s.padding }; };
  const headerOut = { initial: hdr(header) };
  if (header) {
    headerOut.logo = (() => { const a = header.querySelector('a'); const img = header.querySelector('img, svg'); return { href: a && a.getAttribute('href'), kind: img ? img.tagName.toLowerCase() : 'text', alt: img && img.getAttribute && img.getAttribute('alt'), w: img ? Math.round(img.getBoundingClientRect().width) : null, h: img ? Math.round(img.getBoundingClientRect().height) : null }; })();
    headerOut.navLinks = [...header.querySelectorAll('nav a, a')].filter(visible).slice(0, 24).map((a) => ({ text: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), href: a.getAttribute('href'), cls: a.className.toString().replace(/astro-\w+/g, '').trim().slice(0, 40), size: cs(a).fontSize, weight: cs(a).fontWeight, color: toHex(cs(a).color), bg: toHex(cs(a).backgroundColor), radius: cs(a).borderTopLeftRadius, padding: cs(a).padding }));
    const dd = header.querySelectorAll('[aria-haspopup], details, [class*=dropdown], [class*=mega], [class*=submenu]'); headerOut.dropdowns = [...dd].slice(0, 6).map((e) => ({ tag: e.tagName.toLowerCase(), cls: e.className.toString().replace(/astro-\w+/g, '').slice(0, 50), text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 60) }));
    const burger = header.querySelector('button[aria-label*=enu i], button[class*=toggle], button[class*=burger], button[class*=menu], [class*=hamburger]'); headerOut.burger = burger ? { cls: burger.className.toString().replace(/astro-\w+/g, ''), display: cs(burger).display, visible: visible(burger), ariaControls: burger.getAttribute('aria-controls'), label: burger.getAttribute('aria-label') } : null;
    const before = hdr(header);
    window.scrollTo(0, 900);
    headerOut.afterScroll = null;
    headerOut._before = before;
  }
  out.header = headerOut;

  // ---- footer
  const footer = document.querySelector('footer');
  if (footer) {
    const s = cs(footer);
    out.footer = {
      cls: footer.className.toString().replace(/astro-\w+/g, '').trim(), bg: toHex(s.backgroundColor) || (s.backgroundImage !== 'none' ? s.backgroundImage.slice(0, 120) : null), color: toHex(s.color), padding: s.padding, height: Math.round(footer.getBoundingClientRect().height),
      columns: [...footer.querySelectorAll('h2, h3, h4, [class*=col] > strong, [class*=heading]')].filter(visible).map((h) => ({ heading: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), links: (h.parentElement.querySelectorAll('a').length) })),
      gridColumns: (() => { const g = [...footer.querySelectorAll('*')].find((e) => cs(e).display === 'grid'); return g ? { cls: g.className.toString().replace(/astro-\w+/g, '').slice(0, 40), template: cs(g).gridTemplateColumns, gap: cs(g).gap } : null; })(),
      svgIcons: footer.querySelectorAll('svg').length, socialHosts: [...footer.querySelectorAll('a[href^=http]')].map((a) => { try { return new URL(a.href).hostname; } catch { return ''; } }).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 12),
      bottomBar: (() => { const last = [...footer.querySelectorAll('div, p')].filter(visible).slice(-3).map((e) => e.textContent.trim().replace(/\s+/g, ' ').slice(0, 90)); return last; })(),
      linkStyle: textStyle(firstVisible('footer li a, footer a')),
    };
  }

  // ---- components: first instance of each, with the properties that define their look
  const box = (el) => { if (!el) return null; const s = cs(el); const r = el.getBoundingClientRect(); return { tag: el.tagName.toLowerCase(), cls: el.className.toString().replace(/astro-\w+/g, '').trim().slice(0, 60), w: Math.round(r.width), h: Math.round(r.height), display: s.display, padding: s.padding, margin: s.margin, bg: toHex(s.backgroundColor) || (s.backgroundImage !== 'none' ? s.backgroundImage.slice(0, 140) : null), color: toHex(s.color), border: `${s.borderTopWidth} ${s.borderTopStyle} ${toHex(s.borderTopColor)}`, radius: s.borderTopLeftRadius, shadow: s.boxShadow === 'none' ? null : s.boxShadow, family: s.fontFamily.split(',')[0].replace(/["']/g, ''), size: s.fontSize, weight: s.fontWeight, transition: s.transition === 'all 0s ease 0s' ? null : s.transition.slice(0, 120), gap: s.gap === 'normal' ? null : s.gap, textAlign: s.textAlign, maxWidth: s.maxWidth === 'none' ? null : s.maxWidth }; };
  const comps = {};
  const pick = { hero: 'section[class*=hero], [class*=hero]', eyebrow: '[class*=eyebrow]', sectionHeading: 'main section h2', card: '[class*=card]', cardMedia: '[class*=card] img', cardTitle: '[class*=card] h2, [class*=card] h3', btnPrimary: 'a[class*=btn-primary], a[class*=primary], .btn.primary, a.btn', btnSecondary: 'a[class*=secondary], a[class*=ghost], a[class*=outline], .btn-secondary', btnAny: 'button[class*=btn], a[class*=btn]', badge: '[class*=badge], [class*=chip], [class*=pill], [class*=tag]', stat: '[class*=stat], [class*=counter], [class*=metric]', testimonial: '[class*=testimonial], [class*=review], blockquote', faq: 'details, [class*=faq], [class*=accordion]', faqSummary: 'summary', cta: '[class*=cta]', form: 'form', input: 'input:not([type=hidden]):not([type=checkbox]), textarea', select: 'select', formLabel: 'label', crumbs: '[class*=crumb]', cats: '[class*=cats], [class*=filter]', pager: '[class*=pager], [class*=pagination]', icon: 'svg', logoStrip: '[class*=logo], [class*=client], [class*=trust]' };
  for (const [k, sel] of Object.entries(pick)) { const f = firstVisible(sel); comps[k] = f ? { count: document.querySelectorAll(sel).length, ...box(f) } : { count: 0 }; }
  out.components = comps;
  // distinct button looks
  const btnSigs = {};
  document.querySelectorAll('a, button').forEach((e) => { if (!visible(e)) return; const c = e.className.toString(); if (!/btn|button|cta/i.test(c)) return; const s = cs(e); const sig = `${toHex(s.backgroundColor) || (s.backgroundImage !== 'none' ? 'gradient' : 'transparent')} | text ${toHex(s.color)} | border ${s.borderTopWidth} ${toHex(s.borderTopColor)} | radius ${s.borderTopLeftRadius} | pad ${s.padding} | ${s.fontSize}/${s.fontWeight}`; btnSigs[sig] = btnSigs[sig] || { count: 0, example: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), cls: c.replace(/astro-\w+/g, '').trim().slice(0, 40) }; btnSigs[sig].count++; });
  out.buttonLooks = Object.entries(btnSigs).sort((a, b) => b[1].count - a[1].count).slice(0, 10).map(([sig, v]) => ({ look: sig, ...v }));

  // ---- class vocabulary (what the components are called) and animation hooks
  const tokens = {};
  document.querySelectorAll('[class]').forEach((e) => e.className.toString().split(/\s+/).forEach((t) => { if (t && !t.startsWith('astro-') && !/^[a-z]-?[0-9a-f]{6,}$/.test(t)) hist(tokens, t); }));
  out.classVocabulary = top(tokens, 80);
  const reveal = [...document.querySelectorAll('[class*=reveal], [class*=fade], [class*=animate], [class*=aos], [data-aos], [class*=in-view], [class*=slide]')];
  out.revealElements = { count: reveal.length, sample: [...new Set(reveal.slice(0, 40).map((e) => e.className.toString().replace(/astro-\w+/g, '').trim().slice(0, 50)))].slice(0, 8) };
  const scripts = [...document.querySelectorAll('script')];
  out.scripts = { external: scripts.filter((s) => s.src).map((s) => s.src.replace(location.origin, '')).slice(0, 12), inlineCount: scripts.filter((s) => !s.src).length, usesIntersectionObserver: scripts.some((s) => /IntersectionObserver/.test(s.textContent)), usesRequestAnimationFrame: scripts.some((s) => /requestAnimationFrame/.test(s.textContent)), counterHints: scripts.some((s) => /count-?up|counter|data-count/i.test(s.textContent)), inlineScriptBytes: scripts.filter((s) => !s.src).reduce((n, s) => n + s.textContent.length, 0) };

  // ---- images and icons
  const imgs = [...document.querySelectorAll('img')].filter(visible);
  out.images = { count: imgs.length, formats: top(Object.fromEntries(imgs.map((i) => [((i.currentSrc || i.src).split('?')[0].split('.').pop() || '').toLowerCase(), 0]).map(([k]) => [k, imgs.filter((i) => ((i.currentSrc || i.src).split('?')[0].split('.').pop() || '').toLowerCase() === k).length])), 6), lazy: imgs.filter((i) => i.loading === 'lazy').length, withSizes: imgs.filter((i) => i.width && i.height && i.getAttribute('width')).length, inPicture: document.querySelectorAll('picture').length, inlineSvg: document.querySelectorAll('svg').length, iconFont: !!document.querySelector('[class*=fa-], [class^=icon-], i[class*=icon]'), sample: imgs.slice(0, 6).map((i) => ({ src: (i.currentSrc || i.src).split('/').slice(-2).join('/').slice(0, 60), shown: Math.round(i.getBoundingClientRect().width) + 'x' + Math.round(i.getBoundingClientRect().height), fit: cs(i).objectFit, radius: cs(i).borderTopLeftRadius, aspect: cs(i).aspectRatio })) };

  // ---- tech fingerprint
  const all = document.querySelectorAll('*').length;
  const twHits = ['flex', 'grid', 'px-4', 'py-2', 'text-sm', 'rounded-lg', 'md:flex', 'bg-white', 'mx-auto', 'gap-4'].map((c) => document.getElementsByClassName(c.replace(':', ':')).length);
  out.tech = { generator: (document.querySelector('meta[name=generator]') || {}).content || null, astroScopedClasses: document.querySelectorAll('[class*="astro-"], [data-astro-cid-z4jru4n3]').length || [...document.querySelectorAll('*')].filter((e) => [...e.attributes].some((a) => a.name.startsWith('data-astro-cid'))).length, tailwindUtilityHits: twHits.reduce((a, b) => a + b, 0), wordpress: !!document.querySelector('link[href*=wp-content], script[src*=wp-includes]'), elements: all, jquery: !!window.jQuery, viewportMeta: (document.querySelector('meta[name=viewport]') || {}).content, themeColor: (document.querySelector('meta[name=theme-color]') || {}).content || null, lang: document.documentElement.lang, htmlClass: document.documentElement.className.slice(0, 80) };
  out.meta = { title: document.title, h1: (document.querySelector('h1') || {}).textContent && document.querySelector('h1').textContent.trim().replace(/\s+/g, ' ').slice(0, 120), url: location.href };
  window.scrollTo(0, 0);
  return out;
}
