// ===== Motion Reels Kit: reel engine (1080x1920 canvas). Page settings come from page.js =====
// Load after a <canvas id="c" width="1080" height="1920">. Each reel defines scene(t) and calls MM.render(t, DUR, scene).
// PAGE SETTINGS come from page.js (copied from my_page/page.js at the start of every chat). Do not edit them here.
const PAGE = window.PAGE || {};
const HANDLE = PAGE.handle || '@yourpage';          // watermark on every frame
const ACCENT = PAGE.accent || '#FF7A1A';           // the page's one accent colour, set in page.js. Use it on ONE thing per reel.

const W = 1080, H = 1920, c = document.getElementById('c'), g = c.getContext('2d');
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), P = (t, a, b) => cl((t - a) / (b - a));
const ease = x => { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 };
const back = x => { x = cl(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) };
const mix = (a, b, k) => a + (b - a) * k;
const D = Math.PI / 180;
const COL = { bg0: '#17181c', bg1: '#030303', ink: '#ffffff', line: '#e9e9e9', grey: '#6f757e', dim: '#8a93a0', accent: ACCENT,
  red: '#ff5a5a', green: '#7CFFB2', gold: '#F2C94C', blue: '#9cc9ff', night: '#1a2440', wall: '#2a2c33', floor: '#141518' };
let FA = 1; // global alpha for the current scene (fade)
// ---------- grain ----------
const grain = document.createElement('canvas'); grain.width = 540; grain.height = 960; const gg = grain.getContext('2d');
const grainCache = [];
for (let k = 0; k < 7; k++) { const id = gg.createImageData(540, 960); let s = (k + 1) * 9301 + 49297; for (let i = 0; i < id.data.length; i += 4) { s = (s * 9301 + 49297) % 233280; const v = s / 233280 * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 12 } grainCache.push(id) }

// ---------- stick figure ----------
// Pose angles in degrees: 0 = straight down, +90 = pointing forward (facing right), -90 = backward.
// opt: {scale, col, flip, glow}. Returns attachment points: handF, handB, footF, footB, head, shoulder.
const LEN = { torso: 150, ua: 78, fa: 72, th: 92, sh: 90, head: 34 };
function limb(x, y, a1, l1, a2, l2) { const ex = x + Math.sin(a1 * D) * l1, ey = y + Math.cos(a1 * D) * l1; return [[x, y], [ex, ey], [ex + Math.sin(a2 * D) * l2, ey + Math.cos(a2 * D) * l2]] }
function figure(hx, hy, p, opt = {}) {
  const dir = opt.flip ? -1 : 1, s = opt.scale || 1, col = opt.col || COL.ink;
  const L = k => LEN[k] * s, A = a => a * dir;
  const sx = hx + Math.sin(A(p.lean) * D) * L('torso'), sy = hy - Math.cos(p.lean * D) * L('torso');
  const hdx = sx + Math.sin(A(p.lean + (p.neck || 0)) * D) * (L('head') + 14 * s), hdy = sy - Math.cos((p.lean + (p.neck || 0)) * D) * (L('head') + 14 * s);
  if (opt.glow) glow(hx, (hy + hdy) / 2, 150 * s, opt.glow, '255,255,255');
  const legB = limb(hx, hy, A(p.thB), L('th'), A(p.shB), L('sh')), armB = limb(sx, sy, A(p.uaB), L('ua'), A(p.faB), L('fa'));
  const legF = limb(hx, hy, A(p.thF), L('th'), A(p.shF), L('sh')), armF = limb(sx, sy, A(p.uaF), L('ua'), A(p.faF), L('fa'));
  const parts = [legB, armB, [[hx, hy], [sx, sy]], legF, armF];
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col;
  parts.forEach((pts, i) => { g.lineWidth = (i == 2 ? 26 : 20) * s; g.globalAlpha = FA * ((i < 2) ? .82 : 1); g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); g.stroke() });
  g.globalAlpha = FA; g.fillStyle = col; g.beginPath(); g.arc(hdx, hdy, L('head'), 0, 7); g.fill();
  return { handF: armF[2], handB: armB[2], footF: legF[2], footB: legB[2], head: [hdx, hdy], shoulder: [sx, sy], hip: [hx, hy] };
}
// A figure rotated around its hip: rot -90 = lying with head to the LEFT, +90 = head to the right. Points returned are in screen space.
function figureRot(hx, hy, p, rot, opt = {}) {
  g.save(); g.translate(hx, hy); g.rotate(rot * D); const f = figure(0, 0, p, opt); g.restore();
  const r = v => [hx + v[0] * Math.cos(rot * D) - v[1] * Math.sin(rot * D), hy + v[0] * Math.sin(rot * D) + v[1] * Math.cos(rot * D)];
  const o = {}; for (const k in f) o[k] = r(f[k]); return o;
}
// Body-as-meter: the figure is grey, and a coloured "fill" covers it from the feet up to `level` (0..1). Drains head-first as level drops.
function figureMeter(hx, hy, p, level, opt = {}) {
  const s = opt.scale || 1, top = hy - (LEN.torso + LEN.head * 2 + 14) * s - 10, bot = hy + (LEN.th + LEN.sh) * s + 12;
  figure(hx, hy, p, { ...opt, col: opt.empty || COL.grey });
  const yCut = mix(bot, top, cl(level));
  g.save(); g.beginPath(); g.rect(0, yCut, W, H); g.clip(); const f = figure(hx, hy, p, { ...opt, col: opt.full || COL.accent }); g.restore();
  return f;
}
function legDrop(p, s = 1) { return s * Math.max(Math.cos(p.thB * D) * LEN.th + Math.cos(p.shB * D) * LEN.sh, Math.cos(p.thF * D) * LEN.th + Math.cos(p.shF * D) * LEN.sh) }
function lerpPose(a, b, k) { const o = {}; for (const key in a) o[key] = a[key] + ((b[key] ?? a[key]) - a[key]) * k; return o }
const POSE = {
  stand: () => ({ lean: 0, neck: 0, uaF: 8, faF: 4, uaB: -8, faB: -4, thF: 6, shF: 2, thB: -6, shB: -2 }),
  walk: ph => { const s = Math.sin(ph); return { lean: 4, neck: 0, uaF: -28 * s, faF: -28 * s + 18, uaB: 28 * s, faB: 28 * s + 18, thF: 26 * s, shF: 26 * s - 22 * Math.max(0, -Math.cos(ph)), thB: -26 * s, shB: -26 * s - 22 * Math.max(0, Math.cos(ph)) } },
  trudge: ph => { const s = Math.sin(ph); return { lean: 16, neck: 20, uaF: -10 * s, faF: -6 * s, uaB: 10 * s, faB: 6 * s, thF: 16 * s, shF: 16 * s - 14 * Math.max(0, -Math.cos(ph)), thB: -16 * s, shB: -16 * s - 14 * Math.max(0, Math.cos(ph)) } },
  run: ph => { const s = Math.sin(ph); return { lean: 10, neck: 0, uaF: -50 * s + 10, faF: -50 * s + 70, uaB: 50 * s + 10, faB: 50 * s + 70, thF: 42 * s, shF: 42 * s - 40 * Math.max(0, -Math.cos(ph)), thB: -42 * s, shB: -42 * s - 40 * Math.max(0, Math.cos(ph)) } },
  push: (ph, strain = 0) => { const s = Math.sin(ph); return { lean: 58 + 2 * strain, neck: 0, uaF: 36, faF: 48, uaB: 30, faB: 42, thF: 30 + 14 * s, shF: -4 + 10 * s, thB: -30 + 14 * s, shB: -34 + 10 * s } },
  cheer: t => ({ lean: 0, neck: -6, uaF: 150 + 6 * Math.sin(t * 3), faF: 178, uaB: -150 - 6 * Math.sin(t * 3), faB: -178, thF: 10, shF: 6, thB: -10, shB: -6 }),
  stretch: () => ({ lean: -4, neck: -10, uaF: 160, faF: 175, uaB: -160, faB: -175, thF: 6, shF: 2, thB: -6, shB: -2 }),
  slump: () => ({ lean: 14, neck: 24, uaF: 4, faF: 0, uaB: -2, faB: -4, thF: 6, shF: 2, thB: -6, shB: -2 }),
  lookUp: () => ({ lean: -6, neck: -18, uaF: 20, faF: 10, uaB: -14, faB: -8, thF: 6, shF: 2, thB: -6, shB: -2 }),
  point: () => ({ lean: 0, neck: 0, uaF: 95, faF: 92, uaB: -8, faB: -4, thF: 6, shF: 2, thB: -6, shB: -2 }),
  shrug: () => ({ lean: 0, neck: 8, uaF: 40, faF: 150, uaB: -40, faB: -150, thF: 6, shF: 2, thB: -6, shB: -2 }),
  facepalm: () => ({ lean: 6, neck: 14, uaF: 150, faF: -30, uaB: -6, faB: -2, thF: 6, shF: 2, thB: -6, shB: -2 }),
  sit: () => ({ lean: 0, neck: 0, uaF: 30, faF: 80, uaB: 20, faB: 70, thF: 90, shF: 0, thB: 86, shB: -4 }),       // on a chair; hip y = seat y
  sitFloor: () => ({ lean: 10, neck: 18, uaF: 40, faF: 70, uaB: 30, faB: 60, thF: 70, shF: 160, thB: 64, shB: 150 }), // hugging knees
  lie: () => ({ lean: 0, neck: 0, uaF: 6, faF: 4, uaB: -6, faB: -4, thF: 2, shF: 0, thB: -2, shB: 0 }),               // use with figureRot(..., -90)
  holdUp: () => ({ lean: 0, neck: 0, uaF: 125, faF: 175, uaB: -6, faB: -4, thF: 2, shF: 0, thB: -2, shB: 0 }),          // lying, phone/book held above face
  kneel: () => ({ lean: 8, neck: 16, uaF: 30, faF: 60, uaB: -10, faB: 10, thF: 88, shF: 0, thB: 30, shB: -60 }),
  write: ph => ({ lean: 22, neck: 18, uaF: 60, faF: 100 + 8 * Math.sin(ph), uaB: 40, faB: 90, thF: 90, shF: 0, thB: 86, shB: -4 }), // sitting at a desk, writing
  climb: ph => { const s = Math.sin(ph); return { lean: 6, neck: -8, uaF: 150 + 20 * s, faF: 170, uaB: 150 - 20 * s, faB: 170, thF: 40 + 30 * s, shF: -20, thB: 40 - 30 * s, shB: -20 } },
  carry: ph => { const s = Math.sin(ph); return { lean: 6, neck: 0, uaF: 70, faF: 120, uaB: 60, faB: 110, thF: 22 * s, shF: 22 * s - 18 * Math.max(0, -Math.cos(ph)), thB: -22 * s, shB: -22 * s - 18 * Math.max(0, Math.cos(ph)) } },
};

// ---------- drawing helpers ----------
function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath() }
function glow(x, y, r, a = .13, col = '180,220,255') { const gr = g.createRadialGradient(x, y, r * .2, x, y, r * 2.2); gr.addColorStop(0, `rgba(${col},${a * FA})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.2, 0, 7); g.fill() }
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}` }
function typed(s, t0, t, cps = 20) { return s.slice(0, Math.floor(cl((t - t0) * cps, 0, s.length))) }
function label(s, x, y, size = 30, col = COL.ink, weight = 700, align = 'center', alpha = 1, font = 'SM') {
  g.globalAlpha = FA * alpha; g.fillStyle = col; g.font = `${weight} ${size}px ${font}`; g.textAlign = align; g.fillText(s, x, y); g.globalAlpha = FA;
  if (s && FA * alpha > .5) { const w = g.measureText(s).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x; MM.boxes.push({ s, x0, y0: y - size * .8, x1: x0 + w, y1: y + size * .2 }) }
}
// Top caption block (small caps, typed). beats: [[t0, line1, line2, col1, col2], ...] — each beat replaces the previous.
// In this style the top text is SHORT: "SAME NIGHT." / "DIFFERENT MORNING." Max ~22 letters per line.
const TEXT_Y = 330;
function captions(t, beats, y = TEXT_Y) {
  if (window.COVER) return;                      // the cover shows the serif headline instead
  let cur = null, prev = null; for (const b of beats) if (t >= b[0]) { prev = cur; cur = b } if (!cur) return;
  const [t0, a, b2 = '', col1 = COL.ink, col2 = COL.ink] = cur;
  const keep = prev && prev[1] === a;            // same first line as the beat before: don't retype it
  label(keep ? a : typed(a, t0, t), W / 2, y, 46, col1, 700);
  if (b2) label(typed(b2, keep ? t0 : t0 + a.length / 20 + .25, t), W / 2, y + 62, 46, col2, 700);
}
// Speech / thought bubble. Typed in from t0. opt: {size, angry (jagged, red text), thought (dots tail), tail:'down'|'left'|'right'|'none', col, maxW, accent (orange text)}
function bubble(text, x, y, t0, t, opt = {}) {
  if (t < t0) return; const size = opt.size || 30, shown = typed(text, t0, t, opt.cps || 26);
  g.font = `700 ${size}px SM`; const lines = wrapLines(text, opt.maxW || 520, size); const w = Math.max(...lines.map(l => g.measureText(l).width)) + size * 1.2, h = lines.length * size * 1.25 + size * .8;
  const tipX = x; x = cl(x, 50 + w / 2, 1030 - w / 2);   // keep the bubble inside the frame
  const x0 = x - w / 2, y0 = y - h, a = FA * cl((t - t0) * 6);
  g.globalAlpha = a;
  if (opt.angry) { g.fillStyle = '#000'; g.strokeStyle = COL.ink; g.lineWidth = 4; g.beginPath(); const n = 18; for (let i = 0; i <= n * 2; i++) { const ang = i / (n * 2) * Math.PI * 2, rx = w / 2 + (i % 2 ? 22 : 0), ry = h / 2 + (i % 2 ? 18 : 0); const px = x + Math.cos(ang) * rx, py = y0 + h / 2 + Math.sin(ang) * ry; i ? g.lineTo(px, py) : g.moveTo(px, py) } g.closePath(); g.fill(); g.stroke() }
  else { g.fillStyle = '#000'; g.strokeStyle = COL.ink; g.lineWidth = 4; rr(x0, y0, w, h, 14); g.fill(); g.stroke() }
  const tail = opt.tail || 'down';
  if (opt.thought) { g.fillStyle = COL.ink; [[0, 18, 7], [-10, 40, 5], [-18, 58, 3.5]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx, y + dy, r, 0, 7); g.fill() }) }
  else if (tail !== 'none' && !opt.angry) { const tx = tail === 'left' ? x0 + 30 : tail === 'right' ? x0 + w - 30 : cl(tipX, x0 + 30, x0 + w - 30); g.fillStyle = '#000'; g.beginPath(); g.moveTo(tx - 12, y - 2); g.lineTo(tx + 12, y - 2); g.lineTo(tx + (tail === 'left' ? -14 : tail === 'right' ? 14 : 0), y + 22); g.closePath(); g.fill(); g.stroke(); g.fillRect(tx - 10, y - 6, 20, 6) }
  g.globalAlpha = a; g.fillStyle = opt.col || (opt.angry ? COL.red : opt.accent ? COL.accent : COL.ink); g.textAlign = 'center';
  let left = shown.length; lines.forEach((l, i) => { const part = l.slice(0, Math.max(0, left)); left -= l.length + 1; g.fillText(part, x, y0 + size * 1.15 + i * size * 1.25) });
  g.globalAlpha = FA; if (a > .5) MM.boxes.push({ s: '"' + text + '"', x0: x0 - 4, y0: y0 - 4, x1: x0 + w + 4, y1: y + (opt.thought ? 60 : 4) });
}
function wrapLines(text, maxW, size) { g.font = `700 ${size}px SM`; const words = text.split(' '), out = []; let cur = ''; for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (g.measureText(tr).width > maxW && cur) { out.push(cur); cur = w } else cur = tr } out.push(cur); return out }
// Accent pill for the counter (clock, age, day, year). Sits between split panels or over a scene.
function counter(text, x, y, opt = {}) {
  const size = opt.size || 34; g.font = `700 ${size}px SM`; const w = g.measureText(text).width + size * 1.1, h = size * 1.5;
  g.globalAlpha = FA; g.fillStyle = opt.bg || '#000'; g.strokeStyle = opt.col || COL.accent; g.lineWidth = 3; rr(x - w / 2, y - h / 2, w, h, h / 2); g.fill(); g.stroke();
  label(text, x, y + size * .35, size, opt.col || COL.accent, 700);
}
// Small panel label, top-left of a panel: "10PM: PHONE"
function tag(text, x, y, opt = {}) { label(text, x, y, opt.size || 28, opt.col || COL.ink, 700, opt.align || 'left', opt.alpha ?? .92) }
// Headline frame for the cover image (serif, last words italic). Drawn only when the renderer is in cover mode.
function coverHeadline(plain, italic, y = 350) {
  if (!window.COVER) return; g.globalAlpha = 1;
  g.font = '400 64px SF'; const w1 = g.measureText(plain + ' ').width; g.font = 'italic 400 64px SF'; const w2 = g.measureText(italic).width;
  let x = W / 2 - (w1 + w2) / 2; g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '400 64px SF'; g.fillText(plain + ' ', x, y); g.font = 'italic 400 64px SF'; g.fillText(italic, x + w1, y);
}
function coin(x, y, r = 22, a = 1) { g.globalAlpha = FA * a; g.fillStyle = COL.gold; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#b8922e'; g.lineWidth = r * .22; g.stroke(); g.globalAlpha = FA }
function clockText(min) { min = ((Math.round(min) % 1440) + 1440) % 1440; let h = Math.floor(min / 60), m = min % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${ap}` }

// ---------- panels (split screens) ----------
// SPLIT gives two stacked panels. Draw each with panel(p, fn): it clips to the panel, draws a room tint and the label.
// p = {x0, y0, w, h, ground}. Figures inside panels use scale ~.55.
const SPLIT = {
  top: { x0: 40, y0: 420, w: 1000, h: 500, ground: 870 },
  bot: { x0: 40, y0: 1010, w: 1000, h: 500, ground: 1460 },
  mid: 965,   // y of the counter pill between the panels
};
function panel(p, fn, opt = {}) {
  g.save(); rr(p.x0, p.y0, p.w, p.h, 18); g.clip();
  const warm = opt.warm ?? .5; // 0 = cold blue room, 1 = warm lit room
  const top = `rgb(${Math.round(mix(22, 46, warm))},${Math.round(mix(26, 38, warm))},${Math.round(mix(40, 34, warm))})`;
  const gr = g.createLinearGradient(0, p.y0, 0, p.y0 + p.h); gr.addColorStop(0, top); gr.addColorStop(1, '#0c0c0f'); g.fillStyle = gr; g.fillRect(p.x0, p.y0, p.w, p.h);
  g.fillStyle = COL.floor; g.fillRect(p.x0, p.ground, p.w, p.y0 + p.h - p.ground);
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x0, p.ground); g.lineTo(p.x0 + p.w, p.ground); g.stroke();
  fn(p);
  if (opt.dim) { g.fillStyle = `rgba(0,0,0,${opt.dim})`; g.fillRect(p.x0, p.y0, p.w, p.h) }
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; rr(p.x0, p.y0, p.w, p.h, 18); g.stroke();
  if (opt.label) tag(opt.label, p.x0 + 28, p.y0 + 48, { col: opt.labelCol });
}

// ---------- props & backdrops (all take a scale s; y is the bottom/floor contact point unless noted) ----------
function windowFrame(x, y, w, h, day = 0, opt = {}) { // x,y = top-left. day 0 night (moon) -> 1 morning sky
  const sky = g.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, `rgb(${mix(20, 120, day)},${mix(28, 160, day)},${mix(58, 210, day)})`); sky.addColorStop(1, `rgb(${mix(44, 255, day)},${mix(40, 190, day)},${mix(70, 140, day)})`);
  g.fillStyle = sky; g.fillRect(x, y, w, h);
  if (day < .6) { g.globalAlpha = FA * (1 - day / .6); g.fillStyle = '#f4f1e6'; g.beginPath(); g.arc(x + w * .72, y + h * .3, h * .1, 0, 7); g.fill(); g.fillStyle = sky; g.beginPath(); g.arc(x + w * .72 + h * .05, y + h * .27, h * .09, 0, 7); g.fill(); g.globalAlpha = FA }
  if (opt.city !== false) { g.fillStyle = `rgba(8,10,16,${.9 - .4 * day})`; for (let i = 0; i < 7; i++) { const bw = w / 7, bh = h * (.18 + ((i * 37) % 23) / 60); g.fillRect(x + i * bw, y + h - bh, bw - 3, bh) } }
  g.strokeStyle = '#3a3d46'; g.lineWidth = 10; g.strokeRect(x, y, w, h); g.lineWidth = 6; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
}
function door(x, y, s = 1, open = 0) { const w = 120 * s, h = 250 * s; g.fillStyle = '#1b1d22'; g.fillRect(x, y - h, w, h); if (open > 0) { glow(x + w / 2, y - h / 2, 80 * s, .25 * open, '255,230,180'); g.fillStyle = `rgba(255,236,200,${.85 * open})`; g.fillRect(x, y - h, w * open * .9, h) } g.strokeStyle = '#3a3d46'; g.lineWidth = 6 * s; g.strokeRect(x, y - h, w, h); g.fillStyle = '#777'; g.beginPath(); g.arc(x + w * .82, y - h * .48, 5 * s, 0, 7); g.fill() }
function lamp(x, y, s = 1, on = 1) { // y = table/floor contact
  if (on > 0) glow(x, y - 70 * s, 90 * s, .28 * on, '255,214,150');
  g.fillStyle = '#2b2d33'; g.fillRect(x - 4 * s, y - 60 * s, 8 * s, 60 * s); g.fillRect(x - 22 * s, y - 6 * s, 44 * s, 6 * s);
  g.fillStyle = on > .5 ? '#ffe2a8' : '#3b3d44'; g.beginPath(); g.moveTo(x - 30 * s, y - 60 * s); g.lineTo(x + 30 * s, y - 60 * s); g.lineTo(x + 20 * s, y - 100 * s); g.lineTo(x - 20 * s, y - 100 * s); g.closePath(); g.fill();
}
function bed(x, y, w, s = 1, opt = {}) { // x = left edge, y = floor. Returns {top} = mattress top y (lie the figure's hip there)
  const leg = 40 * s, th = 46 * s, top = y - leg - th;
  g.fillStyle = '#2a2d36'; g.fillRect(x, y - leg, 12 * s, leg); g.fillRect(x + w - 12 * s, y - leg, 12 * s, leg);
  g.fillStyle = '#3b4154'; rr(x, top, w, th, 8 * s); g.fill();
  g.fillStyle = '#2b2f3d'; g.fillRect(x - 6 * s, top - 90 * s, 16 * s, 90 * s + th);
  if (opt.blanket !== false) { g.fillStyle = opt.blanketCol || '#4a5a8a'; rr(x + w * .38, top - 18 * s, w * .62, 30 * s, 10 * s); g.fill() }
  g.fillStyle = '#d9dde6'; rr(x + 14 * s, top - 22 * s, 90 * s, 26 * s, 12 * s); g.fill();
  return { top };
}
function table(x, y, w, s = 1, h = 110) { g.fillStyle = '#3a3027'; g.fillRect(x, y - h * s, w, 12 * s); g.fillStyle = '#2a231d'; g.fillRect(x + 10 * s, y - h * s, 10 * s, h * s); g.fillRect(x + w - 20 * s, y - h * s, 10 * s, h * s); return { top: y - h * s } }
function chair(x, y, s = 1, flip = false) { const d = flip ? -1 : 1; g.strokeStyle = '#3a3d46'; g.lineWidth = 8 * s; g.beginPath(); g.moveTo(x - 30 * s * d, y - 70 * s); g.lineTo(x + 30 * s * d, y - 70 * s); g.moveTo(x - 26 * s * d, y - 70 * s); g.lineTo(x - 26 * s * d, y); g.moveTo(x + 26 * s * d, y - 70 * s); g.lineTo(x + 26 * s * d, y); g.moveTo(x - 30 * s * d, y - 70 * s); g.lineTo(x - 30 * s * d, y - 170 * s); g.stroke(); return { seat: y - 70 * s } }
function phone(x, y, s = 1, lit = 1, ang = 0) { g.save(); g.translate(x, y); g.rotate(ang * D); if (lit > 0) glow(0, 0, 50 * s, .35 * lit, '150,190,255'); g.fillStyle = '#111'; rr(-14 * s, -24 * s, 28 * s, 48 * s, 5 * s); g.fill(); g.fillStyle = lit > 0 ? `rgba(150,200,255,${.4 + .6 * lit})` : '#222'; rr(-11 * s, -20 * s, 22 * s, 40 * s, 3 * s); g.fill(); g.restore() }
function book(x, y, s = 1, open = 1, col = COL.accent) { g.save(); g.translate(x, y); if (open > .5) { g.fillStyle = '#f2efe6'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-30 * s, -6 * s); g.lineTo(-30 * s, -40 * s); g.lineTo(0, -34 * s); g.lineTo(30 * s, -40 * s); g.lineTo(30 * s, -6 * s); g.closePath(); g.fill(); g.fillStyle = col; g.fillRect(-32 * s, -4 * s, 64 * s, 6 * s) } else { g.fillStyle = col; rr(-26 * s, -36 * s, 52 * s, 36 * s, 4 * s); g.fill() } g.restore() }
function brick(x, y, s = 1, col = '#cfc8bd') { g.fillStyle = col; rr(x - 30 * s, y - 18 * s, 60 * s, 18 * s, 3 * s); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.stroke() }
function paper(x, y, s = 1, ang = 0, a = 1) { g.save(); g.globalAlpha = FA * a; g.translate(x, y); g.rotate(ang * D); g.fillStyle = '#eceae4'; g.fillRect(-26 * s, -34 * s, 52 * s, 68 * s); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2 * s; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-18 * s, -22 * s + i * 11 * s); g.lineTo(18 * s, -22 * s + i * 11 * s); g.stroke() } g.restore(); g.globalAlpha = FA }
function zzz(x, y, t, s = 1) { for (let i = 0; i < 3; i++) { const k = (t * .7 + i / 3) % 1; label('z', x + k * 40 * s, y - k * 90 * s, (22 + 12 * k) * s, COL.dim, 700, 'center', .8 * (1 - k)) } }
function steam(x, y, t, s = 1, col = '255,255,255') { for (let i = 0; i < 3; i++) { const k = (t * .8 + i / 3) % 1; g.strokeStyle = `rgba(${col},${.45 * (1 - k) * FA})`; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(x - 10 * s + i * 10 * s, y - k * 50 * s); g.quadraticCurveTo(x + i * 10 * s, y - 14 * s - k * 50 * s, x - 10 * s + i * 10 * s, y - 34 * s - k * 50 * s); g.stroke() } }
function spotlight(x, y, w, h, a = .12) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, `rgba(255,255,255,${a * FA})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - w * .15, y); g.lineTo(x + w * .15, y); g.lineTo(x + w / 2, y + h); g.lineTo(x - w / 2, y + h); g.closePath(); g.fill() }
function ground(y, col = 'rgba(255,255,255,.8)') { g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.fillStyle = '#0b0b0c'; g.fillRect(0, y + 3, W, H) }
// A crowd of small grey figures walking (or standing) in rows. dir 1 = right. Returns head positions.
function crowd(n, x0, x1, gy, t, opt = {}) { const s = opt.scale || .45, out = []; for (let i = 0; i < n; i++) { const row = i % (opt.rows || 3), col = Math.floor(i / (opt.rows || 3)), cols = Math.ceil(n / (opt.rows || 3)); const x = mix(x0, x1, cols > 1 ? col / (cols - 1) : .5) + row * 18 + (opt.speed || 0) * t, y = gy - row * 26; const pose = opt.walk === false ? POSE.stand() : POSE.walk(t * 6 + i * 1.7); const f = figure(x, y - legDrop(pose, s), pose, { scale: s, col: opt.col || COL.grey, flip: opt.flip }); out.push(f.head) } return out }

// ---------- frame wrapper ----------
const MM = {
  boxes: [],
  solid(x0, y0, x1, y1, s = 'shape') { if (FA > .5) MM.boxes.push({ s: '[' + s + ']', x0, y0, x1, y1, solid: true }) },
  render(t, dur, scene) {
    MM.boxes = [];
    g.globalAlpha = 1; g.fillStyle = '#040404'; g.fillRect(0, 0, W, H);
    const bg = g.createRadialGradient(W / 2, H * .5, 100, W / 2, H * .5, 1250); bg.addColorStop(0, COL.bg0); bg.addColorStop(1, COL.bg1); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    FA = window.COVER ? 1 : P(t, 0, .45) * (1 - P(t, dur - .55, dur)); g.globalAlpha = FA;
    scene(t);
    g.globalAlpha = .3 * FA; g.fillStyle = '#fff'; g.font = '400 26px SM'; g.textAlign = 'center'; g.fillText(HANDLE, W / 2, 1600); g.globalAlpha = 1; if (FA > .5) MM.boxes.push({ s: HANDLE, x0: W / 2 - 150, y0: 1578, x1: W / 2 + 150, y1: 1606 });
    const vg = g.createRadialGradient(W / 2, H / 2, 520, W / 2, H / 2, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.72)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    gg.putImageData(grainCache[Math.floor(t * 30) % 7], 0, 0); g.drawImage(grain, 0, 0, W, H);
    if (window.COVER && window.COVER_TEXT) coverHeadline(...window.COVER_TEXT);
  }
};
