import * as THREE from 'three';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

/** Revision 3: photo-corrected rooftop; metres; Y up.
 * Primary checks: CMN 2021 three-level plans; FLC original ground/first plans
 * reproduced by Tecnne; FLC/Kozlowski photographs; CMN/11H45 aerial photograph.
 * +Z entrance/NW; +X garden/SW; -Z rear/SE; -X service/NE.
 * UV traces: u=0..1 left to right, v=0..1 rear to entrance. Traces are estimates
 * from raster drawings, not a surveyed CAD model. See MODEL_AUDIT.md.
 * ALL heights, thicknesses, small dimensions and curve controls are ESTIMATED.
 */
export const DIMENSIONS={
  width:19,depth:21.5,grid:4.75, // PROVISIONAL nominal dimensions
  level:3.30,upperHeight:3.35,slab:.22,wall:.18,columnRadius:.135,
  windowSill:1.10,windowHeight:1.15,frame:.035,windowBay:1.47,
  parapet:.16,curveSegments:48,slidingGlassHeight:2.65,
  courtyardGlazing:{split:.63,jamb:.08,meetingStile:.16,base:.065,header:.26,frameDepth:.10,overlap:.05}, // World +X is viewer-left from courtyard: image-left 37%, image-right 63%; ESTIMATED
  ramp:{left:.432,right:.568,back:.19,front:.62,landing:.65,thickness:.13,railHeight:.90,parapetHeight:.78,spineThickness:.12,spineBand:.24,
    glassBarSpacing:.22,glassBarRadius:.011,facadeStile:.14,facadeSplit:.48}, // ESTIMATED from supplied courtyard photograph
  core:{left:.168,right:.832,curveV:.438,frontV:.800,rearStepV:.052,rearLeft:.25,rearRight:.75,glassStart:.92,glassEnd:2.94,mullionSpacing:.31},
  entrance:{bayWidth:3.40,recess:.30,doorWidth:1.60,doorHeight:2.20,base:.14,frame:.045,jamb:.095,railHeight:1.00}, // ESTIMATED from supplied frontal entrance photo; central bay is planar and recessed
  serviceFacade:{sill:.70,bays:6,horizontalDivisions:8,sideSill:1.00,sideHead:1.80,sideWindows:[[.170,.255],[.305,.395]],louverCount:5,doorWidth:.55,doorHeight:1.95}, // ESTIMATED: rear-side cream louver and forward-side dark glazed window, supplied photographs
  stair:{left:.255,center:.337,right:.393,v:.572,radiusV:.046,width:.80,stepsPerFloor:24,railHeight:.98,wallHeight:.76,wallThickness:.09,waistThickness:.16,railLift:.22}, // ESTIMATED: D-shaped return, solid white balustrades, black single handrail
  roofStructureHeight:2.35, // Shared crest: all tall roof walls and column-like upstands; user correction
  roofExit:{roofThickness:.16,doorWidth:.85,doorHeight:2.05,ventU:.343,ventV:.432,ventRadius:.16,
    window:{centerV:.651,width:1.35,sill:.75,height:1.10,frame:.045,bays:3}}, // Window proportions ESTIMATED from supplied exterior photos
  frontRoofStem:{u:.687,v:.947,width:.22,depth:.25}, // FLC frontal photographs: crest aligned with small curved wall; dimensions ESTIMATED
  solarium:{openingCenterU:.465,openingWidth:2.25,openingSill:.72,openingHeight:.98,curveGap:0,rightCurveGap:0, // Model photos: straight screen joins BOTH curved screens, no separating slit
    curveStart:[.099,.721],curveControl1:[.004,.806],curveControl2:[.115,1.006],curveEnd:[.377,.905],straightEnd:[.718,.905],step:[.718,.961],rightArcCenter:[.779,.875],rightRadiusU:.096,rightRadiusV:.086},
  site:{width:47,depth:43,thickness:.38},
};
// Each outline is independently editable. Edge openings are NOT touching holes:
// the outline itself is notched to avoid incorrect triangulation / capping.
export const PLAN={
  roofOutline:[[0,0],[1,0],[1,.277],[.568,.277],[.568,.16],[.432,.16],[.432,.62],[.5,.62],[.5,.72],[1,.72],[1,1],[0,1],[0,.72],[.172,.72],[.172,.585],[0,.585]],
  terrace:[[.75,0],[1,0],[1,.72],[.5,.72],[.5,.62],[.568,.62],[.568,.277],[.75,.277]],
  smallTerrace:[[0,.585],[.172,.585],[.172,.72],[0,.72]],
  // Explicit ground-plan positions. (0,+grid) is inside the entrance enclosure;
  // the other 15 peripheral cylinders are exposed. Interior supports are separate.
  columnGrid:[[-2,-2],[2,-2],[-2,-1],[2,-1],[-2,0],[2,0],[-2,1],[-1,1],[0,1],[1,1],[2,1],[-2,2],[-1,2],[0,2],[1,2],[2,2],[0,-2]],
  interiorColumns:[[.433,.415],[.5,.415],[.567,.415],[.756,.385]],
  // [u1,v1,u2,v2,color] — door gaps are explicit rather than painted on walls.
  partitions:[
    [.224,0,.224,.045,'plaster'],[.224,.092,.224,.196,'plaster'],[.224,.196,.432,.196,'plaster'],[.432,.196,.432,.41,'plaster'],
    // No cross-wall between .432 and .568 at v=.196: this is the upper ramp
    // approach and turning landing, open in the supplied courtyard photos.
    [.568,.196,.568,.277,'plaster'],[.75,.094,.75,.277,'plaster'],
    [0,.277,.135,.277,'plaster'],[.20,.277,.224,.277,'plaster'],[0,.338,.224,.338,'plaster'],[.224,.277,.224,.338,'plaster'],
    [.235,.338,.348,.338,'plaster'],[.348,.277,.348,.338,'plaster'],[0,.585,.172,.585,'plaster'],[.172,.525,.172,.62,'plaster'],
    [.172,.672,.172,.72,'plaster'],[.172,.72,.32,.72,'pink'],[.32,.72,.5,.72,'plaster'],[.25,.72,.25,.90,'blue'],[.255,.943,.255,1,'blue'],
  ],
};

export function createBuilding(m,p=DIMENSIONS){
  const root=new THREE.Group();root.name='Villa Savoye · revision 3';const layers={};
  for(const n of ['floors','walls','columns','roof','glass','frames','ramps','stairs','rails','interior','furniture','landscape']){layers[n]=new THREE.Group();layers[n].name=n;root.add(layers[n]);}
  const W=p.width,D=p.depth,H=p.level,R=H+p.upperHeight,roofHeight=p.roofStructureHeight,T=p.wall,clear=H-p.slab;
  const X=u=>(u-.5)*W,Z=v=>(v-.5)*D,pt=uv=>new THREE.Vector2(X(uv[0]),Z(uv[1]));
  const boxGeo=new THREE.BoxGeometry(1,1,1),tmp=new THREE.Object3D();
  function box(layer,mat,w,h,d,x,y,z){if(w<=0||h<=0||d<=0)throw Error('Invalid box dimension');const a=new THREE.Mesh(boxGeo,mat);a.scale.set(w,h,d);a.position.set(x,y,z);a.castShadow=mat!==m.glass;a.receiveShadow=true;layers[layer].add(a);return a;}
  function polygon(layer,mat,outline,holes,top,depth=p.slab){
    const trace=(path,points)=>{points.forEach(([x,z],i)=>i?path.lineTo(x,-z):path.moveTo(x,-z));path.closePath();};
    const s=new THREE.Shape();trace(s,outline);for(const points of holes){const h=new THREE.Path();trace(h,points);s.holes.push(h);}
    const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:1});geo.rotateX(-Math.PI/2);
    const uv=geo.attributes.uv,pos=geo.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/10,pos.getZ(i)/10);
    const mesh=new THREE.Mesh(geo,mat);mesh.position.y=top-depth;mesh.castShadow=mat!==m.glass;mesh.receiveShadow=true;layers[layer].add(mesh);return mesh;
  }
  const uvPolygon=(layer,mat,outline,holes,top,depth)=>polygon(layer,mat,outline.map(a=>[X(a[0]),Z(a[1])]),holes.map(h=>h.map(a=>[X(a[0]),Z(a[1])])),top,depth);
  function line(layer,mat,a,b,height,base=0,thick=T){const [ax,az]=a,[bx,bz]=b,dx=bx-ax,dz=bz-az;const mesh=box(layer,mat,Math.hypot(dx,dz),height,thick,(ax+bx)/2,base+height/2,(az+bz)/2);mesh.rotation.y=-Math.atan2(dz,dx);return mesh;}
  const uvLine=(layer,mat,a,b,height,base=0,thick=T)=>line(layer,mat,[X(a[0]),Z(a[1])],[X(b[0]),Z(b[1])],height,base,thick);
  function bar(layer,mat,a,b,r=.022){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),dir=vb.clone().sub(va);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),8),mat);mesh.position.copy(va.add(vb).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());mesh.castShadow=true;layers[layer].add(mesh);}
  // Thick open ribbon with a sampled centre line, varying bottom/top elevations.
  function ribbon(layer,mat,points,bottom,height,thick=T){
    const positions=[],uvs=[],indices=[];let distance=0;
    for(let i=0;i<points.length;i++){
      const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],tangent=next.clone().sub(prev).normalize(),normal=new THREE.Vector2(-tangent.y,tangent.x).multiplyScalar(thick/2),lo=typeof bottom==='function'?bottom(i/(points.length-1)):bottom,hi=lo+(typeof height==='function'?height(i/(points.length-1)):height);
      if(i)distance+=points[i].distanceTo(points[i-1]);const a=points[i].clone().add(normal),b=points[i].clone().sub(normal);
      for(const [v,y] of [[a,lo],[b,lo],[a,hi],[b,hi]]){positions.push(v.x,y,v.y);uvs.push(distance,y);}
      if(i){const j=(i-1)*4,k=i*4;indices.push(j,j+2,k+2,j,k+2,k,j+1,k+1,k+3,j+1,k+3,j+3,j+2,j+3,k+3,j+2,k+3,k+2,j,k,k+1,j,k+1,j+1);}
    }
    const n=(points.length-1)*4;indices.push(0,1,3,0,3,2,n,n+2,n+3,n,n+3,n+1);
    // The closed ribbon must face outwards. Inward winding made stair side
    // walls disappear from the hall and hid the actual tops of ramp slabs.
    for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=mat!==m.glass;mesh.receiveShadow=true;layers[layer].add(mesh);return mesh;
  }
  const ellipse=(cx,cz,rx,rz,a,b,count=p.curveSegments)=>Array.from({length:count+1},(_,i)=>{const t=a+(b-a)*i/count;return new THREE.Vector2(cx+Math.cos(t)*rx,cz+Math.sin(t)*rz);});
  const rect=(a,b,c,d)=>[[a,c],[b,c],[b,d],[a,d]];
  const rp=p.ramp,rLeft=X(rp.left),rRight=X(rp.right),rBack=Z(rp.back),rFront=Z(rp.front),lane=(rRight-rLeft-.14)/2,rc=(rRight-rLeft+.14)/4;
  const rampHole=rect(rp.left,rp.right,rp.back-rp.landing/D,rp.front);
  const s=p.stair,scx=X(s.center),scz=Z(s.v),srz=s.radiusV*D,srx=(s.right-s.center)*W;
  const stairHole=[[X(s.left)-.05,scz-srz-.06],...ellipse(scx,scz,srx+.06,srz+.06,-Math.PI/2,Math.PI/2,24).map(v=>[v.x,v.y]),[X(s.left)-.05,scz+srz+.06]];
  polygon('floors',m.floor,rect(-W/2,W/2,-D/2,D/2),[rampHole.map(([u,v])=>[X(u),Z(v)]),stairHole],H);
  const roofOutline=PLAN.roofOutline.map(([u,v])=>[u===.432?rp.left:u===.568?rp.right:u,v===.62?rp.front:v]);
  polygon('roof',m.roofMembrane,roofOutline.map(([u,v])=>[X(u),Z(v)]),[stairHole],R);
  uvPolygon('floors',m.paving,PLAN.terrace,[],H+.025,.025);uvPolygon('floors',m.paving,PLAN.smallTerrace,[],H+.025,.025);
  // Accessible solarium paving, distinct from the rear flat roof.
  uvPolygon('roof',m.paving,[[.064,.72],[.255,.72],[.255,.635],[.43,.635],[.43,.72],[.5,.72],[.5,.746],[.87,.746],[.90,.97],[.065,.97]],[],R+.018,.018);

  // Rear service enclosure has stepped corners; front outline is elliptical.
  const c=p.core,crx=(c.right-c.left)*W/2,crz=(c.frontV-c.curveV)*D,ccz=Z(c.curveV),cl=X(c.left),cr=X(c.right),coreArc=ellipse(0,ccz,crx,crz,0,Math.PI);
  const coreOutline=[[cl,Z(c.rearStepV)],[X(c.rearLeft),Z(c.rearStepV)],[X(c.rearLeft),-D/2],[X(c.rearRight),-D/2],[X(c.rearRight),Z(c.rearStepV)],[cr,Z(c.rearStepV)],[cr,ccz],...coreArc.map(a=>[a.x,a.y]),[cl,Z(c.rearStepV)]];
  polygon('floors',m.floor,coreOutline,[],.11,.11);
  const stepped=[[c.left,c.curveV],[c.left,c.rearStepV],[c.rearLeft,c.rearStepV],[c.rearLeft,0],[c.rearRight,0],[c.rearRight,c.rearStepV],[c.right,c.rearStepV],[c.right,c.curveV]];
  for(let i=1;i<stepped.length;i++){
    const a=stepped[i-1],b=stepped[i];
    if(i===1||i===7){
      // Real punched windows through the green service side.
      const sideU=i===1?c.left:c.right;
      const windows=p.serviceFacade.sideWindows;
      for(const [v1,v2] of [[c.rearStepV,windows[0][0]],[windows[0][1],windows[1][0]],[windows[1][1],c.curveV]])uvLine('walls',m.groundWall,[sideU,v1],[sideU,v2],clear);
      for(const [windowIndex,[v1,v2]] of windows.entries()){
        const sf=p.serviceFacade,wh=sf.sideHead-sf.sideSill;
        uvLine('walls',m.groundWall,[sideU,v1],[sideU,v2],sf.sideSill);uvLine('walls',m.groundWall,[sideU,v1],[sideU,v2],clear-sf.sideHead,sf.sideHead);
        const faceX=X(sideU)+(i===1?-.055:.055);
        if(windowIndex===0){
          // Cream painted opaque louver blades, not a clear glass rectangle.
          const pitch=wh/sf.louverCount;
          for(let j=0;j<sf.louverCount;j++)box('frames',m.serviceLouver,.055,pitch-.018,(v2-v1)*D-.065,faceX,sf.sideSill+pitch*(j+.5),Z((v1+v2)/2));
        }else{
          uvLine('glass',m.serviceGlass,[sideU,v1],[sideU,v2],wh,sf.sideSill,.025);
          for(let j=1;j<3;j++)box('frames',m.entranceFrame,.045,wh,.025,faceX,(sf.sideSill+sf.sideHead)/2,Z(v1+(v2-v1)*j/3));
        }
        for(const vv of [v1,v2])box('frames',m.metal,.045,wh,.045,X(sideU),(sf.sideSill+sf.sideHead)/2,Z(vv));
        for(const y of [sf.sideSill,sf.sideHead])line('frames',m.entranceFrame,[faceX,Z(v1)],[faceX,Z(v2)],.035,y,.045);
        if(windowIndex===1)for(let j=1;j<4;j++)line('frames',m.entranceFrame,[faceX,Z(v1)],[faceX,Z(v2)],.025,sf.sideSill+wh*j/4,.045);
      }
      root.userData.serviceSideWindows??=[];
      root.userData.serviceSideWindows.push({x:X(sideU),sill:p.serviceFacade.sideSill,head:p.serviceFacade.sideHead,windows:windows.map(([a,b])=>[Z(a),Z(b)])});
    }else if(i===2||i===4||i===6){
      // Rear service windows: actual voids; grille subdivision is estimated.
      const sf=p.serviceFacade,sill=i===4?sf.sill:sf.sideSill,head=i===4?clear-.045:sf.sideHead,za=Z(a[1]),xa=X(a[0]),xb=X(b[0]);
      const wallMat=i===4?m.plaster:m.groundWall;
      // Rear portico has a WHITE apron and jambs; green is confined to its returns.
      const x0=Math.min(xa,xb),x1=Math.max(xa,xb);
      const win0=x0,win1=x1,mid=(win0+win1)/2,len=win1-win0;
      box('walls',wallMat,len,sill,T,mid,sill/2,za);
      box('walls',wallMat,len,clear-head,T,mid,(head+clear)/2,za);
      for(const xx of [win0,win1])box('walls',wallMat,.10,head-sill,T,xx,(sill+head)/2,za);
      box('glass',m.glass,len-.12,head-sill,.025,mid,(sill+head)/2,za);
      const bays=i===4?sf.bays:1,divisions=i===4?sf.horizontalDivisions:4;
      for(let j=0;j<=bays;j++)box('frames',m.metal,.035,head-sill,.055,win0+len*j/bays,(sill+head)/2,za-.03);
      for(let j=0;j<=divisions;j++)box('frames',m.metal,len,.035,.055,mid,sill+(head-sill)*j/divisions,za-.03);
      if(i===4)root.userData.serviceFacade={z:za,left:x0,right:x1,sill,head,bays,divisions};
    }else if(i===3||i===5){
      // User-marked short return beside the large rear window: WHITE wall with
      // a black door facing +X. The previous door was on the green cross wall.
      const sf=p.serviceFacade,x=X(a[0]),out=i===3?-1:1,z0=Math.min(Z(a[1]),Z(b[1])),z1=Math.max(Z(a[1]),Z(b[1])),cz=(z0+z1)/2,da=cz-sf.doorWidth/2,db=cz+sf.doorWidth/2;
      line('walls',m.plaster,[x,z0],[x,da],clear);
      line('walls',m.plaster,[x,db],[x,z1],clear);
      line('walls',m.plaster,[x,da],[x,db],clear-sf.doorHeight,sf.doorHeight);
      box('walls',m.serviceDoor,.055,sf.doorHeight,sf.doorWidth,x+out*.025,sf.doorHeight/2,cz);
      for(const z of [da,db])box('frames',m.entranceFrame,.075,sf.doorHeight,.035,x+out*.035,sf.doorHeight/2,z);
      box('frames',m.entranceFrame,.075,.035,sf.doorWidth,x+out*.035,sf.doorHeight,cz);
      box('frames',m.metal,.04,.055,.055,x+out*.07,1.02,db-.08);
      const serviceDoor={x,z:cz,out,base:0,height:sf.doorHeight,width:sf.doorWidth,wallColor:'plaster'};
      root.userData.serviceDoors??=[];root.userData.serviceDoors.push(serviceDoor);
      if(i===5)root.userData.serviceDoor=serviceDoor;
    }else uvLine('walls',m.groundWall,a,b,clear);
  }
  ribbon('walls',m.groundWall,ellipse(0,ccz,crx,crz,0,c.glassStart),0,clear);ribbon('walls',m.groundWall,ellipse(0,ccz,crx,crz,c.glassEnd,Math.PI),0,clear);
  // Two curved glazed wings stop at a recessed, planar entrance bay. The old
  // continuous glass ellipse ran straight through the centre of the doorway.
  const en=p.entrance,halfBay=en.bayWidth/2,angle=Math.acos(halfBay/crx),wingZ=ccz+Math.sin(angle)*crz,entryZ=wingZ-en.recess,glassTop=clear-.07,doorTop=en.base+en.doorHeight;
  for(const [start,end] of [[c.glassStart,angle],[Math.PI-angle,c.glassEnd]]){
    const arc=ellipse(0,ccz,crx,crz,start,end,40);
    ribbon('glass',m.glass,arc,en.base,glassTop-en.base,.018);
    ribbon('walls',m.plaster,arc,0,en.base,.14);
    for(const y of [en.base,en.railHeight,glassTop])ribbon('frames',m.entranceFrame,arc,y,en.frame,.055);
    const length=arc.slice(1).reduce((sum,v,i)=>sum+v.distanceTo(arc[i]),0),bays=Math.ceil(length/c.mullionSpacing);
    for(let i=0;i<=bays;i++){const a=start+(end-start)*i/bays;box('frames',m.entranceFrame,p.frame,glassTop-en.base,.055,Math.cos(a)*crx,(glassTop+en.base)/2,ccz+Math.sin(a)*crz);}
  }
  // Short returns at the curve ends form the actual recess, with deep dark jambs.
  for(const side of [-1,1]){
    const x=side*halfBay;
    box('glass',m.entranceGlass,.022,glassTop-en.base,en.recess,x,(glassTop+en.base)/2,(wingZ+entryZ)/2);
    for(const z of [entryZ,wingZ])box('frames',m.entranceFrame,en.jamb,glassTop-en.base,en.jamb,x,(glassTop+en.base)/2,z);
    for(const y of [en.base,glassTop])line('frames',m.entranceFrame,[x,entryZ],[x,wingZ],en.frame,y,.07);
  }
  for(const [a,b] of [[-halfBay,-en.doorWidth/2],[en.doorWidth/2,halfBay]]){
    box('glass',m.entranceGlass,b-a-en.frame,en.doorHeight,.022,(a+b)/2,(en.base+doorTop)/2,entryZ);
    box('frames',m.entranceFrame,b-a,en.frame,.075,(a+b)/2,en.base,entryZ);
  }
  box('glass',m.entranceGlass,en.bayWidth,glassTop-doorTop,.022,0,(glassTop+doorTop)/2,entryZ);
  for(const x of [-en.doorWidth/2,en.doorWidth/2])box('frames',m.entranceFrame,en.frame,en.doorHeight,.09,x,(en.base+doorTop)/2,entryZ);
  for(const y of [doorTop,glassTop])box('frames',m.entranceFrame,en.bayWidth,en.frame,.09,0,y,entryZ);
  for(const x of [-en.doorWidth/4,en.doorWidth/4])box('walls',m.entranceDoor,en.doorWidth/2-.012,en.doorHeight,.055,x,(en.base+doorTop)/2,entryZ);
  box('frames',m.entranceFrame,.014,en.doorHeight,.035,0,(en.base+doorTop)/2,entryZ-.014);
  // Centre seam and understated metal door knobs, rather than glass handles.
  for(const x of [-.055,.055]){const knob=new THREE.Mesh(new THREE.SphereGeometry(.018,8,6),m.roofMetal);knob.position.set(x,en.base+1.04,entryZ+.042);layers.frames.add(knob);}
  box('floors',m.paving,en.bayWidth+.20,.04,en.recess+.38,0,.105,entryZ+(en.recess+.18)/2);
  box('floors',m.entranceMat,en.doorWidth+.12,.012,.55,0,.131,entryZ+.34);
  root.userData.entrance={doorZ:entryZ,wingZ,doorTop,base:en.base,bayWidth:en.bayWidth,doorWidth:en.doorWidth,leafCount:2};
  const groundPartitions=[[[.432,0],[.432,.163]],[[.168,.163],[.37,.163]],[[.37,.163],[.37,.24]],[[.168,.277],[.32,.277]],[[.365,.29],[.365,.44]],[[.168,.438],[.365,.438]],[[.568,.163],[.68,.163]],[[.68,.163],[.832,.29]],[[.568,.62],[.716,.706]]];
  groundPartitions.forEach(([a,b])=>uvLine('interior',m.plaster,a,b,clear));
  uvLine('walls',m.groundWall,[.568,.62],[.716,.706],.34);uvLine('frames',m.metal,[.568,.62],[.716,.706],2.15,.34,.045);

  const columnPositions=PLAN.columnGrid.map(([ix,iz])=>[ix*p.grid,iz*p.grid]);columnPositions.push(...PLAN.interiorColumns.map(([u,v])=>[X(u),Z(v)]));
  const columns=new THREE.InstancedMesh(new THREE.CylinderGeometry(p.columnRadius,p.columnRadius,clear,16),m.plaster,columnPositions.length);
  columnPositions.forEach(([x,z],i)=>{tmp.position.set(x,clear/2,z);tmp.rotation.set(0,0,0);tmp.scale.set(1,1,1);tmp.updateMatrix();columns.setMatrixAt(i,tmp.matrix);});columns.castShadow=columns.receiveShadow=true;layers.columns.add(columns);root.userData.columnPositions=columnPositions;

  function facade(axis,fixed,start,end,glazed=true){
    const len=end-start,mid=(start+end)/2,sill=p.windowSill,win=p.windowHeight,head=p.upperHeight-sill-win;
    const b=(layer,mat,l,h,y,d)=>axis==='x'?box(layer,mat,l,h,d,mid,y,fixed):box(layer,mat,d,h,l,fixed,y,mid);
    b('walls',m.plaster,len,sill,H+sill/2,T);b('walls',m.plaster,len,head,H+sill+win+head/2,T);
    if(glazed){b('glass',m.glass,len-.12,win,H+sill+win/2,.022);for(const y of [H+sill,H+sill+win])b('frames',m.metal,len,p.frame,y,.055);const n=Math.ceil(len/p.windowBay);for(let i=0;i<=n;i++){const pos=start+len*i/n;axis==='x'?box('frames',m.metal,p.frame,win,.055,pos,H+sill+win/2,fixed):box('frames',m.metal,.055,win,p.frame,fixed,H+sill+win/2,pos);}}
    else for(const pos of [start,end])axis==='x'?box('walls',m.plaster,T,win,T,pos,H+sill+win/2,fixed):box('walls',m.plaster,T,win,T,fixed,H+sill+win/2,pos);
  }
  facade('x',D/2,-W/2,W/2,true);facade('x',-D/2,-W/2,X(.75),true);facade('x',-D/2,X(.75),W/2,true); // WS000232: marked rear-elevation end bay is glazed.
  facade('z',W/2,-D/2,Z(.72),false);facade('z',W/2,Z(.72),D/2,true);
  facade('z',-W/2,-D/2,Z(.585),true);facade('z',-W/2,Z(.585),Z(.72),false);facade('z',-W/2,Z(.72),D/2,true);
  for(const x of [-W/2,W/2])for(const z of [-D/2,D/2])box('walls',m.plaster,T,p.upperHeight,T,x,H+p.upperHeight/2,z);
  PLAN.partitions.forEach(([u1,v1,u2,v2,mat])=>uvLine('interior',m[mat],[u1,v1],[u2,v2],p.upperHeight-p.slab,H));
  // Living-room courtyard bay: two broad panes, white perimeter/meeting stile,
  // dark overhead sliding track. Not a row of ordinary ribbon-window mullions.
  const cg=p.courtyardGlazing,cStart=X(.5),cEnd=X(1),cSplit=cStart+(cEnd-cStart)*cg.split,cZ=Z(.72),cCeiling=R-p.slab,cTop=cCeiling-cg.header,cBase=H+cg.base,cHeight=cTop-cBase;
  for(const [left,right,z] of [[cStart,cSplit,cZ],[cSplit,cEnd,cZ-cg.overlap]])box('glass',m.glass,right-left-cg.jamb,cHeight,.025,(left+right)/2,(cBase+cTop)/2,z);
  for(const [xx,width] of [[cStart,cg.jamb],[cSplit,cg.meetingStile],[cEnd,cg.jamb]])box('frames',m.roofMetal,width,cTop-H,cg.frameDepth,xx,(cTop+H)/2,cZ);
  for(const yy of [cBase,cTop])box('frames',m.roofMetal,cEnd-cStart,.065,cg.frameDepth,(cStart+cEnd)/2,yy,cZ);
  box('frames',m.dark,cEnd-cStart,cg.header,.20,(cStart+cEnd)/2,cCeiling-cg.header/2,cZ);
  box('floors',m.plaster,cEnd-cStart,.065,.20,(cStart+cEnd)/2,H+.0325,cZ);
  root.userData.courtyardGlazing={paneCount:2,splitX:cSplit,top:cTop,ceiling:cCeiling};
  // Courtyard photo: opaque wall beside the covered recess, with a punched
  // square window, rather than a full-width glazed wall. Small sizes estimated.
  const kioskWindow={left:.631,right:.688,sill:1.02,height:1.15},kw=kioskWindow,kz=Z(.277);
  for(const [a,b] of [[.568,kw.left],[kw.right,.75]])uvLine('interior',m.plaster,[a,.277],[b,.277],p.upperHeight-p.slab,H);
  uvLine('interior',m.plaster,[kw.left,.277],[kw.right,.277],kw.sill,H);
  uvLine('interior',m.plaster,[kw.left,.277],[kw.right,.277],p.upperHeight-p.slab-kw.sill-kw.height,H+kw.sill+kw.height);
  box('glass',m.rampGlass,X(kw.right)-X(kw.left),kw.height,.025,X((kw.left+kw.right)/2),H+kw.sill+kw.height/2,kz);
  for(const yy of [H+kw.sill,H+kw.sill+kw.height])box('frames',m.rampFrame,X(kw.right)-X(kw.left),.045,.06,X((kw.left+kw.right)/2),yy,kz);
  for(const u of [kw.left,kw.right])box('frames',m.rampFrame,.045,kw.height,.06,X(u),H+kw.sill+kw.height/2,kz);
  for(const [a,b,height] of [[[.75,.08],[.75,.277],p.slidingGlassHeight]]){
    uvLine('glass',m.glass,a,b,height,H,.025);for(const y of [H,H+height])uvLine('frames',m.metal,a,b,p.frame,y,.06);
    const len=pt(a).distanceTo(pt(b)),n=Math.ceil(len/1.8);for(let i=0;i<=n;i++){const u=a[0]+(b[0]-a[0])*i/n,v=a[1]+(b[1]-a[1])*i/n;box('frames',m.metal,p.frame,height,.06,X(u),H+height/2,Z(v));}
  }
  // Rear kiosk is covered by the rear roof; the main garden in front is open.
  for(const [u,v] of [[.75,.277],[1,.277]])bar('columns',m.plaster,[X(u),H,Z(v)],[X(u),R-p.slab,Z(v)],.075);

  function flight(cx,z1,z2,y1,y2,upper){
    const dz=z2-z1,dy=y2-y1;
    // Horizontal-width extrusion gives exact level endpoints; a rotated box
    // previously overshot the landings and let the courtyard slab cut the ramp.
    const rampSlab=ribbon('ramps',upper?m.paving:m.floor,[new THREE.Vector2(cx,z1),new THREE.Vector2(cx,z2)],t=>y1+dy*t-rp.thickness,rp.thickness,lane);
    const rampUV=rampSlab.geometry.attributes.uv,rampPos=rampSlab.geometry.attributes.position;
    for(let i=0;i<rampUV.count;i++)rampUV.setXY(i,rampPos.getX(i)/10,rampPos.getZ(i)/10);
    const outside=cx<0?cx-lane/2:cx+lane/2;
    // The upper return is an edge beam with an open rail, not a solid tall wall.
    const band=upper&&cx<0?rp.spineBand:rp.parapetHeight;
    ribbon('ramps',m.plaster,[new THREE.Vector2(outside,z1),new THREE.Vector2(outside,z2)],t=>y1+dy*t-(upper&&cx<0?band:0),band,.10);
    // Lower flights have solid parapets. The previous generic three-bar rail
    // rose above the courtyard floor and incorrectly crossed the glazed facade.
    // Only the open upper flights receive white metal rails.
    const edge=cx<0?cx+lane/2:cx-lane/2;
    if(upper&&cx<0){
      for(const lift of [.30,.59,rp.railHeight])bar('rails',m.roofMetal,[edge,y1+lift,z1],[edge,y2+lift,z2],.018);
      for(let i=0;i<=7;i++){const t=i/7;bar('rails',m.roofMetal,[edge,y1+dy*t,z1+dz*t],[edge,y1+dy*t+rp.railHeight,z1+dz*t],.015);}
    }
    if(upper&&cx<0){
      for(const lift of [.30,.59,rp.railHeight])bar('rails',m.roofMetal,[outside,y1+lift,z1],[outside,y2+lift,z2],.018);
      for(let i=0;i<=6;i++){const t=i/6;bar('rails',m.roofMetal,[outside,y1+dy*t,z1+dz*t],[outside,y1+dy*t+rp.railHeight,z1+dz*t],.015);}
    }
  }
  flight(-rc,rFront,rBack,.11,H/2,false);flight(rc,rBack,rFront,H/2,H,false);flight(rc,rFront,rBack,H,(H+R)/2,true);flight(-rc,rBack,rFront,(H+R)/2,R,true);
  for(const y of [H/2,(H+R)/2])box('ramps',m.floor,rRight-rLeft,.13,rp.landing,0,y-.065,rBack-rp.landing/2);
  box('ramps',m.floor,rRight-rLeft,.13,.55,0,H-.065,rFront+.275);
  box('ramps',m.floor,lane+.1,.13,.55,-rc,R-.065,rFront+.275);
  root.userData.rampFlights=[{lane:'left',from:.11,to:H/2},{lane:'right',from:H/2,to:H},{lane:'right',from:H,to:(H+R)/2},{lane:'left',from:(H+R)/2,to:R}];
  // Supplied three courtyard views: glazing separates the two lanes. The
  // ascending garden lane and its solid parapet are IN FRONT of this plane.
  const midLevel=(H+R)/2,faceX=0;
  const face=[new THREE.Vector2(faceX,rFront),new THREE.Vector2(faceX,rBack)];
  const faceTop=t=>R+(midLevel-R)*t-rp.spineBand;
  const rampPane=ribbon('glass',m.rampGlass,face,H+.045,t=>faceTop(t)-H-.045,.022);rampPane.castShadow=false;
  ribbon('ramps',m.plaster,face,t=>R+(midLevel-R)*t-rp.spineBand,rp.spineBand,rp.spineThickness);
  const postT=rp.facadeSplit,postZ=rFront+(rBack-rFront)*postT,postTop=faceTop(postT);
  box('ramps',m.plaster,rp.spineThickness,postTop-H,rp.facadeStile,faceX,(H+postTop)/2,postZ);
  for(const z of [rFront,rBack]){const top=faceTop(z===rFront?0:1);box('ramps',m.plaster,rp.spineThickness,top-H,rp.facadeStile,faceX,(H+top)/2,z);}
  for(let lift=rp.glassBarSpacing;lift<R-H-rp.spineBand;lift+=rp.glassBarSpacing){
    const endT=Math.min(1,(R-H-rp.spineBand-lift)/(R-midLevel));
    // Unbroken glazing bars behind the foreground white parapet. Occlusion
    // comes from their actual separation, not camera-dependent missing bars.
    if(endT>0)bar('frames',m.rampFrame,[faceX+.025,H+lift,rFront],[faceX+.025,H+lift,rFront+(rBack-rFront)*endT],rp.glassBarRadius);
  }
  root.userData.rampFacade={x:faceX,bottom:H,front:rFront,back:rBack,topFront:faceTop(0),topBack:faceTop(1)};

  // D-plan return stair, without a cylindrical centre column. Dimensions above
  // describe its OUTSIDE envelope, not the tread centreline (previous error).
  const centreRx=srx-s.width/2,centreRz=srz-s.width/2,stairStartX=X(s.left)+s.width/2;
  const stairCurve=[new THREE.Vector2(stairStartX,scz-centreRz),...ellipse(scx,scz,centreRx,centreRz,-Math.PI/2,Math.PI/2,48),new THREE.Vector2(stairStartX,scz+centreRz)],curve=new THREE.CurvePath();
  for(let i=1;i<stairCurve.length;i++)curve.add(new THREE.LineCurve(stairCurve[i-1],stairCurve[i]));
  const n=s.stepsPerFloor,route=t=>curve.getPoint(t);
  const sample=(t,offset=0)=>{const q=route(t),a=route(Math.max(0,t-.001)),b=route(Math.min(1,t+.001)),d=b.clone().sub(a).normalize();return q.add(new THREE.Vector2(-d.y,d.x).multiplyScalar(offset));};
  const treadOutlines=[];
  for(let floor=0;floor<2;floor++){
    const base=floor?H:.11,top=floor?R:H,rise=(top-base)/n;
    // True quadrilateral/winder treads meet at their shared radial edge. The
    // old repeated boxes overlapped on turns and left disconnected gaps.
    for(let i=0;i<n;i++){
      const a=i/n,b=(i+1)/n,halfTread=s.width/2-s.wallThickness-.01,outline=[sample(a,-halfTread),sample(b,-halfTread),sample(b,halfTread),sample(a,halfTread)].map(q=>[q.x,q.y]);
      polygon('stairs',m.stairTread,outline,[],base+rise*(i+1),rise+.01);if(!floor)treadOutlines.push(outline);
    }
    const path=Array.from({length:97},(_,i)=>sample(i/96));
    ribbon('stairs',m.plaster,path,t=>base+(top-base)*t-s.waistThickness,s.waistThickness,s.width-2*s.wallThickness-.01);
    for(const side of [-1,1]){
      const edge=Array.from({length:97},(_,i)=>sample(i/96,side*(s.width/2-s.wallThickness/2)));
      ribbon('stairs',m.plaster,edge,t=>base+(top-base)*t-s.waistThickness,s.wallHeight+s.waistThickness,s.wallThickness);
      for(let i=1;i<edge.length;i++)bar('rails',m.stairRail,[edge[i-1].x,base+(top-base)*(i-1)/96+s.railHeight,edge[i-1].y],[edge[i].x,base+(top-base)*i/96+s.railHeight,edge[i].y],.022);
      for(let i=0;i<=8;i++){const t=i/8,q=sample(t,side*(s.width/2-s.wallThickness/2)),y=base+(top-base)*t;bar('rails',m.stairRail,[q.x,y+s.wallHeight,q.y],[q.x,y+s.railHeight,q.y],.014);}
    }
    // Landing joins the returning leg to the next floor's starting leg.
    box('stairs',m.floor,s.width,p.slab,2*srz,stairStartX,top-p.slab/2,scz);
  }
  root.userData.stair={treadOutlines,stepsPerFloor:n,centreline:stairCurve.map(q=>[q.x,q.y]),outside:{left:X(s.left),right:X(s.right),back:scz-srz,front:scz+srz},winding:'same on both storeys'};
  // The first-floor stair is enclosed beside the garden; it must not project
  // naked treads and black rails into the courtyard elevation.
  const stairEnclosure=[new THREE.Vector2(X(s.left),scz-srz),...ellipse(scx,scz,srx,srz,-Math.PI/2,Math.PI/2,48),new THREE.Vector2(X(s.left),scz+srz)];
  ribbon('interior',m.plaster,stairEnclosure,H,p.upperHeight-p.slab,.12);
  // White end wall at the high end of the ramp, with the photographed dark door.
  const endZ=rFront+.075,doorCentre=-rc,doorWidth=.78,doorHeight=2.10;
  for(const [a,b] of [[rLeft,doorCentre-doorWidth/2],[doorCentre+doorWidth/2,0]])line('interior',m.plaster,[a,endZ],[b,endZ],p.upperHeight-p.slab,H,.14);
  line('interior',m.plaster,[doorCentre-doorWidth/2,endZ],[doorCentre+doorWidth/2,endZ],p.upperHeight-p.slab-doorHeight,H+doorHeight,.14);
  box('interior',m.dark,doorWidth,doorHeight,.04,doorCentre,H+doorHeight/2,endZ);
  // CMN drone photograph: roofed stair headhouse, not an open low parapet.
  // D-shaped rear chamber joins the narrow front passage. Door faces solarium.
  const ex=p.roofExit,exitPath=[new THREE.Vector2(X(.172),Z(.72)),new THREE.Vector2(X(.172),Z(.527)),...ellipse(scx,scz,srx+.12,srz+.12,-Math.PI/2,Math.PI/2,24),new THREE.Vector2(X(.255),Z(.62)),new THREE.Vector2(X(.255),Z(.72))];
  ribbon('roof',m.roofWhite,exitPath.slice(1),R,roofHeight,.12);
  // Straight side of stair exit: actual punched framed window, not a painted
  // rectangle on an opaque wall. +Z and -Z ends stay connected to the chamber.
  const ew=ex.window,wx=X(.172),wz=Z(ew.centerV),w1=wz-ew.width/2,w2=wz+ew.width/2;
  for(const [a,b] of [[Z(.527),w1],[w2,Z(.72)]])line('roof',m.roofWhite,[wx,a],[wx,b],roofHeight,R,.12);
  line('roof',m.roofWhite,[wx,w1],[wx,w2],ew.sill,R,.12);
  line('roof',m.roofWhite,[wx,w1],[wx,w2],roofHeight-ew.sill-ew.height,R+ew.sill+ew.height,.12);
  box('glass',m.glass,.022,ew.height,ew.width,wx,R+ew.sill+ew.height/2,wz);
  for(const y of [R+ew.sill,R+ew.sill+ew.height])box('frames',m.metal,.06,ew.frame,ew.width,wx,y,wz);
  for(let i=0;i<=ew.bays;i++)box('frames',m.metal,.06,ew.height,ew.frame,wx,R+ew.sill+ew.height/2,w1+ew.width*i/ew.bays);
  const exitOutline=exitPath.map(q=>[q.x,q.y]);
  polygon('roof',m.roofWhite,exitOutline,[],R+roofHeight,ex.roofThickness);
  // Roof surface ends flush with the shared wall crest. No raised coping/rim.
  polygon('roof',m.roofMembrane,exitOutline,[],R+roofHeight,.004);
  const doorX=(X(.172)+X(.255))/2,doorZ=Z(.72),d1=doorX-ex.doorWidth/2,d2=doorX+ex.doorWidth/2;
  line('roof',m.roofWhite,[X(.172),doorZ],[d1,doorZ],roofHeight,R,.12);line('roof',m.roofWhite,[d2,doorZ],[X(.255),doorZ],roofHeight,R,.12);
  line('roof',m.roofWhite,[d1,doorZ],[d2,doorZ],roofHeight-ex.doorHeight,R+ex.doorHeight,.12);
  box('glass',m.glass,ex.doorWidth,ex.doorHeight,.025,doorX,R+ex.doorHeight/2,doorZ);
  for(const xx of [d1,d2])box('frames',m.metal,.035,ex.doorHeight,.04,xx,R+ex.doorHeight/2,doorZ);
  // Independent cylindrical rooftop vent seen in CMN/FLC roof photographs.
  const vent=new THREE.Mesh(new THREE.CylinderGeometry(ex.ventRadius,ex.ventRadius,roofHeight,20),m.roofWhite);vent.position.set(X(ex.ventU),R+roofHeight/2,Z(ex.ventV));layers.roof.add(vent);
  const ventCap=new THREE.Mesh(new THREE.CylinderGeometry(ex.ventRadius-.025,ex.ventRadius-.025,.012,20),m.roofWhite);ventCap.position.set(X(ex.ventU),R+roofHeight-.006,Z(ex.ventV));layers.roof.add(ventCap);
  root.userData.roofExit={outline:exitOutline,top:R+roofHeight,vent:[X(ex.ventU),Z(ex.ventV)],window:{x:wx,z:wz,width:ew.width,sill:R+ew.sill,height:ew.height}};
  const fs=p.frontRoofStem,stemHeight=roofHeight;
  box('roof',m.roofWhite,fs.width,stemHeight,fs.depth,X(fs.u),R+stemHeight/2,Z(fs.v));
  root.userData.frontRoofStem={x:X(fs.u),z:Z(fs.v),top:R+stemHeight,height:stemHeight};

  // Asymmetric, OPEN solarium screen — never a stadium with two closing bars.
  const so=p.solarium,leftCurve=new THREE.CubicBezierCurve(pt(so.curveStart),pt(so.curveControl1),pt(so.curveControl2),pt(so.curveEnd));
  // User's red markup: full-height connection from the windowed straight wall
  // at the stair exit to the near, formerly free end of the large curved wall.
  const bridgeStart=exitPath[0].clone(),bridgeEnd=pt(so.curveStart);
  ribbon('roof',m.roofWhite,[bridgeStart,bridgeEnd],R,roofHeight,T);
  root.userData.roofWallBridge={start:[bridgeStart.x,bridgeStart.y],end:[bridgeEnd.x,bridgeEnd.y],base:R,top:R+roofHeight};
  // Horizontal crest on the curved wall. Do not create an invented sloping top.
  ribbon('roof',m.roofWhite,leftCurve.getPoints(p.curveSegments),R,roofHeight);
  const wallZ=Z(so.curveEnd[1]),startX=X(so.curveEnd[0])+so.curveGap,endX=X(so.straightEnd[0]),openingX=X(so.openingCenterU),o1=openingX-so.openingWidth/2,o2=openingX+so.openingWidth/2;
  line('roof',m.roofWhite,[startX,wallZ],[o1,wallZ],roofHeight,R);line('roof',m.roofWhite,[o2,wallZ],[endX,wallZ],roofHeight,R);
  line('roof',m.roofWhite,[o1,wallZ],[o2,wallZ],so.openingSill,R);line('roof',m.roofWhite,[o1,wallZ],[o2,wallZ],roofHeight-so.openingSill-so.openingHeight,R+so.openingSill+so.openingHeight);
  for(const xx of [o1,o2])box('roof',m.roofWhite,.055,so.openingHeight,.34,xx,R+so.openingSill+so.openingHeight/2,wallZ-.08);
  box('roof',m.roofWhite,so.openingWidth+.11,.06,.44,openingX,R+so.openingSill,wallZ-.10);
  for(const xx of [startX+.06,X(.573),X(.672)])box('roof',m.roofWhite,.055,roofHeight,.26,xx,R+roofHeight/2,wallZ-.11);
  const ac=so.rightArcCenter,rightArc=ellipse(X(ac[0]),Z(ac[1]),so.rightRadiusU*W,so.rightRadiusV*D,Math.PI/2,-Math.PI/2,p.curveSegments);
  const returnEnd=rightArc[0].clone();returnEnd.x-=so.rightCurveGap;
  ribbon('roof',m.roofWhite,[pt(so.straightEnd),pt(so.step),returnEnd],R,roofHeight);ribbon('roof',m.roofWhite,rightArc,R,roofHeight);
  root.userData.roofScreenGaps=[{x:(X(so.curveEnd[0])+startX)/2,z:wallZ,width:so.curveGap},{x:(returnEnd.x+rightArc[0].x)/2,z:returnEnd.y,width:so.rightCurveGap}];
  // Low roof curbs stop at the outdoor notches.
  for(const [a,b] of [[[0,0],[1,0]],[[0,0],[0,.585]],[[1,0],[1,.277]],[[0,.72],[0,1]],[[0,1],[1,1]],[[1,.72],[1,1]]])uvLine('roof',m.roofWhite,a,b,p.parapet,R,.12);
  for(const [u,v,w,d] of [[.16,.485,.8,.8],[.258,.485,1.8,.8]]){box('roof',m.roofWhite,w,.18,d,X(u),R+.09,Z(v));box('glass',m.glass,w-.10,.025,d-.1,X(u),R+.20,Z(v));}
  // Low L planter seen in the photographs; not another full-height wall.
  for(const [a,b] of [[[.466,.765],[.688,.765]],[[.688,.765],[.688,.830]]]){uvLine('roof',m.roofWhite,a,b,.51,R,1.15);uvLine('roof',m.earth,a,b,.025,R+.51,.95);}
  const roofLeaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.30,1),m.leaf,12);
  for(let i=0;i<12;i++){tmp.rotation.set(0,i,0);tmp.position.set(X(.55+.011*i),R+.67,Z(.765)+Math.sin(i*2)*.22);tmp.scale.set(1,1+(i%3)*.20,1);tmp.updateMatrix();roofLeaves.setMatrixAt(i,tmp.matrix);}layers.roof.add(roofLeaves);
  for(const [u,v,w,d] of [[.69,.664,2,1.45],[.925,.518,2.2,.75],[.72,.329,2.15,1.65]]){
    box('floors',m.plaster,w,.44,d,X(u),H+.22,Z(v));box('landscape',m.earth,w-.18,.035,d-.18,X(u),H+.46,Z(v));
    for(let i=0;i<4;i++){const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(.26,1),m.leaf);leaf.scale.set(1,.70,1);leaf.position.set(X(u)-w*.32+i*w*.21,H+.60,Z(v));layers.landscape.add(leaf);}
  }
  box('floors',m.plaster,1.65,.09,.70,X(.92),H+.82,Z(.235));box('floors',m.plaster,.18,.75,.18,X(.92),H+.375,Z(.235));
  for(const u of [.41,.58]){box('furniture',m.furniture,2,.22,.8,X(u),H+.35,Z(.87));box('furniture',m.cushion,1.92,.20,.75,X(u),H+.56,Z(.87));box('furniture',m.cushion,1.95,.50,.16,X(u),H+.80,Z(.89));}
  box('furniture',m.furniture,1.2,.09,.65,X(.5),H+.42,Z(.81));box('furniture',m.furniture,2.5,.09,1.15,X(.83),H+.76,Z(.87));
  for(const u of [.76,.90])for(const v of [.845,.895])box('furniture',m.dark,.04,.70,.04,X(u),H+.35,Z(v));
  for(const v of [.15,.435]){box('furniture',m.furniture,1.6,.36,2.15,X(.1),H+.18,Z(v));box('furniture',m.cushion,1.54,.18,2.08,X(.1),H+.45,Z(v));}layers.furniture.visible=false;

  // Gravel continues UNDER the pilotis. The previous lawn + oval loop was wrong.
  const site=p.site;box('landscape',m.earth,site.width,site.thickness,site.depth,0,-site.thickness/2-.08,0);box('landscape',m.grass,site.width,.08,site.depth,0,-.04,0);
  polygon('landscape',m.gravel,rect(-W/2-1.1,W/2+1.1,-D/2-.7,D/2+1.5),[coreOutline],.018,.012);box('landscape',m.gravel,3.4,.018,8,0,.009,D/2+5.5);
  const trees=[[-19,-14],[-18,-6],[-19,10],[18,-14],[20,-5],[18,12],[-12,-18],[10,-18]],foliage=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),m.leaf,trees.length),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.13,2.4,7),m.trunk,trees.length);
  trees.forEach(([x,z],i)=>{tmp.rotation.set(0,i,0);tmp.scale.set(1,1,1);tmp.position.set(x,1.2,z);tmp.updateMatrix();trunks.setMatrixAt(i,tmp.matrix);tmp.position.y=3.3;tmp.scale.set(1.6+(i%2)*.3,2.1,1.5);tmp.updateMatrix();foliage.setMatrixAt(i,tmp.matrix);});foliage.castShadow=true;trunks.castShadow=true;layers.landscape.add(foliage,trunks);
  for(const group of Object.values(layers)){
    const batches=new Map();for(const a of [...group.children])if(a.isMesh&&!a.isInstancedMesh&&a.material!==m.glass){a.updateMatrix();const g=a.geometry.clone();g.applyMatrix4(a.matrix);if(!g.index)g.setIndex([...Array(g.attributes.position.count).keys()]);if(!batches.has(a.material))batches.set(a.material,[]);batches.get(a.material).push(g);group.remove(a);}
    for(const [mat,geos]of batches){const geo=mergeGeometries(geos,false);if(!geo)throw Error(`Cannot merge ${group.name}`);const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=group.name!=='stairs';group.add(mesh);geos.forEach(g=>g.dispose());}
  }
  root.userData.roofOutline=roofOutline;root.userData.coreOutline=coreOutline;root.userData.landscapeOpening={x:[o1,o2],z:wallZ,sill:R+so.openingSill,top:R+so.openingSill+so.openingHeight};
  root.userData.stairHole=stairHole;
  return {root,layers,levels:{ground:0,first:H,roof:R},bounds:{width:W,depth:D,height:R+roofHeight}};
}
