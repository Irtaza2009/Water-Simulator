(function () {
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false });

  if (!gl) {
    canvas.parentElement.innerHTML = "WebGL not supported in this browser.";
    return;
  }

  let W = 0,
    H = 0,
    t = 0,
    wind = 0.4,
    chop = 0.5;

  const ripples = [];

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = canvas.width = r.width * devicePixelRatio;
    H = canvas.height = r.height * devicePixelRatio;
    gl.viewport(0, 0, W, H);
  }

  resize();
  new ResizeObserver(resize).observe(canvas);

  const vert = `
    attribute vec2 a;
    varying vec2 uv;
    void main()
        {
            uv = a*0.5+0.5;
            gl_Position = vec4(a,0,1);
        }
            `;

  const frag = `
    precision highp float;
    varying vec2 uv;
    uniform float time;
    uniform vec2 res;
    uniform float windU;
    uniform float chopU;
    uniform int modeU;
    uniform vec3 rip[8];

    float waveHeight(vec2 p){
        float w = windU * 0.8 + 0.2;
        float c = chopU * 0.8 + 0.2;
        float h = sin((p.x + time * 0.6) * (10.0 + c * 8.0)) * (0.02 + 0.03 * w);
        h += sin((p.y - time * 0.5) * (6.0 + c * 6.0)) * 0.015 * w;
        for (int i = 0; i < 8; i++) {
            if (rip[i].z <= 0.0) continue;
            float d = length(p - rip[i].xy);
            h += sin(d * 14.0 - time * 7.0) *  exp(-d * 3.0) * 0.03 * rip[i].z;
        }
        return h;
    }

    vec3 getSky(int m, float y) {
        return mix(vec3(0.45,0.8,1.0), vec3(0.02,0.18,0.55), y);
    }

    vec3 getWater(int m, float y) {
        return mix(vec3(0.0,0.1,0.35), vec3(0.1,0.3,0.65), y);
    }

    void main() {
        vec2 p = uv;
        p.x *= res.x / max(res.y, 1.0);
        float h = waveHeight(p * 2.0);
        vec3 sky = getSky(0, uv.y);
        vec3 water = getWater(0, uv.y + h * 3.0);
        vec3 col = mix(sky, water, 0.7 + h * 2.0);
        gl_FragColor = vec4(col, 1.0);
    }
    `;

  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const vs = compileShader(gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl.FRAGMENT_SHADER, frag);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const aLoc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, "time");

  const uRes = gl.getUniformLocation(prog, "res");
  const uWind = gl.getUniformLocation(prog, "windU");
  const uChop = gl.getUniformLocation(prog, "chopU");
  const uMode = gl.getUniformLocation(prog, "modeU");
  const uRip = gl.getUniformLocation(prog, "rip");

  document.querySelectorAll(".mb").forEach((b) => {
    if (+b.dataset.mode === 0) b.classList.add("active");
    b.addEventListener("click", () => {
      mode = +b.dataset.mode;
      document
        .querySelectorAll(".mb")
        .forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
    });
  });

  document.getElementById("wind").addEventListener("input", (e) => {
    wind = e.target.value / 100;
  });

  document.getElementById("chop").addEventListener("input", (e) => {
    chop = e.target.value / 100;
  });

  let dragging = false;

  function toNDC(e) {
    const r = canvas.getBoundingClientRect();
    const cx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const cy = -((e.clientY - r.top) / r.height) * 2 + 1;
    const aspect = r.width / r.height;
    return [cx * aspect * 0.7, cy * 0.7];
  }

  function addRipple(e) {
    const [nx, ny] = toNDC(e);
    const worldX = nx * 3;
    const worldZ = ny * 3 - 1;
    for (let i = 0; i < ripples.length; i++) {
      if (ripples[i][2] <= 0) {
        ripples[i] = [worldX, worldZ, 1];
        return;
      }
    }
    if (ripples.length < 8) {
      ripples.push([worldX, worldZ, 1]);
    }
  }

  canvas.addEventListener("mousedown", (e) => {
    dragging = true;
    addRipple(e);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (dragging) {
      addRipple(e);
    }
  });

  canvas.addEventListener("mouseup", () => {
    dragging = false;
  });

  let last = 0;
  function frame(ts) {
    const dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;
    t += dt;
    for (let i = 0; i < ripples.length; i++) {
      if (ripples[i][2] > 0) ripples[i][2] -= dt * 0.5;
    }
    const ripArr = new Float32Array(24);
    for (let i = 0; i < Math.min(ripples.length, 8); i++) {
      ripArr[i * 3] = ripples[i][0];
      ripArr[i * 3 + 1] = ripples[i][1];
      ripArr[i * 3 + 2] = Math.max(0, ripples[i][2]);
    }

    gl.uniform1f(uTime, t);
    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uWind, wind);
    gl.uniform1f(uChop, chop);
    gl.uniform1i(uMode, mode);
    gl.uniform3fv(uRip, ripArr);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
