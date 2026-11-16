// Stringer Max: the room behind the controls. Glass towers and drifting cubes in a dark void, moving with the music.
'use strict';
const Scene = (() => {
  let gl, prog, loc = {}, levels = new Float32Array(16), smooth = new Float32Array(160), beat = 0, energy = 0, t0 = performance.now(), cols = 16, rows = 9, floaters = 12, last = 0;
  const VS = `attribute vec3 p; uniform mat4 mvp; varying vec3 vP; varying float vZ; void main(){ vP = p; vec4 q = mvp * vec4(p, 1.0); vZ = q.w; gl_Position = q; }`;
  const FS = `precision mediump float; varying vec3 vP; varying float vZ; uniform vec3 col; uniform float glow; uniform float fog;
    void main(){ vec3 a = abs(vP) * 2.0; float e = max(min(a.x, a.y), max(min(a.y, a.z), min(a.x, a.z))); float edge = smoothstep(0.90, 0.985, e);
      float top = smoothstep(0.2, 0.5, vP.y) * 0.5; float f = clamp(1.0 - vZ / fog, 0.0, 1.0); f *= f;
      gl_FragColor = vec4(col * (0.03 + top * 0.06 * glow + edge * (0.42 + glow)) * f, 1.0); }`;
  const cube = (() => { const f = [[0, 1, 2], [0, 2, 1], [1, 2, 0]], v = []; for (const [a, b, c] of f) for (const s of [-0.5, 0.5]) { const q = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, -.5], [.5, .5], [-.5, .5]]; for (const [x, y] of q) { const p = [0, 0, 0]; p[a] = x; p[b] = y; p[c] = s; v.push(...p); } } return new Float32Array(v); })();
  const mul = (a, b) => { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) o[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3]; return o; };
  const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; };
  const look = (e, c) => { let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]]; const zl = Math.hypot(...z); z = z.map(v => v / zl); let x = [z[2], 0, -z[0]]; const xl = Math.hypot(...x); x = x.map(v => v / xl); const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1]); };
  const model = (x, y, z, sx, sy, sz, ry, rx) => { const c = Math.cos(ry || 0), s = Math.sin(ry || 0), c2 = Math.cos(rx || 0), s2 = Math.sin(rx || 0);
    return new Float32Array([c * sx, s * s2 * sx, -s * c2 * sx, 0, 0, c2 * sy, s2 * sy, 0, s * sz, -c * s2 * sz, c * c2 * sz, 0, x, y, z, 1]); };
  function init(canvas, opt = {}) {
    cols = opt.cols || 16; rows = opt.rows || 9; floaters = opt.floaters == null ? 12 : opt.floaters;
    gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'low-power' }); if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
    for (const u of ['mvp', 'col', 'glow', 'fog']) loc[u] = gl.getUniformLocation(prog, u);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, cube, gl.STATIC_DRAW); const a = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    const size = () => { const s = Math.min(1.5, window.devicePixelRatio || 1) * (opt.scale || 0.75); canvas.width = Math.max(2, Math.round(canvas.clientWidth * s)); canvas.height = Math.max(2, Math.round(canvas.clientHeight * s)); }; size(); window.addEventListener('resize', size);
    const frame = (now) => { requestAnimationFrame(frame); if (document.hidden || now - last < 30) return; last = now; draw(canvas, (now - t0) / 1000); }; requestAnimationFrame(frame); return true;
  }
  function draw(canvas, t) {
    gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0.008, 0.013, 0.032, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    beat *= 0.9; let e = 0; for (let i = 0; i < 16; i++) e += levels[i]; energy += (Math.min(1, e / 3) - energy) * 0.1;
    const asp = canvas.width / canvas.height, ang = t * 0.045, R = 15, eye = [Math.sin(ang) * R, 6.5 + Math.sin(t * 0.11) * 0.8, Math.cos(ang) * R], vp = mul(persp(0.8, asp, 0.5, 80), look(eye, [0, 1.2, 0]));
    gl.uniform1f(loc.fog, 34);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = (c - (cols - 1) / 2) * 1.5, z = (r - (rows - 1) / 2) * 1.5, d = Math.hypot(x, z), lv = levels[(c + r * 3) % 16] || 0;
      const wave = 0.5 + 0.5 * Math.sin(d * 0.9 - t * 0.9 + c * 0.4), target = 0.15 + wave * 0.55 + lv * (2.4 + 2 * wave) + beat * 0.7 * Math.max(0, 1 - d / 9);
      smooth[i] += (target - smooth[i]) * (target > smooth[i] ? 0.35 : 0.08); const hgt = smooth[i], hot = clamp01(lv * 1.6 + beat * 0.25);
      gl.uniformMatrix4fv(loc.mvp, false, mul(vp, model(x, hgt / 2, z, 1.05, hgt, 1.05)));
      gl.uniform3f(loc.col, 0.16 + hot * 0.85, 0.62 + 0.3 * wave - hot * 0.35, 1.0 - hot * 0.15); gl.uniform1f(loc.glow, 0.25 + hot * 1.3 + energy * 0.25); gl.drawArrays(gl.TRIANGLES, 0, 36);
    }
    for (let k = 0; k < floaters; k++) { const a = k * 2.399 + t * (0.05 + (k % 3) * 0.02), rr = 4 + (k % 5) * 1.7, y = 4.5 + (k % 4) * 1.3 + Math.sin(t * 0.3 + k) * 0.6, s = 0.5 + (k % 3) * 0.35 + beat * 0.25;
      gl.uniformMatrix4fv(loc.mvp, false, mul(vp, model(Math.cos(a) * rr, y, Math.sin(a) * rr, s, s, s, t * 0.3 + k, t * 0.21 + k * 2)));
      if (k % 4 === 0) gl.uniform3f(loc.col, 1.0, 0.31, 0.85); else gl.uniform3f(loc.col, 0.45, 0.85, 1.0); gl.uniform1f(loc.glow, 0.5 + energy + beat * 0.6); gl.drawArrays(gl.TRIANGLES, 0, 36); }
  }
  const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  return { init, set(trackPeaks, kick) { for (let i = 0; i < 16; i++) { const v = trackPeaks[i] || 0; levels[i] = v > levels[i] ? v : levels[i] * 0.85; } if (kick) beat = 1; } };
})();
