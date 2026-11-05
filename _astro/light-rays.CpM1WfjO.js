var e=4,t=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uScale;
uniform float uTime;
uniform vec2 uSource;
uniform vec2 uAim;
uniform float uReach;
uniform vec3 uColor;
uniform float uSpread;
uniform float uLength;
uniform float uFade;
uniform float uSaturation;
uniform float uPulsating;
uniform float uNoise;
uniform float uDistortion;
uniform float uDensity;
uniform float uSharpness;
uniform float uGlow;
uniform float uHaze;
uniform float uAtmosphere;
uniform float uIntensity;
uniform vec4 uShadow;
uniform vec4 uPulses[${e}];
uniform vec2 uIntro;
uniform float uLight;
uniform float uOpacity;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
}

float shape(float strength, float width) {
  float edge = max(mix(0.5, 0.08, uSharpness), width);
  return mix(strength, smoothstep(0.62 - edge, 0.62 + edge, strength), uSharpness);
}

void main() {
  vec2 coord = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uScale;
  vec2 delta = coord - uSource;
  float distance = length(delta);
  vec2 dir = delta / max(distance, 1e-4);
  float cosAngle = dot(dir, uAim);
  float angle = cosAngle + uDistortion * sin(uTime * 2.0 + distance * 0.02) * 0.2;
  float slope = fwidth(angle);
  float depth = distance / uReach;

  float source = exp(-depth * depth * 9.0) * 0.9 + exp(-depth * 3.2) * 0.25;
  float glowLight = uGlow * source * smoothstep(-0.2, 0.6, cosAngle);
  float spread = pow(max(angle, 0.0), 1.0 / uSpread);
  float lengthFalloff = clamp(1.0 - distance / (uReach * uLength), 0.0, 1.0);
  float fadeFalloff = clamp(1.0 - distance / (uReach * uFade), 0.5, 1.0);
  float envelope = spread * lengthFalloff * fadeFalloff;
  float reveal = uIntensity * uIntro.y * (1.0 - smoothstep(uIntro.x - 0.35, uIntro.x, depth));
  if ((envelope * 1.6 + glowLight) * reveal < 0.0015) {
    fragColor = vec4(0.0);
    return;
  }

  float phaseA = angle * 36.2214 * uDensity + uTime * 1.5;
  float phaseB = -angle * 21.11349 * uDensity + uTime * 1.5;
  float phaseC = angle * 22.3991 * uDensity + uTime * 1.1;
  float phaseD = -angle * 18.0234 * uDensity + uTime * 1.1;
  float strengthA = clamp(0.75 + 0.15 * sin(phaseA) + 0.2 * cos(phaseB), 0.0, 1.0);
  float strengthB = clamp(0.75 + 0.15 * sin(phaseC) + 0.2 * cos(phaseD), 0.0, 1.0);
  float widthA = abs(0.15 * 36.2214 * cos(phaseA) + 0.2 * 21.11349 * sin(phaseB)) * uDensity * slope;
  float widthB = abs(0.15 * 22.3991 * cos(phaseC) + 0.2 * 18.0234 * sin(phaseD)) * uDensity * slope;
  float pulseA = uPulsating > 0.5 ? 0.8 + 0.2 * sin(uTime * 4.5) : 1.0;
  float pulseB = uPulsating > 0.5 ? 0.8 + 0.2 * sin(uTime * 3.3) : 1.0;
  float rayLight = envelope * (0.5 * shape(strengthA, widthA) * pulseA + 0.4 * shape(strengthB, widthB) * pulseB);

  if (uHaze > 0.0) {
    float around = atan(uAim.x * dir.y - uAim.y * dir.x, cosAngle);
    vec2 drift = vec2(around * 2.2 + uTime * 0.035, depth * 2.6 - uTime * 0.11);
    float fog = 0.65 * valueNoise(drift * vec2(3.0, 1.0)) + 0.35 * valueNoise(drift * vec2(7.0, 2.3) + 4.1);
    rayLight *= mix(1.0, 0.25 + 1.2 * fog, uHaze);
  }

  if (uShadow.z > 0.0) {
    vec2 toCursor = uShadow.xy - uSource;
    float cursorDistance = length(toCursor);
    float along = dot(delta, toCursor) / max(cursorDistance * cursorDistance, 1e-4);
    float side = abs(delta.x * toCursor.y - delta.y * toCursor.x) / max(cursorDistance, 1e-4);
    float trail = max(along - 1.0, 0.0);
    float width = uShadow.w * along + 0.22 * trail * cursorDistance;
    float behind = smoothstep(0.97, 1.25, along) * exp(-trail * 1.1);
    float shade = (1.0 - smoothstep(width * 0.3, width * 1.6, side)) * behind;
    rayLight *= 1.0 - uShadow.z * 0.62 * shade;
  }

  float boost = 0.0;
  for (int i = 0; i < ${e}; i++) {
    vec4 wave = uPulses[i];
    if (wave.z <= 0.0) continue;
    float x = (depth - wave.x) / wave.y;
    boost += wave.z * exp(-x * x);
  }
  float light = (rayLight * (1.0 + boost) + glowLight) * reveal;

  if (uNoise > 0.0) {
    float n = fract(sin(dot(coord * 0.02 + uTime * 0.1, vec2(12.9898, 78.233))) * 43758.5453123);
    light *= 1.0 - uNoise + uNoise * n;
  }

  float near = clamp(1.2 - distance / (uResolution.y / uScale), 0.0, 1.0);
  vec3 tint = mix(vec3(0.9), vec3(0.1, 0.3, 0.5) + near * vec3(0.8, 0.6, 0.5), uAtmosphere);
  float gray = dot(tint, vec3(0.299, 0.587, 0.114));
  vec3 hue = max(mix(vec3(gray), tint, uSaturation), 0.0) * uColor;

  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uLight > 0.5) {
    vec3 color = hue * light;
    float energy = max(color.r, max(color.g, color.b));
    vec3 tone = clamp(1.0 - (1.0 - hue / max(max(hue.r, max(hue.g, hue.b)), 1e-4)) * 1.8, 0.0, 1.0);
    float warm = clamp((min(tone.r, tone.g) - tone.b) * 2.0, 0.0, 1.0);
    vec3 ink = tone * (mix(0.66, 0.94, warm) - 0.1 * smoothstep(0.4, 1.2, energy));
    float density = clamp(0.82 * (1.0 - exp(-1.5 * energy * energy)) * uOpacity + grain, 0.0, 1.0);
    fragColor = vec4(ink * density, density);
    return;
  }
  float level = light < 0.75 ? light : 0.75 + 0.25 * (1.0 - exp(-(light - 0.75) / 0.25));
  float top = max(hue.r, max(hue.g, hue.b));
  hue = mix(hue, vec3(top), smoothstep(0.8, 1.0, level) * 0.45);
  vec3 shown = clamp(hue * level, 0.0, 1.0) * level;
  fragColor = vec4(clamp(shown + grain, 0.0, level) * uOpacity, level * uOpacity);
}`,n=(e,t,n)=>Math.min(n,Math.max(t,e)),r=e=>{let t=n(e,0,1);return t*t*t*(t*(t*6-15)+10)};function i(e){let n=(t,n)=>{let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:null},r=n(e.VERTEX_SHADER,`#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`),i=n(e.FRAGMENT_SHADER,t);if(!r||!i)return null;let a=e.createProgram();if(e.attachShader(a,r),e.attachShader(a,i),e.linkProgram(a),!e.getProgramParameter(a,e.LINK_STATUS))return null;let o={},s=e.getProgramParameter(a,e.ACTIVE_UNIFORMS);for(let t=0;t<s;t++){let n=e.getActiveUniform(a,t);n&&(o[n.name.replace(/\[0\]$/,``)]=e.getUniformLocation(a,n.name))}return{program:a,u:o}}function a(t,a){let o=document.createElement(`canvas`);o.setAttribute(`aria-hidden`,`true`),t.append(o);let s=o.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1}),c=s&&i(s);if(!s||!c)return o.remove();let l=s.createVertexArray(),u={w:1,h:1,r:1},d={x:.5,y:.5,inside:!1,seen:!1},f={x:.5,y:.5},p={x:.5,y:.5,p:0},m=[],h=new Float32Array(16),g=0,_=0,v=0,y=0,b=!0,x=()=>{let e=t.getBoundingClientRect(),n=Math.max(1,e.width),r=Math.max(1,e.height),i=Math.min(devicePixelRatio||1,1.25,Math.sqrt(16e5/(n*r)));o.width=Math.round(n*i),o.height=Math.round(r*i),u.w=n,u.h=r,u.r=o.width/n},S=e=>{v=0;let t=n((e-y)/1e3||0,0,.05);y=e,g+=t*a.speed,_<1&&(_=Math.min(1,_+t/2.2));let i=1-Math.exp(-t/.35);f.x+=((d.seen?d.x:.5)-f.x)*i,f.y+=((d.seen?d.y:.5)-f.y)*i;let x=1-Math.exp(-t/.08);p.x+=(d.x-p.x)*x,p.y+=(d.y-p.y)*x,p.p+=(+!!d.inside-p.p)*(1-Math.exp(-t/.4));for(let e=m.length-1;e>=0;e--)(m[e].age+=t)>=2&&m.splice(e,1);h.fill(0),m.forEach((e,t)=>{h[t*4]=.05+e.age*1.05,h[t*4+1]=.14+e.age*.14,h[t*4+2]=.9*r(e.age/.15)*(1-r(e.age/2))});let{w:C,h:w}=u,T=a.anchor[0]*C,E=a.anchor[1]*w,D=a.dir[0],O=a.dir[1],k=f.x*C-T,A=f.y*w-E,j=Math.hypot(k,A)||1;D+=(k/j-D)*a.influence,O+=(A/j-O)*a.influence;let M=Math.hypot(D,O)||1,N=1-(1-_)**3,P=c.u;s.viewport(0,0,o.width,o.height),s.clearColor(0,0,0,0),s.clear(s.COLOR_BUFFER_BIT),s.useProgram(c.program),s.bindVertexArray(l),s.uniform2f(P.uResolution,o.width,o.height),s.uniform1f(P.uScale,u.r),s.uniform1f(P.uTime,g),s.uniform2f(P.uSource,T,E),s.uniform2f(P.uAim,D/M,O/M),s.uniform1f(P.uReach,Math.max(C,w)),s.uniform3f(P.uColor,...a.color),s.uniform1f(P.uSpread,a.spread),s.uniform1f(P.uLength,a.length),s.uniform1f(P.uFade,1),s.uniform1f(P.uSaturation,a.saturation),s.uniform1f(P.uPulsating,0),s.uniform1f(P.uNoise,0),s.uniform1f(P.uDistortion,0),s.uniform1f(P.uDensity,a.density),s.uniform1f(P.uSharpness,a.sharpness),s.uniform1f(P.uGlow,a.glow),s.uniform1f(P.uHaze,a.haze),s.uniform1f(P.uAtmosphere,a.atmosphere),s.uniform1f(P.uIntensity,a.intensity),s.uniform4f(P.uShadow,p.x*C,p.y*w,p.p,16),s.uniform4fv(P.uPulses,h),s.uniform2f(P.uIntro,N*2.6,r(_/.5)),s.uniform1f(P.uLight,0),s.uniform1f(P.uOpacity,a.opacity),s.drawArrays(s.TRIANGLES,0,3),b&&!document.hidden&&(v=requestAnimationFrame(S))},C=()=>{v||!b||document.hidden||(y=performance.now(),v=requestAnimationFrame(S))};addEventListener(`pointermove`,e=>{let n=t.getBoundingClientRect();d.x=(e.clientX-n.left)/n.width,d.y=(e.clientY-n.top)/n.height,d.inside=e.clientY>=n.top&&e.clientY<=n.bottom,d.seen=!0},{passive:!0}),addEventListener(`pointerdown`,n=>{let r=t.getBoundingClientRect();n.clientY>r.bottom||(m.push({age:0}),m.length>e&&m.shift())},{passive:!0}),new IntersectionObserver(e=>{b=e.some(e=>e.isIntersecting),C()}).observe(t),document.addEventListener(`visibilitychange`,C),new ResizeObserver(()=>{x(),C()}).observe(t),x(),C()}export{a as lightRays};