import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=root;const html=await readFile(path.join(dist,'index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'Duplicate HTML ID');
for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const value=match[1];if(value.startsWith('#'))assert(ids.includes(value.slice(1)),`Missing anchor: ${value}`);
  else if(!/^(https?:|data:|mailto:)/.test(value))assert((await stat(path.join(dist,value))).isFile(),`Missing asset: ${value}`);
}
for(const name of ['app.js','viewer.js']){
  const source=await readFile(path.join(dist,name),'utf8');
  for(const match of source.matchAll(/getElementById\('([^']+)'\)|\$\('#([\w-]+)'\)/g))assert(ids.includes(match[1]||match[2]),`Missing script target: ${match[1]||match[2]}`);
}
const threeURL=pathToFileURL(path.join(dist,'vendor/three.module.js')).href;
const loaderSource=(await readFile(path.join(dist,'vendor/STLLoader.js'),'utf8')).replace("from 'three'",`from '${threeURL}'`);
const {STLLoader}=await import('data:text/javascript;base64,'+Buffer.from(loaderSource).toString('base64'));
const data=await readFile(path.join(dist,'assets/tent.stl'));
const geometry=new STLLoader().parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
const count=geometry.getAttribute('position').count/3;const parts=JSON.parse(await readFile(path.join(dist,'assets/model-parts.json'),'utf8'));
assert.equal(count,8910,'Unexpected model triangle count');assert.equal(parts.triangleCount,count);assert.equal(parts.materialByFace.length,count);assert(parts.materialByFace.every(x=>x===0||x===1));assert(parts.materialByFace.some(x=>x===1));
geometry.computeBoundingBox();for(const key of ['x','y','z'])assert(Number.isFinite(geometry.boundingBox.min[key])&&Number.isFinite(geometry.boundingBox.max[key]));
const {features,audiences}=await import(pathToFileURL(path.join(dist,'content.js')).href);
assert.equal(Object.keys(features).length,3);assert.equal(Object.keys(audiences).length,4);
for(const name of ['OrbitControls.js','RoomEnvironment.js']){
  const source=(await readFile(path.join(dist,'vendor',name),'utf8')).replace("from 'three'",`from '${threeURL}'`);
  const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));assert(module[ name.replace('.js','') ]);
}
const css=await readFile(path.join(dist,'styles.css'),'utf8');assert.equal([...css.matchAll(/{/g)].length,[...css.matchAll(/}/g)].length);assert(css.includes('prefers-reduced-motion'));assert(css.includes('max-width:640px'));
const guide=await readFile(path.join(dist,'presenting.html'),'utf8');
const guideIds=[...guide.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
for(const match of guide.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const value=match[1];if(value.startsWith('#'))assert(guideIds.includes(value.slice(1)),`Missing guide anchor: ${value}`);
  else if(!/^(https?:|data:|mailto:)/.test(value)){
    const url=new URL(value,'https://local.invalid/');let pathname=url.pathname;if(pathname.endsWith('/'))pathname+='index.html';
    assert((await stat(path.join(dist,pathname.slice(1)))).isFile(),`Missing guide asset: ${value}`);
    if(url.hash&&pathname.endsWith('index.html'))assert(ids.includes(url.hash.slice(1)),`Missing product section: ${value}`);
  }
}
console.log('PASS: local assets, anchor and script targets, Three.js helper imports, real STL parsing (8,910 triangles), material mapping, interactive content, and CSS structure.');
console.log('Browser interaction and visual rendering require a separate browser smoke test.');
