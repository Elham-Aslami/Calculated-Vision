import { Vector3, MathUtils } from './vendor/three.module.js';

// Frame every original vertex, leaving space for the overlaid viewer controls.
// This only positions the camera; it never changes the model's proportions.
export function fitPosition(geometry, target, direction, aspect, fov = 38) {
  const back = direction.clone().normalize();
  const right = new Vector3(0, 1, 0).cross(back).normalize();
  const up = back.clone().cross(right).normalize();
  const tanV = Math.tan(MathUtils.degToRad(fov / 2));
  const tanH = tanV * Math.max(aspect, 0.1);
  const point = new Vector3();
  const positions = geometry.getAttribute('position');
  let distance = 2.6;
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).sub(target);
    const depth = point.dot(back);
    distance = Math.max(distance,
      depth + Math.abs(point.dot(right)) / (tanH * 0.82),
      depth + Math.abs(point.dot(up)) / (tanV * 0.62));
  }
  return target.clone().addScaledVector(back, distance);
}
