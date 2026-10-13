import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { STLLoader } from './vendor/STLLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { features } from './content.js';
import { fitPosition } from './viewer-math.js';

// The supplied STL remains byte-for-byte unchanged. Transforms only frame it for display.
export async function initViewer() {
  const stage=document.getElementById('viewer-stage');
  const surface=document.getElementById('viewer-surface');
  const autoButton=document.getElementById('rotation-toggle');
  const shield=document.getElementById('touch-shield');
  const done=document.getElementById('touch-done');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse=window.matchMedia('(pointer: coarse)');
  let renderer,controls,mesh,environment,frame,resizeObserver,visibilityObserver;
  const abort=new AbortController();
  const timeout=setTimeout(()=>abort.abort(),25000);
  try {
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
    renderer.setClearColor(0xf0f2ec,1);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.18;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label','3D model of the Calculated Visions shelter. Drag to rotate. Arrow keys rotate, plus and minus zoom, and R resets the view.');
    canvas.setAttribute('aria-describedby','viewer-instructions');surface.replaceChildren(canvas);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(38,1,.05,50);
    controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;
    controls.enablePan=false;controls.minDistance=2.6;controls.maxDistance=18;
    controls.maxPolarAngle=Math.PI/2-.045;controls.minPolarAngle=.1;
    controls.rotateSpeed=.7;controls.zoomSpeed=.65;controls.autoRotate=false;controls.autoRotateSpeed=.8;controls.enableZoom=false;
    controls.target.set(0,.65,0);
    camera.position.set(-3.9,2.5,5.4);controls.update();
    const room=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);
    environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff,0x849286,2.0));
    const light=new THREE.DirectionalLight(0xfff5e7,3.2);light.position.set(-3,6,4);light.castShadow=true;
    light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:15});light.shadow.bias=-.0003;light.shadow.normalBias=.035;scene.add(light);
    const fill=new THREE.DirectionalLight(0xe6f3ff,1.2);fill.position.set(4,2,-3);scene.add(fill);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x586655,opacity:.19}));floor.rotation.x=-Math.PI/2;floor.position.y=-.016;floor.receiveShadow=true;scene.add(floor);
    const [modelResponse,partsResponse]=await Promise.all([fetch('./assets/tent.stl',{signal:abort.signal}),fetch('./assets/model-parts.json',{signal:abort.signal})]);
    if(!modelResponse.ok||!partsResponse.ok)throw new Error('Model asset could not be loaded.');
    const [buffer,parts]=await Promise.all([modelResponse.arrayBuffer(),partsResponse.json()]);clearTimeout(timeout);
    const geometry=new STLLoader().parse(buffer);const positions=geometry.getAttribute('position');
    if(!positions||positions.count/3!==parts.triangleCount)throw new Error('Model integrity check failed.');
    const silver=new THREE.Color('#b9c3c2'),orange=new THREE.Color('#e47e30');
    const colors=new Float32Array(positions.count*3);
    for(let i=0;i<positions.count;i++){const color=parts.materialByFace[Math.floor(i/3)]===1?orange:silver;color.toArray(colors,i*3);}
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    geometry.rotateX(-Math.PI/2);geometry.computeBoundingBox();
    const bounds=geometry.boundingBox.clone();const center=bounds.getCenter(new THREE.Vector3());const size=bounds.getSize(new THREE.Vector3());const scale=3/Math.max(size.x,size.y,size.z);
    geometry.translate(-center.x,-bounds.min.y,-center.z);geometry.scale(scale,scale,scale);geometry.computeBoundingSphere();
    const material=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.32,roughness:.47,side:THREE.DoubleSide});
    mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
    let visible=true,last=0,needsRender=true,activeFeature='shell',touchActive=false,animation=null,expanded=false,failed=false;
    const defaultPosition=new THREE.Vector3(-3.9,2.5,5.4);
    const views={perspective:defaultPosition,entrance:new THREE.Vector3(0,1.9,6.2),module:new THREE.Vector3(-6.3,2.2,1.8),rear:new THREE.Vector3(2.8,2.2,-5.7)};
    const markerContainer=document.getElementById('model-hotspots');markerContainer.replaceChildren();
    const markers=Object.entries(features).map(([id,item])=>{
      const point=new THREE.Vector3(...item.point).applyAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2).sub(new THREE.Vector3(center.x,bounds.min.y,center.z)).multiplyScalar(scale);
      const button=document.createElement('button');button.className='hotspot'+(id==='shell'?' active':'');button.type='button';button.textContent=item.number;button.setAttribute('aria-label',item.label);button.setAttribute('aria-pressed',String(id==='shell'));button.dataset.id=id;
      button.title=item.label;
      button.addEventListener('click',()=>{stopAuto();document.dispatchEvent(new CustomEvent('cv:hotspot',{detail:id}));});markerContainer.appendChild(button);return{id,point,button};
    });
    const projected=new THREE.Vector3(),raycaster=new THREE.Raycaster(),direction=new THREE.Vector3();
    function updateMarkers(){
      const w=stage.clientWidth,h=stage.clientHeight;
      markers.forEach(({point,button})=>{
        projected.copy(point).project(camera);
        direction.subVectors(point,camera.position);const distance=direction.length();raycaster.set(camera.position,direction.normalize());const hit=raycaster.intersectObject(mesh,false)[0];
        const hidden=projected.z>1||projected.z< -1||Math.abs(projected.x)>.96||Math.abs(projected.y)>.9||(hit&&hit.distance<distance-.10);
        button.setAttribute('aria-hidden',String(!!hidden));button.tabIndex=hidden?-1:0;
        button.style.left=`${(projected.x*.5+.5)*w}px`;button.style.top=`${(-projected.y*.5+.5)*h}px`;
      });
    }
    function draw(time=0){
      frame=null;if(!visible||document.hidden||failed)return;
      const delta=last?Math.min((time-last)/1000,.05):1/60;last=time;
      if(animation){const t=Math.min((time-animation.start)/450,1),ease=1-Math.pow(1-t,3);camera.position.lerpVectors(animation.from,animation.to,ease);if(t===1)animation=null;needsRender=true;}
      const changed=controls.update(delta);
      if(changed||needsRender||controls.autoRotate||animation){renderer.render(scene,camera);updateMarkers();needsRender=false;}
      if((changed||controls.autoRotate||animation)&&!frame)frame=requestAnimationFrame(draw);
    }
    function requestDraw(){needsRender=true;if(!frame&&visible&&!document.hidden&&!failed)frame=requestAnimationFrame(draw);}
    function stopAuto(){controls.autoRotate=false;autoButton.setAttribute('aria-pressed','false');}
    function setView(name){
      if(failed)return;
      stopAuto();const direction=(views[name]||defaultPosition).clone().sub(controls.target);
      const target=fitPosition(geometry,controls.target,direction,camera.aspect,camera.fov);
      if(reduced.matches)camera.position.copy(target);else animation={from:camera.position.clone(),to:target.clone(),start:performance.now()};
      document.querySelectorAll('[data-preset]').forEach(b=>{const chosen=b.dataset.preset===name;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));});requestDraw();
    }
    function zoom(multiplier){stopAuto();animation=null;const v=camera.position.clone().sub(controls.target);v.setLength(THREE.MathUtils.clamp(v.length()*multiplier,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(v);requestDraw();}
    controls.addEventListener('change',requestDraw);
    controls.addEventListener('start',()=>{stopAuto();animation=null;requestDraw();});
    canvas.addEventListener('pointerdown',()=>{canvas.focus({preventScroll:true});controls.enableZoom=true;});
    canvas.addEventListener('focus',()=>{controls.enableZoom=true;});canvas.addEventListener('blur',()=>{controls.enableZoom=touchActive;});
    canvas.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','r','R'].includes(event.key))return;
      event.preventDefault();stopAuto();animation=null;
      if(event.key==='r'||event.key==='R'){setView('perspective');return;}
      if(['+','=','-'].includes(event.key)){zoom(event.key==='-'?1.15:1/1.15);return;}
      const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      if(event.key==='ArrowLeft')spherical.theta-=.12;if(event.key==='ArrowRight')spherical.theta+=.12;
      if(event.key==='ArrowUp')spherical.phi-=.10;if(event.key==='ArrowDown')spherical.phi+=.10;
      spherical.phi=THREE.MathUtils.clamp(spherical.phi,controls.minPolarAngle,controls.maxPolarAngle);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));requestDraw();
    });
    document.querySelectorAll('[data-preset]').forEach(button=>{button.disabled=false;button.addEventListener('click',()=>setView(button.dataset.preset));});
    document.querySelectorAll('[data-viewer]').forEach(button=>button.disabled=false);
    document.querySelector('[data-viewer="reset"]').addEventListener('click',()=>setView('perspective'));
    document.querySelector('[data-viewer="zoom-in"]').addEventListener('click',()=>zoom(1/1.2));
    document.querySelector('[data-viewer="zoom-out"]').addEventListener('click',()=>zoom(1.2));
    autoButton.disabled=false;autoButton.addEventListener('click',()=>{animation=null;controls.autoRotate=!controls.autoRotate;autoButton.setAttribute('aria-pressed',String(controls.autoRotate));requestDraw();});
    reduced.addEventListener('change',()=>{if(reduced.matches)stopAuto();});
    document.addEventListener('cv:feature',event=>{
      if(failed)return;
      activeFeature=event.detail;markers.forEach(({id,button})=>{button.classList.toggle('active',id===activeFeature);button.setAttribute('aria-pressed',String(id===activeFeature));});
      setView(activeFeature==='cooling'?'module':activeFeature==='entry'?'entrance':'perspective');
    });
    function setTouch(active){if(failed)return;touchActive=active;shield.hidden=!coarse.matches||active;done.hidden=!coarse.matches||!active;controls.enabled=!coarse.matches||active;controls.enableZoom=active||document.activeElement===canvas;canvas.style.touchAction=coarse.matches&&!active?'pan-y':'none';}
    shield.addEventListener('click',()=>{stopAuto();setTouch(true);canvas.focus({preventScroll:true});});done.addEventListener('click',()=>{setTouch(false);stopAuto();shield.focus({preventScroll:true});});coarse.addEventListener('change',()=>setTouch(false));setTouch(false);
    const fullscreenButton=document.querySelector('[data-viewer="fullscreen"]');
    function updateFullscreen(){const full=!!document.fullscreenElement||expanded;fullscreenButton.setAttribute('aria-label',full?'Exit full screen':'Enter full screen');fullscreenButton.title=full?'Exit full screen':'Full screen';requestDraw();}
    fullscreenButton.addEventListener('click',async()=>{
      stopAuto();animation=null;
      if(document.fullscreenElement){await document.exitFullscreen();return;}
      if(expanded){expanded=false;stage.classList.remove('viewer-expanded');document.body.style.overflow='';updateFullscreen();return;}
      try{if(!stage.requestFullscreen)throw new Error('No native fullscreen');await stage.requestFullscreen();}
      catch{expanded=true;stage.classList.add('viewer-expanded');document.body.style.overflow='hidden';updateFullscreen();}
    });
    document.addEventListener('fullscreenchange',updateFullscreen);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&expanded){expanded=false;stage.classList.remove('viewer-expanded');document.body.style.overflow='';updateFullscreen();fullscreenButton.focus();}
      if(event.key==='Tab'&&expanded){
        const focusable=[...stage.querySelectorAll('button:not(:disabled),canvas')].filter(el=>!el.hidden&&el.getAttribute('aria-hidden')!=='true'&&el.getClientRects().length);
        const first=focusable[0],last=focusable.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    });
    function resize(){
      const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h||failed)return;
      camera.aspect=w/h;camera.updateProjectionMatrix();
      animation=null;camera.position.copy(fitPosition(geometry,controls.target,camera.position.clone().sub(controls.target),camera.aspect,camera.fov));
      controls.update();renderer.setSize(w,h,false);requestDraw();
    }
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
    visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=0;requestDraw();}else{if(frame)cancelAnimationFrame(frame);frame=null;}},{rootMargin:'50px'});visibilityObserver.observe(stage);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){last=0;requestDraw();}});
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();failed=true;stopAuto();animation=null;controls.enabled=false;
      if(frame)cancelAnimationFrame(frame);frame=null;resizeObserver?.disconnect();visibilityObserver?.disconnect();
      if(document.fullscreenElement===stage)document.exitFullscreen().catch(()=>{});
      expanded=false;stage.classList.remove('ready','viewer-expanded');document.body.style.overflow='';
      document.getElementById('viewer-error').hidden=false;document.getElementById('model-state').textContent='CONCEPT IMAGE';
      markerContainer.hidden=true;shield.hidden=true;done.hidden=true;
      document.querySelectorAll('[data-viewer],[data-preset],#rotation-toggle').forEach(b=>b.disabled=true);
    });
    stage.classList.add('ready');document.getElementById('viewer-loading').hidden=true;document.getElementById('model-state').textContent='LIVE CAD MODEL';resize();
  }catch(error){
    clearTimeout(timeout);abort.abort();if(frame)cancelAnimationFrame(frame);resizeObserver?.disconnect();visibilityObserver?.disconnect();controls?.dispose();mesh?.geometry.dispose();mesh?.material.dispose();environment?.dispose();renderer?.dispose();surface.replaceChildren();throw error;
  }
}
