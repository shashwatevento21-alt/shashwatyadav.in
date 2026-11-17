(async (u) => {
  const html = await (await fetch(u + (u.includes('?') ? '&' : '?') + 'cb=' + Math.random(), { cache: 'no-store' })).text();
  const d = new DOMParser().parseFromString(html, 'text/html');
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const ld = [...d.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch (e) { return null; } });
  const meta = (sel) => [...d.querySelectorAll(sel)].map((m) => m.getAttribute('content'));
  const metas = {};
  for (const m of d.querySelectorAll('meta[property], meta[name]')) { const k = m.getAttribute('property') || m.getAttribute('name'); if (/^(og:|twitter:|article:|robots|description)/.test(k)) (metas[k] = metas[k] || []).push(m.getAttribute('content')); }
  // what comes right after <body>: the first element that is not whitespace or a comment
  const bodyStart = html.slice(html.search(/<body[^>]*>/i)).replace(/^<body[^>]*>/i, '').replace(/^(\s|<!--[\s\S]*?-->)+/, '').slice(0, 120);
  const crumbs = [...d.querySelectorAll('.sbl-crumbs li')].map((l) => ({ text: norm(l.textContent), href: l.querySelector('a') ? l.querySelector('a').getAttribute('href') : '' }));
  return {
    ld, title: norm(d.title), description: meta('meta[name=description]'), canonical: [...d.querySelectorAll('link[rel=canonical]')].map((l) => l.href), metas,
    h1: d.querySelectorAll('h1').length, h1text: [...d.querySelectorAll('h1')].map((h) => norm(h.textContent)), bodyStart, noscriptCount: (html.match(/ns\.html\?id=GTM-5SRRSFV6/g) || []).length, crumbs,
  };
})
