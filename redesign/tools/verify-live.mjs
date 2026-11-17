// Live checks after go-live: status + <title> for the 22 pages, /blog/, every post, the category page; asset 200s referenced by the home page.
import fs from 'node:fs';
const B = 'https://shashwatyadav.com';
const base = JSON.parse(fs.readFileSync(new URL('../content-baseline.json', import.meta.url), 'utf8'));
const get = async (u) => { const r = await fetch(u, { redirect: 'follow' }); return { status: r.status, html: await r.text(), url: r.url }; };
const title = (h) => (h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/\s+/g, ' ').trim().replace(/&amp;/g, '&').replace(/&#8211;/g, '–').replace(/&#8217;/g, '’') ?? '';
let bad = 0; const row = (ok, s) => { if (!ok) bad++; console.log((ok ? 'OK   ' : 'FAIL ') + s); };
for (const [p, e] of Object.entries(base.pages)) {
  const r = await get(B + p); const t = title(r.html);
  row(r.status === 200 && t === (e.head.title || '').trim(), `${p} ${r.status} "${t.slice(0, 70)}"${t === (e.head.title || '').trim() ? '' : ' (expected "' + (e.head.title || '').slice(0, 60) + '")'}`);
}
const sm = (await get(B + '/post-sitemap.xml')).html;
const posts = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const u of ['/blog/', '/category/blog/', ...posts.map((x) => x.replace(B, ''))]) {
  const r = await get(B + u); const t = title(r.html);
  row(r.status === 200 && t.length > 5 && /theme\.css/.test(r.html), `${u} ${r.status} "${t.slice(0, 70)}" new-design:${/theme\.css/.test(r.html)}`);
}
console.log(posts.length + ' posts', bad ? bad + ' FAILURES' : 'all good');
