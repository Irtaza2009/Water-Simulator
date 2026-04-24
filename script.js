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
    precision medium float;
    varying vec2 uv;
    uniform float time;
    void main() {
        float wave = sin ((uv.x + time * 0.6) * 12.0) * 0.03;
        vec3 top = vec3(0.45, 0.8, 1.0);
        vec3 bot = vec3(0.02, 0.18, 0.55);
        vec3 col = mix(bot, top, uv.y + wave);
        gl_FragColor = vec4(col, 1.0);
    }
    `;

  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
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

  function frame(ts) {
    const dt = Math.min(ts * 0.001 - t, 0.05);
    t += dt;
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
