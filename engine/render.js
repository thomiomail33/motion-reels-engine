// Motion Reels Kit renderer.
//   node render.js stills  <scene.html> 1.5,4,8        -> still_<t>.jpg  (look at these before rendering video)
//   node render.js audit   <scene.html> <seconds>      -> lists overlapping text/elements (must print "AUDIT CLEAN")
//   node render.js video   <scene.html> <seconds> <out.mp4>
//   node render.js cover   <scene.html> <t> <out.jpg>     -> cover image with the headline frame
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [mode, scene, arg, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  await p.goto('file://' + path.resolve(scene));
  await p.evaluate(async () => { await document.fonts.load('700 40px SM'); await document.fonts.load('400 40px SM'); await document.fonts.load('400 40px SF'); await document.fonts.load('italic 400 40px SF'); });
  if (mode === 'stills') {
    for (const t of arg.split(',').map(Number)) { await p.evaluate(t => frame(t), t); await p.screenshot({ path: `still_${t}.jpg`, type: 'jpeg', quality: 80 }); }
  } else if (mode === 'cover') {
    // node render.js cover <scene.html> <t> <out.jpg>  -> cover image: the frame at t with the serif headline on top
    await p.evaluate(t => { window.COVER = true; frame(t); }, +arg); await p.screenshot({ path: out, type: 'jpeg', quality: 90 });
  } else if (mode === 'audit') {
    const dur = +arg;
    const res = await p.evaluate(dur => {
      const hits = {};
      for (let t = 0; t < dur; t += 0.1) {
        frame(t); const B = MM.boxes;
        for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
          const a = B[i], c = B[j]; if (a.solid && c.solid) continue;
          const ix = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), iy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
          if (ix > 4 && iy > 4) { const k = a.s + '  <>  ' + c.s; (hits[k] = hits[k] || [t, t])[1] = t; }
        }
        for (const a of B) if (a.x0 < 40 || a.x1 > 1040) { const k = 'WARN off-edge (fine only if it is sliding in/out): ' + a.s; (hits[k] = hits[k] || [t, t])[1] = t; }
      }
      return hits;
    }, dur);
    const keys = Object.keys(res);
    if (!keys.some(k => !k.startsWith('WARN'))) console.log('AUDIT CLEAN'); keys.forEach(k => { if (k.startsWith('WARN')) console.log(k) });
    if (keys.some(k => !k.startsWith('WARN')))  keys.filter(k => !k.startsWith('WARN')).forEach(k => console.log(`${res[k][0].toFixed(1)}s-${res[k][1].toFixed(1)}s  ${k}`));
  } else if (mode === 'video') {
    const dur = +arg, fps = 30;
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', fps, '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'veryfast', out]);
    for (let i = 0; i < Math.round(dur * fps); i++) {
      await p.evaluate(t => frame(t), i / fps);
      const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
