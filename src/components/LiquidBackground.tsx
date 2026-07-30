import { useEffect, useRef } from "react";

type LiquidBackgroundProps = {
  className?: string;
};

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/*
 * Very soft calm holo liquid — no folds/contours.
 * One organic glow source slowly morphs under the center.
 */
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_animate;
uniform sampler2D u_liquid;

in vec2 v_uv;
out vec4 fragColor;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439
  );
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float softNoise(vec2 p) {
  return snoise(p) * 0.7 + snoise(p * 1.5 + vec2(1.7, 2.3)) * 0.3;
}

vec3 sampleSoft(sampler2D tex, vec2 uv, vec2 px) {
  /* Wide soft blur — erases any residual contour */
  return
    texture(tex, uv).rgb * 0.28 +
    texture(tex, uv + vec2(px.x, 0.0)).rgb * 0.12 +
    texture(tex, uv - vec2(px.x, 0.0)).rgb * 0.12 +
    texture(tex, uv + vec2(0.0, px.y)).rgb * 0.12 +
    texture(tex, uv - vec2(0.0, px.y)).rgb * 0.12 +
    texture(tex, uv + px).rgb * 0.08 +
    texture(tex, uv - px).rgb * 0.08 +
    texture(tex, uv + vec2(px.x, -px.y)).rgb * 0.08 +
    texture(tex, uv + vec2(-px.x, px.y)).rgb * 0.08;
}

void main() {
  vec2 uv = v_uv;
  uv.y = 1.0 - uv.y;

  float t = u_time * u_animate;

  float texAspect = 1024.0 / 1536.0;
  float screenAspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 cover = uv;
  if (screenAspect > texAspect) {
    float s = texAspect / screenAspect;
    cover.y = (uv.y - 0.5) * s + 0.5;
  } else {
    float s = screenAspect / texAspect;
    cover.x = (uv.x - 0.5) * s + 0.5;
  }

  vec2 center = vec2(0.5);
  vec2 fromCenter = (uv - center) * vec2(1.05, 0.88);
  float dist = length(fromCenter);

  /*
   * Compact core glow with more obvious organic morph.
   */
  float angle = atan(fromCenter.y, fromCenter.x);
  float morph = softNoise(fromCenter * 1.6 + t * 0.22);
  float shapeWobble =
    0.55 * softNoise(vec2(cos(angle), sin(angle)) * 1.0 + t * 0.28) +
    0.45 * softNoise(fromCenter * 2.1 - t * 0.18);
  float breath = 0.5 + 0.5 * sin(t * 0.7);

  /* Organic radius — clearer shape change over time */
  float glowRadius = 0.15 + 0.08 * shapeWobble + 0.035 * breath;
  float core = smoothstep(glowRadius, 0.0, dist);
  float coreSoft = smoothstep(glowRadius * 1.85, glowRadius * 0.08, dist);

  /* Stronger center warp + soft field drift so motion reads clearly */
  vec2 radial = fromCenter / max(dist, 1e-3);
  vec2 tangential = vec2(-radial.y, radial.x);
  float warpAmt = coreSoft * (0.08 + 0.045 * breath);
  vec2 warp =
    radial * morph * warpAmt +
    tangential * shapeWobble * warpAmt * 0.95;

  /* Gentle whole-field liquid drift (still calm, but noticeable) */
  float fieldDrift = softNoise(uv * 0.7 + t * 0.12);
  warp += vec2(
    softNoise(uv * 0.55 + t * 0.1),
    softNoise(uv * 0.55 - t * 0.08 + 2.1)
  ) * 0.018;

  float zoom = 1.0 - core * (0.05 + 0.035 * breath) - fieldDrift * 0.012;
  vec2 sampleUv = clamp(center + (cover - center) * zoom + warp, 0.01, 0.99);

  vec2 px = 2.8 / u_resolution;
  vec3 color = sampleSoft(u_liquid, sampleUv, px);

  /* Slightly more contrast — less pearl flattening */
  vec3 pearl = vec3(0.95, 0.96, 0.97);
  color = mix(color, pearl, 0.08);
  color = (color - 0.5) * 1.12 + 0.5;

  /* Compact soft glow under center — warm + emerald scent */
  float glow = core * (0.55 + 0.45 * breath + morph * 0.25);
  color += vec3(1.0, 0.98, 0.92) * glow * 0.22;
  color += vec3(0.05, 0.66, 0.36) * glow * 0.07;

  /* Soft hue refraction — a bit more present, still calm */
  float hue = 0.5 + 0.5 * softNoise(uv * 0.85 + t * 0.06);
  vec3 emerald = vec3(0.05, 0.66, 0.36);
  vec3 pink = vec3(1.0, 0.62, 0.68);
  vec3 lavender = vec3(0.72, 0.68, 0.92);
  vec3 softHolo = mix(emerald, pink, smoothstep(0.2, 0.75, hue));
  softHolo = mix(softHolo, lavender, 0.28 * smoothstep(0.55, 1.0, hue));
  color += softHolo * (0.035 + core * 0.05 + abs(fieldDrift) * 0.02);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

function loadTexture(
  gl: WebGL2RenderingContext,
  url: string
): Promise<WebGLTexture | null> {
  return new Promise((resolve) => {
    const texture = gl.createTexture();
    if (!texture) {
      resolve(null);
      return;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([240, 242, 242, 255])
    );

    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      resolve(texture);
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export function LiquidBackground({ className }: LiquidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) return;

    const posLoc = gl.getAttribLocation(program, "a_position");
    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const timeLoc = gl.getUniformLocation(program, "u_time");
    const animateLoc = gl.getUniformLocation(program, "u_animate");
    const liquidLoc = gl.getUniformLocation(program, "u_liquid");

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const animate = reducedMotion ? 0 : 1;
    const start = performance.now();
    let frozenTime = 0;
    let texture: WebGLTexture | null = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth, clientHeight } = canvas;
      if (clientWidth === 0 || clientHeight === 0) return;

      canvas.width = Math.floor(clientWidth * dpr);
      canvas.height = Math.floor(clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (now: number) => {
      if (disposed) return;
      const elapsed = (now - start) / 1000;
      if (animate) {
        frozenTime = elapsed;
      }

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      if (texture) gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(liquidLoc, 0);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, frozenTime);
      gl.uniform1f(animateLoc, animate);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      rafRef.current = requestAnimationFrame(render);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    void loadTexture(gl, "/assets/liquid-metal-ref.png").then((tex) => {
      if (disposed) {
        if (tex) gl.deleteTexture(tex);
        return;
      }
      texture = tex;
      rafRef.current = requestAnimationFrame(render);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      if (texture) gl.deleteTexture(texture);
    };
  }, []);

  return (
    <div
      className={["liquid-bg", className].filter(Boolean).join(" ")}
      aria-hidden
    >
      <canvas ref={canvasRef} className="liquid-bg__canvas" />
      <div className="liquid-bg__veil" />
    </div>
  );
}
