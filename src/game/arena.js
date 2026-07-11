
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer, RenderPass, EffectPass, Effect, BloomEffect, SMAAEffect } from 'postprocessing';
import { renderer } from '../core/renderer.js';
import { modes } from '../core/modes.js';

addEventListener('error',ev=>{try{const el=document.getElementById('mdlStatus');if(el)el.textContent='⚠ '+(ev.message||'script error');}catch(_){}});

const TAU=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;

// ---------------- STAND DEFS ----------------
// barrage = J basic; arts = [L,U,I,O,P]
export const STANDS=[
 {sym:'●',part:5,name:'CRIMSON HERALD',hex:0xe0354b,css:'#e0354b',acc:'#ff9aa8',accHex:0xff9aa8,
  desc:'Emperor of erased time',bDmg:9,bRate:4,bRange:7.5,cry:'GWAH!',
  arts:[{n:'SEVERING CHOP',cd:90},{n:'TIME ERASURE',cd:600},{n:'EPITAPH',cd:480},
        {n:'IMPALING HAND',cd:110},{n:'BLINDSIDE',cd:240}],
  spName:'ERASED RESULT'},
 {sym:'■',part:3,name:'NULL HOUR',hex:0xf2b630,css:'#f2b630',acc:'#ffe28a',accHex:0xffe28a,
  desc:'Armored tyrant of stopped time',bDmg:12,bRate:6,bRange:8,cry:'TICK.',
  arts:[{n:'KNUCKLE DOWN',cd:170},{n:'STEAMROLLER DROP',cd:600},{n:'KNIFE FAN',cd:200},
        {n:'LIFE SIPHON',cd:300},{n:'HEAVEN DROP',cd:260}],
  spName:'VOID TICK'},
 {sym:'▲',part:3,name:'JADE ORACLE',hex:0x3ddc6a,css:'#3ddc6a',acc:'#bdffd3',accHex:0xbdffd3,
  desc:'Serpent puppeteer',bDmg:7,bRate:4,bRange:7,cry:'PYOK!',
  arts:[{n:'EMERALD TEMPEST',cd:140},{n:'TENDRIL SNARE',cd:300},{n:'PUPPET STRINGS',cd:480},
        {n:'AMBUSH NET',cd:360},{n:'COIL CONSTRICT',cd:240}],
  spName:'SERPENT COIL'},
 {sym:'◆',part:3,name:'SILVER ZEPHYR',hex:0xc9d4e4,css:'#c9d4e4',acc:'#ffffff',accHex:0xffffff,
  desc:'Knight of the flashing blade',bDmg:8,bRate:3,bRange:8,cry:'HOH!',
  arts:[{n:'THOUSAND PIERCE',cd:130},{n:'ARMOR PURGE',cd:420},{n:'BLADE SHOT',cd:200},
        {n:'AFTERIMAGE LEGION',cd:420},{n:'RIPOSTE STANCE',cd:300}],
  spName:'BLADE WALTZ'},
 {sym:'✚',part:4,name:'GILDED MENDER',hex:0xff6fa5,css:'#ff6fa5',acc:'#ffc1d9',accHex:0xffc1d9,
  desc:'Restoration brawler — what breaks can be mended',bDmg:10,bRate:4,bRange:7.5,cry:'KRRAK!',
  arts:[{n:'MEND SELF',cd:480},{n:'RETURN TO SENDER',cd:300},{n:'WALL OF MENDING',cd:360},
        {n:'FUSE TO EARTH',cd:240},{n:'METEOR LUNGE',cd:120}],
  spName:"MENDER'S WRATH"},
 {sym:'✶',part:6,name:'VELVET SEAM',hex:0x35c5e8,css:'#35c5e8',acc:'#c8f1ff',accHex:0xc8f1ff,
  desc:'Unraveling string — reach beyond the body',bDmg:8,bRate:4,bRange:8,cry:'TWANG!',
  arts:[{n:'STRING SHOT',cd:100},{n:'GRAPPLE LINE',cd:160},{n:'WIRE NET',cd:300},
        {n:'PUPPET WIRE',cd:240},{n:'UNRAVEL',cd:420}],
  spName:'THOUSAND THREADS'},
 {sym:'⧖',part:7,name:'HIGH NOON',hex:0xcc6b3f,css:'#cc6b3f',acc:'#ffd9a8',accHex:0xffd9a8,
  desc:'Duelist — six seconds can be taken back',bDmg:8,bRate:4,bRange:7.5,cry:'BANG!',
  arts:[{n:'DEAD-EYE SHOT',cd:90},{n:'SIX SECONDS BACK',cd:700},{n:'FAN FIRE',cd:160},
        {n:"DUELIST'S CODE",cd:360},{n:'SUNDOWN MARK',cd:220}],
  spName:'LAST LIGHT'},
 {sym:'◉',part:8,name:'PLUNDER TIDE',hex:0x5aa8ff,css:'#5aa8ff',acc:'#dff0ff',accHex:0xdff0ff,
  desc:'Bubble thief — what is yours becomes mine',bDmg:8,bRate:4,bRange:7,cry:'POP!',
  arts:[{n:'BUBBLE VOLLEY',cd:140},{n:'PLUNDER',cd:300},{n:'BUBBLE WARD',cd:360},
        {n:'SOAP SLICK',cd:280},{n:'BURST FINALE',cd:200}],
  spName:'TOTAL PLUNDER'}
];
const ART_KEYS=['L','U','I','O','P'];

// ---------------- THREE SETUP ----------------
// (renderer is the shared PBR renderer from src/core/renderer.js)
let W=innerWidth,H=innerHeight;
renderer.setSize(W,H);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const clock=new THREE.Clock();
const cTex=c=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;};
document.getElementById('wrap').prepend(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0a0712);
scene.fog=new THREE.Fog(0x0a0712,34,95);
const camera=new THREE.PerspectiveCamera(55,W/H,0.1,220);
addEventListener('resize',()=>{W=innerWidth;H=innerHeight;camera.aspect=W/H;camera.updateProjectionMatrix();renderer.setSize(W,H);composer.setSize(W,H);syncLines();});

// image-based ambient — neutral studio environment as a placeholder until the
// Morioh HDR sky panorama becomes the scene environment (Phase 6)
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
scene.environmentIntensity=0.5;
const sun=new THREE.DirectionalLight(0xfff2dd,3.2);
sun.position.set(12,24,8);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-55;sun.shadow.camera.right=55;
sun.shadow.camera.top=55;sun.shadow.camera.bottom=-55;
sun.shadow.camera.near=1;sun.shadow.camera.far=100;
scene.add(sun);
const standLight=new THREE.PointLight(0xe0354b,40,22);
standLight.position.set(0,4,0);scene.add(standLight);

// (cel-shading toolkit retired in the PBR migration — inverted-hull outlines
// and the toon gradient ramp are gone; this keeps callers' shadow flags)
function outlineGroup(root){
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
}
// manga speed-line overlay
const lineCv=document.getElementById('lines');
const lcx=lineCv.getContext('2d');
let lineAlpha=0;
function syncLines(){lineCv.width=W;lineCv.height=H;}
syncLines();
function drawLines(){
  const base=(state==='play'&&((timeStopT>0)||(P&&P.eraseT>0)))?0.3:0;
  lineAlpha=Math.max(lineAlpha*0.9,base);
  lcx.clearRect(0,0,W,H);
  if(lineAlpha<0.02)return;
  lcx.save();lcx.translate(W/2,H/2);
  lcx.globalAlpha=lineAlpha;
  lcx.fillStyle=(state==='play'&&timeStopT>0)?'#cfb3ff':'#ffffff';
  const R=Math.hypot(W,H)/2;
  for(let i=0;i<26;i++){
    const a=(i/26)*TAU+(frame||0)*0.01;
    const inner=R*rnd(0.45,0.7);
    const w=rnd(0.004,0.018);
    lcx.beginPath();
    lcx.moveTo(Math.cos(a-w)*R,Math.sin(a-w)*R);
    lcx.lineTo(Math.cos(a)*inner,Math.sin(a)*inner);
    lcx.lineTo(Math.cos(a+w)*R,Math.sin(a+w)*R);
    lcx.closePath();lcx.fill();
  }
  lcx.restore();
}

// ---- post chain: bloom + SMAA + gameplay grade (CA, vignette, stop/erase) ----
const gradeEffect=new Effect('PVGrade',`
  uniform float ca; uniform float vig;
  uniform float gradeStop; uniform float gradeErase;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
    vec2 d=uv-0.5;
    float rr=texture2D(inputBuffer,uv+d*ca).r;
    float bb=texture2D(inputBuffer,uv-d*ca).b;
    vec3 c=vec3(rr,inputColor.g,bb);
    float lum=dot(c,vec3(0.299,0.587,0.114));
    c=mix(c,lum*vec3(0.8,0.72,1.3),gradeStop*0.55);
    c=mix(c,c*vec3(1.3,0.78,0.82)+vec3(0.04,0.,0.),gradeErase*0.5);
    float vg=smoothstep(0.95,0.35,length(d));
    c*=mix(1.0,vg,vig);
    outputColor=vec4(c,inputColor.a);
  }`,{
  uniforms:new Map([
    ['ca',new THREE.Uniform(0)],['vig',new THREE.Uniform(0.42)],
    ['gradeStop',new THREE.Uniform(0)],['gradeErase',new THREE.Uniform(0)]])});
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
composer.addPass(new EffectPass(camera,
  new BloomEffect({intensity:0.55,luminanceThreshold:0.72,luminanceSmoothing:0.2,mipmapBlur:true}),
  new SMAAEffect(),
  gradeEffect));
composer.setSize(W,H);
let gradeStopCur=0,gradeEraseCur=0;

// ---------------- STAGES ----------------
const STAGES=[
 {name:'VOID ARENA',desc:'the nameless dark',
  bg:0x0a0712,fog:0x0a0712,stopBg:0x140d26,stopFog:0x1b1133,eraseBg:0x160810,eraseFog:0x1f0a12},
 {name:'MORIOH — GOLDEN HOUR',desc:'Part 4 — a quiet town at sunset',
  bg:0x2a1430,fog:0x4a2440,stopBg:0x1b1433,stopFog:0x272050,eraseBg:0x230a14,eraseFog:0x330d1c}
];
let stageIdx=0,voidGroup,moriohGroup,moriohSun;

(function buildGround(){
  const c=document.createElement('canvas');c.width=c.height=128;
  const g=c.getContext('2d');
  g.fillStyle='#191230';g.fillRect(0,0,128,128);
  g.fillStyle='rgba(239,230,216,0.10)';
  for(let y=8;y<128;y+=24)for(let x=8;x<128;x+=24){g.beginPath();g.arc(x,y,2.4,0,TAU);g.fill();}
  const tex=cTex(c);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(14,14);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(46,48),new THREE.MeshStandardMaterial({map:tex}));
  ground.rotation.x=-Math.PI/2;
  ground.receiveShadow=true;
  scene.add(ground);
  for(let i=1;i<=4;i++){
    const ring=new THREE.Mesh(new THREE.RingGeometry(i*9-0.12,i*9+0.12,64),
      new THREE.MeshBasicMaterial({color:0x4a3f6e,transparent:true,opacity:0.45}));
    ring.rotation.x=-Math.PI/2;ring.position.y=0.02;scene.add(ring);
  }
  const rim=new THREE.Mesh(new THREE.RingGeometry(45.4,46,64),
    new THREE.MeshBasicMaterial({color:0xe0354b,transparent:true,opacity:0.5}));
  rim.rotation.x=-Math.PI/2;rim.position.y=0.03;scene.add(rim);
  // everything below is VOID ARENA set dressing — grouped so stages can swap it
  voidGroup=new THREE.Group();
  for(let i=0;i<10;i++){
    const hgt=rnd(4,11);
    const p=new THREE.Mesh(new THREE.BoxGeometry(0.5,hgt,0.5),
      new THREE.MeshStandardMaterial({color:0x241b42}));
    const a=rnd(0,TAU),d=rnd(34,44);
    p.position.set(Math.cos(a)*d,hgt/2,Math.sin(a)*d);
    p.rotation.y=rnd(0,TAU);voidGroup.add(p);
  }
  // sky dome
  const skyC=document.createElement('canvas');skyC.width=2;skyC.height=256;
  const sg=skyC.getContext('2d');
  const grd=sg.createLinearGradient(0,0,0,256);
  grd.addColorStop(0,'#040208');grd.addColorStop(0.55,'#120a26');grd.addColorStop(1,'#2c1540');
  sg.fillStyle=grd;sg.fillRect(0,0,2,256);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(120,24,16),
    new THREE.MeshBasicMaterial({map:cTex(skyC),side:THREE.BackSide,fog:false}));
  voidGroup.add(sky);
  // ruined arches on the horizon
  for(let i=0;i<8;i++){
    const aa=i/8*TAU+0.3;
    const arch=new THREE.Group();
    const m=new THREE.MeshStandardMaterial({color:0x1c1535});
    const p1=new THREE.Mesh(new THREE.BoxGeometry(1.6,12,1.6),m);p1.position.set(-3,6,0);arch.add(p1);
    const p2=p1.clone();p2.position.x=3;arch.add(p2);
    const lintel=new THREE.Mesh(new THREE.BoxGeometry(8.4,1.8,1.8),m);lintel.position.y=12.4;arch.add(lintel);
    arch.position.set(Math.cos(aa)*52,0,Math.sin(aa)*52);
    arch.lookAt(0,0,0);
    voidGroup.add(arch);
  }
  scene.add(voidGroup);
})();

(function buildMorioh(){
  moriohGroup=new THREE.Group();
  moriohGroup.visible=false;
  // ---- paved plaza ground: warm offset pavers, canvas-painted ----
  const c=document.createElement('canvas');c.width=c.height=256;
  const g=c.getContext('2d');
  g.fillStyle='#241a30';g.fillRect(0,0,256,256);
  const paver=(x,y,w,h)=>{
    const v=rnd(-7,9)|0;
    g.fillStyle='rgb('+(52+v)+','+(38+v)+','+(56+v)+')';
    g.fillRect(x+2,y+2,w-4,h-4);
    g.fillStyle='rgba(255,190,130,0.05)';
    g.fillRect(x+2,y+2,w-4,4); // top catch of sunset light
  };
  for(let row=0;row<4;row++)for(let col=0;col<4;col++)
    paver(col*64+(row%2?32:0)-((row%2)?0:0),row*64,64,64);
  for(let row=0;row<4;row++)if(row%2)paver(-32,row*64,64,64);
  const gtex=cTex(c);
  gtex.wrapS=gtex.wrapT=THREE.RepeatWrapping;gtex.repeat.set(10,10);
  const plaza=new THREE.Mesh(new THREE.CircleGeometry(46,48),
    new THREE.MeshStandardMaterial({map:gtex}));
  plaza.rotation.x=-Math.PI/2;plaza.position.y=0.015;plaza.receiveShadow=true;
  moriohGroup.add(plaza);
  // ---- skyline ring: dusk gradient, hills, house silhouettes, lit windows ----
  const sc=document.createElement('canvas');sc.width=1024;sc.height=256;
  const s=sc.getContext('2d');
  const grd=s.createLinearGradient(0,0,0,256);
  grd.addColorStop(0,'#3c1a4e');grd.addColorStop(0.45,'#8a3b5e');
  grd.addColorStop(0.72,'#e8944c');grd.addColorStop(0.85,'#f2b768');grd.addColorStop(1,'#e8944c');
  s.fillStyle=grd;s.fillRect(0,0,1024,256);
  // far hills
  s.fillStyle='#6d2f56';
  s.beginPath();s.moveTo(0,190);
  for(let x=0;x<=1024;x+=64)s.lineTo(x,190-Math.sin(x*0.006+1)*22-Math.sin(x*0.02)*8);
  s.lineTo(1024,256);s.lineTo(0,256);s.closePath();s.fill();
  // near hills
  s.fillStyle='#4e2148';
  s.beginPath();s.moveTo(0,208);
  for(let x=0;x<=1024;x+=64)s.lineTo(x,208-Math.sin(x*0.009+3)*16);
  s.lineTo(1024,256);s.lineTo(0,256);s.closePath();s.fill();
  // houses along the ridge (seamless: pattern derived from x)
  for(let x=8;x<1024;x+=74){
    const hw=40+((x*7)%22),hh=26+((x*13)%20),hy=226-hh;
    s.fillStyle='#33163a';
    s.fillRect(x,hy,hw,hh);
    s.beginPath();s.moveTo(x-5,hy);s.lineTo(x+hw*0.5,hy-16);s.lineTo(x+hw+5,hy);s.closePath();s.fill();
    for(let wx=x+6;wx<x+hw-8;wx+=14){
      s.fillStyle=((wx*11)%3)?'#ffd27f':'#7fe8d2';
      s.fillRect(wx,hy+8+((wx*5)%8),6,8);
    }
  }
  // power poles with sagging lines
  s.strokeStyle='#241026';s.lineWidth=3;
  for(let x=52;x<1024;x+=256){
    s.beginPath();s.moveTo(x,140);s.lineTo(x,238);s.stroke();
    s.beginPath();s.moveTo(x-16,152);s.lineTo(x+16,152);s.stroke();
    s.beginPath();s.moveTo(x+16,152);
    s.quadraticCurveTo(x+128,168,x+240,152);s.stroke();
  }
  const stex=cTex(sc);
  stex.wrapS=THREE.RepeatWrapping;stex.repeat.set(3,1);
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(58,58,26,48,1,true),
    new THREE.MeshBasicMaterial({map:stex,side:THREE.BackSide,fog:false}));
  ring.position.y=13;
  moriohGroup.add(ring);
  // warm dusk cap above the skyline ring
  const capC=document.createElement('canvas');capC.width=2;capC.height=128;
  const cg=capC.getContext('2d');
  const cgr=cg.createLinearGradient(0,0,0,128);
  cgr.addColorStop(0,'#2a1038');cgr.addColorStop(1,'#3c1a4e');
  cg.fillStyle=cgr;cg.fillRect(0,0,2,128);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(118,24,12,0,TAU,0,Math.PI*0.55),
    new THREE.MeshBasicMaterial({map:cTex(capC),side:THREE.BackSide,fog:false}));
  moriohGroup.add(cap);
  // the low sun, hanging over the rooftops
  const sunC=document.createElement('canvas');sunC.width=sunC.height=128;
  const sg2=sunC.getContext('2d');
  const rad=sg2.createRadialGradient(64,64,6,64,64,64);
  rad.addColorStop(0,'rgba(255,236,190,1)');rad.addColorStop(0.35,'rgba(255,190,110,0.85)');
  rad.addColorStop(1,'rgba(255,150,80,0)');
  sg2.fillStyle=rad;sg2.fillRect(0,0,128,128);
  const sunSpr=new THREE.Sprite(new THREE.SpriteMaterial({
    map:cTex(sunC),transparent:true,depthWrite:false,fog:false}));
  sunSpr.scale.set(26,26,1);
  sunSpr.position.set(Math.sin(2.4)*56,10.5,Math.cos(2.4)*56);
  moriohGroup.add(sunSpr);
  // houses between the arena edge and the skyline, for parallax
  const bodyMat=new THREE.MeshStandardMaterial({color:0x3a1c42});
  const roofMat=new THREE.MeshStandardMaterial({color:0x2b1231});
  for(let i=0;i<12;i++){
    const aa=i/12*TAU+0.26;
    const hw=rnd(2.6,4.4),hh=rnd(2.6,4.6),hd=rnd(2.6,4);
    const house=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(hw,hh,hd),bodyMat);
    body.position.y=hh/2;house.add(body);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(hw,hd)*0.78,hh*0.55,4),roofMat);
    roof.position.y=hh+hh*0.27;roof.rotation.y=Math.PI/4;house.add(roof);
    const d=rnd(49,55);
    house.position.set(Math.cos(aa)*d,0,Math.sin(aa)*d);
    house.rotation.y=rnd(0,TAU);
    moriohGroup.add(house);
  }
  // telephone poles inside the haze line
  const poleMat=new THREE.MeshStandardMaterial({color:0x2a1330});
  for(let i=0;i<6;i++){
    const aa=i/6*TAU+0.8;
    const pole=new THREE.Group();
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.28,8.5,0.28),poleMat);
    post.position.y=4.25;pole.add(post);
    const bar=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.18,0.18),poleMat);
    bar.position.y=7.6;pole.add(bar);
    const d=rnd(46.5,49);
    pole.position.set(Math.cos(aa)*d,0,Math.sin(aa)*d);
    moriohGroup.add(pole);
  }
  scene.add(moriohGroup);
  // late-afternoon sun light, matching the sprite's azimuth
  moriohSun=new THREE.DirectionalLight(0xffb066,1.6);
  moriohSun.position.set(Math.sin(2.4)*40,14,Math.cos(2.4)*40);
  moriohSun.visible=false;
  scene.add(moriohSun);
})();

function applyStage(i){
  stageIdx=i;
  voidGroup.visible=i===0;
  moriohGroup.visible=i===1;
  moriohSun.visible=i===1;
  const d=document.getElementById('stageDesc');
  if(d)d.textContent='· '+STAGES[i].desc;
}
// drifting light motes
const moteGeo=new THREE.BufferGeometry();
const motePos=new Float32Array(60*3);
for(let i=0;i<60;i++){
  const a=rnd(0,TAU),d=rnd(4,44);
  motePos[i*3]=Math.cos(a)*d;motePos[i*3+1]=rnd(0.5,14);motePos[i*3+2]=Math.sin(a)*d;
}
moteGeo.setAttribute('position',new THREE.BufferAttribute(motePos,3));
const motes=new THREE.Points(moteGeo,new THREE.PointsMaterial({
  color:0x9b8cc4,size:0.22,transparent:true,opacity:0.55,depthWrite:false}));
scene.add(motes);

// ---------------- BUILDERS ----------------
function sMat(hex,emI){return new THREE.MeshStandardMaterial({color:hex,roughness:0.45,metalness:0.05,emissive:hex,emissiveIntensity:emI==null?0.35:emI});}
function makeFrame(pts,hex){
  const g=new THREE.Group();
  for(let i=0;i<pts.length;i++){
    const a=pts[i],b=pts[(i+1)%pts.length];
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    const m=new THREE.Mesh(new THREE.BoxGeometry(len,0.06,0.14),
      new THREE.MeshBasicMaterial({color:hex,transparent:true,opacity:0.6}));
    m.position.set((a.x+b.x)/2,0,(a.z+b.z)/2);
    m.rotation.y=-Math.atan2(dz,dx);
    g.add(m);
  }
  return g;
}

export function buildStand(def,idx){
  const g=new THREE.Group();
  const mat=sMat(def.hex);
  const dark=new THREE.MeshStandardMaterial({color:0x1a1430,emissive:def.hex,emissiveIntensity:0.15});
  const accMat=new THREE.MeshStandardMaterial({color:def.accHex,emissive:def.accHex,emissiveIntensity:0.55});
  const armor=[],tendrils=[];

  let torsoW=1.0,torsoH=1.35,fistR=0.24;
  if(idx===0){torsoW=1.3;torsoH=1.45;fistR=0.32;}
  if(idx===1){torsoW=1.15;torsoH=1.4;fistR=0.28;}
  if(idx===2){torsoW=0.7;torsoH=1.2;fistR=0.18;}
  if(idx===3){torsoW=0.85;torsoH=1.3;fistR=0.2;}
  if(idx===4){torsoW=1.2;torsoH=1.45;fistR=0.3;}
  if(idx===5){torsoW=0.8;torsoH=1.3;fistR=0.2;}
  if(idx===6){torsoW=0.95;torsoH=1.35;fistR=0.22;}
  if(idx===7){torsoW=0.9;torsoH=1.3;fistR=0.22;}
  const torso=new THREE.Mesh(new THREE.BoxGeometry(torsoW,torsoH,0.55),mat);
  torso.position.y=1.7;g.add(torso);
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(0.22),new THREE.MeshBasicMaterial({color:def.accHex}));
  core.position.set(0,1.75,0.34);g.add(core);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.42,16,12),mat);
  head.position.y=2.75;g.add(head);
  const eyeL=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,6),new THREE.MeshBasicMaterial({color:0xffffff}));
  eyeL.position.set(-0.16,2.8,0.37);g.add(eyeL);
  const eyeR=eyeL.clone();eyeR.position.x=0.16;g.add(eyeR);

  function arm(side){
    const pv=new THREE.Group();pv.position.set((torsoW/2+0.12)*side,2.25,0);
    const pad=new THREE.Mesh(new THREE.SphereGeometry(idx===0?0.38:0.3,12,8),dark);pv.add(pad);
    const upper=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.12,0.75,8),mat);
    upper.position.y=-0.4;pv.add(upper);
    const elb=new THREE.Group();elb.position.y=-0.78;pv.add(elb);
    const joint=new THREE.Mesh(new THREE.SphereGeometry(0.13,8,6),dark);elb.add(joint);
    const fore=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.1,0.75,8),mat);
    fore.position.y=-0.4;elb.add(fore);
    const fist=new THREE.Mesh(new THREE.SphereGeometry(fistR,10,8),accMat);
    fist.position.y=-0.82;elb.add(fist);
    pv.userData.elb=elb;
    g.add(pv);return pv;
  }
  const armL=arm(-1),armR=arm(1);

  if(idx===2){ // serpent tail
    const t1=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.4,1.0,10),mat);
    t1.position.set(0,0.75,0.1);t1.rotation.x=0.25;g.add(t1);
    const t2=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.32,1.0,10),mat);
    t2.position.set(0,0.25,0.55);t2.rotation.x=1.0;g.add(t2);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.8,8),mat);
    tip.position.set(0,0.15,1.25);tip.rotation.x=1.7;g.add(tip);
    for(let i=0;i<5;i++){
      const tn=new THREE.Mesh(new THREE.BoxGeometry(0.07,1.7,0.07),sMat(def.hex,0.55));
      const a=i/5*TAU;
      tn.position.set(Math.cos(a)*0.55,0.9,Math.sin(a)*0.55-0.1);
      tn.rotation.z=Math.cos(a)*0.5;tn.rotation.x=Math.sin(a)*0.5;
      tn.userData.base={z:tn.rotation.z,x:tn.rotation.x,ph:rnd(0,TAU)};
      g.add(tn);tendrils.push(tn);
    }
  } else {
    function leg(side){
      const l=new THREE.Mesh(new THREE.CylinderGeometry(idx===0||idx===1?0.19:0.15,0.12,1.2,8),mat);
      l.position.set(0.3*side,0.55,0);l.rotation.z=side*0.12;g.add(l);
    }
    leg(-1);leg(1);
  }

  // ----- signature silhouettes -----
  if(idx===0){ // EMPEROR OF ERASED TIME: crown ridges, second face on brow, diamond studs
    for(let i=-1;i<=1;i++){ // crown ridges
      const c=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.45,6),dark);
      c.position.set(i*0.22,3.25,0);g.add(c);
    }
    // the second face — a small prophet visage on the forehead
    const brow=new THREE.Mesh(new THREE.SphereGeometry(0.17,10,8),dark);
    brow.position.set(0,3.02,0.3);g.add(brow);
    const bEyeL=new THREE.Mesh(new THREE.SphereGeometry(0.035,6,4),new THREE.MeshBasicMaterial({color:def.accHex}));
    bEyeL.position.set(-0.06,3.04,0.45);g.add(bEyeL);
    const bEyeR=bEyeL.clone();bEyeR.position.x=0.06;g.add(bEyeR);
    // diamond studs across torso & shoulders
    const studPos=[[-0.35,2.1],[0.35,2.1],[-0.35,1.4],[0.35,1.4],[0,1.05]];
    for(const sp of studPos){
      const st=new THREE.Mesh(new THREE.OctahedronGeometry(0.1),accMat);
      st.position.set(sp[0],sp[1],0.34);g.add(st);
    }
    // belt
    const belt=new THREE.Mesh(new THREE.BoxGeometry(torsoW+0.08,0.18,0.6),dark);
    belt.position.y=1.05;g.add(belt);
  }
  if(idx===1){
    const fin=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.7,0.5),dark);
    fin.position.y=3.25;g.add(fin);
    const mask=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.22,0.12),dark);
    mask.position.set(0,2.66,0.38);g.add(mask);
    const plate=new THREE.Mesh(new THREE.BoxGeometry(0.95,0.8,0.14),dark);
    plate.position.set(0,1.9,0.34);g.add(plate);
    for(let s=-1;s<=1;s+=2){
      const tank=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.85,10),accMat);
      tank.position.set(0.3*s,2.0,-0.45);g.add(tank);
      const pld=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.6),dark);
      pld.position.set((torsoW/2+0.2)*s,2.5,0);g.add(pld);
    }
  }
  if(idx===2){
    const hood=new THREE.Mesh(new THREE.ConeGeometry(0.5,0.6,4),mat);
    hood.position.y=3.2;hood.rotation.y=Math.PI/4;g.add(hood);
    const gem=new THREE.Mesh(new THREE.OctahedronGeometry(0.13),new THREE.MeshBasicMaterial({color:def.accHex}));
    gem.position.set(0,2.95,0.4);g.add(gem);
  }
  let blade=null;
  if(idx===3){
    const plume=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.95,8),sMat(def.hex,0.6));
    plume.position.set(0,3.3,-0.12);plume.rotation.x=-0.5;g.add(plume);
    const visor=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.14,0.1),dark);
    visor.position.set(0,2.8,0.4);g.add(visor);armor.push(visor);
    const bp=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.9,0.16),
      new THREE.MeshStandardMaterial({color:0x9fb0c6,metalness:0.85,roughness:0.25}));
    bp.position.set(0,1.85,0.33);g.add(bp);armor.push(bp);
    const shield=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.08,18),
      new THREE.MeshStandardMaterial({color:0x9fb0c6,metalness:0.85,roughness:0.25}));
    shield.rotation.z=Math.PI/2;shield.position.y=-0.9;armL.add(shield);armor.push(shield);
    blade=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.01,3.0,6),
      new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xc9d4e4,emissiveIntensity:0.8,metalness:0.9,roughness:0.15}));
    blade.position.y=-2.1;armR.userData.elb.add(blade);
  }
  if(idx===4){ // RESTORATION BRAWLER: domed helm with fins, cross emblem, rivets
    const dome=new THREE.Mesh(new THREE.SphereGeometry(0.5,14,10),dark);
    dome.scale.set(1,0.7,1);dome.position.y=3.0;g.add(dome);
    for(let s2=-1;s2<=1;s2+=2){
      const finp=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.4,0.3),accMat);
      finp.position.set(0.4*s2,3.1,0);g.add(finp);
    }
    const cv=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.6,0.08),accMat);
    cv.position.set(0,1.8,0.34);g.add(cv);
    const ch=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.16,0.08),accMat);
    ch.position.set(0,1.85,0.35);g.add(ch);
    for(const rp of [[-0.45,2.15],[0.45,2.15],[-0.45,1.25],[0.45,1.25]]){
      const rv=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,6),dark);
      rv.position.set(rp[0],rp[1],0.32);g.add(rv);
    }
  }
  if(idx===5){ // UNRAVELING STRING: spool rings, star brow, hanging threads
    for(let i=0;i<3;i++){
      const ring2=new THREE.Mesh(new THREE.TorusGeometry(0.52,0.045,8,20),accMat);
      ring2.position.y=1.4+i*0.32;ring2.rotation.x=Math.PI/2;g.add(ring2);
    }
    const star=new THREE.Mesh(new THREE.OctahedronGeometry(0.12),new THREE.MeshBasicMaterial({color:def.accHex}));
    star.position.set(0,3.0,0.36);g.add(star);
    for(let s2=-1;s2<=1;s2+=2){
      const th=new THREE.Mesh(new THREE.BoxGeometry(0.05,1.3,0.05),sMat(def.hex,0.5));
      th.position.set(0.95*s2,1.3,0);th.rotation.z=s2*0.15;
      th.userData.base={z:th.rotation.z,x:0,ph:rnd(0,TAU)};
      g.add(th);tendrils.push(th);
    }
  }
  if(idx===6){ // GUNSLINGER: wide-brim hat, poncho, revolver, clock-dial chest
    const brimH=new THREE.Mesh(new THREE.CylinderGeometry(0.78,0.78,0.06,16),dark);
    brimH.position.y=3.05;g.add(brimH);
    const crown=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.38,0.34,12),dark);
    crown.position.y=3.25;g.add(crown);
    const poncho=new THREE.Mesh(new THREE.ConeGeometry(0.85,0.9,10),sMat(def.hex,0.3));
    poncho.position.y=2.2;g.add(poncho);
    const dial=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.06,16),accMat);
    dial.rotation.x=Math.PI/2;dial.position.set(0,1.7,0.32);g.add(dial);
    const hand1=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.2,0.03),dark);
    hand1.position.set(0,1.78,0.37);g.add(hand1);
    const gunB=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.18,0.3),dark);
    gunB.position.y=-0.85;armR.userData.elb.add(gunB);
    const gunC=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.5,8),dark);
    gunC.rotation.x=Math.PI/2;gunC.position.set(0,-0.85,0.35);armR.userData.elb.add(gunC);
  }
  if(idx===7){ // BUBBLE THIEF: crest orb, orb-studded body, drifting bubbles
    const crest=new THREE.Mesh(new THREE.SphereGeometry(0.18,10,8),accMat);
    crest.position.y=3.3;g.add(crest);
    for(const op of [[-0.35,2.1],[0.35,2.1],[0,1.5],[-0.4,1.2],[0.4,1.2]]){
      const orb=new THREE.Mesh(new THREE.SphereGeometry(0.11,10,8),accMat);
      orb.position.set(op[0],op[1],0.32);g.add(orb);
    }
    for(let i=0;i<3;i++){
      const bub=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,8),
        new THREE.MeshBasicMaterial({color:def.accHex,transparent:true,opacity:0.35}));
      const aa=i/3*TAU;
      bub.position.set(Math.cos(aa)*0.9,2.2+Math.sin(aa)*0.4,Math.sin(aa)*0.5);
      g.add(bub);
    }
  }

  let marker;
  if(idx===0){
    marker=new THREE.Mesh(new THREE.TorusGeometry(1.6,0.05,8,40),
      new THREE.MeshBasicMaterial({color:def.hex,transparent:true,opacity:0.6}));
    marker.rotation.x=Math.PI/2;
  } else if(idx===1){
    const s=1.5;marker=makeFrame([{x:s,z:s},{x:s,z:-s},{x:-s,z:-s},{x:-s,z:s}],def.hex);
  } else if(idx===2){
    const r=1.9,pts=[];
    for(let i=0;i<3;i++){const a=Math.PI/2+i/3*TAU;pts.push({x:Math.cos(a)*r,z:Math.sin(a)*r});}
    marker=makeFrame(pts,def.hex);
  } else if(idx===4){ // plus / cross
    const r=1.9,w=0.55;
    marker=makeFrame([{x:w,z:r},{x:w,z:w},{x:r,z:w},{x:r,z:-w},{x:w,z:-w},{x:w,z:-r},
      {x:-w,z:-r},{x:-w,z:-w},{x:-r,z:-w},{x:-r,z:w},{x:-w,z:w},{x:-w,z:r}],def.hex);
  } else if(idx===5){ // five-point star
    const pts=[];
    for(let i=0;i<10;i++){const a=Math.PI/2+i/10*TAU;const rr=i%2===0?2.1:0.9;
      pts.push({x:Math.cos(a)*rr,z:Math.sin(a)*rr});}
    marker=makeFrame(pts,def.hex);
  } else if(idx===6){ // hourglass bowtie
    const r=1.6;
    marker=makeFrame([{x:-r,z:r},{x:r,z:r},{x:-r,z:-r},{x:r,z:-r}],def.hex);
  } else if(idx===7){ // double circle
    marker=new THREE.Group();
    const r1=new THREE.Mesh(new THREE.TorusGeometry(1.9,0.05,8,40),
      new THREE.MeshBasicMaterial({color:def.hex,transparent:true,opacity:0.6}));
    r1.rotation.x=Math.PI/2;marker.add(r1);
    const r2=new THREE.Mesh(new THREE.TorusGeometry(1.1,0.05,8,40),
      new THREE.MeshBasicMaterial({color:def.hex,transparent:true,opacity:0.6}));
    r2.rotation.x=Math.PI/2;marker.add(r2);
  } else { // idx 3: diamond
    const r=1.9;marker=makeFrame([{x:r,z:0},{x:0,z:r},{x:-r,z:0},{x:0,z:-r}],def.hex);
  }
  marker.position.y=0.25;g.add(marker);

  g.userData={armL,armR,blade,armor,marker,tendrils,def};
  g.visible=false;scene.add(g);
  return g;
}
const standMeshes=STANDS.map(buildStand);
standMeshes.forEach(m=>outlineGroup(m,1.06));

function buildPlayer(){
  const g=new THREE.Group();
  const coat=new THREE.Mesh(new THREE.BoxGeometry(0.85,1.15,0.5),
    new THREE.MeshStandardMaterial({color:0x2a2440}));
  coat.position.y=0.95;g.add(coat);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.34,14,10),
    new THREE.MeshStandardMaterial({color:0xefe6d8}));
  head.position.y=1.85;g.add(head);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.38,0.22,12),sMat(0xe0354b,0.3));
  cap.position.y=2.06;g.add(cap);
  const brim=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.06,0.4),cap.material);
  brim.position.set(0,1.98,0.4);g.add(brim);
  const legs=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,0.45),
    new THREE.MeshStandardMaterial({color:0x14101f}));
  legs.position.y=0.25;g.add(legs);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(0.8,16),
    new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.45}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=0.015;g.add(shadow);
  g.userData={cap:cap.material};
  scene.add(g);return g;
}
const playerMesh=buildPlayer();
outlineGroup(playerMesh,1.07);

function buildMirage(){
  const g=new THREE.Group();
  const m=new THREE.MeshBasicMaterial({color:0xc9d4e4,transparent:true,opacity:0.35,depthWrite:false});
  const t=new THREE.Mesh(new THREE.BoxGeometry(0.7,1.2,0.4),m);t.position.y=1.7;g.add(t);
  const h=new THREE.Mesh(new THREE.SphereGeometry(0.32,10,8),m);h.position.y=2.6;g.add(h);
  const b=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.01,2.4,6),m);
  b.position.set(0.5,1.6,0.8);b.rotation.x=1.2;g.add(b);
  scene.add(g);return g;
}

// ---------------- POOLS ----------------
function makePool(n,mk){const arr=[];for(let i=0;i<n;i++){const o=mk();o.mesh.visible=false;scene.add(o.mesh);arr.push(o);}return arr;}
const partPool=makePool(180,()=>({mesh:new THREE.Mesh(new THREE.BoxGeometry(0.24,0.24,0.24),
  new THREE.MeshBasicMaterial({color:0xffffff,transparent:true})),vx:0,vy:0,vz:0,life:0,max:0}));
const fistPool=makePool(36,()=>({mesh:new THREE.Mesh(new THREE.BoxGeometry(0.55,0.42,0.8),
  new THREE.MeshBasicMaterial({color:0xffffff,transparent:true})),vx:0,vy:0,vz:0,life:0,max:0}));
const slashPool=makePool(24,()=>({mesh:new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.55),
  new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,
  side:THREE.DoubleSide,depthWrite:false})),life:0,max:0}));
const ringPool=makePool(8,()=>({mesh:new THREE.Mesh(new THREE.TorusGeometry(1,0.12,8,48),
  new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})),
  life:0,max:0,maxR:1,dmg:0,hitset:null,cx:0,cz:0}));
const beamPool=makePool(6,()=>({mesh:new THREE.Mesh(new THREE.BoxGeometry(1,0.22,0.22),
  new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})),life:0,max:0}));

function emit(x,y,z,hex,n,sp){
  for(const p of partPool){if(p.life>0)continue;if(n--<=0)break;
    p.mesh.visible=true;p.mesh.position.set(x,y,z);
    p.mesh.material.color.setHex(hex);p.mesh.material.opacity=1;
    const a=rnd(0,TAU),el=rnd(-0.6,1.2),s=rnd(0.06,sp||0.22);
    p.vx=Math.cos(a)*s;p.vz=Math.sin(a)*s;p.vy=el*s+0.08;
    p.life=p.max=rnd(16,32);
  }
}
function throwFist(x,y,z,tx,ty,tz,hex){
  for(const f of fistPool){if(f.life>0)continue;
    f.mesh.visible=true;f.mesh.position.set(x,y,z);
    f.mesh.material.color.setHex(hex);f.mesh.material.opacity=1;
    const dx=tx-x,dy=ty-y,dz=tz-z,m=Math.hypot(dx,dy,dz)||1;
    const sp=0.95;
    f.vx=dx/m*sp+rnd(-0.12,0.12);f.vy=dy/m*sp+rnd(-0.06,0.06);f.vz=dz/m*sp+rnd(-0.12,0.12);
    f.mesh.lookAt(tx,ty,tz);
    f.life=f.max=9;return;
  }
}
function slashAt(x,y,z,ang,hex){
  for(const s of slashPool){if(s.life>0)continue;
    s.mesh.visible=true;s.mesh.position.set(x,y,z);
    s.mesh.material.color.setHex(hex);s.mesh.material.opacity=0.95;
    s.mesh.rotation.set(rnd(-0.4,0.4),-ang,rnd(0,TAU));
    s.mesh.scale.set(rnd(0.6,1),1,1);
    s.life=s.max=8;return;
  }
}
function shockRing(x,z,hex,maxR,dmg){
  for(const r of ringPool){if(r.life>0)continue;
    r.mesh.visible=true;r.mesh.position.set(x,0.35,z);
    r.mesh.rotation.x=Math.PI/2;
    r.mesh.material.color.setHex(hex);r.mesh.material.opacity=0.95;
    r.mesh.scale.set(1,1,1);
    r.life=r.max=26;r.maxR=maxR;r.dmg=dmg;r.hitset=new Set();r.cx=x;r.cz=z;return;
  }
}
function beam(x,z,ang,len,hex){
  for(const b of beamPool){if(b.life>0)continue;
    b.mesh.visible=true;
    b.mesh.scale.set(len,1,1);
    b.mesh.position.set(x+Math.sin(ang)*len/2,1.8,z+Math.cos(ang)*len/2);
    b.mesh.rotation.y=-Math.atan2(Math.cos(ang),Math.sin(ang));
    b.mesh.material.color.setHex(hex);b.mesh.material.opacity=0.95;
    b.life=b.max=10;return;
  }
}

// ---------------- DOM TEXT ----------------
const fxLayer=document.getElementById('fxText');
const texts=[];
function addText(x,y,z,str,col,size,life){
  const el=document.createElement('div');el.className='ft';
  el.textContent=str;el.style.color=col;el.style.fontSize=size+'px';
  fxLayer.appendChild(el);
  texts.push({el,x,y,z,life,max:life});
}
const tmpV=new THREE.Vector3();
function updateTexts(){
  for(let i=texts.length-1;i>=0;i--){
    const t=texts[i];t.life--;t.y+=0.045;
    if(t.life<=0){t.el.remove();texts.splice(i,1);continue;}
    tmpV.set(t.x,t.y,t.z).project(camera);
    t.el.style.left=((tmpV.x+1)/2*W)+'px';
    t.el.style.top=((-tmpV.y+1)/2*H)+'px';
    t.el.style.opacity=clamp(t.life/t.max*1.6,0,1);
  }
}

// ---------------- GAME STATE ----------------
let state='menu';
let P,enemies,shots,ebullets,waltzQ,rollers,snares,traps,mirages,walls,hist;
let keys={},mouse={x:0,y:0,down:false};
let camYaw=0,camPitch=0.95,camDist=28,camDrag=null,camTouch=null,lmbStart=null;
let wave,score,combo,comboT,shake,timeStopT,frame,bestCombo,hitstop=0;
let touchMove=null,btn={atk:false};
let training=false;
let eraseGhosts=[];
const ghostMatProto=new THREE.MeshBasicMaterial({color:0xff2a3c,transparent:true,opacity:0.35,depthWrite:false});
function makeEraseGhosts(){
  clearEraseGhosts();
  for(const e of enemies){
    const mesh=new THREE.Mesh(e.body.geometry,ghostMatProto.clone());
    scene.add(mesh);
    eraseGhosts.push({e,mesh});
  }
}
function clearEraseGhosts(){
  for(const g of eraseGhosts)scene.remove(g.mesh);
  eraseGhosts.length=0;
}

const eGeoChaser=new THREE.IcosahedronGeometry(0.95,0);
const eGeoBrute=new THREE.BoxGeometry(2.3,2.3,2.3);
const eGeoRanged=new THREE.SphereGeometry(0.85,14,10);

function spawnEnemy(){
  const a=rnd(0,TAU),d=rnd(46,54);
  const t=(wave>=3&&Math.random()<0.3)?'ranged':(wave>=5&&Math.random()<0.2?'brute':'chaser');
  const g=new THREE.Group();
  let body;
  if(t==='brute'){body=new THREE.Mesh(eGeoBrute,sMat(0xb8842c,0.25));body.position.y=1.3;
    const h1=new THREE.Mesh(new THREE.ConeGeometry(0.25,1,6),new THREE.MeshStandardMaterial({color:0xefe6d8}));
    h1.position.set(-0.8,2.7,0);h1.rotation.z=0.4;g.add(h1);
    const h2=h1.clone();h2.position.x=0.8;h2.rotation.z=-0.4;g.add(h2);}
  else if(t==='ranged'){body=new THREE.Mesh(eGeoRanged,sMat(0x5a7d9e,0.3));body.position.y=1.4;
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.34,10,8),new THREE.MeshBasicMaterial({color:0xefe6d8}));
    eye.position.set(0,1.4,0.6);g.add(eye);
    const pup=new THREE.Mesh(new THREE.SphereGeometry(0.15,8,6),new THREE.MeshBasicMaterial({color:0x14101f}));
    pup.position.set(0,1.4,0.88);g.add(pup);}
  else{body=new THREE.Mesh(eGeoChaser,sMat(0x6f6f82,0.3));body.position.y=1.0;}
  g.add(body);
  const bg=new THREE.Sprite(new THREE.SpriteMaterial({color:0x000000,depthTest:false}));
  bg.scale.set(1.8,0.2,1);bg.position.y=(t==='brute'?3.4:2.5);bg.renderOrder=998;g.add(bg);
  const fg=new THREE.Sprite(new THREE.SpriteMaterial({color:0xe0354b,depthTest:false}));
  fg.scale.set(1.7,0.13,1);fg.position.y=bg.position.y;fg.renderOrder=999;g.add(fg);
  g.position.set(Math.cos(a)*d,0,Math.sin(a)*d);
  scene.add(g);
  outlineGroup(g,1.06);
  const e={g,body,fg,type:t,
    r:t==='brute'?1.6:1.0,
    hp:t==='brute'?100+wave*20:t==='ranged'?26+wave*6:30+wave*8,
    spd:(t==='brute'?0.055:t==='ranged'?0.075:0.09+Math.min(wave*0.005,0.08)),
    cd:rnd(40,120),hitT:0,wob:rnd(0,TAU),
    charmT:0,charmHitCd:0,bindT:0,
    baseEm:body.material.emissiveIntensity,origEm:body.material.emissive.getHex()};
  e.maxhp=e.hp;enemies.push(e);
}

function nextWave(){
  wave++;
  for(let i=0;i<3+wave*2;i++)spawnEnemy();
  addText(P.x,4.5,P.z,'WAVE '+wave,'#f2b630',38,90);
}

function spawnDummies(){
  for(let i=0;i<3;i++){
    const a=i/3*TAU;
    const g=new THREE.Group();
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.34,2.4,10),sMat(0x8a6a3c,0.2));
    post.position.y=1.2;g.add(post);
    const arms=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.22,0.22),sMat(0x8a6a3c,0.2));
    arms.position.y=1.9;g.add(arms);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.45,12,10),sMat(0xd8c08a,0.25));
    head.position.y=2.85;g.add(head);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.1,0.3,12),
      new THREE.MeshStandardMaterial({color:0x4a3a22}));
    base.position.y=0.15;g.add(base);
    const bg=new THREE.Sprite(new THREE.SpriteMaterial({color:0x000000,depthTest:false}));
    bg.scale.set(1.8,0.2,1);bg.position.y=3.6;bg.renderOrder=998;g.add(bg);
    const fg=new THREE.Sprite(new THREE.SpriteMaterial({color:0x3ddc6a,depthTest:false}));
    fg.scale.set(1.7,0.13,1);fg.position.y=3.6;fg.renderOrder=999;g.add(fg);
    g.position.set(Math.cos(a)*9,0,Math.sin(a)*9);
    scene.add(g);
    outlineGroup(g,1.06);
    const e={g,body:post,fg,type:'dummy',r:1.1,hp:100000,maxhp:100000,spd:0,
      cd:9999,hitT:0,wob:rnd(0,TAU),charmT:0,charmHitCd:0,bindT:0,
      baseEm:post.material.emissiveIntensity,origEm:post.material.emissive.getHex()};
    enemies.push(e);
  }
  addText(0,4.5,0,'TRAINING ROOM — STRIKE FREELY','#3ddc6a',26,110);
}

function reset(){
  if(enemies)for(const e of enemies)scene.remove(e.g);
  if(shots)for(const s of shots)scene.remove(s.mesh);
  if(ebullets)for(const b of ebullets)scene.remove(b.mesh);
  if(rollers)for(const r of rollers)scene.remove(r.grp);
  if(snares)for(const s of snares)scene.remove(s.grp);
  if(traps)for(const t of traps)scene.remove(t.mesh);
  if(mirages)for(const m of mirages)scene.remove(m.g);
  if(walls)for(const w of walls)scene.remove(w.grp);
  for(const t of texts)t.el.remove();texts.length=0;
  clearEraseGhosts();
  P={x:0,z:0,hp:100,maxhp:100,si:0,atkCd:0,sp:0,cds:[0,0,0,0,0],
     ang:0,inv:0,atkAnim:0,dashT:0,dashCd:0,dx:0,dz:1,
     purgeT:0,eraseT:0,eraseAx:0,eraseAz:0,epitaphT:0,epiCh:0,riposteT:0,bladeGoneT:0,
     barrageT:0,barrageSi:0,untouchT:0,dueT:0,bubbleT:0,speedBuffT:0};
  enemies=[];shots=[];ebullets=[];waltzQ=[];rollers=[];snares=[];traps=[];mirages=[];walls=[];hist=[];
  wave=0;score=0;combo=0;comboT=0;shake=0;timeStopT=0;frame=0;bestCombo=0;hitstop=0;lineAlpha=0;
  camYaw=0;camPitch=0.95;camDist=28;
  if(training)spawnDummies();else nextWave();
}

// ---------------- INPUT ----------------
addEventListener('keydown',e=>{
  keys[e.key.toLowerCase()]=true;
  if(state!=='play')return;
  if(e.key>='1'&&e.key<='8')setStand(+e.key-1);
  const k=e.key.toLowerCase();
  if(k==='q')setStand((P.si+1)%STANDS.length);
  if(k==='k')special();
  if(k==='l')castArt(0);
  if(k==='u')castArt(1);
  if(k==='i')castArt(2);
  if(k==='o')castArt(3);
  if(k==='p')castArt(4);
  if(e.key===' '){e.preventDefault();dash();}
});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
addEventListener('wheel',e=>{camDist=clamp(camDist+e.deltaY*0.02,15,42);},{passive:true});

const cnv=renderer.domElement;
cnv.style.cursor='crosshair';
cnv.addEventListener('contextmenu',e=>e.preventDefault());
cnv.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='mouse')return;
  if(e.button===2||e.button===1){
    e.preventDefault();
    camDrag={id:e.pointerId,x:e.clientX,y:e.clientY};
    try{cnv.setPointerCapture(e.pointerId);}catch(_){}
  } else if(e.button===0&&state==='play'){
    mouse.down=true;
    lmbStart={id:e.pointerId,x:e.clientX,y:e.clientY};
  }
});
cnv.addEventListener('pointermove',e=>{
  mouse.x=e.clientX;mouse.y=e.clientY;
  // holding the cursor down and moving it steers the camera;
  // a stationary press keeps attacking as before
  if(lmbStart&&e.pointerId===lmbStart.id&&!camDrag){
    if(Math.hypot(e.clientX-lmbStart.x,e.clientY-lmbStart.y)>8){
      mouse.down=false;
      camDrag={id:e.pointerId,x:e.clientX,y:e.clientY};
      try{cnv.setPointerCapture(e.pointerId);}catch(_){}
    }
  }
  if(camDrag&&e.pointerId===camDrag.id){
    camYaw-=(e.clientX-camDrag.x)*0.006;
    camPitch=clamp(camPitch+(e.clientY-camDrag.y)*0.004,0.35,1.35);
    camDrag.x=e.clientX;camDrag.y=e.clientY;
  }
});
function endPointer(e){
  if(camDrag&&e.pointerId===camDrag.id){
    camDrag=null;
    try{cnv.releasePointerCapture(e.pointerId);}catch(_){}
  }
  if(lmbStart&&e.pointerId===lmbStart.id)lmbStart=null;
  if(e.button===0)mouse.down=false;
}
cnv.addEventListener('pointerup',endPointer);
cnv.addEventListener('pointercancel',endPointer);
addEventListener('blur',()=>{mouse.down=false;camDrag=null;lmbStart=null;});

cnv.addEventListener('touchstart',e=>{for(const t of e.changedTouches){
  if(t.clientX<W/2)touchMove={id:t.identifier,sx:t.clientX,sy:t.clientY,x:t.clientX,y:t.clientY};
  else camTouch={id:t.identifier,x:t.clientX,y:t.clientY};}},{passive:true});
cnv.addEventListener('touchmove',e=>{for(const t of e.changedTouches){
  if(touchMove&&t.identifier===touchMove.id){touchMove.x=t.clientX;touchMove.y=t.clientY;}
  if(camTouch&&t.identifier===camTouch.id){
    camYaw-=(t.clientX-camTouch.x)*0.007;
    camPitch=clamp(camPitch+(t.clientY-camTouch.y)*0.005,0.35,1.35);
    camTouch={id:t.identifier,x:t.clientX,y:t.clientY};}}},{passive:true});
cnv.addEventListener('touchend',e=>{for(const t of e.changedTouches){
  if(touchMove&&t.identifier===touchMove.id)touchMove=null;
  if(camTouch&&t.identifier===camTouch.id)camTouch=null;}},{passive:true});
const tb=(id,dn,up)=>{const el=document.getElementById(id);
  el.addEventListener('touchstart',e=>{e.preventDefault();dn();});
  if(up)el.addEventListener('touchend',e=>{e.preventDefault();up();});};
tb('btnAtk',()=>btn.atk=true,()=>btn.atk=false);
tb('btnSp',()=>special());tb('btnSw',()=>setStand((P.si+1)%STANDS.length));tb('btnDash',()=>dash());
for(let i=0;i<5;i++)tb('btnA'+i,(j=>()=>castArt(j))(i));

function screenToGround(sx,sy){
  const v=new THREE.Vector3(sx/W*2-1,-(sy/H)*2+1,0.5).unproject(camera);
  const d=v.sub(camera.position).normalize();
  const t=-camera.position.y/d.y;
  return{x:camera.position.x+d.x*t,z:camera.position.z+d.z*t};
}
function aimPoint(){
  if(touchMove||btn.atk){
    const ne=nearestEnemy(P.x,P.z,null);
    if(ne)return{x:ne.g.position.x,z:ne.g.position.z};
  }
  return screenToGround(mouse.x,mouse.y);
}
function nearestEnemy(x,z,excl,maxD){
  let best=null,bd=(maxD||1e9)**2;
  for(const e of enemies){if(e===excl)continue;
    const dx=e.g.position.x-x,dz=e.g.position.z-z,d=dx*dx+dz*dz;
    if(d<bd){bd=d;best=e;}}
  return best;
}

// ---------------- CORE ACTIONS ----------------
function setStand(i){
  const wasnew=i!==P.si;
  P.si=i;const s=STANDS[i];
  document.getElementById('standName').textContent='P'+s.part+' '+s.sym+' '+s.name;
  document.getElementById('standName').style.color=s.css;
  document.getElementById('standDesc').textContent=s.desc;
  for(let j=0;j<5;j++)document.getElementById('cdA'+j).textContent=ART_KEYS[j]+' '+s.arts[j].n;
  document.getElementById('cdSp').textContent='K '+s.spName;
  standMeshes.forEach((m,j)=>m.visible=j===i);
  standLight.color.setHex(s.hex);
  playerMesh.userData.cap.color.setHex(s.hex);
  playerMesh.userData.cap.emissive.setHex(s.hex);
  if(state==='play'&&wasnew){
    emit(P.x,1.5,P.z,s.hex,26,0.3);
    addText(P.x,3.2,P.z,s.sym+' '+s.name+'!',s.css,22,45);
    shake=Math.max(shake,0.5);
  }
  for(let j=0;j<5;j++)P.cds[j]=Math.min(P.cds[j],60);
}

function dash(){
  if(P.dashCd>0||P.dashT>0)return;
  if(P.dueT>0){P.dueT=0;addText(P.x,2.6,P.z,'the code is broken','#ffd9a8',12,30);}
  P.dashT=10;P.dashCd=45;P.inv=Math.max(P.inv,14);
  emit(P.x,0.8,P.z,0xefe6d8,10,0.25);
}

function standPos(){return standMeshes[P.si].position;}

function hitEnemy(e,dmg,s){
  if(!enemies.includes(e))return;
  if(P.eraseT>0){ // within erased time, no action leaves a result
    emit(e.g.position.x,1.4,e.g.position.z,0x66101e,2,0.12);
    if(Math.random()<0.25)addText(e.g.position.x,2.4,e.g.position.z,'NO RESULT','#ff5d70',13,28);
    return;
  }
  dmg=Math.round(dmg*(P.dueT>0?1.6:1));
  e.hp-=dmg;e.hitT=6;
  if(dmg>=30)hitstop=Math.max(hitstop,3);
  combo++;comboT=120;bestCombo=Math.max(bestCombo,combo);
  score+=dmg;
  emit(e.g.position.x,1.4,e.g.position.z,s.hex,4,0.28);
  if(Math.random()<0.3)addText(e.g.position.x+rnd(-0.8,0.8),2.4,e.g.position.z,s.cry,s.acc,15,25);
  if(e.type==='dummy'&&e.hp<e.maxhp*0.02){
    e.hp=e.maxhp;
    addText(e.g.position.x,3.2,e.g.position.z,'DUMMY RESTORED','#3ddc6a',14,45);
  }
  if(e.hp<=0){
    score+=100;hitstop=Math.max(hitstop,4);
    emit(e.g.position.x,1.4,e.g.position.z,0xf2b630,22,0.4);
    addText(e.g.position.x,2,e.g.position.z,'+100','#f2b630',18,35);
    scene.remove(e.g);
    enemies.splice(enemies.indexOf(e),1);
    P.sp=clamp(P.sp+11,0,100);
  }
}

// shot factory: kind = 'orb' | 'knife' | 'blade'
function makeShot(x,z,ax,az,dmg,hex,opt){
  opt=opt||{};
  let mesh;
  if(opt.kind==='knife'){
    mesh=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.09,0.95),new THREE.MeshBasicMaterial({color:hex}));
  } else if(opt.kind==='blade'){
    mesh=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.13,2.4),new THREE.MeshBasicMaterial({color:hex}));
  } else if(opt.kind==='bubble'){
    mesh=new THREE.Mesh(new THREE.SphereGeometry(0.45,12,10),
      new THREE.MeshBasicMaterial({color:hex,transparent:true,opacity:0.55}));
  } else {
    mesh=new THREE.Mesh(new THREE.SphereGeometry(0.32,10,8),new THREE.MeshBasicMaterial({color:hex}));
  }
  mesh.position.set(x,1.6,z);
  if(opt.kind)mesh.rotation.y=Math.atan2(ax,az);
  scene.add(mesh);
  shots.push({mesh,vx:ax,vz:az,dmg,hex,
    life:opt.life||(opt.homing?140:80),homing:!!opt.homing,
    pierce:!!opt.pierce,hitset:opt.pierce?new Set():null,
    bubble:opt.kind==='bubble',
    waitStop:!!opt.waitStop});
}

function effRate(s){return (P.si===3&&P.purgeT>0)?Math.max(2,Math.floor(s.bRate/2)):s.bRate;}

// ---- UNIVERSAL FIST BARRAGE (J) ----
function attack(){
  const s=STANDS[P.si];
  if(P.atkCd>0)return;
  P.atkCd=effRate(s);P.atkAnim=10;P.fistSide=!P.fistSide;
  const t=aimPoint();
  const a=Math.atan2(t.x-P.x,t.z-P.z);
  P.ang=a;
  const sp=standPos();
  // visuals per stand flavor
  if(P.si===3){
    slashAt(P.x+Math.sin(a)*4.2,1.6,P.z+Math.cos(a)*4.2,a,s.hex);
  } else {
    throwFist(sp.x,2.2,sp.z,
      P.x+Math.sin(a)*s.bRange+rnd(-1.4,1.4),rnd(0.8,2.2),
      P.z+Math.cos(a)*s.bRange+rnd(-1.4,1.4),s.hex);
  }
  const hit=meleeCone(a,s,1.0,s.bDmg,s.bRange);
  if(hit&&P.si===1)shake=Math.max(shake,0.3);
  P.sp=clamp(P.sp+1.1,0,100);
}

function meleeCone(a,s,arc,dmg,range){
  let hit=false;
  for(const e of [...enemies]){
    const dx=e.g.position.x-P.x,dz=e.g.position.z-P.z;
    const d=Math.hypot(dx,dz);
    if(d<range+e.r){
      const ea=Math.atan2(dx,dz);
      let da=Math.abs(ea-a);da=Math.min(da,TAU-da);
      if(da<arc||d<e.r+2.2){hitEnemy(e,dmg,s);hit=true;
        const ka=d>0.001?ea:a;
        e.g.position.x+=Math.sin(ka)*(d<e.r+2.2?0.6:0.3);
        e.g.position.z+=Math.cos(ka)*(d<e.r+2.2?0.6:0.3);}
    }
  }
  return hit;
}

function boundP(){
  const d=Math.hypot(P.x,P.z);
  if(d>43){P.x=P.x/d*43;P.z=P.z/d*43;}
}

// ---------------- ARTS (L,U,I,O,P) ----------------
function castArt(slot){
  if(state!=='play'||P.cds[slot]>0)return;
  const s=STANDS[P.si],art=s.arts[slot];
  const t=aimPoint();
  const a=Math.atan2(t.x-P.x,t.z-P.z);P.ang=a;
  P.atkAnim=16;
  // rigged phantoms — give each technique its own whole-body gesture
  const gdurs=P.si===4?[36,40,38,34,30]:P.si===1?[30,46,32,36,34]:P.si===2?[34,36,34,38,32]:null;
  if(gdurs)P.gesture={slot,t:gdurs[slot],dur:gdurs[slot]};
  P.cds[slot]=art.cd;
  addText(P.x,3.6,P.z,art.n+'!',s.css,22,48);
  const fn=ARTS[P.si][slot];
  fn(s,a,t);
}

const ARTS=[
// ===== CRIMSON HERALD (emperor of erased time) =====
[
 (s,a)=>{ // SEVERING CHOP — one annihilating hand-blade
   slashAt(P.x+Math.sin(a)*4.5,1.8,P.z+Math.cos(a)*4.5,a,s.hex);
   slashAt(P.x+Math.sin(a)*4.5,1.2,P.z+Math.cos(a)*4.5,a,s.accHex);
   meleeCone(a,s,0.55,55,9);
   shake=0.8;
 },
 (s)=>{ // TIME ERASURE — time skips; no action leaves a result; fate is visible
   P.eraseT=200;P.eraseAx=P.x;P.eraseAz=P.z;
   document.getElementById('tint').style.background='rgba(224,53,75,0.14)';
   addText(P.x,2.8,P.z,'TIME IS ERASED — FATE IS VISIBLE','#ffffff',15,90);
   emit(P.x,1.6,P.z,s.hex,24,0.4);
   makeEraseGhosts();
 },
 (s)=>{ // EPITAPH — foresee the next moments; auto-dodge 3 blows
   P.epitaphT=420;P.epiCh=3;
   addText(P.x,2.8,P.z,'THE FUTURE IS WRITTEN','#ffffff',15,70);
   emit(P.x,2.6,P.z,s.accHex,14,0.25);
 },
 (s,a)=>{ // IMPALING HAND — thrust straight through the line
   const len=15;
   beam(P.x,P.z,a,len,s.accHex);
   for(const e of [...enemies]){
     const dx=e.g.position.x-P.x,dz=e.g.position.z-P.z;
     const proj=clamp(dx*Math.sin(a)+dz*Math.cos(a),0,len);
     const cx2=P.x+Math.sin(a)*proj,cz2=P.z+Math.cos(a)*proj;
     if(Math.hypot(e.g.position.x-cx2,e.g.position.z-cz2)<e.r+0.9){
       hitEnemy(e,46,s);
       e.g.position.x+=Math.sin(a)*1.5;e.g.position.z+=Math.cos(a)*1.5;}
   }
   shake=0.5;
 },
 (s)=>{ // BLINDSIDE — it has already happened; you are behind them
   const e=nearestEnemy(P.x,P.z,null,26);
   if(!e){addText(P.x,2.6,P.z,'no prey in reach...','#ff9aa8',13,40);P.cds[4]=30;return;}
   const ea=Math.atan2(e.g.position.x-P.x,e.g.position.z-P.z);
   emit(P.x,1.2,P.z,s.hex,12,0.3);
   P.x=e.g.position.x+Math.sin(ea)*2.2;P.z=e.g.position.z+Math.cos(ea)*2.2;boundP();
   P.ang=Math.atan2(e.g.position.x-P.x,e.g.position.z-P.z);
   P.inv=Math.max(P.inv,18);
   slashAt(e.g.position.x,1.6,e.g.position.z,P.ang,s.hex);
   hitEnemy(e,60,s);
   emit(P.x,1.2,P.z,s.hex,12,0.3);
   shake=0.7;
 }
],
// ===== NULL HOUR =====
[
 (s)=>{ // KNUCKLE DOWN
   shockRing(P.x,P.z,s.hex,15,26);
   shake=0.9;emit(P.x,0.6,P.z,s.hex,30,0.45);
 },
 (s,a,t)=>{ // STEAMROLLER DROP
   const tx=clamp(t.x,-40,40),tz=clamp(t.z,-40,40);
   const grp=new THREE.Group();
   const drum=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,3.6,16),
     new THREE.MeshStandardMaterial({color:0x556055,metalness:0.6,roughness:0.5}));
   drum.rotation.z=Math.PI/2;drum.position.y=1.5;grp.add(drum);
   const body=new THREE.Mesh(new THREE.BoxGeometry(2.8,1.6,2.4),
     new THREE.MeshStandardMaterial({color:0x3a4a3a,roughness:0.7}));
   body.position.set(0,2.6,-1.8);grp.add(body);
   const stack=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.22,1.1,8),
     new THREE.MeshStandardMaterial({color:0x222a22}));
   stack.position.set(0.7,3.9,-2.2);grp.add(stack);
   grp.position.set(tx,22,tz);grp.rotation.y=a;
   scene.add(grp);
   outlineGroup(grp,1.04);
   rollers.push({grp,x:tx,z:tz,phase:'fall',t:0});
 },
 (s,a)=>{ // KNIFE FAN — frozen mid-air during stopped time
   const frozenNow=timeStopT>0;
   for(let i=-3;i<=3;i++){
     const aa=a+i*0.16;
     makeShot(P.x+Math.sin(aa)*1.6,P.z+Math.cos(aa)*1.6,
       Math.sin(aa)*0.85,Math.cos(aa)*0.85,14,s.accHex,
       {kind:'knife',life:160,waitStop:frozenNow});
   }
   if(frozenNow)addText(P.x,2.8,P.z,'...they will fly when time resumes','#ffffff',13,80);
 },
 (s)=>{ // LIFE SIPHON
   const e=nearestEnemy(P.x,P.z,null,11);
   if(!e){addText(P.x,2.6,P.z,'nothing to drain...','#ffe28a',13,40);P.cds[3]=30;return;}
   const ea=Math.atan2(e.g.position.x-P.x,e.g.position.z-P.z);
   beam(P.x,P.z,ea,Math.hypot(e.g.position.x-P.x,e.g.position.z-P.z),0xe0354b);
   hitEnemy(e,30,s);
   P.hp=clamp(P.hp+15,0,P.maxhp);
   addText(P.x,2.6,P.z,'+15','#3ddc6a',18,40);
   emit(P.x,1.6,P.z,0xe0354b,10,0.25);
 },
 (s,a,t)=>{ // HEAVEN DROP — crashing leap onto the cursor
   const tx=clamp(t.x,-42,42),tz=clamp(t.z,-42,42);
   emit(P.x,1,P.z,s.hex,12,0.35);
   P.x=tx;P.z=tz;boundP();
   P.inv=Math.max(P.inv,20);
   shockRing(P.x,P.z,s.hex,8,35);
   emit(P.x,0.8,P.z,s.hex,26,0.5);
   shake=1.0;
 }
],
// ===== JADE ORACLE =====
[
 (s,a)=>{ // EMERALD TEMPEST
   for(let i=0;i<11;i++){
     const aa=a+rnd(-0.55,0.55);
     makeShot(P.x+Math.sin(aa)*1.5,P.z+Math.cos(aa)*1.5,
       Math.sin(aa)*rnd(0.55,0.85),Math.cos(aa)*rnd(0.55,0.85),11,s.hex);
   }
   emit(standPos().x,2.2,standPos().z,s.hex,14,0.35);
 },
 (s,a,t)=>{ // TENDRIL SNARE
   const tx=clamp(t.x,-42,42),tz=clamp(t.z,-42,42);
   const grp=new THREE.Group();
   const disc=new THREE.Mesh(new THREE.CircleGeometry(6,28),
     new THREE.MeshBasicMaterial({color:s.hex,transparent:true,opacity:0.22,depthWrite:false}));
   disc.rotation.x=-Math.PI/2;disc.position.y=0.06;grp.add(disc);
   for(let i=0;i<8;i++){
     const cone=new THREE.Mesh(new THREE.ConeGeometry(0.16,1.6,6),sMat(s.hex,0.5));
     const aa=i/8*TAU;
     cone.position.set(Math.cos(aa)*5.4,0.8,Math.sin(aa)*5.4);
     cone.rotation.z=Math.cos(aa)*0.5;cone.rotation.x=-Math.sin(aa)*0.5;
     grp.add(cone);
   }
   grp.position.set(tx,0,tz);
   scene.add(grp);
   snares.push({grp,disc,x:tx,z:tz,r:6,t:300});
 },
 (s)=>{ // PUPPET STRINGS — seize a body and turn it on its allies
   const e=nearestEnemy(P.x,P.z,null,22);
   if(!e){addText(P.x,2.6,P.z,'no body to seize...','#bdffd3',13,40);P.cds[2]=30;return;}
   e.charmT=300;e.bindT=0;
   e.body.material.emissive.setHex(s.hex);
   e.body.material.emissiveIntensity=1.0;
   const ea=Math.atan2(e.g.position.x-P.x,e.g.position.z-P.z);
   beam(P.x,P.z,ea,Math.hypot(e.g.position.x-P.x,e.g.position.z-P.z),s.hex);
   addText(e.g.position.x,2.8,e.g.position.z,'SEIZED!',s.css,18,50);
 },
 (s)=>{ // AMBUSH NET — a waiting perimeter of tendrils
   const mesh=new THREE.Mesh(new THREE.TorusGeometry(8,0.09,8,56),
     new THREE.MeshBasicMaterial({color:s.hex,transparent:true,opacity:0.35}));
   mesh.rotation.x=Math.PI/2;mesh.position.set(P.x,0.15,P.z);
   scene.add(mesh);
   traps.push({mesh,x:P.x,z:P.z,r:8,t:600,hitset:new Set()});
   addText(P.x,2.4,P.z,'the net is laid...',s.css,13,60);
 },
 (s)=>{ // COIL CONSTRICT — bind and squeeze
   const e=nearestEnemy(P.x,P.z,null,18);
   if(!e){addText(P.x,2.6,P.z,'nothing to bind...','#bdffd3',13,40);P.cds[4]=30;return;}
   e.bindT=180;e.charmT=0;
   const ea=Math.atan2(e.g.position.x-P.x,e.g.position.z-P.z);
   beam(P.x,P.z,ea,Math.hypot(e.g.position.x-P.x,e.g.position.z-P.z),s.hex);
   hitEnemy(e,15,s);
   addText(e.g.position.x,2.8,e.g.position.z,'BOUND!',s.css,18,50);
 }
],
// ===== SILVER ZEPHYR =====
[
 (s,a)=>{ // THOUSAND PIERCE
   const ox=P.x,oz=P.z;
   P.x+=Math.sin(a)*11;P.z+=Math.cos(a)*11;boundP();
   P.inv=Math.max(P.inv,14);
   for(let i=0;i<10;i++){
     const px=lerp(ox,P.x,i/10),pz=lerp(oz,P.z,i/10);
     slashAt(px,rnd(0.8,2.4),pz,a+rnd(-0.3,0.3),s.hex);
     for(const e of [...enemies]){
       const dx=e.g.position.x-px,dz=e.g.position.z-pz;
       if(dx*dx+dz*dz<(e.r+2.2)**2)hitEnemy(e,9,s);
     }
   }
   shake=0.6;
 },
 (s)=>{ // ARMOR PURGE
   P.purgeT=360;
   const u=standMeshes[3].userData;
   for(const m of u.armor)m.visible=false;
   emit(standPos().x,2,standPos().z,0x9fb0c6,24,0.4);
   addText(P.x,2.8,P.z,'SPEED UNCHAINED — BUT FRAGILE','#ffffff',14,70);
 },
 (s,a)=>{ // BLADE SHOT — the rapier itself becomes the bullet
   makeShot(P.x+Math.sin(a)*1.8,P.z+Math.cos(a)*1.8,
     Math.sin(a)*1.3,Math.cos(a)*1.3,40,s.accHex,
     {kind:'blade',pierce:true,life:60});
   P.bladeGoneT=90;
   const u=standMeshes[3].userData;
   if(u.blade)u.blade.visible=false;
   shake=0.4;
 },
 (s)=>{ // AFTERIMAGE LEGION — mirages of pure speed
   for(let i=0;i<3;i++){
     mirages.push({g:buildMirage(),ang:i/3*TAU,life:360,hitCd:0});
   }
   emit(P.x,1.5,P.z,s.hex,20,0.35);
 },
 (s)=>{ // RIPOSTE STANCE — parry everything; punish everything
   P.riposteT=150;
   addText(P.x,2.8,P.z,'EN GARDE','#ffffff',16,60);
   emit(P.x,1.5,P.z,s.accHex,14,0.25);
 }
],
// ===== GILDED MENDER (Part 4 — restoration brawler) =====
[
 (s)=>{ // MEND SELF — what breaks can be mended
   P.hp=clamp(P.hp+25,0,P.maxhp);
   emit(P.x,1.5,P.z,s.hex,18,0.3);
   addText(P.x,2.8,P.z,'+25 — GOOD AS NEW','#3ddc6a',16,55);
 },
 (s)=>{ // RETURN TO SENDER — drag the nearest foe back to your feet
   const e=nearestEnemy(P.x,P.z,null,30);
   if(!e){addText(P.x,2.6,P.z,'nothing to return...',s.css,13,40);P.cds[1]=30;return;}
   e.pullT=120;e.pullX=P.x+Math.sin(P.ang)*3;e.pullZ=P.z+Math.cos(P.ang)*3;
   const ea=Math.atan2(e.g.position.x-P.x,e.g.position.z-P.z);
   beam(P.x,P.z,ea,Math.hypot(e.g.position.x-P.x,e.g.position.z-P.z),s.hex);
   hitEnemy(e,12,s);
   addText(e.g.position.x,2.8,e.g.position.z,'RETURNED!',s.css,16,45);
 },
 (s,a)=>{ // WALL OF MENDING — raise a barrier of restored rubble
   const posts=[];const grp=new THREE.Group();
   for(let i=-1;i<=1;i++){
     const aa=a+i*0.45;
     const px=P.x+Math.sin(aa)*4.5,pz=P.z+Math.cos(aa)*4.5;
     const slab=new THREE.Mesh(new THREE.BoxGeometry(2.2,2.6,0.5),sMat(s.hex,0.35));
     slab.position.set(px,1.3,pz);slab.rotation.y=aa;
     grp.add(slab);posts.push({x:px,z:pz});
   }
   scene.add(grp);outlineGroup(grp,1.04);
   walls.push({grp,posts,t:360});
   emit(P.x+Math.sin(a)*4.5,1,P.z+Math.cos(a)*4.5,s.hex,16,0.3);
 },
 (s)=>{ // FUSE TO EARTH — root the nearest foe into restored ground
   const e=nearestEnemy(P.x,P.z,null,16);
   if(!e){addText(P.x,2.6,P.z,'no one to fuse...',s.css,13,40);P.cds[3]=30;return;}
   e.bindT=200;
   emit(e.g.position.x,0.5,e.g.position.z,s.hex,14,0.3);
   addText(e.g.position.x,2.8,e.g.position.z,'FUSED!',s.css,18,50);
 },
 (s,a)=>{ // METEOR LUNGE
   const ox=P.x,oz=P.z;
   P.x+=Math.sin(a)*14;P.z+=Math.cos(a)*14;boundP();
   P.inv=Math.max(P.inv,16);
   for(let i=0;i<=8;i++){
     const px=lerp(ox,P.x,i/8),pz=lerp(oz,P.z,i/8);
     emit(px,1,pz,s.hex,2,0.2);
     for(const e of [...enemies]){
       const dx=e.g.position.x-px,dz=e.g.position.z-pz;
       if(dx*dx+dz*dz<(e.r+2.4)**2){hitEnemy(e,30,s);
         e.g.position.x+=Math.sin(a)*2;e.g.position.z+=Math.cos(a)*2;}
     }
   }
   shake=0.7;
 }
],
// ===== VELVET SEAM (Part 6 — unraveling string) =====
[
 (s,a)=>{ // STRING SHOT — a fist on a thread, far beyond reach
   const len=16;
   beam(P.x,P.z,a,len,s.hex);
   for(const e of [...enemies]){
     const dx=e.g.position.x-P.x,dz=e.g.position.z-P.z;
     const proj=clamp(dx*Math.sin(a)+dz*Math.cos(a),0,len);
     const cx2=P.x+Math.sin(a)*proj,cz2=P.z+Math.cos(a)*proj;
     if(Math.hypot(e.g.position.x-cx2,e.g.position.z-cz2)<e.r+0.9)hitEnemy(e,28,s);
   }
 },
 (s,a,t)=>{ // GRAPPLE LINE — string-swing to the cursor
   const tx=clamp(t.x,-42,42),tz=clamp(t.z,-42,42);
   const ga=Math.atan2(tx-P.x,tz-P.z);
   const dd=Math.min(18,Math.hypot(tx-P.x,tz-P.z));
   beam(P.x,P.z,ga,dd,s.accHex);
   const ox=P.x,oz=P.z;
   P.x+=Math.sin(ga)*dd;P.z+=Math.cos(ga)*dd;boundP();
   P.inv=Math.max(P.inv,16);
   for(let i=0;i<6;i++)emit(lerp(ox,P.x,i/6),1.2,lerp(oz,P.z,i/6),s.hex,2,0.15);
 },
 (s,a,t)=>{ // WIRE NET — slowing web of string
   const tx=clamp(t.x,-42,42),tz=clamp(t.z,-42,42);
   const grp=new THREE.Group();
   const disc=new THREE.Mesh(new THREE.CircleGeometry(6,28),
     new THREE.MeshBasicMaterial({color:s.hex,transparent:true,opacity:0.22,depthWrite:false}));
   disc.rotation.x=-Math.PI/2;disc.position.y=0.06;grp.add(disc);
   for(let i=0;i<8;i++){
     const cone=new THREE.Mesh(new THREE.ConeGeometry(0.16,1.6,6),sMat(s.hex,0.5));
     const aa=i/8*TAU;
     cone.position.set(Math.cos(aa)*5.4,0.8,Math.sin(aa)*5.4);
     cone.rotation.z=Math.cos(aa)*0.5;cone.rotation.x=-Math.sin(aa)*0.5;
     grp.add(cone);
   }
   grp.position.set(tx,0,tz);
   scene.add(grp);
   snares.push({grp,disc,x:tx,z:tz,r:6,t:300,si:5});
 },
 (s)=>{ // PUPPET WIRE — string into the body; bind
   const e=nearestEnemy(P.x,P.z,null,18);
   if(!e){addText(P.x,2.6,P.z,'nothing in thread range...',s.css,13,40);P.cds[3]=30;return;}
   e.bindT=180;e.charmT=0;
   const ea=Math.atan2(e.g.position.x-P.x,e.g.position.z-P.z);
   beam(P.x,P.z,ea,Math.hypot(e.g.position.x-P.x,e.g.position.z-P.z),s.hex);
   hitEnemy(e,12,s);
   addText(e.g.position.x,2.8,e.g.position.z,'STRUNG UP!',s.css,18,50);
 },
 (s)=>{ // UNRAVEL — become string; nothing can touch you
   P.untouchT=150;
   addText(P.x,2.8,P.z,'BODY OF STRING','#ffffff',15,70);
   emit(P.x,1.5,P.z,s.hex,20,0.3);
 }
],
// ===== HIGH NOON (Part 7 — the duelist who turns back six seconds) =====
[
 (s,a)=>{ // DEAD-EYE SHOT — one perfect round
   makeShot(P.x+Math.sin(a)*1.8,P.z+Math.cos(a)*1.8,
     Math.sin(a)*1.5,Math.cos(a)*1.5,45,s.accHex,{kind:'knife',pierce:true,life:50});
   shake=0.4;emit(standPos().x,2.2,standPos().z,s.accHex,6,0.25);
 },
 (s)=>{ // SIX SECONDS BACK — the rewind; only your memory survives
   if(hist.length<10){addText(P.x,2.6,P.z,'not enough time has passed...',s.css,13,40);P.cds[1]=60;return;}
   const snap=hist[0];
   P.x=snap.px;P.z=snap.pz;P.hp=Math.max(P.hp,snap.php);boundP();
   for(const rec of snap.ents){
     const e=rec[0];
     if(enemies.includes(e)){
       e.g.position.x=rec[1];e.g.position.z=rec[2];
       e.hp=clamp(rec[3],1,e.maxhp);
     }
   }
   for(const b of shots)scene.remove(b.mesh);shots.length=0;
   for(const b of ebullets)scene.remove(b.mesh);ebullets.length=0;
   hist.length=0;
   document.getElementById('tint').style.background='rgba(204,107,63,0.25)';
   setTimeout(()=>{if(timeStopT<=0&&P.eraseT<=0)document.getElementById('tint').style.background='transparent';},300);
   lineAlpha=1;shake=0.8;
   addText(P.x,3,P.z,'SIX SECONDS — TAKEN BACK','#ffffff',18,80);
   emit(P.x,1.6,P.z,s.hex,30,0.4);
 },
 (s,a)=>{ // FAN FIRE — six rounds across the arc
   for(let i=-2.5;i<=2.5;i++){
     const aa=a+i*0.12;
     makeShot(P.x+Math.sin(aa)*1.6,P.z+Math.cos(aa)*1.6,
       Math.sin(aa)*1.1,Math.cos(aa)*1.1,12,s.accHex,{kind:'knife',life:60});
   }
   emit(standPos().x,2.2,standPos().z,s.accHex,8,0.3);
 },
 (s)=>{ // DUELIST'S CODE — plant your feet; hit harder
   P.dueT=300;
   addText(P.x,2.8,P.z,'STAND YOUR GROUND — DAMAGE +60%','#ffffff',14,70);
   emit(P.x,0.6,P.z,s.hex,14,0.25);
 },
 (s)=>{ // SUNDOWN MARK — the duel ends in three seconds
   const e=nearestEnemy(P.x,P.z,null,26);
   if(!e){addText(P.x,2.6,P.z,'no opponent worthy...',s.css,13,40);P.cds[4]=30;return;}
   e.markT=180;
   addText(e.g.position.x,3,e.g.position.z,'MARKED FOR SUNDOWN',s.css,15,60);
 }
],
// ===== PLUNDER TIDE (Part 8 — the bubble thief) =====
[
 (s,a)=>{ // BUBBLE VOLLEY — drifting homing bubbles
   for(let i=-1;i<=1;i++){
     const aa=a+i*0.3;
     makeShot(P.x+Math.sin(aa)*1.5,P.z+Math.cos(aa)*1.5,
       Math.sin(aa)*0.45,Math.cos(aa)*0.45,16,s.hex,{kind:'bubble',homing:true,life:160});
   }
 },
 (s)=>{ // PLUNDER — steal their footing
   const e=nearestEnemy(P.x,P.z,null,14);
   if(!e){addText(P.x,2.6,P.z,'nothing to plunder...',s.css,13,40);P.cds[1]=30;return;}
   e.spd*=0.55;
   P.speedBuffT=480;
   const ea=Math.atan2(e.g.position.x-P.x,e.g.position.z-P.z);
   beam(P.x,P.z,ea,Math.hypot(e.g.position.x-P.x,e.g.position.z-P.z),s.hex);
   hitEnemy(e,10,s);
   addText(e.g.position.x,2.8,e.g.position.z,'PLUNDERED: SPEED',s.css,15,55);
 },
 (s)=>{ // BUBBLE WARD — a shield that pops incoming fire
   P.bubbleT=300;
   addText(P.x,2.8,P.z,'WARD OF BUBBLES','#ffffff',14,60);
   emit(P.x,1.6,P.z,s.hex,16,0.25);
 },
 (s,a,t)=>{ // SOAP SLICK — a slippery field where no one keeps their footing
   const tx=clamp(t.x,-42,42),tz=clamp(t.z,-42,42);
   const grp=new THREE.Group();
   const disc=new THREE.Mesh(new THREE.CircleGeometry(6,28),
     new THREE.MeshBasicMaterial({color:s.hex,transparent:true,opacity:0.22,depthWrite:false}));
   disc.rotation.x=-Math.PI/2;disc.position.y=0.06;grp.add(disc);
   for(let i=0;i<6;i++){
     const bub=new THREE.Mesh(new THREE.SphereGeometry(0.3,10,8),
       new THREE.MeshBasicMaterial({color:s.accHex,transparent:true,opacity:0.4}));
     const aa=i/6*TAU;
     bub.position.set(Math.cos(aa)*4.5,0.4,Math.sin(aa)*4.5);
     grp.add(bub);
   }
   grp.position.set(tx,0,tz);
   scene.add(grp);
   snares.push({grp,disc,x:tx,z:tz,r:6,t:300,si:7,slip:true});
 },
 (s)=>{ // BURST FINALE — pop every bubble at once
   let n=0;
   for(let i=shots.length-1;i>=0;i--){
     const b=shots[i];if(!b.bubble)continue;
     n++;
     emit(b.mesh.position.x,b.mesh.position.y,b.mesh.position.z,s.hex,8,0.35);
     for(const e of [...enemies]){
       const dx=e.g.position.x-b.mesh.position.x,dz=e.g.position.z-b.mesh.position.z;
       if(dx*dx+dz*dz<9)hitEnemy(e,15,s);
     }
     scene.remove(b.mesh);shots.splice(i,1);
   }
   if(n===0){addText(P.x,2.6,P.z,'no bubbles afloat...',s.css,13,40);P.cds[4]=40;}
   else shake=0.6;
 }
]];

// ---------------- SPECIALS (K) ----------------
function special(){
  if(state!=='play'||P.sp<100)return;
  const s=STANDS[P.si];
  P.sp=0;shake=1.2;P.atkAnim=30;lineAlpha=1;
  addText(P.x,4.4,P.z,s.spName+'!',s.css,32,70);
  if(P.si===0){ // ERASED RESULT — the moments between are gone; only carnage remains
    for(const b of ebullets)scene.remove(b.mesh);
    ebullets.length=0;
    document.getElementById('tint').style.background='rgba(224,53,75,0.3)';
    setTimeout(()=>{if(timeStopT<=0&&P.eraseT<=0)document.getElementById('tint').style.background='transparent';},220);
    shockRing(P.x,P.z,s.hex,18,0);
    for(const e of [...enemies]){
      const dx=e.g.position.x-P.x,dz=e.g.position.z-P.z;
      if(dx*dx+dz*dz<16*16){hitEnemy(e,70,s);
        const ka=Math.atan2(dx,dz);
        e.g.position.x+=Math.sin(ka)*5;e.g.position.z+=Math.cos(ka)*5;}
    }
    P.inv=Math.max(P.inv,40);
  } else if(P.si===1){
    timeStopT=190;
    document.getElementById('tint').style.background='rgba(122,79,208,0.18)';
    emit(P.x,1.6,P.z,0xffffff,40,0.5);
    shockRing(P.x,P.z,0xcfb3ff,46,0);
  } else if(P.si===2){
    P.gesture={slot:5,t:30,dur:30}; // SERPENT COIL — coil tight, fling the swarm wide
    for(let i=0;i<14;i++){const aa=i/14*TAU;
      makeShot(P.x,P.z,Math.sin(aa)*0.6,Math.cos(aa)*0.6,22,s.hex,{homing:i%2===0});}
  } else if(P.si===3){
    const pool=[...enemies].sort((A,B)=>{
      const da=(A.g.position.x-P.x)**2+(A.g.position.z-P.z)**2;
      const db=(B.g.position.x-P.x)**2+(B.g.position.z-P.z)**2;return da-db;}).slice(0,6);
    waltzQ=pool.map(e=>({e,t:0}));
  } else if(P.si===4){ // MENDER'S WRATH — roaring restoration barrage
    P.barrageT=42;P.barrageSi=4;
    shockRing(P.x,P.z,s.hex,20,0);
  } else if(P.si===5){ // THOUSAND THREADS — a string to every throat
    const pool=[...enemies].sort((A,B)=>{
      const da=(A.g.position.x-P.x)**2+(A.g.position.z-P.z)**2;
      const db=(B.g.position.x-P.x)**2+(B.g.position.z-P.z)**2;return da-db;}).slice(0,8);
    for(const e of pool){
      const ea=Math.atan2(e.g.position.x-P.x,e.g.position.z-P.z);
      beam(P.x,P.z,ea,Math.hypot(e.g.position.x-P.x,e.g.position.z-P.z),s.hex);
      hitEnemy(e,40,s);
    }
  } else if(P.si===6){ // LAST LIGHT — the duel ends
    const e=nearestEnemy(P.x,P.z,null,20);
    if(e){
      slashAt(e.g.position.x,1.6,e.g.position.z,rnd(0,TAU),s.accHex);
      if(e.hp<e.maxhp*0.5&&e.type!=='dummy'){
        hitEnemy(e,99999,s);
        addText(P.x,3.4,P.z,'SUNDOWN.','#ffffff',24,70);
      } else hitEnemy(e,65,s);
    } else addText(P.x,2.8,P.z,'no opponent stands...',s.css,14,50);
  } else { // P.si===7: TOTAL PLUNDER
    let stolen=0;
    for(const e of [...enemies]){
      const dx=e.g.position.x-P.x,dz=e.g.position.z-P.z;
      if(dx*dx+dz*dz<14*14){
        hitEnemy(e,25,s);
        if(enemies.includes(e))e.spd*=0.8;
        stolen++;
      }
    }
    P.hp=clamp(P.hp+stolen*3,0,P.maxhp);
    if(stolen)addText(P.x,3,P.z,'+'+(stolen*3)+' STOLEN VITALITY','#3ddc6a',16,60);
    shockRing(P.x,P.z,s.hex,15,0);
  }
}

function damagePlayer(d,attacker){
  if(P.inv>0)return;
  if(P.eraseT>0)return; // erased time — you were never there
  if(P.untouchT>0)return; // a body of string cannot be struck
  if(P.epitaphT>0&&P.epiCh>0){ // foreseen — auto-dodge
    P.epiCh--;
    const ka=attacker?Math.atan2(P.x-attacker.g.position.x,P.z-attacker.g.position.z):rnd(0,TAU);
    emit(P.x,1.2,P.z,0xff9aa8,10,0.3);
    P.x+=Math.sin(ka)*6;P.z+=Math.cos(ka)*6;boundP();
    P.inv=Math.max(P.inv,20);
    addText(P.x,2.8,P.z,'FORESEEN!','#ffffff',16,40);
    if(P.epiCh===0)P.epitaphT=0;
    return;
  }
  if(P.riposteT>0){
    if(attacker)hitEnemy(attacker,25,STANDS[3]);
    d=Math.ceil(d/2);
    slashAt(P.x,1.6,P.z,rnd(0,TAU),0xffffff);
  }
  d=Math.round(d*(P.purgeT>0?1.5:1));
  P.hp-=d;P.inv=45;shake=0.8;
  combo=0;comboT=0;
  emit(P.x,1.2,P.z,0xe0354b,14,0.35);
  addText(P.x,2.6,P.z,'-'+d,'#ff9aa8',20,35);
  document.getElementById('tint').style.background='rgba(224,53,75,0.22)';
  setTimeout(()=>{if(timeStopT<=0&&P.eraseT<=0)document.getElementById('tint').style.background='transparent';},140);
}

// ---------------- UPDATE ----------------
function update(){
  frame++;
  const frozen=timeStopT>0;
  if(frozen){timeStopT--;
    if(timeStopT===0)document.getElementById('tint').style.background='transparent';}
  if(P.eraseT>0){P.eraseT--;
    // red figures of fate — where each foe will stand when time resumes
    for(let i=eraseGhosts.length-1;i>=0;i--){
      const gh=eraseGhosts[i];
      if(!enemies.includes(gh.e)){scene.remove(gh.mesh);eraseGhosts.splice(i,1);continue;}
      const e=gh.e;
      const a2=Math.atan2(P.eraseAx-e.g.position.x,P.eraseAz-e.g.position.z);
      let px=e.g.position.x+Math.sin(a2)*e.spd*P.eraseT;
      let pz=e.g.position.z+Math.cos(a2)*e.spd*P.eraseT;
      const dd=Math.hypot(px,pz);if(dd>44){px=px/dd*44;pz=pz/dd*44;}
      gh.mesh.position.set(px,e.body.position.y,pz);
      gh.mesh.rotation.y=a2;
      gh.mesh.material.opacity=0.28+Math.sin(frame*0.25)*0.14;
    }
    if(P.eraseT===0){
      clearEraseGhosts();
      document.getElementById('tint').style.background='transparent';
      shockRing(P.x,P.z,0xe0354b,10,0);
      addText(P.x,3,P.z,'TIME RESUMES','#ffffff',16,50);
    }}
  if(P.epitaphT>0)P.epitaphT--;
  if(P.riposteT>0)P.riposteT--;
  if(P.bladeGoneT>0){P.bladeGoneT--;
    if(P.bladeGoneT===0){const u=standMeshes[3].userData;if(u.blade)u.blade.visible=true;}}
  if(shake>0)shake*=0.86;
  if(comboT>0){comboT--;if(comboT===0)combo=0;}
  if(P.inv>0)P.inv--;
  if(P.atkCd>0)P.atkCd--;
  for(let i=0;i<5;i++)if(P.cds[i]>0)P.cds[i]--;
  if(P.gesture&&P.gesture.t>0)P.gesture.t--;
  if(P.dashCd>0)P.dashCd--;
  if(P.atkAnim>0)P.atkAnim--;
  if(P.purgeT>0){P.purgeT--;
    if(P.purgeT===0){const u=standMeshes[3].userData;
      for(const m of u.armor)m.visible=true;}}
  if(P.untouchT>0)P.untouchT--;
  if(P.dueT>0)P.dueT--;
  if(P.bubbleT>0)P.bubbleT--;
  if(P.speedBuffT>0)P.speedBuffT--;

  // history for the six-second rewind
  if(frame%3===0){
    hist.push({px:P.x,pz:P.z,php:P.hp,
      ents:enemies.map(e=>[e,e.g.position.x,e.g.position.z,e.hp])});
    if(hist.length>120)hist.shift();
  }

  // keyboard camera fallback
  if(keys['z'])camYaw+=0.045;
  if(keys['c'])camYaw-=0.045;
  if(keys['r'])camPitch=clamp(camPitch-0.02,0.35,1.35);
  if(keys['f'])camPitch=clamp(camPitch+0.02,0.35,1.35);
  if(keys['+']||keys['='])camDist=clamp(camDist-0.5,15,42);
  if(keys['-']||keys['_'])camDist=clamp(camDist+0.5,15,42);

  // camera-relative movement
  let inF=0,inR=0;
  if(keys['w']||keys['arrowup'])inF+=1;
  if(keys['s']||keys['arrowdown'])inF-=1;
  if(keys['d']||keys['arrowright'])inR+=1;
  if(keys['a']||keys['arrowleft'])inR-=1;
  if(touchMove){const dx=touchMove.x-touchMove.sx,dy=touchMove.y-touchMove.sy;
    const m=Math.hypot(dx,dy);if(m>10){inR=dx/m;inF=-dy/m;}}
  const fx=-Math.sin(camYaw),fz=-Math.cos(camYaw);
  const rx=Math.cos(camYaw),rz=-Math.sin(camYaw);
  let mx=inR*rx+inF*fx, mz=inR*rz+inF*fz;
  if(P.dueT>0){mx=0;mz=0;} // duelist's code: feet planted
  const ml=Math.hypot(mx,mz);
  if(ml>0){P.dx=mx/ml;P.dz=mz/ml;}
  let spd=0.34*(P.purgeT>0?1.3:1)*(P.eraseT>0?1.5:1)*(P.speedBuffT>0?1.15:1);
  if(P.dashT>0){P.dashT--;spd=1.15;
    if(ml===0){mx=P.dx;mz=P.dz;}
    emit(P.x,0.6,P.z,STANDS[P.si].hex,2,0.12);
  }
  const ml2=Math.hypot(mx,mz)||1;
  if(ml>0||P.dashT>0){P.x+=mx/ml2*spd;P.z+=mz/ml2*spd;boundP();}

  if(mouse.down||keys['j']||btn.atk)attack();

  // sustained AoE barrage (MENDER'S WRATH)
  if(P.barrageT>0){P.barrageT--;
    const sB=STANDS[P.barrageSi||0],spB=standPos();
    for(let k=0;k<3;k++){const aa=rnd(0,TAU);
      throwFist(spB.x,2.2,spB.z,P.x+Math.sin(aa)*8,rnd(0.5,2.5),P.z+Math.cos(aa)*8,sB.hex);}
    if(P.barrageT%4===0)for(const e of [...enemies]){
      const dx=e.g.position.x-P.x,dz=e.g.position.z-P.z;
      if(dx*dx+dz*dz<100)hitEnemy(e,9,sB);
    }
    shake=Math.max(shake,0.25);
  }

  // blade waltz
  if(waltzQ.length){
    const w=waltzQ[0];w.t++;
    const s=STANDS[3],m=standMeshes[3];
    if(enemies.includes(w.e)){
      m.position.x=lerp(m.position.x,w.e.g.position.x,0.5);
      m.position.z=lerp(m.position.z,w.e.g.position.z,0.5);
      if(w.t>=5){
        slashAt(w.e.g.position.x,1.6,w.e.g.position.z,rnd(0,TAU),s.hex);
        slashAt(w.e.g.position.x,1.6,w.e.g.position.z,rnd(0,TAU),s.hex);
        hitEnemy(w.e,40,s);
        waltzQ.shift();
      }
    } else waltzQ.shift();
  }

  // steamrollers
  for(let i=rollers.length-1;i>=0;i--){
    const r=rollers[i];
    const s=STANDS[1];
    if(r.phase==='fall'){
      r.grp.position.y-=0.9;
      if(r.grp.position.y<=1.5){
        r.grp.position.y=1.5;r.phase='crush';r.t=48;
        shockRing(r.x,r.z,s.hex,11,30);
        emit(r.x,1,r.z,0x8a8a7a,30,0.5);
        shake=1.3;lineAlpha=Math.max(lineAlpha,0.9);hitstop=Math.max(hitstop,4);
        addText(r.x,4,r.z,'CRUSH!',s.css,26,50);
      }
    } else {
      r.t--;
      r.grp.position.y=1.5+Math.abs(Math.sin(r.t*0.5))*0.35;
      if(r.t%6===0){
        const sp=standPos();
        throwFist(sp.x,3,sp.z,r.x+rnd(-1,1),2,r.z+rnd(-1,1),s.hex);
        shake=Math.max(shake,0.5);
        for(const e of [...enemies]){
          const dx=e.g.position.x-r.x,dz=e.g.position.z-r.z;
          if(dx*dx+dz*dz<36)hitEnemy(e,8,s);
        }
      }
      if(r.t<=0){
        emit(r.x,2,r.z,0xf2b630,40,0.6);
        shockRing(r.x,r.z,s.hex,9,20);
        scene.remove(r.grp);rollers.splice(i,1);
        shake=1.0;
      }
    }
  }

  // snare fields
  for(let i=snares.length-1;i>=0;i--){
    const f=snares[i];f.t--;
    f.grp.rotation.y+=0.02;
    f.disc.material.opacity=0.18+Math.sin(frame*0.15)*0.06;
    if(f.t<=0){scene.remove(f.grp);snares.splice(i,1);}
  }

  // ambush nets
  for(let i=traps.length-1;i>=0;i--){
    const tr=traps[i];tr.t--;
    tr.mesh.material.opacity=0.25+Math.sin(frame*0.2)*0.1;
    for(const e of enemies){
      if(tr.hitset.has(e))continue;
      const d=Math.hypot(e.g.position.x-tr.x,e.g.position.z-tr.z);
      if(Math.abs(d-tr.r)<e.r+0.8){
        tr.hitset.add(e);
        hitEnemy(e,28,STANDS[2]);
        emit(e.g.position.x,1,e.g.position.z,STANDS[2].hex,12,0.35);
        addText(e.g.position.x,2.6,e.g.position.z,'AMBUSHED!',STANDS[2].css,15,40);
      }
    }
    if(tr.t<=0){scene.remove(tr.mesh);traps.splice(i,1);}
  }

  // mending walls — they weather, then crumble
  for(let i=walls.length-1;i>=0;i--){
    const w=walls[i];w.t--;
    if(w.t<60)w.grp.traverse(o=>{
      if(o.material&&!o.userData.isOutline){o.material.transparent=true;o.material.opacity=w.t/60;}
      if(o.userData.isOutline)o.visible=false;
    });
    if(w.t<=0){scene.remove(w.grp);walls.splice(i,1);}
  }

  // mirages
  for(let i=mirages.length-1;i>=0;i--){
    const m=mirages[i];m.life--;m.ang+=0.07;
    m.g.position.set(P.x+Math.cos(m.ang)*3.2,0,P.z+Math.sin(m.ang)*3.2);
    m.g.rotation.y=-m.ang;
    if(m.hitCd>0)m.hitCd--;
    if(m.hitCd<=0){
      for(const e of enemies){
        const dx=e.g.position.x-m.g.position.x,dz=e.g.position.z-m.g.position.z;
        if(dx*dx+dz*dz<(e.r+2.0)**2){
          hitEnemy(e,8,STANDS[3]);
          slashAt(e.g.position.x,1.6,e.g.position.z,rnd(0,TAU),0xc9d4e4);
          m.hitCd=15;break;
        }
      }
    }
    if(m.life<=0){emit(m.g.position.x,1.5,m.g.position.z,0xc9d4e4,8,0.25);
      scene.remove(m.g);mirages.splice(i,1);}
  }

  // shots
  for(let i=shots.length-1;i>=0;i--){
    const b=shots[i];
    if(b.waitStop&&timeStopT>0){ // knives hang in stopped time
      b.mesh.position.y=1.6+Math.sin(frame*0.1+i)*0.06;
      if(frame%14===0)emit(b.mesh.position.x,b.mesh.position.y,b.mesh.position.z,0xffffff,1,0.04);
      continue;
    }
    b.waitStop=false;
    if(b.homing&&enemies.length){
      const best=nearestEnemy(b.mesh.position.x,b.mesh.position.z,null);
      if(best){const ta=Math.atan2(best.g.position.x-b.mesh.position.x,best.g.position.z-b.mesh.position.z);
        const ca=Math.atan2(b.vx,b.vz);
        let da=ta-ca;while(da>Math.PI)da-=TAU;while(da<-Math.PI)da+=TAU;
        const na=ca+clamp(da,-0.08,0.08);
        const sm=Math.hypot(b.vx,b.vz);
        b.vx=Math.sin(na)*sm;b.vz=Math.cos(na)*sm;
        b.mesh.rotation.y=na;}
    }
    b.mesh.position.x+=b.vx;b.mesh.position.z+=b.vz;
    b.life--;
    if(frame%2===0)emit(b.mesh.position.x,b.mesh.position.y,b.mesh.position.z,b.hex,1,0.05);
    let dead=b.life<=0||Math.hypot(b.mesh.position.x,b.mesh.position.z)>50;
    for(const e of enemies){
      if(b.hitset&&b.hitset.has(e))continue;
      const dx=e.g.position.x-b.mesh.position.x,dz=e.g.position.z-b.mesh.position.z;
      if(dx*dx+dz*dz<(e.r+(b.pierce?0.9:0.7))**2){
        hitEnemy(e,b.dmg,STANDS[P.si]);
        if(b.pierce){b.hitset.add(e);}
        else{dead=true;break;}
      }
    }
    if(dead){scene.remove(b.mesh);shots.splice(i,1);}
  }

  // shock rings
  for(const r of ringPool){
    if(r.life<=0)continue;
    r.life--;
    const f=1-r.life/r.max;
    const cur=lerp(1,r.maxR,1-Math.pow(1-f,2));
    r.mesh.scale.set(cur,cur,1);
    r.mesh.material.opacity=0.9*(r.life/r.max);
    if(r.dmg>0)for(const e of enemies){
      const dx=e.g.position.x-r.cx,dz=e.g.position.z-r.cz;
      const d=Math.hypot(dx,dz);
      if(!r.hitset.has(e)&&Math.abs(d-cur)<e.r+1.4){
        r.hitset.add(e);hitEnemy(e,r.dmg,STANDS[P.si]);
        const a=Math.atan2(dx,dz);
        e.g.position.x+=Math.sin(a)*3;e.g.position.z+=Math.cos(a)*3;}
    }
    if(r.life<=0)r.mesh.visible=false;
  }

  // enemies
  if(!frozen){
    for(const e of [...enemies]){
      e.wob+=0.1;
      if(e.hitT>0)e.hitT--;
      if(e.type==='dummy'){ // training dummy: stands there and takes it
        e.body.material.emissiveIntensity=e.hitT>0?1.4:e.baseEm;
        e.fg.scale.x=1.7*clamp(e.hp/e.maxhp,0,1);
        continue;
      }
      // bind: cannot move, squeezed
      if(e.bindT>0){e.bindT--;
        if(e.bindT%30===0)hitEnemy(e,4,STANDS[2]);
        if(!enemies.includes(e))continue;
        e.body.position.y=(e.type==='brute'?1.3:e.type==='ranged'?1.4:1.0)+Math.sin(e.wob*3)*0.06;
        e.fg.scale.x=1.7*clamp(e.hp/e.maxhp,0,1);
        continue;
      }
      // charm: fight for the oracle
      if(e.charmT>0){e.charmT--;
        if(e.charmHitCd>0)e.charmHitCd--;
        if(e.charmT===0){
          e.body.material.emissive.setHex(e.origEm);
          e.body.material.emissiveIntensity=e.baseEm;
        } else {
          const tgt=nearestEnemy(e.g.position.x,e.g.position.z,e);
          if(tgt){
            const ta=Math.atan2(tgt.g.position.x-e.g.position.x,tgt.g.position.z-e.g.position.z);
            e.g.rotation.y=ta;
            e.g.position.x+=Math.sin(ta)*e.spd*1.2;
            e.g.position.z+=Math.cos(ta)*e.spd*1.2;
            const dd=Math.hypot(tgt.g.position.x-e.g.position.x,tgt.g.position.z-e.g.position.z);
            if(dd<tgt.r+e.r+0.3&&e.charmHitCd<=0){
              hitEnemy(tgt,12,STANDS[2]);e.charmHitCd=20;
            }
          }
          e.body.rotation.y+=0.15;
          e.fg.scale.x=1.7*clamp(e.hp/e.maxhp,0,1);
          continue;
        }
      }
      // dragged back by the mender
      if(e.pullT>0){e.pullT--;
        const pd=Math.hypot(e.pullX-e.g.position.x,e.pullZ-e.g.position.z);
        if(pd>0.5){const pa=Math.atan2(e.pullX-e.g.position.x,e.pullZ-e.g.position.z);
          e.g.position.x+=Math.sin(pa)*0.35;e.g.position.z+=Math.cos(pa)*0.35;}
      }
      // marked for sundown
      if(e.markT>0){e.markT--;
        if(frame%10===0)emit(e.g.position.x,2.6,e.g.position.z,0xcc6b3f,1,0.1);
        if(e.markT===0){
          hitEnemy(e,50,STANDS[6]);
          shake=Math.max(shake,0.5);
          if(!enemies.includes(e))continue;
        }
      }
      // snare slow
      let slow=1;
      for(const f of snares){
        const dx=e.g.position.x-f.x,dz=e.g.position.z-f.z;
        if(dx*dx+dz*dz<f.r*f.r){slow=0.42;
          if(f.slip){e.g.position.x+=rnd(-0.18,0.18);e.g.position.z+=rnd(-0.18,0.18);}
          if(frame%30===0)hitEnemy(e,f.slip?2:4,STANDS[f.si==null?2:f.si]);}
      }
      if(!enemies.includes(e))continue;
      // targeting: during erased time enemies hunt the afterimage
      const tx=P.eraseT>0?P.eraseAx:P.x,tz=P.eraseT>0?P.eraseAz:P.z;
      const dx=tx-e.g.position.x,dz=tz-e.g.position.z;
      const a=Math.atan2(dx,dz),d=Math.hypot(dx,dz);
      e.g.rotation.y=a;
      const v=e.spd*slow;
      if(e.type==='ranged'){
        if(d>20){e.g.position.x+=Math.sin(a)*v;e.g.position.z+=Math.cos(a)*v;}
        else if(d<13){e.g.position.x-=Math.sin(a)*v;e.g.position.z-=Math.cos(a)*v;}
        e.cd--;
        if(e.cd<=0){e.cd=110-Math.min(wave*4,50);
          const m=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6),
            new THREE.MeshBasicMaterial({color:0xffb3c0}));
          m.position.set(e.g.position.x,1.4,e.g.position.z);scene.add(m);
          ebullets.push({mesh:m,vx:Math.sin(a)*0.27,vz:Math.cos(a)*0.27,life:200});}
      } else {
        e.g.position.x+=Math.sin(a)*v;e.g.position.z+=Math.cos(a)*v;
      }
      e.body.position.y=(e.type==='brute'?1.3:e.type==='ranged'?1.4:1.0)+Math.sin(e.wob)*0.12;
      e.body.rotation.y+=e.type==='chaser'?0.04:0;
      e.body.material.emissiveIntensity=e.hitT>0?1.4:(e.charmT>0?1.0:e.baseEm);
      e.fg.scale.x=1.7*clamp(e.hp/e.maxhp,0,1);
      const pd=Math.hypot(P.x-e.g.position.x,P.z-e.g.position.z);
      if(pd<e.r+0.9)damagePlayer(e.type==='brute'?18:10,e);
    }
    for(let i=ebullets.length-1;i>=0;i--){
      const b=ebullets[i];
      b.mesh.position.x+=b.vx;b.mesh.position.z+=b.vz;b.life--;
      // riposte slices nearby bullets
      if(P.riposteT>0){
        const dx0=P.x-b.mesh.position.x,dz0=P.z-b.mesh.position.z;
        if(dx0*dx0+dz0*dz0<16){
          slashAt(b.mesh.position.x,1.4,b.mesh.position.z,rnd(0,TAU),0xffffff);
          score+=5;b.life=0;
        }
      }
      // bubble ward pops incoming fire
      if(b.life>0&&P.bubbleT>0){
        const dx0=P.x-b.mesh.position.x,dz0=P.z-b.mesh.position.z;
        if(dx0*dx0+dz0*dz0<20){
          emit(b.mesh.position.x,1.4,b.mesh.position.z,0x5aa8ff,5,0.25);
          score+=5;b.life=0;
        }
      }
      // mending walls block shots
      if(b.life>0)for(const w of walls){
        let blocked=false;
        for(const p of w.posts){
          const dxw=p.x-b.mesh.position.x,dzw=p.z-b.mesh.position.z;
          if(dxw*dxw+dzw*dzw<2.2){blocked=true;break;}
        }
        if(blocked){emit(b.mesh.position.x,1.4,b.mesh.position.z,0xff6fa5,4,0.2);b.life=0;break;}
      }
      const dx=P.x-b.mesh.position.x,dz=P.z-b.mesh.position.z;
      if(b.life>0&&dx*dx+dz*dz<1.2&&P.inv<=0){damagePlayer(8,null);b.life=0;}
      if(b.life<=0){scene.remove(b.mesh);ebullets.splice(i,1);}
    }
  }

  // pools
  for(const p of partPool){if(p.life<=0)continue;
    p.life--;p.mesh.position.x+=p.vx;p.mesh.position.y+=p.vy;p.mesh.position.z+=p.vz;
    p.vy-=0.012;p.vx*=0.94;p.vz*=0.94;
    p.mesh.rotation.x+=0.2;p.mesh.rotation.y+=0.17;
    p.mesh.material.opacity=clamp(p.life/p.max,0,1);
    if(p.mesh.position.y<0.05)p.mesh.position.y=0.05;
    if(p.life<=0)p.mesh.visible=false;}
  for(const f of fistPool){if(f.life<=0)continue;
    f.life--;f.mesh.position.x+=f.vx;f.mesh.position.y+=f.vy;f.mesh.position.z+=f.vz;
    f.mesh.material.opacity=f.life/f.max;
    if(f.life<=0)f.mesh.visible=false;}
  for(const s of slashPool){if(s.life<=0)continue;
    s.life--;s.mesh.scale.x+=0.12;
    s.mesh.material.opacity=0.95*(s.life/s.max);
    if(s.life<=0)s.mesh.visible=false;}
  for(const b of beamPool){if(b.life<=0)continue;
    b.life--;b.mesh.material.opacity=0.95*(b.life/b.max);
    b.mesh.scale.y=b.mesh.scale.z=1+(1-b.life/b.max)*1.5;
    if(b.life<=0)b.mesh.visible=false;}

  if(!training&&enemies.length===0&&waltzQ.length===0)nextWave();
  if(P.hp<=0)gameOver();

  // player + stand transforms
  playerMesh.position.set(P.x,Math.abs(Math.sin(frame*0.18))*(ml>0?0.12:0),P.z);
  playerMesh.rotation.y=P.ang;
  // ghostly during erased time
  playerMesh.traverse(o=>{
    if(o.userData.isOutline){o.visible=P.eraseT<=0&&P.untouchT<=0;return;}
    if(o.material){o.material.transparent=true;o.material.opacity=(P.eraseT>0||P.untouchT>0)?0.45:1;}
  });
  const s=STANDS[P.si],m=standMeshes[P.si];
  const active=P.atkAnim>0||mouse.down||keys['j']||btn.atk;
  const rollerActive=P.si===1&&rollers.length>0&&rollers[0].phase==='crush';
  if(waltzQ.length===0){
    if(rollerActive){
      const r=rollers[0];
      m.position.x=lerp(m.position.x,r.x,0.3);
      m.position.z=lerp(m.position.z,r.z,0.3);
      m.position.y=3.8+Math.sin(frame*0.8)*0.5;
    } else if(P.si===4&&customModels[4]&&((P.gesture&&P.gesture.t>0)||P.barrageT>0)){
      // GILDED MENDER — the phantom leaves the user's shoulder and moves
      // around them to act out each technique where it actually lands
      let tx,tz,ty;
      if(P.gesture&&P.gesture.t>0){
        const g=P.gesture,p=clamp(1-g.t/g.dur,0,1),pulse=Math.sin(p*Math.PI);
        if(g.slot===0){        // MEND SELF — circle the user, showering restoration
          const ca=P.ang+Math.PI*0.6+p*TAU;
          tx=P.x+Math.sin(ca)*2.8; tz=P.z+Math.cos(ca)*2.8; ty=0.55+0.9*pulse;
        }else if(g.slot===1){  // RETURN TO SENDER — dart out to seize, haul back in
          const reach=Math.min(p/0.4,1),yank=Math.max(0,(p-0.4)/0.6);
          const d=4.6*reach*(1-yank)-0.6*yank;
          tx=P.x+Math.sin(P.ang)*d; tz=P.z+Math.cos(P.ang)*d; ty=0.55;
        }else if(g.slot===2){  // WALL OF MENDING — plant at the wall line, rise with it
          tx=P.x+Math.sin(P.ang)*2.8; tz=P.z+Math.cos(P.ang)*2.8;
          ty=0.1+1.5*Math.max(0,(p-0.35)/0.65);
        }else if(g.slot===3){  // FUSE TO EARTH — leap over the target, slam straight down
          const up=Math.min(p/0.25,1),down=Math.min(Math.max(0,(p-0.3)/0.2),1);
          tx=P.x+Math.sin(P.ang)*3.0; tz=P.z+Math.cos(P.ang)*3.0;
          ty=0.4+2.0*up-2.2*down;
        }else{                 // METEOR LUNGE — fly point-first ahead of the user
          tx=P.x+Math.sin(P.ang)*3.6; tz=P.z+Math.cos(P.ang)*3.6; ty=1.1;
        }
      }else{                   // MENDER'S WRATH — stand at the center of the storm
        tx=P.x+Math.sin(P.ang)*2.2; tz=P.z+Math.cos(P.ang)*2.2;
        ty=0.9+Math.sin(frame*1.4)*0.2;
      }
      m.position.x=lerp(m.position.x,tx,0.3);
      m.position.z=lerp(m.position.z,tz,0.3);
      m.position.y=lerp(m.position.y,ty,0.3);
    } else if(P.si===1&&customModels[1]&&((P.gesture&&P.gesture.t>0)||timeStopT>0)){
      // NULL HOUR — steps out around the user to act out each technique
      let tx,tz,ty;
      const fx=Math.sin(P.ang),fz=Math.cos(P.ang);
      if(P.gesture&&P.gesture.t>0){
        const g=P.gesture,p=clamp(1-g.t/g.dur,0,1);
        if(g.slot===0){        // KNUCKLE DOWN — hop up, drop onto the ground ahead
          const up=Math.min(p/0.35,1),drop=Math.max(0,Math.min((p-0.35)/0.2,1));
          tx=P.x+fx*1.9; tz=P.z+fz*1.9; ty=0.35+1.3*up-1.5*drop;
        }else if(g.slot===1){  // STEAMROLLER DROP — rise skyward to call it down
          const lift=Math.min(p/0.35,1);
          tx=P.x+fx*2.0; tz=P.z+fz*2.0; ty=0.55+2.6*lift;
        }else if(g.slot===2){  // KNIFE FAN — step ahead to fling the fan
          tx=P.x+fx*1.6; tz=P.z+fz*1.6; ty=0.7;
        }else if(g.slot===3){  // LIFE SIPHON — lunge at the prey, drag it dry
          const reach=Math.min(p/0.35,1),drink=Math.max(0,(p-0.45)/0.55);
          const d=0.8+2.4*reach*(1-drink);
          tx=P.x+fx*d; tz=P.z+fz*d; ty=0.55;
        }else{                 // HEAVEN DROP — crash down at the landing point
          const dive=Math.min(p/0.4,1);
          tx=P.x+fx*2.0; tz=P.z+fz*2.0; ty=Math.max(0.25,3.4-3.1*dive);
        }
      }else{                   // VOID TICK — surge forward with the throw, then loom
        const e=190-timeStopT,t0=e<12?0:Math.min((e-12)/16,1),th=t0*t0*(3-2*t0);
        tx=P.x+fx*(0.9+1.5*th); tz=P.z+fz*(0.9+1.5*th);
        ty=0.55+(0.5+Math.sin(frame*0.045)*0.15)*th;
      }
      const mrate=(P.gesture&&P.gesture.t>0)?0.3:0.1; // slow, weightless glide in stopped time
      m.position.x=lerp(m.position.x,tx,mrate);
      m.position.z=lerp(m.position.z,tz,mrate);
      m.position.y=lerp(m.position.y,ty,mrate);
    } else if(P.si===2&&customModels[2]&&P.gesture&&P.gesture.t>0){
      // JADE ORACLE — slithers around the user to cast each technique
      let tx,tz,ty;
      const g=P.gesture,p=clamp(1-g.t/g.dur,0,1);
      const fx=Math.sin(P.ang),fz=Math.cos(P.ang);
      if(g.slot===0){        // EMERALD TEMPEST — plant ahead, recoil with the volley
        const fire=Math.max(0,Math.min((p-0.3)/0.15,1));
        tx=P.x+fx*(2.4-0.6*fire); tz=P.z+fz*(2.4-0.6*fire); ty=0.7;
      }else if(g.slot===1){  // TENDRIL SNARE — rise to cast, dip as the trap plants
        const raise=Math.min(p/0.35,1),sw=Math.max(0,Math.min((p-0.35)/0.3,1));
        tx=P.x+fx*2.4; tz=P.z+fz*2.4; ty=0.5+1.1*raise*(1-sw);
      }else if(g.slot===2){  // PUPPET STRINGS — lean out toward the seized prey
        tx=P.x+fx*2.8; tz=P.z+fz*2.8; ty=0.9;
      }else if(g.slot===3){  // AMBUSH NET — skim a low circle, paying the net out
        const ca=P.ang+Math.PI*0.6+p*TAU;
        tx=P.x+Math.sin(ca)*3.2; tz=P.z+Math.cos(ca)*3.2; ty=0.35;
      }else if(g.slot===4){  // COIL CONSTRICT — lunge in to wrap the target
        const sq=Math.max(0,Math.min((p-0.3)/0.25,1));
        tx=P.x+fx*(1.2+1.8*sq); tz=P.z+fz*(1.2+1.8*sq); ty=0.55;
      }else{                 // SERPENT COIL — gather at the center, rise with the release
        const rel=Math.max(0,Math.min((p-0.35)/0.2,1));
        tx=P.x+fx*1.6; tz=P.z+fz*1.6; ty=0.45+0.9*rel;
      }
      m.position.x=lerp(m.position.x,tx,0.3);
      m.position.z=lerp(m.position.z,tz,0.3);
      m.position.y=lerp(m.position.y,ty,0.3);
    } else {
      const off=2.4;
      const tx=P.x-Math.sin(P.ang)*1.2-Math.cos(P.ang)*off*0.6;
      const tz=P.z-Math.cos(P.ang)*1.2+Math.sin(P.ang)*off*0.6;
      m.position.x=lerp(m.position.x,tx,0.18);
      m.position.z=lerp(m.position.z,tz,0.18);
      m.position.y=0.55+Math.sin(frame*0.1)*0.18;
    }
  }
  m.rotation.y=P.ang;
  const u=m.userData;
  const eL=u.armL.userData.elb,eR=u.armR.userData.elb;
  if(customModels[P.si]){
    const cm=customModels[P.si];
    // base body pose: static rigs get a punchy lunge; rigged models stay neutral
    // (their skeleton is driven by the mixer in the render loop)
    let tRx=0,tRz=0,tPz=0,tPy=0;
    if(!cm.mixer){
      tPz=active?Math.abs(Math.sin(frame*0.9))*0.55:0;
      tRx=active?-0.12:0;
      tRz=active?Math.sin(frame*0.9)*0.06:0;
    }
    // GILDED MENDER / NULL HOUR — each technique drives the whole body so the
    // motion reads: torso tilt via the holder, arms and legs posed bone-by-bone
    // on top of whatever clip the skeleton is playing (applied after
    // mixer.update in loop).
    P.phantomPose=null;
    if(P.si===4&&P.gesture&&P.gesture.t>0){
      const g=P.gesture,p=clamp(1-g.t/g.dur,0,1),pulse=Math.sin(p*Math.PI);
      // rig conventions (measured from the clip pose): arms raise forward with
      // Z (R:-, L:+) and swing outward with X-; forearms extend the guard with
      // Z (R:+, L:-); Spine1/Head pitch forward with X+; thighs swing forward
      // with Z+ and knees fold with Z-.
      const B={};
      if(g.slot===0){            // MEND SELF — arms sweep open, face skyward, drink it in
        tRx=0.20*pulse; tPy=0.22*pulse; tPz=-0.10*pulse; tRz=0;
        B.RightArm=[-0.55*pulse,0,-1.15*pulse]; B.LeftArm=[-0.55*pulse,0,1.15*pulse];
        B.RightForeArm=[0,0,0.85*pulse]; B.LeftForeArm=[0,0,-0.85*pulse];
        B.Head=[-0.45*pulse,0,0]; B.Spine1=[-0.18*pulse,0,0];
        const tr=Math.sin(frame*0.5)*0.3; // light trot while it circles the user
        B.RightUpLeg=[0,0,0.25+tr]; B.LeftUpLeg=[0,0,0.25-tr];
        B.RightLeg=[0,0,-0.45]; B.LeftLeg=[0,0,-0.45];
      }else if(g.slot===1){      // RETURN TO SENDER — spear the arm out, seize, rip back
        const reach=Math.min(p/0.4,1),yank=Math.max(0,(p-0.4)/0.6);
        tPz=0.55*reach*(1-yank)-0.45*yank;
        tRx=-0.30*reach*(1-yank)+0.40*yank;
        tRz=0.12*pulse;
        B.RightArm=[0,0,-1.35*reach*(1-yank)+0.6*yank];
        B.RightForeArm=[0,0,1.25*reach*(1-yank)];
        B.LeftArm=[0,0,-0.5*reach*(1-yank)+0.6*yank];
        B.Spine1=[0.15*reach*(1-yank),0.35*reach*(1-yank)-0.25*yank,0];
        B.LeftUpLeg=[0,0,0.45*reach*(1-yank)]; B.LeftLeg=[0,0,-0.5*reach*(1-yank)];
        B.RightUpLeg=[0,0,-0.4*reach*(1-yank)+0.3*yank];
      }else if(g.slot===2){      // WALL OF MENDING — crouch low, heave the slabs overhead
        tPy=0.30*pulse; tRx=0.30*pulse; tPz=-0.10*pulse; tRz=0;
        const lift=Math.min(p/0.55,1),crouch=Math.max(0,1-p/0.4);
        B.RightArm=[-0.3*lift,0,-2.2*lift]; B.LeftArm=[-0.3*lift,0,2.2*lift];
        B.RightForeArm=[0,0,1.0*lift-0.4*crouch]; B.LeftForeArm=[0,0,-1.0*lift+0.4*crouch];
        B.Spine1=[0.4*crouch-0.2*lift,0,0]; B.Head=[-0.35*lift,0,0];
        B.RightUpLeg=[0,0,0.95*crouch]; B.LeftUpLeg=[0,0,0.95*crouch];
        B.RightLeg=[0,0,-1.25*crouch]; B.LeftLeg=[0,0,-1.25*crouch];
      }else if(g.slot===3){      // FUSE TO EARTH — hands overhead, hammer them into the ground
        const slam=p<0.3?p/0.3:1,rel=Math.max(0,(p-0.7)/0.3);
        tPy=0.08*Math.max(0,1-p/0.18)-0.34*slam*(1-rel);
        tRx=-0.42*slam*(1-rel); tPz=0.18*slam*(1-rel); tRz=0;
        const up=Math.min(p/0.3,1),drop=Math.max(0,Math.min((p-0.3)/0.2,1)),k=1-rel;
        const armZ=(-2.4*up+2.0*drop)*k,elb=(0.5*up+0.9*drop)*k;
        B.RightArm=[-0.2*up*k,0,armZ]; B.LeftArm=[-0.2*up*k,0,-armZ];
        B.RightForeArm=[0,0,elb]; B.LeftForeArm=[0,0,-elb];
        B.Spine1=[(-0.25*up+1.1*drop)*k,0,0]; B.Head=[(-0.3*up+0.5*drop)*k,0,0];
        B.RightUpLeg=[0,0,0.6*drop*k]; B.LeftUpLeg=[0,0,0.6*drop*k];
        B.RightLeg=[0,0,-0.8*drop*k]; B.LeftLeg=[0,0,-0.8*drop*k];
      }else if(g.slot===4){      // METEOR LUNGE — fists forward, body flat, legs trailing
        const drive=Math.min(p*1.5,1),out=Math.max(0,(p-0.7)/0.3),out2=Math.max(0,(p-0.8)/0.2);
        tPy=0.26*pulse; tPz=0.70*drive*(1-out);
        tRx=-0.50*drive*(1-out2); tRz=0.08*Math.sin(p*TAU);
        const d2=drive*(1-out2);
        B.RightArm=[0,0,-1.15*d2]; B.LeftArm=[0,0,1.15*d2];
        B.RightForeArm=[0,0,1.35*d2]; B.LeftForeArm=[0,0,-1.35*d2];
        B.Head=[-0.5*d2,0,0]; B.Spine1=[-0.15*d2,0,0];
        B.RightUpLeg=[0,0,-0.7*d2]; B.LeftUpLeg=[0,0,-0.55*d2];
        B.RightLeg=[0,0,-0.45*d2]; B.LeftLeg=[0,0,-0.35*d2];
      }
      P.phantomPose=B;
    }else if(P.si===4&&P.barrageT>0){ // MENDER'S WRATH — frenzied alternating flurry
      const w=Math.sin(frame*1.7),pr=Math.max(0,w),pl=Math.max(0,-w);
      tRx=-0.12; tPz=0.30; tRz=w*0.05;
      P.phantomPose={
        RightArm:[0,0,-0.35-1.05*pr],LeftArm:[0,0,0.35+1.05*pl],
        RightForeArm:[0,0,1.35*pr-0.2],LeftForeArm:[0,0,-1.35*pl+0.2],
        Spine1:[0.15,w*0.3,0],Head:[-0.15,0,0],
        RightUpLeg:[0,0,0.3],LeftUpLeg:[0,0,0.3],
        RightLeg:[0,0,-0.5],LeftLeg:[0,0,-0.5]};
    }else if(P.si===1&&rollerActive){ // pounding the fallen steamroller flat
      const rt=rollers[0]?rollers[0].t:frame;
      const pound=Math.abs(Math.sin(rt*0.5));
      tRx=0.10;
      P.phantomPose={
        RightArm:[0,0,-2.0+1.5*pound],LeftArm:[0,0,2.0-1.5*pound],
        RightForeArm:[0,0,0.9],LeftForeArm:[0,0,-0.9],
        Spine1:[0.15+0.3*pound,0,0],Head:[-0.25,0,0],
        RightUpLeg:[0,0,0.3],LeftUpLeg:[0,0,0.3],
        RightLeg:[0,0,-0.5],LeftLeg:[0,0,-0.5]};
    }else if(P.si===1&&P.gesture&&P.gesture.t>0){
      const g=P.gesture,p=clamp(1-g.t/g.dur,0,1);
      const B={};
      if(g.slot===0){            // KNUCKLE DOWN — leap and hammer both fists into the earth
        const up=Math.min(p/0.35,1),drop=Math.max(0,Math.min((p-0.35)/0.2,1)),rel=Math.max(0,(p-0.75)/0.25),k=1-rel;
        tPy=(0.30*up-0.55*drop)*k; tRx=(-0.15*up+0.45*drop)*k; tPz=0.15*drop*k;
        const armZ=(-2.2*up+1.9*drop)*k,elb=(0.4*up+0.8*drop)*k;
        B.RightArm=[0,0,armZ]; B.LeftArm=[0,0,-armZ];
        B.RightForeArm=[0,0,elb]; B.LeftForeArm=[0,0,-elb];
        B.Spine1=[(-0.2*up+0.9*drop)*k,0,0]; B.Head=[(-0.25*up+0.4*drop)*k,0,0];
        B.RightUpLeg=[0,0,0.55*drop*k]; B.LeftUpLeg=[0,0,0.55*drop*k];
        B.RightLeg=[0,0,-0.75*drop*k]; B.LeftLeg=[0,0,-0.75*drop*k];
      }else if(g.slot===1){      // STEAMROLLER DROP — both arms thrust skyward to call it down
        const lift=Math.min(p/0.35,1);
        tRx=-0.20*lift; tPy=0.30*lift;
        B.RightArm=[0,0,-2.35*lift]; B.LeftArm=[0,0,2.35*lift];
        B.RightForeArm=[0,0,1.15*lift]; B.LeftForeArm=[0,0,-1.15*lift];
        B.Head=[-0.5*lift,0,0]; B.Spine1=[-0.15*lift,0,0];
        B.RightUpLeg=[0,0,0.2*lift]; B.LeftUpLeg=[0,0,0.2*lift];
        B.RightLeg=[0,0,-0.3*lift]; B.LeftLeg=[0,0,-0.3*lift];
      }else if(g.slot===2){      // KNIFE FAN — wind across the chest, fling the fan wide
        const wind=Math.min(p/0.3,1),sweep=Math.max(0,Math.min((p-0.3)/0.35,1)),rec=Math.max(0,(p-0.8)/0.2),k=1-rec;
        tRz=(-0.10*wind+0.14*sweep)*k; tRx=-0.08*sweep*k;
        B.RightArm=[(0.9*wind-2.1*sweep)*k,0,(-0.7*wind+0.3*sweep)*k];
        B.RightForeArm=[0,0,(0.3*wind+1.0*sweep)*k];
        B.LeftArm=[0,0,0.4*sweep*k];
        B.Spine1=[0.1*k,(0.5*wind-0.95*sweep)*k,0];
        B.RightUpLeg=[0,0,-0.25*sweep*k]; B.LeftUpLeg=[0,0,0.35*sweep*k];
        B.LeftLeg=[0,0,-0.4*sweep*k];
      }else if(g.slot===3){      // LIFE SIPHON — seize the prey, draw its vitality in
        const reach=Math.min(p/0.35,1),drink=Math.max(0,(p-0.45)/0.55);
        tPz=0.35*reach*(1-drink); tRx=-0.15*reach*(1-drink)+0.10*drink;
        B.RightArm=[0,0,-1.5*reach*(1-drink)-0.3*drink];
        B.RightForeArm=[0,0,1.3*reach*(1-drink)-0.5*drink];
        B.LeftArm=[0,0,0.35*reach*(1-drink)];
        B.Head=[0.2*reach*(1-drink)-0.55*drink,0,0];
        B.Spine1=[0.25*reach*(1-drink)-0.2*drink,0,0];
        B.RightUpLeg=[0,0,0.35*reach*(1-drink)]; B.RightLeg=[0,0,-0.4*reach*(1-drink)];
      }else{                     // HEAVEN DROP — plunge from the sky, double axe-handle landing
        const dive=Math.min(p/0.4,1),land=Math.max(0,Math.min((p-0.4)/0.25,1)),rel=Math.max(0,(p-0.8)/0.2),k=1-rel;
        tRx=(-0.35*dive+0.55*land)*k; tPy=-0.25*land*k;
        const armZ=(-2.3*dive+2.0*land)*k,elb=(0.5*dive+0.7*land)*k;
        B.RightArm=[0,0,armZ]; B.LeftArm=[0,0,-armZ];
        B.RightForeArm=[0,0,elb]; B.LeftForeArm=[0,0,-elb];
        B.Spine1=[(-0.2*dive+0.9*land)*k,0,0]; B.Head=[(-0.3*dive+0.4*land)*k,0,0];
        B.RightUpLeg=[0,0,(-0.4*dive+0.9*land)*k]; B.LeftUpLeg=[0,0,(-0.4*dive+0.9*land)*k];
        B.RightLeg=[0,0,(-0.3*dive-0.6*land)*k]; B.LeftLeg=[0,0,(-0.3*dive-0.6*land)*k];
      }
      P.phantomPose=B;
    }else if(P.si===1&&P.atkAnim>0){ // heavy basic — alternating piston straights
      const ext=Math.sin((P.atkAnim/10)*Math.PI*0.5); // snaps out, eases back
      const R=P.fistSide?1:0,L=1-R;
      tPz=0.25*ext; tRx=-0.08*ext;
      P.phantomPose={
        RightArm:[0,0,-1.15*ext*R+0.25*ext*L],LeftArm:[0,0,1.15*ext*L-0.25*ext*R],
        RightForeArm:[0,0,1.35*ext*R],LeftForeArm:[0,0,-1.35*ext*L],
        Spine1:[0.12*ext,(R?-1:1)*0.4*ext,0],
        RightUpLeg:[0,0,(R?-1:1)*0.3*ext],LeftUpLeg:[0,0,(L?-1:1)*0.3*ext]};
    }else if(P.si===1&&timeStopT>0){ // VOID TICK — coil, throw the arms wide, hold
      const e=190-timeStopT,f=Math.min(1,timeStopT/20); // f eases everything out at the end
      const wind=Math.min(e/12,1);                      // arms draw across the chest
      const t0=e<12?0:Math.min((e-12)/16,1);
      const th=t0*t0*(3-2*t0);                          // the throw, eased
      const ov=1+0.18*Math.sin(th*Math.PI);             // swing past the mark, settle back
      const wa=wind*(1-th)*f,sa=th*f;                   // wind-up / spread weights
      const breathe=Math.sin(frame*0.045)*0.05*sa;
      tPy=-0.10*wa+0.42*sa+breathe; tRx=0.10*wa-0.12*sa; tRz=0;
      const W={ // coiled: arms crossed, chin down, knees gathering
        RightArm:[0.55,0,-0.55],LeftArm:[0.55,0,0.25],
        RightForeArm:[0,0,-0.45],LeftForeArm:[0,0,0.45],
        Head:[0.28,0,0],Spine1:[0.18,0,0],
        RightUpLeg:[0,0,0.20],LeftUpLeg:[0,0,-0.20],
        RightLeg:[0,0,-0.15],LeftLeg:[0,0,-0.25]};
      const S={ // thrown wide — block stance's asymmetry cancelled per side
        RightArm:[-1.25*ov,0,-0.10],LeftArm:[-1.25*ov,0,-0.30],
        RightForeArm:[0,0,1.25*ov],LeftForeArm:[0,0,-1.25*ov],
        Head:[-0.62,0,0],Spine1:[-0.20,0,0],
        RightUpLeg:[0,0,0.10],LeftUpLeg:[0,0,-0.30],
        RightLeg:[0,0,0.25],LeftLeg:[0,0,-0.10]};
      const B={};
      for(const k in W)B[k]=W[k].map((v,i)=>v*wa+S[k][i]*sa);
      P.phantomPose=B;
    }else if(P.si===2&&P.gesture&&P.gesture.t>0){
      const g=P.gesture,p=clamp(1-g.t/g.dur,0,1);
      const B={};
      if(g.slot===0){            // EMERALD TEMPEST — draw to the chest, unleash the splash
        const chg=Math.min(p/0.3,1),fire=Math.max(0,Math.min((p-0.3)/0.15,1)),k=1-Math.max(0,(p-0.75)/0.25);
        tPz=(-0.1*chg+0.45*fire)*k; tRx=(0.06*chg-0.14*fire)*k;
        const armZ=(0.35*chg-1.4*fire)*k,elb=(-0.35*chg+1.55*fire)*k;
        B.RightArm=[0,0,armZ]; B.LeftArm=[0,0,-armZ];
        B.RightForeArm=[0,0,elb]; B.LeftForeArm=[0,0,-elb];
        B.Spine1=[(-0.1*chg+0.28*fire)*k,0,0]; B.Head=[(0.15*chg-0.2*fire)*k,0,0];
        B.RightUpLeg=[0,0,0.2*fire*k]; B.LeftUpLeg=[0,0,0.2*fire*k];
        B.RightLeg=[0,0,-0.3*fire*k]; B.LeftLeg=[0,0,-0.3*fire*k];
      }else if(g.slot===1){      // TENDRIL SNARE — raise the arm high, sweep the trap down
        const raise=Math.min(p/0.35,1),sw=Math.max(0,Math.min((p-0.35)/0.3,1)),k=1-Math.max(0,(p-0.8)/0.2);
        tPy=0.2*raise*(1-sw)*k; tRx=(-0.1*raise+0.3*sw)*k;
        B.RightArm=[-0.8*sw*k,0,(-1.9*raise+1.55*sw)*k];
        B.RightForeArm=[0,0,(0.4*raise+0.6*sw)*k];
        B.LeftArm=[-0.6*sw*k,0,(0.7*raise-0.6*sw)*k];
        B.LeftForeArm=[0,0,(-0.4*raise-0.3*sw)*k];
        B.Spine1=[(-0.15*raise+0.4*sw)*k,0,0]; B.Head=[(-0.35*raise+0.55*sw)*k,0,0];
        B.RightUpLeg=[0,0,0.25*sw*k]; B.LeftUpLeg=[0,0,0.25*sw*k];
        B.RightLeg=[0,0,-0.35*sw*k]; B.LeftLeg=[0,0,-0.35*sw*k];
      }else if(g.slot===2){      // PUPPET STRINGS — point and seize; the off hand works the strings
        const pt=Math.min(p/0.3,1),pull=Math.max(0,Math.min((p-0.4)/0.4,1)),k=1-Math.max(0,(p-0.85)/0.15);
        tPz=0.3*pt*k; tRz=0.08*pull*k;
        B.RightArm=[0,0,-1.35*pt*k];
        B.RightForeArm=[0,0,1.35*pt*k];
        B.LeftArm=[0,0,(0.25*pt-0.75*pull)*k];
        B.LeftForeArm=[0,0,(0.35+0.55*pull)*k];
        B.Spine1=[0.12*pt*k,-0.3*pull*k,0]; B.Head=[0,0,0.18*pull*k];
        B.RightUpLeg=[0,0,0.3*pt*k]; B.RightLeg=[0,0,-0.35*pt*k];
      }else if(g.slot===3){      // AMBUSH NET — skim low around the user, paying the net out
        const s3=Math.sin(p*Math.PI);
        tRx=0.15*s3;
        const tr=Math.sin(frame*0.55)*0.3;
        B.RightArm=[-0.95*s3,0,0.3*s3]; B.LeftArm=[-0.95*s3,0,-0.3*s3];
        B.RightForeArm=[0,0,0.95*s3]; B.LeftForeArm=[0,0,-0.95*s3];
        B.Spine1=[0.25*s3,0,0]; B.Head=[0.22*s3,0,0];
        B.RightUpLeg=[0,0,0.25+tr*s3]; B.LeftUpLeg=[0,0,0.25-tr*s3];
        B.RightLeg=[0,0,-0.45*s3]; B.LeftLeg=[0,0,-0.45*s3];
      }else if(g.slot===4){      // COIL CONSTRICT — arms open, then wrap and squeeze
        const wind=Math.min(p/0.3,1),sq=Math.max(0,Math.min((p-0.3)/0.25,1)),k=1-Math.max(0,(p-0.8)/0.2);
        tPz=0.35*sq*k; tRx=0.12*sq*k;
        B.RightArm=[(-0.9*wind+1.6*sq)*k,0,-0.5*sq*k];
        B.LeftArm=[(-0.9*wind+1.6*sq)*k,0,0.5*sq*k];
        B.RightForeArm=[0,0,(0.5*wind-1.1*sq)*k];
        B.LeftForeArm=[0,0,(-0.5*wind+1.1*sq)*k];
        B.Spine1=[0.4*sq*k,0,0]; B.Head=[0.3*sq*k,0,0];
        B.RightUpLeg=[0,0,0.25*sq*k]; B.LeftUpLeg=[0,0,0.25*sq*k];
        B.RightLeg=[0,0,-0.4*sq*k]; B.LeftLeg=[0,0,-0.4*sq*k];
      }else{                     // SERPENT COIL — coil the whole body tight, fling the swarm wide
        const coil=Math.min(p/0.35,1),rel=Math.max(0,Math.min((p-0.35)/0.2,1)),k=1-Math.max(0,(p-0.8)/0.2);
        tPy=(-0.12*coil+0.35*rel)*k; tRx=(0.12*coil-0.15*rel)*k;
        B.RightArm=[(0.7*coil-2.0*rel)*k,0,-0.35*coil*k];
        B.LeftArm=[(0.7*coil-2.0*rel)*k,0,0.35*coil*k];
        B.RightForeArm=[0,0,(-0.65*coil+1.85*rel)*k];
        B.LeftForeArm=[0,0,(0.65*coil-1.85*rel)*k];
        B.Spine1=[(0.35*coil-0.55*rel)*k,0,0]; B.Head=[(0.25*coil-0.75*rel)*k,0,0];
        B.RightUpLeg=[0,0,(0.3*coil-0.2*rel)*k]; B.LeftUpLeg=[0,0,(0.3*coil-0.2*rel)*k];
        B.RightLeg=[0,0,(-0.45*coil+0.2*rel)*k]; B.LeftLeg=[0,0,(-0.45*coil+0.2*rel)*k];
      }
      P.phantomPose=B;
    }else if(P.si===2&&P.atkAnim>0){ // basics — quick alternating emerald flings
      const ext=Math.sin((P.atkAnim/10)*Math.PI*0.5);
      const R=P.fistSide?1:0,L=1-R;
      tPz=0.18*ext; tRz=(R?-1:1)*0.06*ext;
      P.phantomPose={
        RightArm:[-0.35*ext*R,0,-1.1*ext*R+0.2*ext*L],
        LeftArm:[-0.35*ext*L,0,1.1*ext*L-0.2*ext*R],
        RightForeArm:[0,0,1.25*ext*R],LeftForeArm:[0,0,-1.25*ext*L],
        Spine1:[0.1*ext,(R?-1:1)*0.3*ext,0]};
    }
    cm.holder.rotation.x=lerp(cm.holder.rotation.x,tRx,0.30);
    cm.holder.rotation.z=lerp(cm.holder.rotation.z,tRz,0.30);
    cm.holder.position.z=lerp(cm.holder.position.z,tPz,0.35);
    cm.holder.position.y=lerp(cm.holder.position.y,tPy,0.35);
  } else if(active||rollerActive){
    if(u.blade){ // fencing: shoulder level, elbow snaps straight on each thrust
      const fq=P.purgeT>0?2.0:1.3;
      u.armR.rotation.x=-Math.PI/2+Math.sin(frame*fq)*0.18;
      eR.rotation.x=-0.5+Math.max(0,Math.sin(frame*fq))*0.5;
      u.armR.rotation.z=Math.sin(frame*fq)*0.12;
      u.armL.rotation.x=0.5;eL.rotation.x=-0.8;
    } else if(P.si===1){ // heavy: full windup, elbow whips through on the slam
      const ph=rollerActive?Math.abs(Math.sin(frame*0.8)):1-P.atkCd/effRate(s);
      u.armR.rotation.x=lerp(0.9,-2.1,Math.min(ph*2,1));
      eR.rotation.x=lerp(-1.4,-0.05,Math.min(ph*1.5,1));
      u.armL.rotation.x=lerp(-0.3,0.4,ph);eL.rotation.x=-0.9;
    } else { // barrage: alternating shoulders, elbows extending into each punch
      const w1=Math.sin(frame*1.5),w2=Math.sin(frame*1.5+Math.PI);
      u.armR.rotation.x=-1.2+w1*0.5;
      eR.rotation.x=-1.4+Math.abs(w1)*1.35;
      u.armL.rotation.x=-1.2+w2*0.5;
      eL.rotation.x=-1.4+Math.abs(w2)*1.35;
    }
  } else {
    u.armR.rotation.x=lerp(u.armR.rotation.x,Math.sin(frame*0.08)*0.15,0.15);
    u.armL.rotation.x=lerp(u.armL.rotation.x,-Math.sin(frame*0.08)*0.15,0.15);
    eR.rotation.x=lerp(eR.rotation.x,-0.35,0.12);
    eL.rotation.x=lerp(eL.rotation.x,-0.35,0.12);
    u.armR.rotation.z=lerp(u.armR.rotation.z,0,0.2);
  }
  u.marker.rotation.y=(u.marker.rotation.y||0)+0.02;
  for(const tn of u.tendrils){
    tn.rotation.z=tn.userData.base.z+Math.sin(frame*0.12+tn.userData.base.ph)*0.25;
    tn.rotation.x=tn.userData.base.x+Math.cos(frame*0.1+tn.userData.base.ph)*0.25;
  }
  standLight.position.set(m.position.x,3.5,m.position.z);
  standLight.intensity=active?60:38;

  // orbit camera
  const horiz=camDist*Math.cos(camPitch),vert=camDist*Math.sin(camPitch);
  const ctx2=P.x+Math.sin(camYaw)*horiz,cty=vert,ctz=P.z+Math.cos(camYaw)*horiz;
  camera.position.x=lerp(camera.position.x,ctx2,0.12)+rnd(-shake,shake);
  camera.position.y=lerp(camera.position.y,cty,0.12)+rnd(-shake,shake)*0.5;
  camera.position.z=lerp(camera.position.z,ctz,0.12)+rnd(-shake,shake);
  camera.lookAt(P.x,1.2,P.z);

  const STG=STAGES[stageIdx];
  scene.fog.color.setHex(frozen?STG.stopFog:(P.eraseT>0?STG.eraseFog:STG.fog));
  scene.background.setHex(frozen?STG.stopBg:(P.eraseT>0?STG.eraseBg:STG.bg));

  updateTexts();

  if(training)P.sp=100;
  document.getElementById('hpbar').style.width=clamp(P.hp/P.maxhp*100,0,100)+'%';
  document.getElementById('spbar').style.width=P.sp+'%';
  document.getElementById('wave').textContent=training?'DOJO':wave;
  document.getElementById('score').textContent=score;
  document.getElementById('combo').textContent=combo>4?combo+' HIT COMBO!':'';
  for(let i=0;i<5;i++)document.getElementById('cdA'+i).className='cd'+(P.cds[i]<=0?' ready':'');
  document.getElementById('cdDash').className='cd'+(P.dashCd<=0?' ready':'');
  document.getElementById('cdSp').className='cd'+(P.sp>=100?' ready':'');
}

function gameOver(){
  state='over';
  document.getElementById('exitTrain').style.display='none';
  const ov=document.getElementById('overlay');
  ov.style.display='flex';
  ov.querySelector('h1').textContent='RETIRED...';
  ov.querySelector('h2').textContent='WAVE '+wave+' • SCORE '+score+' • BEST COMBO '+bestCombo;
  document.getElementById('startBtn').textContent='ONE MORE TRIAL';
}

function loop(){
  const dt=clock.getDelta();
  // when another mode owns the frame (e.g. Morioh exploration), delegate
  if(modes.current!=='arena'){
    const tick=modes.ticks[modes.current];
    if(tick)tick(Math.min(dt,0.1));
    requestAnimationFrame(loop);
    return;
  }
  if(state==='play'){
    if(hitstop>0)hitstop--; // ASB-style impact freeze
    else update();
    // skeletal animation for custom models
    const cm=P?customModels[P.si]:null;
    if(cm&&cm.mixer&&hitstop<=0){
      // undo last frame's additive limb pose first: a paused clip does not
      // rewrite the bones, so without this the additions would accumulate
      if(cm.poseRestore){
        for(const k in cm.poseRestore)if(cm.bones[k])cm.bones[k].quaternion.copy(cm.poseRestore[k]);
        cm.poseRestore=null;
      }
      cm.mixer.update(dt);
      // NULL HOUR / JADE ORACLE's only clip is a block stance — hold it as the
      // idle and do all attack motion procedurally; the Mender holds idle
      // during gestures
      const noAtkClip=P.si===1||P.si===2||(P.gesture&&P.gesture.t>0&&P.si===4);
      const activeNow=(P.atkAnim>0||mouse.down||keys['j']||btn.atk||P.barrageT>0)&&!noAtkClip;
      const want=activeNow?'atk':'idle';
      if(cm.cur!==want&&cm.clips.length){
        const clip=cm.clips[cm.map[want]]||cm.clips[0];
        const action=cm.mixer.clipAction(clip);
        action.paused=false;
        action.reset().play();
        if(cm.curAction&&cm.curAction!==action)cm.curAction.crossFadeTo(action,0.15,false);
        cm.curAction=action;cm.cur=want;
        // single-clip rig (only a punch): hold a still ready stance while idle
        if(want==='idle'&&cm.map.idle===cm.map.atk){action.time=0;action.paused=true;}
      }
      // layer the technique's limb pose on top of the clip, chasing the target
      // pose so transitions between branches (punch <-> stop <-> none) never snap
      if((P.phantomPose||cm.poseCur)&&cm.bones){
        const tgt=P.phantomPose||{};
        const cur=cm.poseCur=cm.poseCur||{};
        for(const k in tgt)if(!cur[k])cur[k]=[0,0,0];
        const bak={};
        for(const k in cur){
          const t=tgt[k]||[0,0,0],c=cur[k];
          c[0]=lerp(c[0],t[0],0.4);c[1]=lerp(c[1],t[1],0.4);c[2]=lerp(c[2],t[2],0.4);
          if(!tgt[k]&&Math.abs(c[0])+Math.abs(c[1])+Math.abs(c[2])<0.003){delete cur[k];continue;}
          const b=cm.bones[k];if(!b)continue;
          bak[k]=b.quaternion.clone();
          if(c[0])b.rotateX(c[0]);
          if(c[1])b.rotateY(c[1]);
          if(c[2])b.rotateZ(c[2]);
        }
        cm.poseRestore=bak;
      }
    }
  }
  // drifting motes
  const mp=motes.geometry.attributes.position;
  for(let i=0;i<mp.count;i++){
    let y=mp.getY(i)+0.012;
    if(y>14)y=0.4;
    mp.setY(i,y);
  }
  mp.needsUpdate=true;
  // post uniforms
  const playing=state==='play';
  gradeEffect.uniforms.get('ca').value=Math.min(0.012,(playing?(shake||0)*0.006:0)+lineAlpha*0.004);
  gradeStopCur=lerp(gradeStopCur,(playing&&timeStopT>0)?1:0,0.12);
  gradeEraseCur=lerp(gradeEraseCur,(playing&&P&&P.eraseT>0)?1:0,0.12);
  gradeEffect.uniforms.get('gradeStop').value=gradeStopCur;
  gradeEffect.uniforms.get('gradeErase').value=gradeEraseCur;
  composer.render();
  drawLines();
  requestAnimationFrame(loop);
}
loop();

function beginRun(isTraining){
  training=isTraining;
  document.getElementById('overlay').style.display='none';
  document.getElementById('hud').style.display='flex';
  document.getElementById('exitTrain').style.display=isTraining?'block':'none';
  reset();
  P.si=-1;setStand(0);
  state='play';
}
document.getElementById('startBtn').addEventListener('click',()=>beginRun(false));
document.getElementById('trainBtn').addEventListener('click',()=>beginRun(true));
function exitTraining(){
  if(!training||state!=='play')return;
  state='menu';training=false;
  clearEraseGhosts();
  document.getElementById('tint').style.background='transparent';
  document.getElementById('exitTrain').style.display='none';
  document.getElementById('hud').style.display='none';
  const ov=document.getElementById('overlay');
  ov.style.display='flex';
  ov.querySelector('h1').textContent='PHANTOM VERDICT';
  ov.querySelector('h2').textContent='3D CHAPTER III — THE FULL ARSENAL';
  document.getElementById('startBtn').textContent='BEGIN THE TRIAL';
}
document.getElementById('exitTrain').addEventListener('click',exitTraining);
addEventListener('keydown',e=>{if(e.key==='Escape')exitTraining();});

// ============ CUSTOM MODEL SYSTEM (real .glb phantoms) ============
const customModels=new Array(STANDS.length).fill(null);

function prepCustomModel(root,tintHex){
  const meshes=[];
  root.traverse(o=>{if(o.isMesh&&!o.userData.isOutline)meshes.push(o);});
  for(const o of meshes){
    const om=o.material;
    const hasMap=!!(om&&om.map);
    const baseCol=(om&&om.color)?om.color.clone():new THREE.Color(0xffffff);
    // untextured, near-white models get tinted in the stand's color
    if(tintHex!=null&&!hasMap&&baseCol.r>0.6&&baseCol.g>0.6&&baseCol.b>0.6)baseCol.setHex(tintHex);
    // PBR: keep the source texture, standard-material shading; GLTFLoader
    // already gives us MeshStandardMaterial for real PBR exports — only
    // rebuild when the source material carries no PBR data of its own
    let tm;
    if(om&&om.isMeshStandardMaterial){
      tm=om;
      if(tintHex!=null&&!hasMap&&baseCol.r>0.6&&baseCol.g>0.6&&baseCol.b>0.6)tm.color.setHex(tintHex);
    }else{
      tm=new THREE.MeshStandardMaterial({color:baseCol,map:hasMap?om.map:null,roughness:0.55,metalness:0.05});
      if(om&&om.transparent){tm.transparent=true;tm.opacity=om.opacity;}
    }
    o.material=tm;
    o.castShadow=true;o.receiveShadow=true;
    o.frustumCulled=false;
  }
}

function removeCustomModel(idx){
  const cm=customModels[idx];
  if(!cm)return;
  standMeshes[idx].remove(cm.holder);
  for(const ch of standMeshes[idx].children)ch.visible=true;
  customModels[idx]=null;
}

function autoMapClips(cm){
  const find=re=>{const i=cm.clips.findIndex(c=>re.test(c.name));return i>=0?i:null;};
  cm.map.idle=find(/idle|breath|stand/i);
  if(cm.map.idle==null)cm.map.idle=0;
  cm.map.atk=find(/punch|attack|jab|strike|slash|swing|hook/i);
  if(cm.map.atk==null)cm.map.atk=cm.clips.length-1;
}

function populateClipUI(idx){
  const cm=customModels[idx];
  const box=document.getElementById('mdlClips');
  if(!cm||!cm.clips.length){box.style.display='none';return;}
  const fill=(sel,cur)=>{
    sel.innerHTML='';
    cm.clips.forEach((c,i)=>{
      const o=document.createElement('option');
      o.value=i;o.textContent=c.name||('clip '+i);
      if(i===cur)o.selected=true;
      sel.appendChild(o);
    });
  };
  fill(document.getElementById('mdlIdle'),cm.map.idle);
  fill(document.getElementById('mdlAtk'),cm.map.atk);
  box.style.display='inline';
}

function loadCustomModel(buf,name,idx){
  const loader=new GLTFLoader();
  loader.parse(buf,'',gltf=>{
    const root=gltf.scene;
    const box=new THREE.Box3().setFromObject(root);
    const size=box.getSize(new THREE.Vector3());
    root.scale.setScalar(3.4/(size.y||1));
    const box2=new THREE.Box3().setFromObject(root);
    const ctr=box2.getCenter(new THREE.Vector3());
    root.position.set(-ctr.x,-box2.min.y,-ctr.z);
    prepCustomModel(root,STANDS[idx].hex);
    removeCustomModel(idx);
    const holder=new THREE.Group();
    holder.add(root);
    const sm=standMeshes[idx];
    sm.add(holder);
    for(const ch of sm.children){
      if(ch===holder||ch===sm.userData.marker)continue;
      ch.visible=false;
    }
    const cm={holder,root,
      mixer:(gltf.animations&&gltf.animations.length)?new THREE.AnimationMixer(root):null,
      clips:gltf.animations||[],cur:null,curAction:null,map:{idle:0,atk:0}};
    // cache skeleton bones by short name so techniques can pose limbs directly
    cm.bones={};
    root.traverse(o=>{if(o.isBone)cm.bones[o.name.replace(/^mixamorig:?/i,'')]=o;});
    customModels[idx]=cm;
    if(cm.clips.length){autoMapClips(cm);populateClipUI(idx);}
    else document.getElementById('mdlClips').style.display='none';
    document.getElementById('mdlStatus').textContent=
      '✓ '+name+' → '+STANDS[idx].name+(cm.mixer?' • '+cm.clips.length+' clips':' • no animations (static)');
  },err=>{
    console.error(err);
    document.getElementById('mdlStatus').textContent='✗ could not parse — export as binary .glb from Blender (include animations)';
  });
}

// UI wiring
(function(){
  const ssel=document.getElementById('stageSel');
  STAGES.forEach((st,i)=>{
    const o=document.createElement('option');
    o.value=i;o.textContent=st.name;
    ssel.appendChild(o);
  });
  ssel.addEventListener('change',()=>applyStage(+ssel.value));
  applyStage(0);
  const sel=document.getElementById('mdlStand');
  STANDS.forEach((s,i)=>{
    const o=document.createElement('option');
    o.value=i;o.textContent='P'+s.part+' '+s.sym+' '+s.name;
    sel.appendChild(o);
  });
  document.getElementById('mdlFile').addEventListener('change',e=>{
    const f=e.target.files&&e.target.files[0];
    if(!f)return;
    if(!/\.glb$/i.test(f.name)){
      document.getElementById('mdlStatus').textContent='✗ use a binary .glb file';
      return;
    }
    const r=new FileReader();
    r.onload=()=>loadCustomModel(r.result,f.name,+sel.value);
    r.readAsArrayBuffer(f);
  });
  document.getElementById('mdlIdle').addEventListener('change',e=>{
    const cm=customModels[+sel.value];
    if(cm){cm.map.idle=+e.target.value;cm.cur=null;}
  });
  document.getElementById('mdlAtk').addEventListener('change',e=>{
    const cm=customModels[+sel.value];
    if(cm){cm.map.atk=+e.target.value;cm.cur=null;}
  });
  document.getElementById('mdlRemove').addEventListener('click',()=>{
    removeCustomModel(+sel.value);
    document.getElementById('mdlClips').style.display='none';
    document.getElementById('mdlStatus').textContent='model removed — primitive body restored';
  });
  sel.addEventListener('change',()=>populateClipUI(+sel.value));
  // drag & drop onto the menu
  addEventListener('dragover',e=>e.preventDefault());
  addEventListener('drop',e=>{
    e.preventDefault();
    if(state==='play')return;
    const f=e.dataTransfer.files&&e.dataTransfer.files[0];
    if(!f||!/\.glb$/i.test(f.name))return;
    const r=new FileReader();
    r.onload=()=>loadCustomModel(r.result,f.name,+sel.value);
    r.readAsArrayBuffer(f);
  });
})();

// ---- built-in rigged phantom bodies, fetched from assets/models/ ----
(function loadBuiltins(){
  const load=async(url,name,idx)=>{
    try{
      const res=await fetch(url);
      if(!res.ok)throw new Error(res.status+' '+url);
      loadCustomModel(await res.arrayBuffer(),name,idx);
    }catch(e){console.error('builtin model load failed',e);}
  };
  load('./assets/models/mender.glb','punch_combo.glb (built-in, rigged)',4);
  load('./assets/models/theworld.glb','theworld.glb (built-in, rigged)',1);
  load('./assets/models/hierophant.glb','hierophant.glb (built-in, rigged)',2);
})();
