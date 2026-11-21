// Room coordinates are in metres. S measures toward the media wall and W toward the garden.
const focal = 1100;
const basisLength = Math.hypot(1100, 1106);
const S = [1100 / basisLength, 0, 1106 / basisLength];
const W = [-S[2], 0, S[0]];
const xOrigin = 836;
const floor = -1.48;
const soffit = 2.40;
const ceiling = 2.64;
const limits = { s0: -2.80, w0: -2.55, s1: 10800 / basisLength, w1: 9.19 };
const mediaDepth = (u, k = 10250) => k / (u + 270);
const glassDepth = (u, k = 14250) => k / (1930.03 - u);
const toward = (p, n, distance) => p.map((v, i) => v + n[i] * distance);
const room = (s, w, y) => [s * S[0] + w * W[0], y, s * S[2] + w * W[2]];
const dot = (v, n) => v[0] * n[0] + v[2] * n[2];
const mix = (a, z, t) => a + (z - a) * t;
const colors = {
  plaster: [.60, .51, .421], trim: [.64, .557, .467], dark: [.067, .050, .040],
  walnut: [.226, .134, .079], faced: [.267, .185, .124], oak: [.42, .284, .170],
  antique: [.53, .388, .218], ceramic: [.295, .218, .115], iron: [.093, .093, .087],
};

export const roomCalibration = { mediaDepth, glassDepth, floor, soffit, ceiling, limits, S, W, room };

export function addArchitecture(b) {
  const face = (points, material, options = {}) => b.face(points, material,options);
  const proj = (u, v, depth) => b.at(u, v, typeof depth === 'function' ? depth(u, v) : depth);
  const projected = (polygon, depth) => polygon.map(([u, v]) => proj(u, v, depth));
  const onMedia = k => u => mediaDepth(u, k);
  const onGlass = k => u => glassDepth(u, k);
  const solid = (front, back, mat, opts = {}, sideOpts = opts) => {
    face(front, mat, opts);
    face([...back].reverse(), mat, sideOpts);
    for (let i = 0; i < front.length; i++) {
      const j = (i + 1) % front.length;
      face([front[j], front[i], back[i], back[j]], mat, sideOpts);
    }
  };
  const slab = (polygon, depth, thickness, mat, opts = {}, normal = S) => {
    const points = projected(polygon, depth);
    solid(points, points.map(p => toward(p, normal, thickness)), mat, opts);
  };
  const block = (s0, s1, w0, w1, y0, y1, mat, opts = {}) => {
    if (s1 <= s0 || w1 <= w0 || y1 <= y0) return;
    const rect = y => [room(s0,w0,y), room(s1,w0,y), room(s1,w1,y), room(s0,w1,y)];
    solid(rect(y1), rect(y0), mat, opts);
  };
  const wallS = (s, w0, w1, y0, y1, mat, opts) => face([
    room(s,w0,y0), room(s,w1,y0), room(s,w1,y1), room(s,w0,y1)
  ], mat, opts);
  const wallW = (w, s0, s1, y0, y1, mat, opts) => face([
    room(s0,w,y0), room(s1,w,y0), room(s1,w,y1), room(s0,w,y1)
  ], mat, opts);
  const horizontal = (s0, s1, w0, w1, y, mat, opts) => face([
    room(s0,w0,y), room(s1,w0,y), room(s1,w1,y), room(s0,w1,y)
  ], mat, opts);
  const rod = (a, z, radius, mat, opts = {}) => b.rod(a, z, radius, mat,{segments:radius<.008?5:8,...opts});
  const oval = (at, radii, mat, opts = {}) => b.ellipsoid(at,radii,mat,opts);
  const plain = color => ({ photo: false, color });
  const {s0, s1, w0, w1} = limits;
  const floorOpts = { color: colors.oak };

  // The top, side returns and inside of the ceiling tray are separate surfaces.
  horizontal(s0, s1, w0, w1, floor, 'oak', floorOpts);
  wallS(s1, w0, w1, floor, soffit, 'wall', { color: colors.plaster });
  wallS(s0, w0, w1, floor, soffit, 'wall', plain(colors.plaster));
  wallW(w0, s0, s1, floor, soffit, 'wall', plain(colors.plaster));
  const tray = { s0: s0 + .94, s1: 5.53, w0: w0 + .94, w1: 7.71 };
  const plaster = { color: [.705,.619,.540] };
  horizontal(s0, tray.s0, w0, w1, soffit, 'ceiling', plaster);
  horizontal(tray.s1, s1, w0, w1, soffit, 'ceiling', plaster);
  horizontal(tray.s0, tray.s1, w0, tray.w0, soffit, 'ceiling', plaster);
  horizontal(tray.s0, tray.s1, tray.w1, w1, soffit, 'ceiling', plaster);
  wallS(tray.s1, tray.w0, tray.w1, soffit, ceiling, 'ceiling', plaster);
  wallS(tray.s0, tray.w0, tray.w1, soffit, ceiling, 'ceiling', plaster);
  wallW(tray.w1, tray.s0, tray.s1, soffit, ceiling, 'ceiling', plaster);
  wallW(tray.w0, tray.s0, tray.s1, soffit, ceiling, 'ceiling', plaster);
  horizontal(tray.s0, tray.s1, tray.w0, tray.w1, ceiling, 'ceiling', plaster);

  // A woven bound edge gives the rug thickness and lets the floor appear below it.
  const rugS = [.80, 5.52], rugW = [.995, 6.22], edge = .072;
  const rugCorners = [
    [rugS[0]+edge,rugW[0]], [rugS[1]-edge,rugW[0]], [rugS[1],rugW[0]+edge],
    [rugS[1],rugW[1]-edge], [rugS[1]-edge,rugW[1]], [rugS[0]+edge,rugW[1]],
    [rugS[0],rugW[1]-edge], [rugS[0],rugW[0]+edge],
  ];
  const rugTop = rugCorners.map(([s,w]) => room(s,w,floor+.022));
  solid(rugTop, rugCorners.map(([s,w]) => room(s,w,floor+.002)), 'rug', {color:[.57,.484,.407]});
  for (let i=0; i<48; i++) {
    const w = mix(rugW[0]+.08, rugW[1]-.08, (i+.45)/48);
    const length = .018 + .022 * (1+Math.sin(i*17.16))*.5;
    face([room(rugS[1]-.008,w-.01,floor+.011), room(rugS[1]+length,w-.006,floor+.006),
      room(rugS[1]+length,w+.006,floor+.006), room(rugS[1]-.008,w+.012,floor+.011)], 'rug');
  }

  // The opening genuinely pierces the wall. Trees sit beyond the timber patio and glazing.
  const windowS0 = .86, windowS1 = 6.20, windowBottom = -.59, windowTop = 1.95;
  const plasterWall = {color:colors.plaster};
  wallW(w1, s0, windowS0, floor, soffit, 'wall', plasterWall);
  wallW(w1, windowS1, s1, floor, soffit, 'wall', plasterWall);
  wallW(w1, windowS0, windowS1, floor, windowBottom, 'wall', plasterWall);
  wallW(w1, windowS0, windowS1, windowTop, soffit, 'wall', plasterWall);
  const sash = { color:[.075,.067,.056] };
  block(windowS0-.045,windowS1+.045,w1-.10,w1+.12,windowTop-.052,windowTop+.05,'darkWood',sash);
  block(windowS0-.055,windowS1+.055,w1-.15,w1+.12,windowBottom-.085,windowBottom+.002,'wood',{color:colors.trim});
  block(windowS0,windowS0+.07,w1-.08,w1+.14,windowBottom,windowTop,'darkWood',sash);
  block(windowS1-.08,windowS1,w1-.08,w1+.14,windowBottom,windowTop,'darkWood',sash);
  const winS = u => dot(proj(u,400,onGlass(14250)),S);
  for (const [u, width] of [[108,.175],[217,.029],[325,.031],[409,.167],[488,.031]]) {
    const s=winS(u);
    block(s-width/2,s+width/2,w1-.045,w1+.035,windowBottom,windowTop,'metal',sash);
  }
  for (const [h,th] of [[1.203,.033],[.557,.028],[-.088,.025]]) {
    block(windowS0,windowS1,w1-.036,w1+.005,h-th/2,h+th/2,'metal',sash);
  }
  const shadeW = w1-.14;
  wallW(shadeW,windowS0,windowS1,windowBottom-.025,windowTop,'shade',
    {photo:false,device:'shades',shadeTop:windowTop,color:[.77,.715,.638]});
  // The bottom rail advances with the shade; the aluminium cassette is stationary.
  block(windowS0,windowS1,shadeW-.005,shadeW+.009,windowBottom-.043,windowBottom-.025,
    'metal',{photo:false,device:'shades',shadeTop:windowTop,color:[.43,.39,.33]});
  block(windowS0-.02,windowS1+.02,w1-.14,w1-.06,windowTop,windowTop+.055,'wood',{color:colors.trim});

  const curtainW = w1-.24;
  rod(room(.33,curtainW,2.326), room(6.74,curtainW,2.326), .021,'metal',{color:colors.iron});
  for (const s of [.41,3.03,6.62]) {
    rod(room(s,curtainW,2.326),room(s,w1,2.326),.018,'metal',sash);
    oval(room(s,curtainW,2.326),[.036,.036,.036],'metal',sash);
  }
  const drape = (a,z,w,folds) => {
    const slices=folds*5, heights=[2.30,2.21,1.80,.96,.05,-.86,-1.445];
    const rows=heights.map((y,row)=>Array.from({length:slices+1},(_,i)=>{
      const f=i/slices, phase = f*folds*Math.PI*2;
      const fullness=.045+.021*row/6;
      const wave=Math.sin(phase+.11*row)+.27*Math.cos(phase*2-.4);
      const selvedge=.043*Math.sin(f*Math.PI)*row/6;
      return room(mix(a,z,f)+selvedge,w+fullness*wave,y-(row===6?.0145*Math.cos(phase):0));
    }));
    for(let h=0;h<rows.length-1;h++) for(let i=0;i<slices;i++) {
      face([rows[h][i],rows[h][i+1],rows[h+1][i+1],rows[h+1][i]],'curtain',{color:[.188,.151,.118]});
    }
  };
  drape(.37,1.47,curtainW-.042,8);
  drape(5.28,6.65,curtainW-.042,10);

  // Garden backdrop and near patio elements deliberately occupy different depths.
  wallW(15.65,-5.5,12.8,-2.45,6.3,'window',{color:[.101,.205,.160]});
  horizontal(-5.5,12.8,w1+.10,15.7,floor-.07,'stone',{color:[.38,.355,.298]});
  // Tree crowns and trunks sit in front of the distant photograph. The patio, trees
  // and far garden move at different rates as a visitor passes the glass.
  for(const [s,w,h,lean,tone] of [[2.25,14.72,3.65,.26,.91],[4.39,14.91,3.83,-.15,.98],
    [6.92,14.55,3.64,.38,.88],[8.64,15.03,3.25,.21,1.08],[10.1,14.77,4.0,-.27,.90]]){
    const base=room(s,w,floor-.07), crotch=room(s+lean,w+.05,floor+h*.59),top=room(s+lean*1.3,w+.07,floor+h);
    rod(base,crotch,.071,'darkWood',{color:[.183,.144,.082],segments:7});
    rod(crotch,top,.040,'darkWood',{color:[.188,.153,.097],segments:6});
    for(let j=0;j<5;j++){
      const ang=j*2.399+s*.65, y=top[1]+.38*Math.sin(j*.92);
      const end=room(s+lean+.495*Math.cos(ang),w+.455*Math.sin(ang),y);
      rod(crotch,end,.019,'darkWood',{color:[.174,.153,.093],segments:5});
      oval(end,[.62,.53+.09*(j%2),.57],'leaf',{color:[.102*tone,.195*tone,.119*tone],segments:8,rings:5});
    }
  }
  for(const [uv,depth,thick,mat,color] of [
    [[[-30,185],[195,233],[183,269],[-30,223]],15850,.17,'wood',[.28,.160,.081]],
    [[[47,322],[136,226],[159,231],[73,352]],16030,.18,'wood',[.38,.223,.121]],
    [[[109,326],[200,249],[215,255],[140,342]],16400,.18,'wood',[.34,.19,.089]],
    [[[132,329],[159,327],[157,379],[130,379]],16120,.19,'wood',[.32,.190,.105]],
    [[[126,373],[167,371],[177,540],[123,542]],16120,.21,'stone',[.48,.47,.432]],
    [[[260,502],[351,501],[349,513],[261,513]],17000,.22,'stone',[.57,.55,.49]],
    [[[273,513],[336,512],[339,559],[267,560]],17100,.23,'stone',[.43,.41,.35]],
  ]) slab(uv,onGlass(depth),thick,mat,{color},W);

  // Baseboards follow the three visible returns and the open side of the window.
  block(s0,s0+.034,w0,w1,floor,floor+.106,'wood',plain(colors.trim));
  block(s0,s1,w0,w0+.034,floor,floor+.106,'wood',plain(colors.trim));
  block(s0,s1,w1-.032,w1,floor,floor+.103,'wood',{color:colors.trim});
  block(s1-.034,s1,w0,w1,floor,floor+.103,'wood',{color:colors.trim});

  addMediaWall();
  addBuiltIns();
  addReturnWall();

  function addMediaWall() {
    const stone = {color:[.39,.343,.303]};
    const stoneD=onMedia(10250), tvD=onMedia(10000), screenD=onMedia(9988);
    const opening=[[984,515],[1284,516],[1285,655],[983,630]];
    const topL=[900,203], topR=[1395,79], midR=[1416,516], footR=[1427,665], footL=[902,624];
    const panels=[
      [topL,topR,midR,opening[1],opening[0],[901,515]],
      [[901,515],opening[0],opening[3],footL],
      [opening[1],midR,footR,opening[2]],
    ];
    for(const polygon of panels) slab(polygon,stoneD,.31,'stone',stone);
    // The raised faces of the stacked stone catch side light and cast narrow joints.
    // Course heights and the stagger vary, avoiding a wallpaper-like repeating grid.
    const ridgeS=10250/basisLength;
    const lowW=dot(proj(1395,100,stoneD),W), highW=dot(proj(900,200,stoneD),W);
    const fireLo=dot(proj(1287,519,stoneD),W)-.015;
    const fireHi=dot(proj(981,518,stoneD),W)+.015;
    const fireBottom=-.88, fireTop=-.048;
    let seed=3401;
    const noise=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
    let row=0;
    for(let y=-.93;y<2.37;) {
      const h=.117+noise()*.065, top=Math.min(2.375,y+h);
      for (let w=lowW; w<highW-.015;) {
        const width=(.24+noise()*.38)*(w===lowW&&row%2===1?.62:1), end=Math.min(highW,w+width);
        const insideFire=y<fireTop&&top>fireBottom&&end>fireLo&&w<fireHi;
        if(!insideFire&&end-w>.040){
          const relief=.0035+noise()*.012;
          const rL=w+.006, rR=end-.007, yB=y+.005, yT=top-.005;
          const corners=[[rL,yB+.005],[rL+.015,yB],[rR-.014,yB],[rR,yB+.009],
            [rR,yT-.01],[rR-.013,yT],[rL+.014,yT],[rL,yT-.009]];
          const facePoints=corners.map(([cw,cy])=>room(ridgeS-relief,cw,cy));
          const backPoints=corners.map(([cw,cy])=>room(ridgeS+.001,cw,cy));
          solid(facePoints,backPoints,'stone',stone);
        }
        w=end;
      }
      y=top+.002; row++;
    }
    const bezel=[[927,244],[1331,156],[1339,448],[934,467]];
    slab(bezel,tvD,.083,'black',{color:[.022,.022,.024]});
    const display=[[932,248],[1327,162],[1334,441],[938,460]];
    face(projected(display,screenD),'screen',{device:'tv',color:[.065,.078,.11]});
    const fireBack=onMedia(10336);
    const hole=projected(opening,stoneD);
    const glass=[[1002,531],[1269,532],[1272,636],[1003,617]];
    const window=projected(glass,fireBack);
    for(let i=0;i<4;i++) {
      const j=(i+1)%4;
      face([hole[i],hole[j],window[j],window[i]],'black',{color:[.039,.032,.028]});
    }
    face(window,'firebox',{device:'fire',color:[.075,.04,.018]});

    const topFront=projected([[873,634],[1386,684]],onMedia(9940));
    const topBack=projected([[903,623],[1427,665]],stoneD);
    const lowerFront=projected([[874,646],[1386,695]],onMedia(9940));
    const lowerBack=projected([[904,635],[1427,677]],stoneD);
    face([topFront[0],topFront[1],topBack[1],topBack[0]],'stone',{color:[.56,.494,.407]});
    face([topFront[0],lowerFront[0],lowerFront[1],topFront[1]],'stone',stone);
    face([topFront[1],lowerFront[1],lowerBack[1],topBack[1]],'stone',stone);
    const baseFront=projected([[876,646],[1382,695],[1384,779],[880,701]],onMedia(9960));
    const baseBack=projected([[903,635],[1424,676],[1410,768],[904,694]],stoneD);
    solid(baseFront,baseBack,'stone',stone);
    slab([[911,623],[945,625],[945,629],[908,627]],onMedia(10050),.08,'wood',{color:colors.faced});
    vaseAt(940,626,.109,.175,10150,[.59,.35,.14]);
    plantSprig(937,607,1,10180,13,10);
  }

  function shelf(u0,u1,top0,top1,bottom0,bottom1, k=10260, depth=.42, mat='darkWood',opts={}) {
    slab([[u0,top0],[u1,top1],[u1,bottom1],[u0,bottom0]],onMedia(k),depth,mat,{color:colors.faced,...opts});
  }

  function led(u0,v0,u1,v1,k) {
    const polygon=[[u0,v0],[u1,v1],[u1,v1+2.1],[u0,v0+2.1]];
    face(projected(polygon,onMedia(k)),'wax',{device:'shelves',color:[.99,.78,.48]});
  }

  function vaseAt(u,v,radius,height,k,color,mat='ceramic') {
    const at=proj(u,v,onMedia(k));
    const sides=14;
    const profile=[[.67,0],[.88,.10],[1,.53],[.89,.79],[.58,.94],[.62,1]];
    const rings=profile.map(([r,h])=>Array.from({length:sides},(_,i)=>{
      const a=i*Math.PI*2/sides;
      return [at[0]+Math.cos(a)*radius*r,at[1]+height*h,at[2]+Math.sin(a)*radius*r];
    }));
    for(let row=0;row<rings.length-1;row++) for(let i=0;i<sides;i++) {
      const j=(i+1)%sides;
      face([rings[row][i],rings[row][j],rings[row+1][j],rings[row+1][i]],mat,{color});
    }
    face(rings[rings.length-1],mat,{color});
    return [at[0],at[1]+height,at[2]];
  }

  function plantSprig(u,v,scale,k,horizontalSpread=32,verticalSpread=27) {
    // A mix of front, crossing and trailing stems sits around the vessel in three dimensions.
    const d=mediaDepth(u,k), start=proj(u,v,d), stems=scale<.5?7:13;
    let seed=Math.round(u*97+v*211+409);
    const rnd=()=>{ seed=(seed*48271)%2147483647;return seed/2147483647; };
    for(let i=0;i<stems;i++) {
      const a=i*2.39996-.3, radial=.40+.64*rnd(), trailing=i%4===1;
      const dx=Math.cos(a)*horizontalSpread*radial;
      const dy=trailing?verticalSpread*(.55+.74*rnd()):-verticalSpread*(.50+.72*rnd());
      const dep=(rnd()-.5)*.25*scale;
      let last=start;
      const steps=trailing?7:4;
      for(let j=1;j<=steps;j++) {
        const t=j/steps;
        const px=u+dx*(trailing?Math.sin(t*2.3):t), py=v+dy*t-(trailing?13:3)*Math.sin(Math.PI*t);
        const p=proj(px,py,d+dep*t);
        rod(last,p,.0032*Math.max(.65,scale),'leaf',{color:[.235,.266,.105]});
        const lr=j%2===0?-1:1, leafSpan=(3+4*rnd())*Math.max(.60,scale)*(trailing?1:1.27);
        const vx=lr*leafSpan, vy=trailing?leafSpan*.94:-leafSpan*.61;
        const tip=proj(px+vx,py+vy,d+dep*t-.017*scale);
        const a1=proj(px+vx*.55-vy*.31,py+vy*.55+vx*.31,d+dep*t-.02*scale);
        const a2=proj(px+vx*.50+vy*.30,py+vy*.50-vx*.30,d+dep*t-.02*scale);
        const mid=proj(px+vx*.46,py+vy*.46,d+dep*t-.030*scale);
        const opt={color:[.125+rnd()*.10,.22+rnd()*.13,.066+rnd()*.044]};
        face([p,a1,tip,mid],'leaf',opt); face([p,mid,tip,a2],'leaf',opt);
        last=p;
      }
    }
  }

  function book(u,v,w,h,k,color,lean=0) {
    slab([[u+lean,v-h],[u+w+lean,v-h-.45],[u+w,v],[u,v]],onMedia(k),.139,'book',{color});
  }
  function frame(u,v,w,h,k,lean=2) {
    const yR=v-.06*w, f=Math.max(w*.08,1.3);
    const outer=[[u+lean,v-h],[u+w+lean,yR-h],[u+w,yR],[u,v]];
    slab(outer,onMedia(k),.037,'wood',{color:colors.antique});
    const inner=[[u+lean+f,v-h+f],[u+w+lean-f,yR-h+f],[u+w-f,yR-f],[u+f,v-f]];
    face(projected(inner,onMedia(k-4.5)),'paper',{color:[.64,.585,.47]});
  }
  function stillLife(u,v,w,h,k,color) {
    slab([[u,v-h],[u+w,v-h+.065*w],[u+w,v+.07*w],[u,v]],onMedia(k),.16,'book',{color});
  }

  function addBuiltIns() {
    // Each shelf has an actual front lip, a top, a rear and a narrow underside LED.
    const timber={color:colors.walnut};
    slab([[769,247],[783,244],[789,619],[771,617]],onMedia(10368),.39,'darkWood',timber);
    slab([[1420,94],[1451,87],[1457,670],[1427,668]],onMedia(10366),.40,'darkWood',timber);
    shelf(770,907,247,215,280,249,10350,.40);
    shelf(783,906,356,337,368,349);
    shelf(783,906,440,433,452,445);
    shelf(783,906,517,518,530,530);
    shelf(778,907,609,619,621,631,10186,.55,'stone',{color:[.53,.47,.406]});
    // Cabinet below the left stone work surface, and its recessed plinth.
    shelf(784,903,622,632,658,680,10290,.41,'wood');
    shelf(784,903,658,680,667,690,10410,.32,'darkWood');
    led(813,287.8,901,267.4,10618); led(815,365.8,900,353,10605);
    led(815,451.2,900,447.3,10605);
    // Right return continues just past the photographed crop into the same family of joinery.
    shelf(1421,2280,92,-93,136,-48,10360,.41);
    shelf(1451,2235,256,143,276,162,10276,.47);
    shelf(1452,2235,400,338,419,356,10276,.47);
    shelf(1454,2235,537,550,555,571,10276,.47);
    shelf(1409,2252,668,749,682,766,10164,.55,'stone',{color:[.50,.443,.372]});
    shelf(1409,2252,680,766,757,888,10252,.50,'wood',{color:[.228,.166,.126]});
    shelf(1410,2250,757,888,772,914,10415,.40,'darkWood');
    const endW=dot(proj(2240,400,onMedia(10400)), W);
    block(10360/basisLength,s1,endW-.07,endW+.07,floor,soffit,'darkWood',{color:colors.walnut});
    led(1471,156.4,2190,0.6,10615); led(1471,279.7,2200,171,10615);
    led(1472,420.3,2180,369.5,10615);

    // Pothos, small pictures, books and candles are solid objects set at different shelf depths.
    vaseAt(843,344,.164,.213,10565,colors.ceramic);
    plantSprig(840,323,1.04,10475,39,25);
    plantSprig(814,348,.8,10480,16,66);
    vaseAt(889,337,.048,.114,10572,[.35,.225,.13]);
    frame(821,437,31,31,10460,1); frame(866,433,33,37,10508,5);
    for (const [u,w,h,lean,tint] of [[810,4,40,0,.11],[815,4,43,0,.14],[820,5,42,0,.16],[826,7,43,0,.21],
      [837,6,37,-2,.52],[844,6,36,-2,.58],[853,7,27,-3,.62]]) {
      book(u,518,w,h,10450,[tint,tint*.83,tint*.67],lean);
    }
    vaseAt(886,518,.071,.148,10458,[.77,.63,.44],'wax');
    frame(815,607,22,40,10440,-2); stillLife(850,611,47,5,10370,[.20,.135,.093]);
    stillLife(852,605,46,6,10380,[.095,.105,.122]); stillLife(848,599,49,5,10375,[.19,.145,.12]);
    vaseAt(879,594,.037,.073,10390,[.34,.25,.13]);

    vaseAt(1569,241,.191,.220,10510,[.235,.177,.100]);
    plantSprig(1565,211,1.38,10480,64,44);
    plantSprig(1521,242,1.36,10400,28,112);
    frame(1573,391,42,46,10480,5); frame(1626,390,43,60,10465,5);
    stillLife(1510,397,57,8,10465,[.126,.105,.090]); stillLife(1512,388,56,10,10475,[.24,.155,.095]);
    stillLife(1515,379,54,13,10470,[.21,.19,.15]);
    vaseAt(1524,535,.064,.135,10500,[.88,.68,.419],'wax');
    frame(1544,532,39,58,10490,5);
    stillLife(1541,534,50,4,10463,[.45,.31,.18]); stillLife(1544,529,49,4,10466,[.52,.38,.22]);
    for (const [u,w,h,lean,tint] of [[1593,8,60,-2,.61],[1602,10,69,0,.67],[1614,9,78,-1,.71],
      [1625,10,72,-5,.56],[1637,8,83,0,.73],[1648,9,80,0,.12],[1658,10,79,0,.15],[1670,11,81,0,.22]]) {
      book(u,539,w,h,10480,[tint,tint*.87,tint*.75],lean);
    }
    const vase=proj(1542,639,onMedia(10430));
    oval(vase,[.223,.181,.20],'ceramic',{color:[.219,.151,.084]});
    vaseAt(1542,613,.098,.060,10428,[.324,.213,.110],'metal');
    for(let i=0;i<7;i++) {
      const a=i*Math.PI/7;
      const around=t=>[vase[0]+.223*Math.cos(t)*Math.cos(a)+.199*Math.sin(t)*Math.sin(a),
        vase[1]+.18*Math.cos(t+.51),vase[2]+.193*Math.cos(t)*Math.sin(a)-.164*Math.sin(t)*Math.cos(a)];
      for(let j=0;j<9;j++) rod(around(j/9*Math.PI*2),around((j+1)/9*Math.PI*2),.0045,'brass',{color:colors.antique});
    }
    stillLife(1625,678,74,7,10335,[.165,.13,.10]); stillLife(1621,670,72,9,10345,[.22,.154,.102]);
    stillLife(1627,662,67,8,10345,[.135,.128,.115]); stillLife(1626,653,72,8,10358,[.26,.19,.13]);
  }

  function addReturnWall() {
    // Inferred surfaces outside the photo. The oak door, framed landscape and console
    // continue the same material palette when the visitor looks back toward the entry.
    const warm=plain(colors.walnut), trim=plain(colors.trim), painted=plain([.41,.345,.275]);
    const door={w0:3.01,w1:4.08,y1:.69};
    block(s0+.003,s0+.038,door.w0,door.w1,floor,door.y1,'wood',painted);
    for (const w of [door.w0-.055,door.w1]) block(s0+.012,s0+.066,w,w+.055,floor,door.y1+.068,'wood',trim);
    block(s0+.012,s0+.069,door.w0-.06,door.w1+.06,door.y1,door.y1+.068,'wood',trim);
    for(const [y0,y1] of [[floor+.20,-.55],[-.40,door.y1-.19]]) {
      const w0=door.w0+.14,w1=door.w1-.14;
      block(s0+.040,s0+.051,w0,w1,y0,y1,'wood',plain([.37,.303,.23]));
      for(const w of [w0,w1-.023]) block(s0+.049,s0+.066,w,w+.023,y0,y1,'wood',painted);
      for(const y of [y0,y1-.023]) block(s0+.049,s0+.066,w0,w1,y,y+.023,'wood',painted);
    }
    const handle=room(s0+.062,door.w0+.132,floor+.97);
    const handleTip=toward(handle,S,.059);
    rod(handle,handleTip,.026,'metal',plain(colors.iron));
    rod(handleTip,toward(handleTip,W,.105),.012,'brass',plain(colors.antique));
    // Slim walnut slats enclose a matted, layered landscape print.
    const print=(s,w,y,width,height) => {
      block(s,s+.046,w-width/2,w+width/2,y-height/2,y+height/2,'wood',warm);
      const pad=.038, xL=w-width/2+pad,xR=w+width/2-pad,yB=y-height/2+pad,yT=y+height/2-pad;
      wallS(s+.049,xL,xR,yB,yT,'paper',plain([.80,.747,.643]));
      const l=xL+.102,r=xR-.102,lo=yB+.097,hi=yT-.097;
      wallS(s+.051,l,r,lo,hi,'paper',plain([.63,.625,.551]));
      const ridge=(profile,shade,offset)=>{
        const top=profile.map((v,i)=>room(s+offset,mix(l,r,i/(profile.length-1)),mix(lo,hi,v)));
        for(let i=0;i<top.length-1;i++)face([room(s+offset,mix(l,r,i/(top.length-1)),lo),top[i],top[i+1],room(s+offset,mix(l,r,(i+1)/(top.length-1)),lo)],'paper',plain(shade));
      };
      ridge([.45,.61,.53,.68,.54,.56,.45,.58,.51],[.408,.459,.410],.054);
      ridge([.31,.46,.39,.41,.32,.48,.53,.34,.43],[.309,.370,.322],.056);
      ridge([.26,.31,.23,.35,.28,.24,.33,.28,.26],[.241,.276,.242],.058);
    };
    print(s0+.010,.41,.15,1.64,1.06);
    block(s0+.08,s0+.45,-.68,1.49,floor+.67,floor+.73,'walnut',warm);
    for(const w of [-.61,1.35]) block(s0+.11,s0+.40,w,w+.074,floor+.008,floor+.68,'walnut',warm);
    block(s0+.13,s0+.385,-.62,1.43,floor+.19,floor+.226,'walnut',warm);
    for(const [i,w,col] of [[0,-.27,[.255,.237,.194]],[1,-.22,[.581,.479,.346]],[2,-.25,[.347,.30,.231]]]) {
      block(s0+.19,s0+.385,w,w+.37,floor+.733+i*.038,floor+.768+i*.038,'book',plain(col));
    }
    const c=room(s0+.255,.95,floor+.859);
    oval(c,[.096,.132,.091],'ceramic',plain([.37,.407,.312]));
    const high=room(s0+.255,.95,floor+.968);
    rod(high,room(s0+.255,.95,floor+1.024),.042,'ceramic',plain([.34,.376,.291]));
    for(let i=0;i<5;i++) {
      const to=room(s0+.255+.069*Math.sin(i*1.61),.95+.164*Math.cos(i*1.71),floor+1.22+.072*Math.sin(i));
      rod(high,to,.0033,'leaf',plain([.263,.28,.177]));
      for(let j=0;j<3;j++) {
        const mid=high.map((v,q)=>mix(v,to[q],.52+j*.18));
        oval(mid,[.033,.014,.022],'leaf',{...plain([.25,.337,.179]),segments:8,rings:5});
      }
    }
    // Wall battens on the opposite short wall lend scale when seen along the sofa.
    for(let s=-.98;s<1.93;s+=.123) {
      block(s,s+.042,w0+.012,w0+.040,floor+.14,soffit-.145,'walnut',plain([.297,.204,.145]));
    }
  }
}
