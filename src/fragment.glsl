#version 300 es
precision highp float;

uniform vec2 res;
uniform float time;

out vec4 outColor;

// https://iquilezles.org/articles/distfunctions2d/
float circle(in vec2 point, in float radius) {
  return length(point) - radius;
}

void main() {
  vec2 coord = (2.0f * gl_FragCoord.xy - res) / res.y;

  float distance = circle(coord, 0.5f);

  vec3 outsideColor = vec3(0.0f, 0.56f, 0.85f);
  vec3 insideColor = vec3(0.66f, 0.45f, 0.07f);

  // Circle
  vec3 color = distance > 0.0f ? outsideColor : insideColor;
  // Shadow
  color *= 1.0f - exp(-6.0f * abs(distance));
  // Waves
  color *= 0.8f + 0.2f * cos(150.0f * distance - 10.0f * time);
  // Border
  color = mix(color, vec3(1.0f), 1.0f - smoothstep(0.0f, 0.01f, abs(distance)));

  outColor = vec4(color, 1);
}