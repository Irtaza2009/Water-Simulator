(function () {
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
  if (!gl) {
    canvas.parentElement.innerHTML = "<p>WebGL not supported</p>";
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
void main(){uv=a*.5+.5;gl_Position=vec4(a,0,1);}
`;

  const frag = `
precision highp float;
varying vec2 uv;
uniform float time;
uniform vec2 res;
uniform float windU;
uniform float chopU;
uniform vec3 rip[8];

#define PI 3.14159265
#define TAU 6.28318530

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} 
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.-2.*f);
  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float fbm(vec2 p){
  float v=0.;float a=.5;
  for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.+7.3;a*=.5;}
  return v;
}

vec3 gerstner(vec2 pos,float amp,float wlen,vec2 dir,float speed,float steep){
  float k=TAU/wlen;
  float w=sqrt(9.8*k)*speed;
  float ph=dot(dir,pos)*k-w*time;
  float s=steep*amp*k;
  return vec3(dir.x*s*sin(ph),dir.y*s*sin(ph),amp*cos(ph));
}

float waveHeight(vec2 pos){
  float w=windU*.8+.2;
  float c=chopU*.8+.2;
  vec3 g=vec3(0);
  g+=gerstner(pos,0.08*w,3.2,normalize(vec2(1,.3)),1.,c*.8);
  g+=gerstner(pos,0.05*w,1.8,normalize(vec2(.7,.7)),1.1,c*.6);
  g+=gerstner(pos,0.03*w,0.9,normalize(vec2(-.3,1.)),1.2,c*.5);
  g+=gerstner(pos,0.02*w,0.5,normalize(vec2(.5,-.8)),0.9,c*.4);
  g+=gerstner(pos,0.015*w,0.3,normalize(vec2(-.7,.4)),1.3,c*.3);
  float h=g.z+fbm(pos*.4+vec2(time*.03,time*.02))*.04*w;
  for(int i=0;i<8;i++){
    if(rip[i].z<=0.)continue;
    float d=length(pos-rip[i].xy)*3.;
    float age=rip[i].z;
    float spread=age*8.;
    float env=exp(-pow(d-spread,2.)*1.5)*exp(-age*.7);
    h+=sin(d*8.-time*6.)*env*.12*rip[i].z;
  }
  return h;
}

vec3 getNormal(vec2 pos){
  float eps=0.015;
  float hx=waveHeight(pos+vec2(eps,0))-waveHeight(pos-vec2(eps,0));
  float hz=waveHeight(pos+vec2(0,eps))-waveHeight(pos-vec2(0,eps));
  return normalize(vec3(-hx,1.,-hz));
}

vec3 getSky(vec3 dir){
  float y=clamp(dir.y,0.,1.);
  float sun=pow(max(0.,dot(dir,normalize(vec3(.6,.4,.2)))),200.);
  float sunGlow=pow(max(0.,dot(dir,normalize(vec3(.6,.4,.2)))),8.);
  vec3 top=vec3(.1,.3,.6);
  vec3 bot=vec3(.5,.7,.9);
  vec3 sky=mix(bot,top,y);
  return sky+sun*vec3(1.,.95,.7)*2.+sunGlow*vec3(.8,.7,.3)*.3;
}

vec3 getWaterColor(){
  return vec3(.02,.07,.15);
}

vec3 getDeepColor(){
  return vec3(.005,.03,.07);
}

void main(){
  vec2 ndc=uv*2.-1.;
  ndc.x*=res.x/res.y;
  float fov=.7;
  vec3 rayDir=normalize(vec3(ndc.x*fov,ndc.y*fov,-1.));
  vec3 camPos=vec3(0.,1.2,3.);
  vec3 col=vec3(0);
  float hit=0.;
  float tstep=0.;
  vec3 wpos=vec3(0);
  for(int i=0;i<80;i++){
    wpos=camPos+rayDir*(tstep+.2);
    float h=waveHeight(wpos.xz)*.5+.0;
    if(wpos.y<h){hit=1.;break;}
    float dist=max(.02,abs(wpos.y-h)*.5);
    tstep+=dist;
    if(tstep>30.)break;
  }
  if(hit>.5){
    vec3 n=getNormal(wpos.xz);
    vec3 view=normalize(camPos-wpos);
    vec3 reflDir=reflect(-view,n);
    reflDir.y=abs(reflDir.y);
    vec3 skyCol=getSky(reflDir);
    float fresnel=pow(1.-max(0.,dot(view,n)),4.);
    fresnel=mix(.04,1.,fresnel);
    float depth=clamp((wpos.y+.3)/.6,0.,1.);
    vec3 waterCol=mix(getDeepColor(),getWaterColor(),depth);
    float h2=waveHeight(wpos.xz);
    float foam=smoothstep(.3,.5,h2)*fbm(wpos.xz*4.+time*.5)*.5;
    vec3 lightDir=normalize(vec3(.6,.8,.3));
    float spec=pow(max(0.,dot(reflect(-lightDir,n),view)),80.);
    vec3 specCol=vec3(1.,.95,.7)*2.;
    col=mix(waterCol,skyCol,fresnel)+spec*specCol+foam*vec3(.9,.95,1.);
  } else {
    col=getSky(rayDir);
  }
  col=pow(max(col,vec3(0)),vec3(.45));
  gl_FragColor=vec4(col,1);
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
  const uRip = gl.getUniformLocation(prog, "rip");

  document
    .getElementById("wind")
    .addEventListener("input", (e) => (wind = e.target.value / 100));
  document
    .getElementById("chop")
    .addEventListener("input", (e) => (chop = e.target.value / 100));

  let dragging = false;
  function toNDC(e) {
    const r = canvas.getBoundingClientRect();
    const cx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const cy = -(((e.clientY - r.top) / r.height) * 2 - 1);
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
    if (ripples.length < 8) ripples.push([worldX, worldZ, 1]);
  }
  canvas.addEventListener("mousedown", (e) => {
    dragging = true;
    addRipple(e);
  });
  canvas.addEventListener("mousemove", (e) => {
    if (dragging) addRipple(e);
  });
  canvas.addEventListener("mouseup", () => (dragging = false));
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      dragging = true;
      addRipple(e.touches[0]);
    },
    { passive: false },
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      if (dragging) addRipple(e.touches[0]);
    },
    { passive: false },
  );
  canvas.addEventListener("touchend", () => (dragging = false));

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
    gl.uniform3fv(uRip, ripArr);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
