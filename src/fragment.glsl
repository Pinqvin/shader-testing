#version 300 es
precision highp float;

uniform vec2 res;
uniform float time;

out vec4 outColor;

void main() {
  outColor = vec4(fract(gl_FragCoord.xy / res), fract(time), 1);
}