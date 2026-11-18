# Opens every screen against the real engine (node tools/dev.js must be running) and reports any text that is clipped, off-screen or overlapping. "worst" adds long names and 16 tracks. TH and BH set the two screen heights.
import sys, asyncio, json, os
TH=int(os.environ.get('TH',1080)); BH=int(os.environ.get('BH',1080))
from playwright.async_api import async_playwright
JS = r"""() => {
  const out = [], vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; for (let p = e; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden') return false; } return true; };
  const leaves = [];
  const walk = (n) => { for (const c of n.childNodes) { if (c.nodeType === 3 && c.textContent.trim()) { const e = c.parentElement; if (!vis(e)) continue; const rg = document.createRange(); rg.selectNodeContents(c); const r = rg.getBoundingClientRect(); if (r.width > 1) leaves.push({ t: c.textContent.trim().slice(0, 40), r, e }); } else if (c.nodeType === 1 && c.tagName !== 'SCRIPT' && c.tagName !== 'STYLE' && c.getAttribute('aria-hidden') !== 'true') walk(c); } };
  walk(document.querySelector('.pop') || document.body);
  const W = innerWidth, H = innerHeight;
  for (const l of leaves) {
    const r = l.r; if (l.e.closest('#toast,#busy')) continue;
    if (r.right > W + 1 || r.left < -1 || r.bottom > H + 1 || r.top < -1) out.push('OFFSCREEN ' + l.t);
    // clipped by a box (button / lcd / anything with overflow hidden or a clip-path), unless inside a scroller
    for (let p = l.e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/auto|scroll/.test(s.overflowX + s.overflowY)) break; const clip = s.overflow !== 'visible' || s.clipPath !== 'none' || p.tagName === 'BUTTON' || p.classList.contains('lcd'); if (!clip) continue; const b = p.getBoundingClientRect(); if (r.left < b.left - 1.5 || r.right > b.right + 1.5 || r.top < b.top - 3 || r.bottom > b.bottom + 3) { out.push(`CLIPPED "${l.t}" by ${Math.round(Math.max(b.left - r.left, r.right - b.right, b.top - r.top, r.bottom - b.bottom))}px in <${p.tagName.toLowerCase()} ${p.className}>`); break; } }
  }
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) { const a = leaves[i], b = leaves[j]; if (a.e === b.e || a.e.contains(b.e) || b.e.contains(a.e)) continue; if (a.e.closest('#toast,#busy,svg') || b.e.closest('#toast,#busy,svg')) continue; const sa = a.e.closest('.scroll,.scrollx'), sb = b.e.closest('.scroll,.scrollx'); if (sa || sb) { const c = (sa || sb).getBoundingClientRect(); const inside = (r) => r.left >= c.left - 1 && r.right <= c.right + 1 && r.top >= c.top - 1 && r.bottom <= c.bottom + 1; if (!inside(a.r) || !inside(b.r)) continue; }
    const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top); if (ox > 2 && oy > 3) out.push(`OVERLAP "${a.t}" × "${b.t}" (${Math.round(ox)}×${Math.round(oy)}px)`); }
  // text drawn on the plates (svg) against html boxes
  for (const t of document.querySelectorAll('#plates text')) { const r = t.getBoundingClientRect(); for (const e of document.querySelectorAll('#app .lcd, #app .btn')) { if (!vis(e)) continue; const b = e.getBoundingClientRect(); const ox = Math.min(r.right, b.right) - Math.max(r.left, b.left), oy = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top); if (ox > 2 && oy > 2) { out.push(`PLATE TEXT "${t.textContent.slice(0, 30)}" under a control`); break; } } }
  // smallest text
  let min = 99, who = ''; for (const l of leaves) { const f = parseFloat(getComputedStyle(l.e).fontSize) / parseFloat(getComputedStyle(document.documentElement).fontSize) * 20; if (f < min) { min = f; who = l.t; } }
  out.push(`(smallest text ${min.toFixed(1)}px of design: "${who}")`);
  return [...new Set(out)];
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox']); errs = []; total = 0
        top = await b.new_page(viewport={'width':1920,'height':TH}); bot = await b.new_page(viewport={'width':1240,'height':BH})
        for pg,n in ((top,'top'),(bot,'bottom')):
            pg.on('pageerror', lambda e,n=n: errs.append(n+': '+str(e))); pg.on('console', lambda m,n=n: errs.append(n+' console: '+m.text) if m.type=='error' else None)
            await pg.goto(f'http://localhost:8377/{n}.html'); await pg.wait_for_timeout(900)
        async def cmd(pg,c): await pg.evaluate("c=>{C(c);sync()}",c)
        async def shot(pg,name):
            nonlocal total
            await pg.wait_for_timeout(450); await pg.screenshot(path=f'/tmp/s_{name}.png'); r = await pg.evaluate(JS); bad=[x for x in r if not x.startswith('(')]; total+=len(bad)
            print(f'--- {name}: {len(bad)} problems  {[x for x in r if x.startswith("(")][0]}'); [print('   ',x) for x in bad[:14]]
        await cmd(top,'sel home 1'); await shot(top,'top_home'); await shot(bot,'bot_home'); await cmd(top,'sel home 0')
        # a 16-track worst case is checked too
        for tr in range(5):
            await cmd(top,f'sel track {tr}'); await cmd(top,f'ed {tr} 0')
            for i,v in enumerate(['song','notes','sample','files']):
                if tr>2 and i!=1: continue
                await cmd(top,f'sel view {i}'); await shot(top,f'top_{v}{tr}')
            for i,v in enumerate(['sound','fx','mix','input','master','play']):
                if tr>1 and i not in (0,5): continue
                await cmd(bot,f'sel tab {i}'); await shot(bot,f'bot_{v}{tr}')
        if 'worst' in sys.argv:
            for c in ['title "MY VERY LONG SONG NAME 24"','trk name 0 "WWWWWWWWWWWWWWWWWWWWWWWW"','trk name 1 "MMMMMMMMMMMMMMMMMMMMMMMM"','blk name 0 0 "WWWWWWWWWWWWWWWWWWWWWWWW"','blk name 1 0 "MMMMMMMMMMMMMMMMMMMMMMMM"','blk bars 1 0 1','bpm 240'] + ['trk add %d'%(i%4) for i in range(11)]: await cmd(top,c)
            for tr in (0,1,15):
                await cmd(top,f'sel track {tr}'); await cmd(top,f'ed {tr} 0')
                for i,v in enumerate(['song','notes','sample','files']): await cmd(top,f'sel view {i}'); await shot(top,f'w_top_{v}{tr}')
                for i,v in enumerate(['sound','fx','mix','input','master','play']): await cmd(bot,f'sel tab {i}'); await shot(bot,f'w_bot_{v}{tr}')
        for extra in []:
            pg = top if extra.startswith('top:') else bot; await pg.evaluate(extra.split(':',1)[1]); await shot(pg,'x_'+str(sys.argv.index(extra)))
        print('\n'.join(errs) or 'no js errors'); print('TOTAL', total); await b.close()
asyncio.run(main())
