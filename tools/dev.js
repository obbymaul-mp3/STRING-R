// Preview the two screens on a computer with the real engine: node tools/dev.js, then open http://localhost:8377/top.html and /bottom.html
// Needs the host built first:  g++ -std=c++17 -O2 -Iapp/src/main/cpp/engine enginetest/host.cpp -o /tmp/smhost
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ui = path.join(__dirname, '../app/src/main/assets/ui'), demo = path.join(__dirname, '../app/src/main/assets/demo.smx');
const host = spawn(process.env.SMHOST || '/tmp/smhost', ['serve', demo]); let buf = '', waiters = [];
host.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); const w = waiters.shift(); if (w) w(line.replace(/\x01/g, '\n')); } });
const ask = (line) => new Promise((res) => { waiters.push(res); host.stdin.write(line.replace(/\n/g, ' ') + '\n'); });
let last = Date.now(), focus = '', rec = false, selTrack = 0; const kits = {};
const fake = { '': { path: '', up: '', dirs: [{ n: 'THOR STORAGE', p: '/storage/emulated/0' }, { n: 'MY TAKES AND BOUNCES', p: '/takes' }], files: [] },
  '/storage/emulated/0': { path: '/storage/emulated/0', up: '', dirs: [{ n: 'Music', p: '/storage/emulated/0/Music' }, { n: 'Download', p: '/d' }], files: [] },
  '/storage/emulated/0/Music': { path: '/storage/emulated/0/Music', up: '/storage/emulated/0', dirs: [{ n: 'Trance Kicks', p: '/k' }], files: ['Acid Loop 138.wav', 'Hoover Stab C.wav', 'Vocal Chop Angel.wav', 'Breakbeat 170.wav', 'Garage Shuffle 132.wav'].map((n, i) => ({ n, p: '/x/' + n, k: 300 + i * 911 })) } };
async function call(fn, a) {
  if (fn === 'cmd') { if (a[0].startsWith('sel track ')) selTrack = parseInt(a[0].slice(10)) || 0; return ask('cmd ' + a[0]); }
  if (fn === 'kits') return JSON.stringify(Object.keys(kits).map(n => ({ n, pads: kits[n].split('\n').filter(l => l && l[0] !== 'x' && l.split(' ')[1] !== '10').length, smp: 0, t: 1 })));
  if (fn === 'saveKit') { kits[a[0]] = await ask('cmd kitdump ' + selTrack); await ask(`cmd trk name ${selTrack} "${a[0]}"`); return ''; }
  if (fn === 'removeKit') { delete kits[a[0]]; return ''; }
  if (fn === 'loadKit') { for (const l of (kits[a[0]] || '').split('\n')) { const f = l.split(' '); if (f[0] === 'x' || f.length < 7) continue; await ask(`cmd pad ${selTrack} ${f[0]} ${f[1] === '9' ? 10 : f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} -1`); } await ask(`cmd trk name ${selTrack} "${a[0]}"`); return ''; }
  if (fn === 'state') { const s = await ask('state'); const m = /^\{"v":(\d+)/.exec(s); return m && Number(m[1]) === a[0] ? '' : s; }
  if (fn === 'peaks') return ask(`peaks ${a[0]} ${a[1]}`);
  if (fn === 'poll') { const now = Date.now(), n = Math.min(48000, Math.round((now - last) * 48)); last = now; if (n > 0) await ask('run ' + n); const m = await ask('meters'); return JSON.stringify({ m, acts: [], notice: '', busy: '', rec, input: 'FM-1', usb: true, mic: true, midi: 'FM-1', proj: 'FIRST LIGHT' }); }
  if (fn === 'browse') return JSON.stringify(fake[a[0]] || { path: a[0], up: '', dirs: [], files: [] });
  if (fn === 'projects') return JSON.stringify([{ n: 'FIRST LIGHT', t: 1 }, { n: 'WAREHOUSE 4AM', t: 2 }, { n: 'GLASS ANGEL', t: 3 }]);
  if (fn === 'rec') { rec = !rec; return ''; }
  if (fn === 'info') return '48000 Hz · block 96 · preview';
  return '';
}
http.createServer((req, res) => {
  if (req.method === 'POST') { let b = ''; req.on('data', (d) => b += d); req.on('end', async () => { try { const [fn, ...a] = JSON.parse(b); res.end(String(await call(fn, a))); } catch (e) { res.statusCode = 500; res.end(''); } }); return; }
  const f = path.join(ui, path.normalize(req.url.split('?')[0]).replace(/^\/+/, '') || 'top.html');
  fs.readFile(f, (err, data) => { if (err) { res.statusCode = 404; return res.end('not found'); } const ext = path.extname(f); res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.jpg': 'image/jpeg' }[ext] || 'application/octet-stream'); res.end(data); });
}).listen(8377, () => console.log('http://localhost:8377/top.html  ·  http://localhost:8377/bottom.html'));
