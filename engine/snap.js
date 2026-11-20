// Screenshot any kit page (palette, profile pictures).
//   node snap.js <page.html> <out.png> [width] [height] [drawArg]
// If the page defines draw(arg), it is called (after the fonts load) with drawArg.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const [file, out, w = 1080, h = 1080, arg] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  await p.goto('file://' + path.resolve(file));
  await p.evaluate(async () => { for (const f of ['700 40px SM', '400 40px SM']) { try { await document.fonts.load(f) } catch (e) {} } });
  await p.evaluate(a => window.draw && draw(a), arg);
  await p.screenshot({ path: out }); await b.close(); console.log('saved', out);
})();
