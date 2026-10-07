import fs from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
const base=path.dirname(fileURLToPath(import.meta.url));
const url=pathToFileURL(path.join(base,'vendor/three.module.js')).href;
const THREE=await import(url);
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const utils=(await fs.readFile(path.join(base,'vendor/BufferGeometryUtils.js'),'utf8')).replaceAll("from 'three'",`from '${url}'`);
const source=(await fs.readFile(path.join(base,'building.js'),'utf8')).replaceAll("from 'three'",`from '${url}'`).replace("'./vendor/BufferGeometryUtils.js'",JSON.stringify(data(utils)));
const {createBuilding,DIMENSIONS}=await import(data(source));
const names=['serviceLouver','serviceGlass','serviceDoor','entranceFrame','entranceDoor','entranceMat','entranceGlass','plaster','roofWhite','rampFrame','stairRail','stairTread','rampGlass','groundWall','blue','pink','metal','roofMetal','roofMembrane','glass','floor','paving','gravel','grass','earth','leaf','trunk','furniture','cushion','dark'];
const m=Object.fromEntries(names.map(n=>[n,new THREE.MeshStandardMaterial()]));
function validate(p){const b=createBuilding(m,p);b.root.updateMatrixWorld(true);let vertices=0,instances=0;
  b.root.traverse(a=>{if(a.geometry){for(const [name,attr]of Object.entries(a.geometry.attributes)){for(const value of attr.array)if(!Number.isFinite(value))throw Error(`${a.name} / ${name}: nonfinite`);}vertices+=a.geometry.attributes.position.count;if(a.isInstancedMesh)instances+=a.count;}});
  const floorBounds=new THREE.Box3().setFromObject(b.layers.floors);
  if(Math.abs(floorBounds.min.x+p.width/2)>1e-4||Math.abs(floorBounds.max.x-p.width/2)>1e-4)throw Error('Floor scale mismatch');
  if(Math.abs(floorBounds.min.z+p.depth/2)>1e-4||Math.abs(floorBounds.max.z-p.depth/2)>1e-4)throw Error('Floor depth mismatch');
  if(b.levels.roof!==p.level+p.upperHeight)throw Error('Level mismatch');
  if(b.layers.furniture.visible)throw Error('Reference furniture should start hidden');
  const roofRay=(u,v)=>new THREE.Raycaster(new THREE.Vector3((u-.5)*p.width,b.levels.roof+.05,(v-.5)*p.depth),new THREE.Vector3(0,-1,0),0,.35).intersectObject(b.layers.roof,true).length>0;
  for(const [u,v,expected] of [[.85,.5,false],[.08,.66,false],[.5,.35,false],[.88,.15,true],[.9,.88,true],[.3,.12,true]])if(roofRay(u,v)!==expected)throw Error(`Roof topology mismatch at ${u},${v}`);
  const head=b.root.userData.roofExit;
  const bridge=b.root.userData.roofWallBridge;
  if(Math.abs(bridge.top-(b.levels.roof+p.roofStructureHeight))>1e-6)throw Error('Marked wall connection has a different crest height');
  const bx=(bridge.start[0]+bridge.end[0])/2,bz=(bridge.start[1]+bridge.end[1])/2;
  for(const lift of [.25,p.roofStructureHeight-.12])if(!new THREE.Raycaster(new THREE.Vector3(bx,b.levels.roof+lift,bz-.35),new THREE.Vector3(0,0,1),0,.7).intersectObject(b.layers.roof,true).length)throw Error('Red-marked full-height wall connection is missing');
  const roofTop=new THREE.Box3().setFromObject(b.layers.roof).max.y;
  if(roofTop>b.levels.roof+p.roofStructureHeight+1e-4)throw Error('Raised coping remains above shared rooftop crest');
  const hw=head.window;
  if(new THREE.Raycaster(new THREE.Vector3(hw.x-.3,hw.sill+hw.height*.5,hw.z+.12),new THREE.Vector3(1,0,0),0,.5).intersectObject(b.layers.roof,true).length)throw Error('Stair exit window is blocked by opaque wall');
  if(!new THREE.Raycaster(new THREE.Vector3(hw.x-.3,hw.sill+hw.height*.5,hw.z+.12),new THREE.Vector3(1,0,0),0,.5).intersectObject(b.layers.glass,true).length)throw Error('Stair exit window glazing missing');
  // Supplied model views show joined screens, not the slits introduced earlier.
  for(const gap of b.root.userData.roofScreenGaps){
    const hit=new THREE.Raycaster(new THREE.Vector3(gap.x,b.levels.roof+1,gap.z-.4),new THREE.Vector3(0,0,1),0,.8).intersectObject(b.layers.roof,true).length>0;
    if(gap.width>.01?hit:!hit)throw Error('Roof curve/straight screen joint differs from specified connection');
  }
  if(Math.abs(head.top-b.levels.roof-p.roofStructureHeight)>1e-6)throw Error('Roof structure crest mismatch');
  const headHit=new THREE.Raycaster(new THREE.Vector3((.32-.5)*p.width,head.top+.04,(.57-.5)*p.depth),new THREE.Vector3(0,-1,0),0,.20).intersectObject(b.layers.roof,true);
  if(!headHit.length)throw Error('Stair headhouse roof missing');
  const stem=b.root.userData.frontRoofStem;
  if(Math.abs(stem.height-p.roofStructureHeight)>1e-6)throw Error('Front upstand crest differs from small curved wall');
  if(!new THREE.Raycaster(new THREE.Vector3(stem.x,stem.top+.04,stem.z),new THREE.Vector3(0,-1,0),0,.15).intersectObject(b.layers.roof,true).length)throw Error('Front rectangular rooftop upstand missing');
  const o=b.root.userData.landscapeOpening;
  const wallRay=x=>new THREE.Raycaster(new THREE.Vector3(x,(o.sill+o.top)/2,o.z-.4),new THREE.Vector3(0,0,1),0,.8).intersectObject(b.layers.roof,true).length>0;
  if(wallRay((o.x[0]+o.x[1])/2)||!wallRay(o.x[0]-.1))throw Error('Landscape slot is capped or wall missing');
  if(!b.root.userData.columnPositions.some(([x,z])=>Math.abs(x)<.001&&Math.abs(z-2*p.grid)<.001))throw Error('Central front pilotis missing');
  if(Math.abs(Math.min(...b.root.userData.coreOutline.map(a=>a[1]))+p.depth/2)>.001)throw Error('Rear service enclosure does not meet rear facade');
  const flights=b.root.userData.rampFlights;
  // Verify actual upper-ramp travel clearance, including the formerly blocked
  // v=.196 crossing and the turn behind the central glazing.
  const rampRight=(p.width*(p.ramp.right-p.ramp.left)+.14)/4,front=(p.ramp.front-.5)*p.depth,back=(p.ramp.back-.5)*p.depth,mid=p.level+p.upperHeight/2;
  const route=[];
  for(let j=0;j<=24;j++){const t=j/24;route.push(new THREE.Vector3(rampRight,p.level+(mid-p.level)*t+1.7,front+(back-front)*t));}
  route.push(new THREE.Vector3(rampRight,mid+1.7,back-p.ramp.landing/2),new THREE.Vector3(-rampRight,mid+1.7,back-p.ramp.landing/2),new THREE.Vector3(-rampRight,mid+1.7,back));
  for(let j=1;j<=24;j++){const t=j/24;route.push(new THREE.Vector3(-rampRight,mid+(b.levels.roof-mid)*t+1.7,back+(front-back)*t));}
  for(let j=1;j<route.length;j++){
    const dir=route[j].clone().sub(route[j-1]),len=dir.length(),ray=new THREE.Raycaster(route[j-1],dir.normalize(),0,len);
    for(const layer of ['walls','interior','glass','roof'])if(ray.intersectObject(b.layers[layer],true).length)throw Error(`Upper ramp walking route blocked by ${layer} at segment ${j}`);
  }
  const entry=b.root.userData.entrance;
  const service=b.root.userData.serviceFacade;
  const markedRearWindow=new THREE.Raycaster(new THREE.Vector3(.35*p.width,p.level+p.windowSill+p.windowHeight/2,-p.depth/2-.2),new THREE.Vector3(0,0,1),0,.4);
  if(!markedRearWindow.intersectObject(b.layers.glass,true).length)throw Error('WS000232 marked rear end bay glazing missing');
  if(new THREE.Raycaster(new THREE.Vector3(p.width/2+.2,p.level+p.windowSill+p.windowHeight/2,0),new THREE.Vector3(-1,0,0),0,.4).intersectObject(b.layers.glass,true).length)throw Error('Open courtyard side was glazed again');
  const door=b.root.userData.serviceDoor;
  for(const d of b.root.userData.serviceDoors){
    for(const [y,mat] of [[1.1,m.serviceDoor],[d.height+.25,m.plaster]]){
      const hit=new THREE.Raycaster(new THREE.Vector3(d.x+d.out*.3,y,d.z),new THREE.Vector3(-d.out,0,0),0,.6).intersectObject(b.layers.walls,true);
      if(!hit.length||hit[0].object.material!==mat)throw Error('White return with black door missing on a service facade side');
    }
  }
  const doorHit=new THREE.Raycaster(new THREE.Vector3(door.x+.3,1.1,door.z),new THREE.Vector3(-1,0,0),0,.6).intersectObject(b.layers.walls,true);
  if(!doorHit.length||doorHit[0].object.material!==m.serviceDoor)throw Error('Black door missing from marked white return');
  const whiteHit=new THREE.Raycaster(new THREE.Vector3(door.x+.3,door.height+.25,door.z),new THREE.Vector3(-1,0,0),0,.6).intersectObject(b.layers.walls,true);
  if(!whiteHit.length||whiteHit[0].object.material!==m.plaster)throw Error('Marked door return must be white');
  for(const side of b.root.userData.serviceSideWindows){
    const dir=side.x>0?-1:1,y=(side.sill+side.head)/2;
    const sideRay=z=>new THREE.Raycaster(new THREE.Vector3(side.x-dir*.3,y,z),new THREE.Vector3(dir,0,0),0,.6);
    for(const [a,end] of side.windows)if(sideRay((a+end)/2).intersectObject(b.layers.walls,true).length)throw Error('Service side window blocked by green wall');
    const [a,bz]=side.windows[1];
    if(!sideRay((a+bz)/2).intersectObject(b.layers.glass,true).length)throw Error('Dark service side glazing missing');
  }
  const rearRay=y=>new THREE.Raycaster(new THREE.Vector3(.35,y,service.z-.3),new THREE.Vector3(0,0,1),0,.6);
  const apronHit=rearRay(service.sill/2).intersectObject(b.layers.walls,true);
  if(!apronHit.length||apronHit[0].object.material!==m.plaster)throw Error('Rear service window apron must be white plaster');
  if(rearRay((service.sill+service.head)/2).intersectObject(b.layers.walls,true).length||!rearRay((service.sill+service.head)/2).intersectObject(b.layers.glass,true).length)throw Error('Service facade opening blocked or glass missing');
  if(entry.leafCount!==2||entry.doorZ>=entry.wingZ)throw Error('Entrance must have two opaque leaves in a recessed planar bay');
  const entryRay=(x,y,layer)=>new THREE.Raycaster(new THREE.Vector3(x,y,entry.doorZ+.15),new THREE.Vector3(0,0,-1),0,.3).intersectObject(layer,true).length>0;
  if(!entryRay(entry.doorWidth/4,1.2,b.layers.walls)||entryRay(entry.doorWidth/4,1.2,b.layers.glass))throw Error('Entrance door replaced or covered by glazing');
  if(!entryRay(entry.doorWidth/2+.25,1.2,b.layers.glass)||!entryRay(0,entry.doorTop+.2,b.layers.glass))throw Error('Entrance sidelight or transom missing');
  const facade=b.root.userData.rampFacade;
  if(Math.abs(facade.x)>.001)throw Error('Ramp glazing must separate the two lanes');
  const facadeHit=new THREE.Raycaster(new THREE.Vector3(facade.x+.4,b.levels.first+1.5,facade.front+.2*(facade.back-facade.front)),new THREE.Vector3(-1,0,0),0,.8).intersectObject(b.layers.glass,true);
  if(!facadeHit.length)throw Error('Courtyard ramp glazing missing');
  const rampX=(p.width*(p.ramp.right-p.ramp.left)+.14)/4,rampZ=facade.front+.25*(facade.back-facade.front),rampY=p.level+p.upperHeight*.125;
  if(!new THREE.Raycaster(new THREE.Vector3(rampX,rampY+.08,rampZ),new THREE.Vector3(0,-1,0),0,.15).intersectObject(b.layers.ramps,true).length)throw Error('Ramp top has inward winding or wrong elevation');
  const st=b.root.userData.stair;
  for(const outline of st.treadOutlines)for(const [x,z] of outline)if(x<st.outside.left-.02||x>st.outside.right+.02||z<st.outside.back-.02||z>st.outside.front+.02)throw Error('Stair tread outside floor opening envelope');
  for(let i=1;i<flights.length;i++)if(Math.abs(flights[i-1].to-flights[i].from)>.001)throw Error('Ramp level discontinuity');
  return {width:p.width,depth:p.depth,roof:b.levels.roof,columns:b.root.userData.columnPositions.length,vertices,instances};
}
console.log(JSON.stringify({default:validate(DIMENSIONS),edited:validate({...DIMENSIONS,width:20,depth:22,level:3.5,upperHeight:3.2}),status:'PASS: finite geometry, scale, roof voids / covered kiosk, landscape opening, front pilotis, rear enclosure, four ramp flights, parameter edit'},null,2));
