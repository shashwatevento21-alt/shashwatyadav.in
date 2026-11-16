// Evaluated inside a rendered page by baseline.mjs. Returns the page's content as plain JSON: head/SEO tags and JSON-LD (from the
// raw HTML the server sent), the CHATBOT-OFF comment block, and the rendered body: text by region, headings, links, images, forms.
// The same function is used before and after the redesign, so the two outputs can be compared field by field.
async () => {
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16); };

  // ---- 1. what the server sent (before any script ran): head tags, JSON-LD, comments
  const raw = await (await fetch(location.href, { cache: 'no-store', credentials: 'omit' })).text();
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const head = {
    lang: doc.documentElement.getAttribute('lang'),
    title: doc.title,
    meta: [...doc.querySelectorAll('meta')].map((m) => ({ name: m.getAttribute('name'), property: m.getAttribute('property'), httpEquiv: m.getAttribute('http-equiv'), charset: m.getAttribute('charset'), content: m.getAttribute('content') })),
    links: [...doc.querySelectorAll('link')].map((l) => ({ rel: l.getAttribute('rel'), href: l.getAttribute('href'), type: l.getAttribute('type'), sizes: l.getAttribute('sizes'), as: l.getAttribute('as') })),
    jsonLd: [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch (e) { return { __unparsable: s.textContent.slice(0, 300) }; } }),
    scripts: [...doc.querySelectorAll('script')].filter((s) => s.getAttribute('type') !== 'application/ld+json').map((s) => s.getAttribute('src') ? { src: s.getAttribute('src') } : { inline: hash(s.textContent), bytes: s.textContent.length, gtm: /googletagmanager/.test(s.textContent) }),
    noscriptGtm: [...doc.querySelectorAll('noscript')].some((n) => /googletagmanager/.test(n.textContent + n.innerHTML)),
  };
  const comments = [];
  const cw = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
  while (cw.nextNode()) comments.push(cw.currentNode.nodeValue);
  const chatbotBlocks = comments.filter((c) => /CHATBOT-OFF/.test(c)).map((c) => c.replace(/\s+/g, ' ').trim());

  // ---- 2. the rendered page (after the site's own scripts ran)
  // regions: header (nav + skip link), footer, floating (WhatsApp/call buttons, fixed in the corner), content (everything else)
  const regionOf = (el) => (el.closest('#navbar, header.site-header, [data-region=header]') ? 'header' : el.closest('footer, [data-region=footer]') ? 'footer' : el.closest('.fab-group, div[style*="position: fixed"], [data-region=floating]') ? 'floating' : 'content');
  const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
  const text = { header: [], content: [], footer: [], floating: [] };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (tw.nextNode()) {
    const n = tw.currentNode; const p = n.parentElement; const t = norm(n.nodeValue);
    if (!t || !p || skip.has(p.tagName) || p.closest('noscript, template, script, style')) continue;
    text[regionOf(p)].push(t);
  }
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({ level: +h.tagName[1], text: norm(h.textContent), region: regionOf(h) }));
  const links = [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), text: norm(a.textContent) || a.getAttribute('aria-label') || (a.querySelector('img') ? 'img:' + (a.querySelector('img').getAttribute('alt') || '') : ''), target: a.getAttribute('target'), rel: a.getAttribute('rel'), region: regionOf(a) }));
  const images = [...document.querySelectorAll('img')].map((i) => ({ src: i.getAttribute('src'), srcset: i.getAttribute('srcset') ? 'yes' : null, alt: i.getAttribute('alt'), width: i.getAttribute('width'), height: i.getAttribute('height'), loading: i.getAttribute('loading'), region: regionOf(i) }));
  const pictureSources = [...document.querySelectorAll('picture source')].map((s) => ({ srcset: s.getAttribute('srcset'), type: s.getAttribute('type'), media: s.getAttribute('media') }));
  const media = [...document.querySelectorAll('video, iframe, audio, object, embed')].map((m) => ({ tag: m.tagName.toLowerCase(), src: m.getAttribute('src') || (m.querySelector('source') && m.querySelector('source').getAttribute('src')) || null, poster: m.getAttribute('poster'), title: m.getAttribute('title') }));
  const bgImages = [...document.querySelectorAll('[style*="url("]')].map((e) => (e.getAttribute('style').match(/url\(([^)]+)\)/) || [])[1]).filter(Boolean);
  const forms = [...document.querySelectorAll('form')].map((f) => ({
    id: f.id || null, action: f.getAttribute('action'), method: f.getAttribute('method'), novalidate: f.hasAttribute('novalidate'), region: regionOf(f),
    fields: [...f.querySelectorAll('input, select, textarea, button')].map((x) => ({ tag: x.tagName.toLowerCase(), type: x.getAttribute('type'), name: x.getAttribute('name'), id: x.id || null, required: x.hasAttribute('required'), placeholder: x.getAttribute('placeholder'), value: x.tagName === 'BUTTON' ? norm(x.textContent) : (x.getAttribute('type') === 'hidden' || x.type === 'submit' ? x.getAttribute('value') : null), label: ((x.id && document.querySelector('label[for="' + x.id + '"]')) || x.closest('label') || {}).textContent ? norm(((x.id && document.querySelector('label[for="' + x.id + '"]')) || x.closest('label')).textContent).slice(0, 80) : null, options: x.tagName === 'SELECT' ? [...x.options].map((o) => norm(o.textContent)) : null, autocomplete: x.getAttribute('autocomplete'), maxlength: x.getAttribute('maxlength'), pattern: x.getAttribute('pattern') })),
  }));
  const dataHooks = {};
  document.querySelectorAll('*').forEach((e) => [...e.attributes].forEach((a) => { if (/^data-(lc|course|session|class|enrol|master|form|contact)/.test(a.name)) { const k = a.name; dataHooks[k] = (dataHooks[k] || 0) + 1; } }));
  const joined = (arr) => arr.join(' ');
  return {
    url: location.pathname,
    head,
    chatbotBlocks,
    commentCount: comments.length,
    text: { header: joined(text.header), content: joined(text.content), footer: joined(text.footer), floating: joined(text.floating) },
    wordCount: { header: joined(text.header).split(' ').filter(Boolean).length, content: joined(text.content).split(' ').filter(Boolean).length, footer: joined(text.footer).split(' ').filter(Boolean).length, floating: joined(text.floating).split(' ').filter(Boolean).length },
    headings, links, images, pictureSources, media, bgImages, forms, dataHooks,
    ids: [...document.querySelectorAll('[id]')].map((e) => e.id).filter((v, i, a) => a.indexOf(v) === i),
    htmlBytes: raw.length,
  };
}
