import { cameraPosition, clamp, diffuseColor, dot, fwidth, length, max, mix, normalize, normalWorld, positionWorld, pow, smoothstep, uniform, vec3, vec4 } from 'three/tsl';
import * as THREE from 'three';

// Limited experiment for the default opaque beast style with no shadow,
// environment reflection or fur-light mask. Not a general AfricanToon port.
export function createBeastToonOutput() {
  const night = uniform(0), sun = uniform(new THREE.Vector3(-6, 12, 9).normalize());
  const n = normalize(normalWorld), view = normalize(cameraPosition.sub(positionWorld));
  const albedo = diffuseColor.rgb;
  const keyDir = normalize(view.mul(.62).add(vec3(0, .82, 0)).add(sun.mul(.16)));
  const key = smoothstep(-.18, .92, dot(n, keyDir));
  const keyColor = mix(vec3(1.16, 1.04, .88), vec3(.70, .61, .49), night);
  const fillColor = mix(vec3(.22, .23, .25), vec3(.15, .17, .21), night);
  let light = albedo.mul(fillColor.add(keyColor.mul(key.mul(.78).add(.22))));
  const nv = max(dot(n, view), 0);
  const rim = pow(clamp(nv.oneMinus(), 0, 1), 2.8).mul(smoothstep(-.30, .55, n.y));
  light = light.add(max(albedo, vec3(0)).sqrt().mul(vec3(.11, .15, .21)).mul(rim).mul(mix(.45, .85, night)));
  const exposure = light.max(0);
  let color = pow(clamp(exposure.mul(exposure.mul(2.51).add(.03)).div(exposure.mul(exposure.mul(2.43).add(.59)).add(.14)), 0, 1), 1 / 2.2);
  const luminance = dot(color, vec3(.299, .587, .114)); color = mix(vec3(luminance), color, 1.08);
  const contrast = clamp(color.sub(.40).mul(1.10).add(.40), 0, 1);
  color = mix(color, contrast, smoothstep(vec3(.02), vec3(.14), color));
  const edge = smoothstep(.30, .68, length(fwidth(n)).mul(2));
  color = color.mul(edge.mul(.10).oneMinus());
  return { night, sun, output: vec4(pow(max(color, vec3(0)), 2.2), diffuseColor.a) };
}
