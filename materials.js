import * as THREE from 'three';

// All textures are generated locally; no texture downloads. Dimensions <= 512 px.
export const MATERIAL_CONFIG = {
  plaster: { color: '#ffffff', roughness: 0.83, bumpScale: 0.013 },
  metal: { color: '#67766f', roughness: 0.48, metalness: 0.38 },
  glass: { color: '#d4e2df', roughness: 0.12, metalness: 0, ior: 1.46,
    transmission: 0, transparent: true, opacity: 0.30, depthWrite: false, envMapIntensity: 1.1 },
  // Transparent physical glass avoids an extra transmission render pass on phones.
  // Set transmission > 0 and opacity = 1 for costlier refractive glazing if needed.
};
function random(seed = 7351) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function texture(size, paint, repeat = 1, color = false) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  paint(c.getContext('2d'), size, random());
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat); t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 2; return t;
}
export function createMaterials() {
  const noise = texture(128, (ctx, n, rand) => { const d = ctx.createImageData(n,n);
    for(let i=0;i<d.data.length;i+=4) { const v=126+rand()*35; d.data.set([v,v,v,255],i); } ctx.putImageData(d,0,0); }, 8);
  const tiles = texture(256, (ctx,n,rand) => {
    ctx.fillStyle='#c5c8bb';ctx.fillRect(0,0,n,n);
    for(let y=0;y<n;y+=64) for(let x=0;x<n;x+=64){const v=193+Math.floor(rand()*12);ctx.fillStyle=`rgb(${v},${v+2},${v-9})`;ctx.fillRect(x+1,y+1,62,62);}
    for(let i=0;i<9500;i++){ctx.fillStyle=rand()>.5?'#ffffff0b':'#33443308';ctx.fillRect(rand()*n,rand()*n,1,1);}
  },4,true);
  const tileNormal = texture(128,(ctx,n) => {ctx.fillStyle='#8080ff';ctx.fillRect(0,0,n,n);
    for(let i=0;i<n;i+=32){ctx.fillStyle='#7480fc';ctx.fillRect(i,0,1,n);ctx.fillStyle='#8c80fc';ctx.fillRect(i+1,0,1,n);ctx.fillStyle='#8074fc';ctx.fillRect(0,i,n,1);ctx.fillStyle='#808cfc';ctx.fillRect(0,i+1,n,1);}},4);
  const grassMap = texture(256,(ctx,n,rand)=>{ctx.fillStyle='#9aa889';ctx.fillRect(0,0,n,n);for(let i=0;i<30000;i++){ctx.fillStyle=rand()>.45?'#52664116':'#d6dbb317';ctx.fillRect(rand()*n,rand()*n,1,2);}},10,true);
  const std = (opts) => new THREE.MeshStandardMaterial(opts);
  const plaster=std({...MATERIAL_CONFIG.plaster,bumpMap:noise});
  return {
    plaster,
    // Roof walls share the exact first-floor exterior plaster material.
    roofWhite:plaster,
    rampFrame:std({color:'#56615f',roughness:.7,metalness:.12}),
    stairRail:std({color:'#252827',roughness:.6,metalness:.15}),
    stairTread:std({color:'#565957',roughness:.92}),
    entranceFrame:std({color:'#303530',roughness:.65,metalness:.18}),
    entranceDoor:std({color:'#242824',roughness:.86,bumpMap:noise,bumpScale:.004}),
    entranceMat:std({color:'#555b53',roughness:1,bumpMap:noise,bumpScale:.006}),
    entranceGlass:new THREE.MeshPhysicalMaterial({...MATERIAL_CONFIG.glass,color:'#bac6b3',roughness:.35,opacity:.48,side:THREE.DoubleSide}),
    groundWall:std({color:'#286c50',roughness:.88,bumpMap:noise,bumpScale:.016}),
    serviceLouver:std({color:'#c6c3a2',roughness:.82,metalness:.05}),
    serviceGlass:new THREE.MeshPhysicalMaterial({...MATERIAL_CONFIG.glass,color:'#42564c',opacity:.75,roughness:.25,envMapIntensity:.55,side:THREE.DoubleSide}),
    serviceDoor:std({color:'#242824',roughness:.86,bumpMap:noise,bumpScale:.006}),
    blue:std({color:'#709ba3',roughness:.84,bumpMap:noise,bumpScale:.01}),
    pink:std({color:'#cfae9e',roughness:.86,bumpMap:noise,bumpScale:.01}),
    metal:std(MATERIAL_CONFIG.metal), glass:new THREE.MeshPhysicalMaterial({...MATERIAL_CONFIG.glass,side:THREE.DoubleSide}),
    rampGlass:new THREE.MeshPhysicalMaterial({...MATERIAL_CONFIG.glass,color:'#aab5b2',opacity:.60,envMapIntensity:.8,side:THREE.DoubleSide}),
    floor:std({color:'#dedccf',roughness:.9,bumpMap:noise,bumpScale:.012}),
    paving:std({color:'#eeeee4',map:tiles,roughnessMap:noise,roughness:.95,normalMap:tileNormal,normalScale:new THREE.Vector2(.2,.2)}),
    gravel:std({color:'#b8b6a7',roughness:1,bumpMap:noise,bumpScale:.04}),
    roofMembrane:std({color:'#ffffff',roughness:.96,bumpMap:noise,bumpScale:.01}),
    roofMetal:std({color:'#ffffff',roughness:.56,metalness:.15}),
    grass:std({color:'#dde4cd',map:grassMap,roughness:1}),
    earth:std({color:'#777c65',roughness:1}), leaf:std({color:'#6d8560',roughness:1}),
    trunk:std({color:'#8a8067',roughness:1}), furniture:std({color:'#9a8875',roughness:.76}),
    cushion:std({color:'#d9cdbc',roughness:1}), dark:std({color:'#41544a',roughness:.8}),
  };
}
export function createEnvironment(renderer) {
  // A one-time, prefiltered environment map; no realtime cube-camera reflections.
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const c=canvas.getContext('2d'), g=c.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#8cbbd1');g.addColorStop(.38,'#d5e5e7');g.addColorStop(.5,'#f4f1df');g.addColorStop(.54,'#b6c5aa');g.addColorStop(1,'#7b8e71');c.fillStyle=g;c.fillRect(0,0,512,256);
  const sun=c.createRadialGradient(360,60,0,360,60,45);sun.addColorStop(0,'#ffffff');sun.addColorStop(.18,'#fffde9');sun.addColorStop(1,'#fffde900');c.fillStyle=sun;c.fillRect(310,10,100,100);
  const source=new THREE.CanvasTexture(canvas);source.mapping=THREE.EquirectangularReflectionMapping;source.colorSpace=THREE.SRGBColorSpace;
  const pmrem=new THREE.PMREMGenerator(renderer), target=pmrem.fromEquirectangular(source);
  source.dispose();pmrem.dispose();return target;
}
