(function () {
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false });

  if (!gl) {
    canvas.parentElement.innerHTML = "WebGL not supported in this browser.";
    return;
  }

  let W = 0,
    H = 0,
    t = 0;

  const ripples = [];

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = canvas.width = r.width * devicePixelRatio;
    H = canvas.height = r.height * devicePixelRatio;
    gl.viewport(0, 0, W, H);
  }

  resize();
  new ResizeObserver(resize).observe(canvas);

  function frame(ts) {
    const dt = Math.min(ts * 0.001 - t, 0.05);
    t += dt;
    gl.clearColor(0.05, 0.24 + Math.sin(t) * 0.03, 0.57, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
