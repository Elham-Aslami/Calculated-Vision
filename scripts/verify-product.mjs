import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { fitPosition } from '../viewer-math.js';
import { features } from '../content.js';
import { prepareInquiry, formatInquiry, interestAreas } from '../inquiry.js';

const buffer = await readFile(new URL('../assets/tent.stl', import.meta.url));
assert.equal(createHash('sha256').update(buffer).digest('hex'), 'c871f4e9f782d3e60b1da1bb34efe91a6fcd5ec69c6a90239bc342a2884d7074', 'The supplied STL must remain byte-for-byte intact.');
const threeURL = new URL('../vendor/three.module.js', import.meta.url).href;
const loaderText = (await readFile(new URL('../vendor/STLLoader.js', import.meta.url), 'utf8')).replace("from 'three'", `from '${threeURL}'`);
const { STLLoader } = await import('data:text/javascript;base64,' + Buffer.from(loaderText).toString('base64'));
const geometry = new STLLoader().parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
geometry.rotateX(-Math.PI / 2); geometry.computeBoundingBox();
const bounds = geometry.boundingBox.clone(), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
const scale = 3 / Math.max(size.x, size.y, size.z);
geometry.translate(-center.x, -bounds.min.y, -center.z); geometry.scale(scale, scale, scale);
const target = new THREE.Vector3(0, .65, 0);
const presets = { perspective: [-3.9, 2.5, 5.4], entrance: [0, 1.9, 6.2], module: [-6.3, 2.2, 1.8], rear: [2.8, 2.2, -5.7] };
const screens = { phone320: [286, 440], phone390: [349, 440], tablet: [691, 500], desktop: [780, 620], fullscreenPortrait: [390, 844], fullscreenLandscape: [1440, 900] };
const positions = geometry.getAttribute('position'), point = new THREE.Vector3();
let checked = 0;
for (const [screen, [width, height]] of Object.entries(screens)) {
  for (const [view, position] of Object.entries(presets)) {
    const camera = new THREE.PerspectiveCamera(38, width / height, .05, 50);
    camera.position.copy(fitPosition(geometry, target, new THREE.Vector3(...position).sub(target), camera.aspect));
    camera.lookAt(target); camera.updateMatrixWorld();
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).project(camera);
      assert(Math.abs(point.x) <= .82001 && Math.abs(point.y) <= .62001 && point.z > -1 && point.z < 1, `Clipped vertex: ${screen}/${view}`);
    }
    checked++;
  }
}
const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); mesh.updateMatrixWorld();
const camera = new THREE.PerspectiveCamera(38, 1, .05, 50), ray = new THREE.Raycaster();
for (const [feature, view] of [['shell', 'perspective'], ['shell', 'entrance'], ['entry', 'entrance'], ['cooling', 'module']]) {
  camera.position.copy(fitPosition(geometry, target, new THREE.Vector3(...presets[view]).sub(target), 1));
  camera.lookAt(target); camera.updateMatrixWorld();
  const marker = new THREE.Vector3(...features[feature].point).applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2).sub(new THREE.Vector3(center.x, bounds.min.y, center.z)).multiplyScalar(scale);
  const direction = marker.clone().sub(camera.position), distance = direction.length();
  ray.set(camera.position, direction.normalize()); const hit = ray.intersectObject(mesh)[0];
  assert(!hit || hit.distance >= distance - .1, `${feature} marker is hidden in its useful view.`);
}
const good = { name: '  Example Visitor  ', email: 'visitor@example.org', interest: interestAreas[1], message: '<script>sample text</script>' };
const prepared = prepareInquiry(good);
assert(prepared.valid); assert.equal(prepared.data.name, 'Example Visitor');
assert.match(formatInquiry(prepared.data), /has NOT been sent/);
assert.match(formatInquiry(prepared.data), /Organization: Not provided/);
for (const bad of [{ ...good, name: '   ' }, { ...good, email: 'wrong-address' }, { ...good, interest: 'Purchase now' }, { ...good, message: 'x'.repeat(1201) }]) assert(!prepareInquiry(bad).valid);
console.log(`PASS: original STL hash; all vertices fit in ${checked} camera/screen combinations; feature marker visibility; valid, invalid, whitespace, and length-limited demo inquiries.`);
console.log('These are source and geometry checks, not a browser rendering or interaction test.');
