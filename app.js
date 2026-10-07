import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createMaterials, createEnvironment } from './materials.js';
import { createBuilding, DIMENSIONS } from './building.js';

const wrap=document.querySelector('#canvas-wrap'), stage=document.querySelector('.stage');
const $=s=>document.querySelector(s);
let renderer;
try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'}); }
catch(error){$('#loading').innerHTML='<div class="error">3D表示にはWebGL 2対応のブラウザが必要です。ブラウザのハードウェアアクセラレーションを有効にして再読み込みしてください。</div>';throw error;}
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
wrap.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','ドラッグしてサヴォア邸を回転');
const scene=new THREE.Scene();scene.background=new THREE.Color('#e5ebe6');
const camera=new THREE.PerspectiveCamera(37,1,.15,180);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.085;controls.minDistance=11;controls.maxDistance=78;controls.maxPolarAngle=Math.PI*.60;controls.target.set(0,3.8,0);
controls.autoRotateSpeed=.35;controls.enablePan=true;controls.screenSpacePanning=true;
const env=createEnvironment(renderer);scene.environment=env.texture;scene.environmentIntensity=.65;
const ambient=new THREE.HemisphereLight('#e9eef2','#afb3b5',1.45);scene.add(ambient);
const sun=new THREE.DirectionalLight('#fffaed',3.15);sun.castShadow=true;sun.shadow.camera.left=-32;sun.shadow.camera.right=32;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.camera.near=1;sun.shadow.camera.far=100;sun.shadow.bias=-.00022;sun.shadow.normalBias=.035;sun.shadow.radius=3;sun.position.set(-18,30,18);sun.target.position.set(0,2,0);scene.add(sun,sun.target);
const materials=createMaterials(),model=createBuilding(materials);scene.add(model.root);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshStandardMaterial({color:'#e5ebe6',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.48;ground.receiveShadow=true;scene.add(ground);
const presets={
  servicedoorleft:{position:[-12,3,-14],target:[-4,2.8,-5],fov:65,name:'1階の扉 / SERVICE DOOR',caption:'大窓脇の白い折返し壁と、黒い扉。',en:'THE BLACK DOOR IN THE WHITE RETURN WALL'},
  serviceside:{position:[12,3,-14],target:[4,2.8,-5],fov:65,name:'1階側面 / SERVICE WINDOWS',caption:'深い緑の壁と、クリーム色のルーバー・暗いガラスの小窓。',en:'TWO DIFFERENT WINDOWS IN THE GREEN WALL'},
  service:{position:[0,3.3,-31],target:[0,3.3,0],fov:45,name:'1階背面 / SERVICE FAÇADE',caption:'白い窓下壁、緑の側壁と、横桟を重ねた大きな建具。',en:'THE WHITE WINDOW APRON AND GREEN SERVICE WALLS'},
  exterior:{position:[31,18,35],target:[0,3.0,0],name:'外観 / PERSPECTIVE',caption:'ピロティが支える、自由なファサード。',en:'THE HOUSE ABOVE THE GROUND'},
  front:{position:[0,3.5,43],target:[0,4,0],name:'正面 / NORTHWEST',caption:'水平の窓と曲面がつくる、静かなリズム。',en:'A FREE FAÇADE, A CONTINUOUS HORIZON'},
  side:{position:[44,10,0],target:[0,4,0],name:'側面 / SOUTHWEST',caption:'風景を切り取る、庭園の連続開口。',en:'A GARDEN OPEN TO THE LANDSCAPE'},
  roof:{position:[23,34,29],target:[0,5.5,0],name:'屋上 / ROOF GARDEN',caption:'空へ続くスロープ。光を受けるソラリウム。',en:'AN ARCHITECTURAL PROMENADE'},
  plan:{position:[0,48,.01],target:[0,3.5,0],name:'平面 / PLAN STUDY',caption:'中庭を囲み、自由につながる生活空間。',en:'THE FREE PLAN'},
  ground:{position:[24,5.8,31],target:[0,1.6,0],name:'ピロティ / GROUND FLOOR',caption:'曲面の玄関とサービス室を囲む、砂利敷きの回廊。',en:'THE CURVED ENTRANCE AND THE PILOTIS'},
  roofdetail:{position:[-19.07,13.44,-5.56],target:[-2.5,7.5,4.5],name:'屋上詳細 / SOLARIUM & STAIR ROOF',caption:'屋根のある階段出口、円筒状部材、空に開くソラリウム。',en:'ROOF STRUCTURES AND OPEN SKY'},
  courtyard:{position:[8,5.4,-2],target:[4.5,4.8,4.73],name:'中庭 / SLIDING GLASS WALL',caption:'居間と庭園をつなぐ、大きなガラス引き戸。',en:'THE LIVING ROOM OPEN TO THE GARDEN'},
  rampdetail:{position:[8.5,5.3,3.7],target:[1.2,5.2,-1.5],fov:55,name:'中庭 / RAMP & GLAZING',caption:'白い斜めの壁帯と、水平桟のあるガラス面。',en:'THE RAMP ALONG THE COURTYARD'},
  rampwalk:{position:[.68,5.55,-5.6],target:[.68,3.8,4.73],fov:60,name:'スロープ / BETWEEN WALL & GLASS',caption:'中庭側の白い側壁と、2本のスロープを隔てるガラス。',en:'WALKING ALONG THE COURTYARD'},
  entrance:{position:[0,1.55,8.7],target:[0,1.55,5.9],fov:85,name:'玄関 / RECESSED ENTRANCE',caption:'曲面ガラスの間に引き込まれた、黒い両開き扉。',en:'THE RECESSED DOOR BETWEEN CURVED GLAZED WINGS'},
  stairdetail:{position:[-1.5,1.6,5.0],target:[-3.3,1.7,1.55],fov:65,name:'螺旋階段 / RETURN STAIR',caption:'白い連続した側壁と、黒い手すりを持つ回り階段。',en:'THE CURVING STAIR IN THE ENTRANCE HALL'},
};
let currentView='exterior',transition=null,section=false,savedVisibility=null,annotationEnabled=false,selectedPin=-1;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let queued=0,frameId=0,lastTime=0,active=false;
function invalidate(frames=2){queued=Math.max(queued,frames);if(!frameId)frameId=requestAnimationFrame(render);}
function resize(){const {width,height}=wrap.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();invalidate(3);}
new ResizeObserver(resize).observe(wrap);
function quality(){const selected=$('#quality').value;const mobile=matchMedia('(max-width:760px)').matches||navigator.hardwareConcurrency<=4;
  const low=selected==='low'||(selected==='auto'&&mobile);
  renderer.setPixelRatio(Math.min(devicePixelRatio,low?1.25:1.75));const size=low?1024:2048;
  if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}sun.shadow.mapSize.set(size,size);sun.shadow.needsUpdate=true;
  resize();
}
$('#quality').addEventListener('change',quality);quality();
matchMedia('(max-width:760px)').addEventListener('change',quality);
function view(key,animate=false){const p=presets[key];currentView=key;
  camera.fov=p.fov||37;camera.updateProjectionMatrix();
  controls.minDistance=['courtyard','rampdetail','rampwalk','stairdetail','entrance','serviceside','servicedoorleft'].includes(key)?2:11;
  const pos=new THREE.Vector3(...p.position);if(camera.aspect<.85&&!['courtyard','rampdetail','rampwalk','stairdetail','entrance','serviceside','servicedoorleft'].includes(key))pos.multiplyScalar(key==='plan'?1.38:1.45);
  const target=new THREE.Vector3(...p.target);
  if(animate&&!reduced)transition={start:performance.now(),from:camera.position.clone(),to:pos,fromTarget:controls.target.clone(),toTarget:target};
  else{transition=null;camera.position.copy(pos);controls.target.copy(target);controls.update();}
  $('#view-name').textContent=p.name;$('#caption').textContent=p.caption;$('#caption-en').textContent=p.en;
  document.querySelectorAll('[data-view]').forEach(b=>{const state=b.dataset.view===key;b.classList.toggle('active',state);b.setAttribute('aria-pressed',String(state));});invalidate(80);
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
$('#courtyard-view').addEventListener('click',()=>{if(section)$('#section').click();view('courtyard');});
$('#ramp-view').addEventListener('click',()=>{if(section)$('#section').click();view('rampdetail');});
$('#ramp-walk').addEventListener('click',()=>{if(section)$('#section').click();view('rampwalk');});
$('#stair-view').addEventListener('click',()=>{if(section)$('#section').click();view('stairdetail');});
$('#entrance-view').addEventListener('click',()=>{if(section)$('#section').click();view('entrance');});
$('#service-door-view').addEventListener('click',()=>{if(section)$('#section').click();view('servicedoorleft');});
$('#service-side-view').addEventListener('click',()=>{if(section)$('#section').click();view('serviceside');});
$('#service-view').addEventListener('click',()=>{if(section)$('#section').click();view('service');});
view('exterior',false);
function updateVisibility(){document.querySelectorAll('[data-layer]').forEach(c=>{model.layers[c.dataset.layer].visible=c.checked;});model.layers.frames.visible=model.layers.glass.visible;invalidate(3);}
document.querySelectorAll('[data-layer]').forEach(c=>c.addEventListener('change',()=>{
  if(section&&c.dataset.layer==='furniture')savedVisibility.furniture=c.checked;
  else if(section){section=false;savedVisibility=null;$('#section').classList.remove('active');$('#section').setAttribute('aria-pressed','false');$('#section span').textContent='内部を見る';}
  updateVisibility();
}));
$('#section').addEventListener('click',()=>{
  section=!section;$('#section').classList.toggle('active',section);$('#section').setAttribute('aria-pressed',String(section));$('#section span').textContent=section?'外観に戻す':'内部を見る';
  if(section){savedVisibility={};document.querySelectorAll('[data-layer]').forEach(c=>{savedVisibility[c.dataset.layer]=c.checked;if(['roof','walls','glass'].includes(c.dataset.layer))c.checked=false;});updateVisibility();view('plan');}
  else{document.querySelectorAll('[data-layer]').forEach(c=>c.checked=savedVisibility[c.dataset.layer]);updateVisibility();savedVisibility=null;view('exterior');}
});
$('#rotate').addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;$('#rotate').setAttribute('aria-pressed',String(controls.autoRotate));invalidate(2);});
$('#reset').addEventListener('click',()=>{controls.autoRotate=false;$('#rotate').setAttribute('aria-pressed','false');view('exterior');});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen();}catch{$('#caption').textContent='このブラウザでは全画面表示を利用できません。';}invalidate(3);});
function sunlight(){const t=Number($('#sun').value),hour=Math.floor(t),minute=Math.round((t-hour)*60);$('#sun-value').value=`${hour}:${String(minute).padStart(2,'0')}`;
  const angle=(t-12)*Math.PI/13;sun.position.set(Math.sin(angle)*-35,Math.cos(angle)*30+8,18);sun.color.set(t>16?'#ffe1b2':'#fffaed');sun.intensity=t>16?2.6:3.15;invalidate(3);
}$('#sun').addEventListener('input',sunlight);sunlight();
$('#about-open').addEventListener('click',()=>$('#about').showModal());$('#about-close').addEventListener('click',()=>$('#about').close());$('#about').addEventListener('click',e=>{if(e.target===$('#about')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
const features=[
  {p:[7.1,1.7,9.5],title:'01 / ピロティ',text:'細い柱が居住階を持ち上げ、地上を庭園と自動車の動線へ開放します。'},
  {p:[0,5.1,10.75],title:'02 / 水平連続窓',text:'柱と独立した外壁に設けた窓が、風景を水平につなぎます。'},
  {p:[9.5,4.2,-6],title:'03 / 自由なファサード',text:'外壁は構造を支える役割から解放され、開口を自由に配置できます。'},
  {p:[-4.2,4.2,-2],title:'04 / 自由な平面',text:'柱と床の構造により、室内の間仕切りは自由に配置できます。「内部を見る」で確認。'},
  {p:[5,6.8,7],title:'05 / 屋上庭園',text:'居住階の屋外庭園からスロープを上がると、曲面壁が囲む屋上ソラリウムへ。'},
];
const pins=features.map((f,i)=>{const b=document.createElement('button');b.className='pin';b.textContent=String(i+1).padStart(2,'0');b.setAttribute('aria-label',f.title);b.hidden=true;$('#annotations').appendChild(b);b.addEventListener('click',()=>{selectedPin=i;showPin();invalidate(3);});return b;});
const info=document.createElement('div');info.className='pin-info';info.hidden=true;$('#annotations').appendChild(info);
function showPin(){info.hidden=selectedPin<0||!annotationEnabled;pins.forEach((p,i)=>p.classList.toggle('selected',i===selectedPin));if(info.hidden)return;info.replaceChildren();const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','解説を閉じる');close.onclick=()=>{selectedPin=-1;showPin();invalidate();};const b=document.createElement('b');b.textContent=features[selectedPin].title;info.append(close,b,document.createTextNode(features[selectedPin].text));}
$('#features-toggle').addEventListener('click',()=>{annotationEnabled=!annotationEnabled;$('#features-toggle').setAttribute('aria-pressed',String(annotationEnabled));$('#features-toggle').textContent=annotationEnabled?'五つの原則を隠す −':'五つの原則を表示 ＋';showPin();invalidate(3);});
const projected=new THREE.Vector3();
function annotations(){features.forEach((f,i)=>{projected.set(...f.p).project(camera);const visible=annotationEnabled&&projected.z<1&&projected.z>-1&&Math.abs(projected.x)<.96&&Math.abs(projected.y)<.9;pins[i].hidden=!visible;if(visible){pins[i].style.left=`${(projected.x*.5+.5)*wrap.clientWidth}px`;pins[i].style.top=`${(-projected.y*.5+.5)*wrap.clientHeight}px`;}});}
controls.addEventListener('start',()=>{transition=null;active=true;invalidate(2);});controls.addEventListener('end',()=>{active=false;invalidate(70);});controls.addEventListener('change',()=>invalidate(2));
function render(time){frameId=0;if(document.hidden)return;const delta=lastTime?Math.min((time-lastTime)/1000,.05):1/60;lastTime=time;
  if(transition){let t=THREE.MathUtils.clamp((time-transition.start)/850,0,1);t=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,t);controls.target.lerpVectors(transition.fromTarget,transition.toTarget,t);if(t>=1)transition=null;}
  controls.update(delta);renderer.render(scene,camera);annotations();
  const angle=Math.atan2(camera.position.x-controls.target.x,camera.position.z-controls.target.z)*180/Math.PI;$('#compass-needle').style.transform=`rotate(${angle-45}deg)`;
  // Project a real 5-m segment parallel to the camera's horizontal direction.
  const distance=camera.position.distanceTo(controls.target);const pixels=5*wrap.clientHeight/(2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));$('.scale-bar b').style.width=`${pixels}px`;
  $('#stats').textContent=`${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles/1000)}k triangles · 1 unit = 1 m`;
  $('#stats').dataset.camera=camera.position.toArray().join(',');
  queued=Math.max(0,queued-1);if(queued||active||transition||controls.autoRotate)frameId=requestAnimationFrame(render);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frameId);frameId=0;lastTime=0;}else invalidate(3);});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frameId);frameId=0;$('#loading').style.display='flex';$('#loading').textContent='描画が一時停止しました。復帰しない場合はページを再読み込みしてください。';});
renderer.domElement.addEventListener('webglcontextrestored',()=>{$('#loading').style.display='none';invalidate(3);});
$('#loading').style.display='none';resize();invalidate(3);
// Minimal read-only diagnostics for QA / tuning; no animation loop while idle.
window.villaDiagnostics=()=>({three:THREE.REVISION,dimensions:DIMENSIONS,layers:Object.fromEntries(Object.entries(model.layers).map(([k,v])=>[k,v.visible])),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio(),shadowSize:sun.shadow.mapSize.x,camera:camera.position.toArray(),geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,idle:!frameId});
