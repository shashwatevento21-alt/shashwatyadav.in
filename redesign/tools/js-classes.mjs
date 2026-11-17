// Lists the class strings a script builds at run time (HTML templates, className, classList calls). Used to restyle live-classes.js.
//   node redesign/tools/js-classes.mjs assets/js/live-classes.js
import fs from 'node:fs';
const s = fs.readFileSync(process.argv[2], 'utf8');
const count = (map, k) => map.set(k, (map.get(k) || 0) + 1);
const attr = new Map(), cl = new Map(), cn = new Map();
for (const r of s.matchAll(/class=\\?["']([^"'\\]+)\\?["']/g)) count(attr, r[1]);
for (const r of s.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)) count(cl, r[1]);
for (const r of s.matchAll(/className\s*[+]?=\s*([^;\n]*)/g)) count(cn, r[1].slice(0, 160));
console.log('class= strings:', attr.size);
for (const [k, v] of [...attr].sort((a, b) => b[1] - a[1])) console.log('  ' + v + 'x', k.slice(0, 220));
console.log('\nclassList calls:');
for (const [k, v] of cl) console.log('  ' + v + 'x', k);
console.log('\nclassName assignments:');
for (const [k, v] of cn) console.log('  ' + v + 'x', k);
