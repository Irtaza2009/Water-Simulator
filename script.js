const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function draw() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#00aaff");
  g.addColorStop(1, "#004466");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#9be7ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x < canvas.width; x += 20) {
    ctx.lineTo(x, canvas.height * 0.55 + Math.sin(x * 0.03) * 10);
  }
  ctx.stroke();
}

draw();

window.addEventListener("resize", draw);
