/** Photo-registered solid furnishings. All dimensions are in metres. */
export function addFurniture(b) {
  const at = (point, depth) => b.at(point[0], point[1], depth);
  const add = (p, q) => p.map((v, i) => v + q[i]);
  const scale = (p, k) => p.map(v => v * k);
  const mix = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);
  const mean = pts => scale(pts.reduce((a, p) => add(a, p), pts[0].map(() => 0)), 1 / pts.length);
  const face = (p, mat, opt) => b.face(p, mat, opt);
  const tau = Math.PI * 2;
  const depthAt = (v, y) => -y * 1100 / (v - 507);
  const onLevel = (p, y) => at(p, depthAt(p[1], y));
  const ringFace = (ring, mat, opt, center = mean(ring)) => {
    for (let i = 0; i < ring.length; i++) face([center, ring[i], ring[(i + 1) % ring.length]], mat, opt);
  };
  const band = (a, c, mat, opt) => {
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      face([a[i], c[i], c[j], a[j]], mat, opt);
    }
  };
  const repaint = (options, source) => ({...options, photo: source});
  const cognac = {color:[.36,.153,.061]};
  const saddle = {color:[.42,.207,.093]};
  const shadowLeather = {color:[.19,.077,.035]};
  const linen = {color:[.75,.609,.423]};
  const flax = {color:[.82,.687,.50]};
  const chocolate = {color:[.205,.137,.115]};
  const walnut = {color:[.37,.202,.101]};
  const antiqueBrass = {color:[.49,.328,.151]};
  const flatBlack = {color:[.041,.039,.038]};

  // Trace the upholstery piping, then give the face a convex crown and a full back.
  // The side rolls follow the traced perimeter when viewed from the reference eye.
  function backCushion(outline, center, depth, material, options, puff, thickness) {
    const profile = [[.19,.96],[.46,.87],[.73,.66],[.895,.38],[.973,.12],[1,0]];
    let previous;
    for (const [r, fullness] of profile) {
      const next = outline.map((uv, i) => {
        const p = mix(center, uv, r);
        const gathered = .008 * Math.sin(2.1 * i + .9) * Math.max(0, 1 - 4 * Math.abs(r - .76));
        return at(p, depth(...p) - fullness * (puff + gathered));
      });
      if (previous) band(previous,next,material,options);
      else ringFace(next,material,options,at(center, depth(...center)-puff));
      previous = next;
    }
    const welt = outline.map(uv => at(uv, depth(...uv) + .014));
    const backRim = outline.map(uv => {
      const p = mix(center,uv,.962);
      return at(p, depth(...uv) + thickness);
    });
    band(previous,welt,material,options);
    band(welt,backRim,material,options);
    ringFace([...backRim].reverse(),material,repaint(options,false));
  }

  // Padded seats and cabinet components use an actual horizontal bearing surface.
  function levelSolid(outline, y, height, mat, opt, softness=0, shoulders=.96) {
    const contour = outline.map(p=>onLevel(p,y));
    const center = mean(contour);
    const ring = (r, lift) => contour.map(p => add(mix(center,p,r),[0,lift,0]));
    if (softness > 0) {
      const crown = ring(.64,softness); const top = ring(shoulders,softness*.62);
      const turn = ring(.995,softness*.13); const side = ring(1,-height*.23);
      ringFace(crown,mat,opt,add(center,[0,softness*1.08,0]));
      band(crown,top,mat,opt); band(top,turn,mat,opt); band(turn,side,mat,opt);
      const lower = ring(.992,-height*.87); const bottom = ring(.955,-height);
      band(side,lower,mat,opt); band(lower,bottom,mat,opt); ringFace(bottom.reverse(),mat,repaint(opt,false));
    } else {
      const lower = ring(1,-height);
      ringFace(contour,mat,opt); band(contour,lower,mat,opt); ringFace(lower.reverse(),mat,repaint(opt,false));
    }
    return contour;
  }

  function lathe(cx,cz,profile,mat,opt,n=24) {
    let prior;
    for (const [radius,y] of profile) {
      const ring=Array.from({length:n},(_,i) => [cx+radius*Math.cos(i*tau/n),y,cz+radius*Math.sin(i*tau/n)]);
      if (!prior) ringFace(ring,mat,opt,[cx,y,cz]);
      else band(prior,ring,mat,opt);
      prior=ring;
    }
    ringFace(prior.slice().reverse(),mat,opt,[cx,profile[profile.length-1][1],cz]);
  }

  // Sofa along the window. The rear rail and low chassis carry the loose cushions.
  const windowSofa = [[-166,711],[472,674],[633,681],[616,702],[176,747],[-138,768]];
  levelSolid(windowSofa,-1.07,.295,'darkLeather',shadowLeather,.024);
  levelSolid([[-128,768],[502,717],[601,723],[574,756],[-94,817]],-1.36,.095,'wood',{color:[.115,.073,.054]});
  const backDepth=(u,v) => 5.67 + .00253*u - .00155*(v-554);
  backCushion([[-113,583],[-58,582],[17,577],[25,571],[64,568],[96,569],[125,565],[162,561],[180,558],[226,560],[281,564],[296,572],[306,624],[301,646],[277,671],[189,675],[-70,709],[-123,692]], [90,623], backDepth,'leather',cognac,.077,.23);
  backCushion([[164,560],[185,553],[204,557],[248,558],[281,559],[301,560],[332,560],[357,558],[371,555],[378,558],[390,582],[395,621],[397,646],[381,658],[333,664],[248,674],[195,675],[180,652]], [284,613], backDepth,'leather',cognac,.106,.20);
  backCushion([[378,559],[383,556],[397,555],[421,558],[449,557],[474,556],[497,553],[501,556],[503,568],[514,606],[514,626],[507,640],[486,646],[444,651],[401,655],[394,650],[386,615],[379,588]], [449,604],backDepth,'leather',cognac,.111,.205);
  // Far arm slopes slightly toward the seat; the return and end are upholstered as well.
  backCushion([[505,602],[517,604],[557,610],[583,614],[599,613],[619,611],[640,608],[649,614],[651,629],[640,654],[616,665],[590,664],[570,653],[533,649],[516,641]], [581,632], (u,v)=>6.59+.0007*(u-550)-.0058*(v-609),'leather',saddle,.04,.24);
  levelSolid([[-127,688],[68,664],[153,656],[248,647],[290,646],[324,649],[360,653],[379,661],[392,673],[389,688],[378,694],[328,702],[119,726],[-115,752]],-.932,.168,'leather',saddle,.028);
  levelSolid([[334,657],[369,652],[417,649],[467,645],[504,642],[546,642],[587,646],[607,650],[615,655],[617,664],[616,673],[603,678],[548,685],[441,695],[410,701],[397,698],[390,683],[380,672],[360,664]],-.927,.185,'leather',saddle,.029);
  const windowPillowDepth=(u,v)=>5.61+.00254*u-.0008*(v-560);
  backCushion([[50,579],[64,573],[98,572],[119,574],[146,566],[158,552],[166,550],[177,559],[192,577],[206,602],[216,640],[214,655],[159,669],[116,662],[82,628]], [145,610],windowPillowDepth,'fabric',{color:[.361,.219,.114]},.11,.14);
  backCushion([[172,548],[174,543],[180,542],[201,546],[219,551],[238,553],[256,550],[277,546],[288,540],[293,541],[296,549],[301,569],[311,596],[321,615],[328,631],[336,642],[339,650],[334,652],[316,653],[290,658],[264,662],[232,667],[221,669],[215,665],[208,649],[201,625],[194,606],[186,577],[179,560]], [249,606],(u,v)=>windowPillowDepth(u,v)-.25,'knit',flax,.14,.13);

  // A throw drapes over the far arm into the seat. Individual rows turn down the edge.
  const farThrow=[
    [[486,643,6.66],[503,639,6.7],[530,641,6.69],[555,643,6.7],[587,646,6.7],[613,646,6.7],[634,643,6.7],[664,637,6.8],[685,635,6.88]],
    [[499,647,6.48],[517,644,6.48],[541,645,6.46],[568,647,6.46],[599,652,6.43],[618,650,6.48],[641,646,6.4],[663,642,6.45],[683,641,6.46]],
    [[513,650,6.28],[529,646,6.27],[554,649,6.26],[581,651,6.24],[607,655,6.16],[620,658,6.13],[640,657,6.12],[664,651,6.17],[681,648,6.23]]
  ];
  const armDrape=[[[611,650,6.25],[625,645,6.32],[647,641,6.49],[669,639,6.59],[687,636,6.65]],[[618,660,6.08],[632,655,6.14],[652,650,6.28],[675,647,6.38],[690,645,6.48]],[[617,678,6.03],[632,679,6.02],[653,672,6.12],[675,664,6.28],[687,659,6.36]],[[613,706,6.06],[627,705,6.06],[647,699,6.10],[669,691,6.23],[681,690,6.27]]];
  const cloth=(rows,mat,opt)=>{
    const polys=rows.map(row=>row.map(([u,v,d])=>b.at(u,v,d)));
    for(let i=1;i<polys.length;i++) for(let j=1;j<polys[i].length;j++) face([polys[i-1][j-1],polys[i-1][j],polys[i][j],polys[i][j-1]],mat,opt);
  };
  cloth(farThrow,'knit',flax); cloth(armDrape,'knit',flax);

  // The second sofa runs at right angles to the window seating. The nearest end extends
  // beyond the photograph so the scene remains furnished on the reverse side.
  levelSolid([[-172,724],[-52,682],[249,707],[367,729],[514,772],[667,839],[461,916],[-114,1036]],-1.03,.33,'darkLeather',shadowLeather,.028);
  levelSolid([[-129,811],[-39,760],[233,790],[334,814],[500,877],[611,930],[419,1015],[-101,1152]],-1.36,.10,'wood',{color:[.116,.072,.045]});
  levelSolid([[-104,704],[21,676],[193,684],[300,703],[382,729],[418,750],[421,770],[350,784],[184,809],[53,832],[-100,854]],-.956,.16,'leather',cognac,.033);
  levelSolid([[-111,806],[47,773],[189,751],[300,739],[365,753],[454,777],[532,804],[592,827],[603,851],[544,864],[375,902],[150,947],[-83,983]],-.952,.165,'leather',cognac,.035);
  // Raised back rail behind the loose pillow stack.
  backCushion([[-148,564],[-95,571],[-27,579],[23,591],[87,608],[145,627],[191,651],[221,674],[244,699],[247,734],[222,762],[137,802],[27,829],[-137,831]], [30,693],(u,v)=>4.13-.00330*(v-600)+.00119*u,'leather',saddle,.053,.26);
  backCushion([[-125,578],[-76,581],[-9,581],[19,581],[45,586],[70,590],[86,588],[107,591],[134,603],[152,616],[188,631],[203,648],[255,675],[280,690],[284,708],[250,730],[194,733],[135,703],[98,684],[60,657],[12,647],[-48,638],[-114,631]], [76,644],(u,v)=>3.71+.0013*u-.0030*(v-630),'knit',chocolate,.062,.10);
  backCushion([[-123,597],[-63,598],[-9,606],[16,612],[42,618],[71,623],[94,621],[110,627],[127,637],[149,662],[165,697],[183,733],[201,767],[205,788],[193,799],[158,813],[145,820],[120,815],[76,800],[30,785],[-20,780],[-58,759],[-108,727]], [57,701],(u,v)=>3.10+.00131*u-.00139*(v-665),'leather',saddle,.143,.195);
  backCushion([[133,654],[138,651],[149,654],[164,662],[183,671],[207,678],[232,680],[259,680],[291,676],[317,672],[327,671],[335,680],[339,689],[350,707],[356,727],[367,749],[376,773],[391,792],[390,800],[368,808],[330,814],[278,816],[233,816],[203,810],[191,799],[187,779],[179,754],[169,724],[156,693],[145,670]], [265,743],(u,v)=>3.24+.0009*u-.0017*(v-690),'fabric',linen,.14,.14);

  // Knit throw on the near seat, including the roll where it folds beneath the arm.
  const nearThrow=[
    [[122,820,2.62],[154,809,2.75],[197,806,2.78],[241,802,2.89],[291,799,3.00],[332,795,3.08],[370,792,3.12],[392,797,3.10]],
    [[136,830,2.60],[169,817,2.67],[210,815,2.76],[258,810,2.83],[304,811,2.89],[350,804,2.99],[394,801,3.07],[414,802,3.07]],
    [[146,843,2.54],[181,832,2.60],[232,829,2.66],[279,822,2.73],[327,819,2.78],[370,816,2.89],[414,812,2.95],[451,815,2.96]],
    [[152,855,2.46],[198,850,2.49],[253,842,2.57],[295,838,2.66],[350,833,2.72],[393,827,2.79],[448,823,2.84],[494,829,2.84]],
    [[163,871,2.37],[213,862,2.40],[267,855,2.48],[321,850,2.56],[370,844,2.62],[418,840,2.68],[462,835,2.75],[507,835,2.79]]
  ];
  cloth(nearThrow,'knit',flax);
  const endArmOutline=[[-188,902],[-137,908],[-89,909],[-22,903],[38,897],[114,888],[176,880],[254,867],[337,855],[423,843],[502,828],[566,817],[621,810],[655,805],[682,806],[710,812],[735,819],[755,829],[767,837],[774,849],[777,863],[780,930],[780,985],[772,1034],[750,1070],[631,1102],[329,1168],[-169,1250]];
  // Depth of the rolled top transitions to a vertical face below its piping seam.
  const endArmDepth=(u,v)=>{
    const ridge=899-.136*u, shoulder=31;
    const t=Math.max(0,Math.min(1,(v-ridge)/shoulder));
    const retreat=.24*(1-t), profile=.032*Math.sin(Math.PI*t);
    return 1.897+.00075*u+retreat+profile;
  };
  backCushion(endArmOutline,[283,963],endArmDepth,'leather',saddle,.038,.26);
  // Left upholstery continues around the outside of the sectional.
  backCushion([[-165,775],[-119,770],[-75,776],[-29,779],[12,780],[50,784],[80,796],[115,808],[144,826],[167,842],[195,864],[208,882],[204,892],[125,909],[19,924],[-83,936],[-162,921]], [0,844],(u,v)=>2.46-.0013*(v-793)+.0008*u,'leather',cognac,.088,.245);

  // Low walnut table, with an inset toe plinth and a two-drawer front.
  const tableOutline=[[403,731],[755,678],[1125,740],[766,829]];
  const table=levelSolid(tableOutline,-.90,.423,'walnut',walnut);
  const tc=mean(table);
  const pedestal=table.map(p=>add(mix(tc,p,.91),[0,-.426,0]));
  const pedestalFoot=pedestal.map(p=>add(p,[0,-.153,0]));
  ringFace(pedestal,'darkLeather',{color:[.15,.074,.043]});
  band(pedestal,pedestalFoot,'wood',{color:[.142,.074,.044]});
  const edge=[table[3],table[2]];
  const bottom=edge.map(p=>add(p,[0,-.417,0]));
  const frontNormal=[.0043,0,-.002];
  for(const t of [.535]){
    const left=mix(edge[0],edge[1],t-.0025),right=mix(edge[0],edge[1],t+.0025);
    face([add(left,frontNormal),add(right,frontNormal),add(mix(bottom[0],bottom[1],t+.0025),frontNormal),add(mix(bottom[0],bottom[1],t-.0025),frontNormal)],'wood',{color:[.135,.076,.051]});
  }

  // Turned tray with raised rim, a glazed pot, coasters, a tea light and a pillar candle.
  const trayCenter=b.at(735,714,4.48);
  const [tx,,tz]=trayCenter;
  lathe(tx,tz,[[.398,-.899],[.427,-.89],[.443,-.874],[.443,-.804],[.435,-.796],[.423,-.800],[.412,-.850]],'wood',walnut,48);
  const pot=b.at(715,690,4.79);
  const [px,,pz]=pot;
  lathe(px,pz,[[.087,-.854],[.104,-.844],[.119,-.812],[.145,-.71],[.147,-.653],[.138,-.611],[.113,-.59],[.108,-.569],[.091,-.574],[.091,-.61]],'ceramic',{color:[.16,.103,.053]},32);
  lathe(px,pz,[[.089,-.603],[.089,-.598]],'wood',{color:[.090,.066,.045]},24);
  const coaster=b.at(693,710,4.40);
  for(let i=0;i<3;i++) lathe(coaster[0]+.004*i,coaster[2]-.001*i,[[.120,-.854+i*.011],[.127,-.851+i*.011],[.126,-.843+i*.011],[.120,-.840+i*.011]],'ceramic',{color:[.58,.425,.276]},24);
  const cand=b.at(789,713,4.53);
  lathe(cand[0],cand[2],[[.06,-.852],[.068,-.842],[.068,-.625],[.066,-.618],[.057,-.619]],'wax',{color:[.895,.754,.509]},26);
  b.rod([cand[0],-.619,cand[2]],[cand[0]+.001,-.595,cand[2]],.003,'wood',flatBlack);
  const fbase=[cand[0],-.604,cand[2]];
  const flame=[cand[0]+.006,-.552,cand[2]+.002];
  const fr=Array.from({length:9},(_,i)=>[cand[0]+.009*Math.cos(tau*i/9),-.594,cand[2]+.009*Math.sin(tau*i/9)]);
  ringFace(fr,'wax',{color:[1,.64,.20]},flame);ringFace([...fr].reverse(),'wax',{color:[1,.74,.30]},fbase);
  const tlight=b.at(764,713,4.51);
  lathe(tlight[0],tlight[2],[[.039,-.854],[.053,-.846],[.053,-.834],[.025,-.826],[.015,-.797],[.012,-.741],[.026,-.738],[.028,-.725]],'brass',antiqueBrass,16);

  // Articulated tablet and folding easel. The glass has its own pickable surface.
  const tabletOpt={...flatBlack,device:'tablet'};
  const depthGlass=(u,v)=>4.17-.00074*(u-835)-.00158*(v-650);
  const glassPoint=(u,v,offset=0)=>b.at(u,v,depthGlass(u,v)+offset);
  const bezelUV=[[839,644],[846,644],[945,652],[953,655],[958,660],[960,667],[958,678],[939,750],[936,757],[930,762],[922,763],[820,750],[815,748],[812,743],[812,737],[828,662],[831,652],[835,646]];
  const bezel=bezelUV.map(p=>glassPoint(...p));
  const rear=bezelUV.map(p=>glassPoint(...p,.030));
  const innerUV=[[844,654],[944,663],[946,666],[946,669],[929,745],[926,749],[823,737],[822,733],[838,659],[841,655]];
  const glass=innerUV.map(p=>glassPoint(...p,-.006));
  ringFace(bezel,'black',tabletOpt);band(bezel,rear,'brass',{color:[.205,.142,.086],device:'tablet'});
  ringFace([...rear].reverse(),'black',{...tabletOpt,photo:false});
  ringFace(glass,'screen',{color:[.063,.105,.151],device:'tablet'});
  const standL=glassPoint(823,744,.044),standR=glassPoint(936,757,.043);
  const hingeL=mix(standL,glassPoint(837,650,.044),.62),hingeR=mix(standR,glassPoint(955,661,.044),.62);
  const footL=add(standL,[0,-.005,.209]),footR=add(standR,[0,-.004,.212]);
  face([footL,hingeL,hingeR,footR],'black',tabletOpt);
  face([footL,hingeL,standL],'black',tabletOpt);face([standR,hingeR,footR],'black',tabletOpt);
  face([standL,standR,footR,footL],'black',tabletOpt);

  addFern();
  function addFern() {
    // Stem paths follow the individual sprays in the reference. Tips occupy several
    // depth planes; each botanical blade is folded about its central vein.
    const stems=[
      {dz:.20, blade:1, pts:[[705,649],[693,610],[681,568],[668,536],[660,510]]},
      {dz:.27, blade:2, pts:[[711,647],[723,597],[737,552],[751,517],[770,492]]},
      {dz:.12, blade:1, pts:[[715,648],[740,604],[758,584],[777,558],[802,538]]},
      {dz:.095,blade:0, pts:[[704,646],[682,608],[653,572],[631,548],[608,525]]},
      {dz:-.06,blade:0, pts:[[705,650],[688,621],[663,596],[634,582],[605,575],[574,583],[562,593]]},
      {dz:.04, blade:1, pts:[[719,649],[737,625],[764,604],[785,582],[812,577]]},
      {dz:-.16,blade:1, pts:[[708,650],[687,623],[666,611],[640,604],[613,608],[589,623]]},
      {dz:-.27,blade:2, pts:[[708,650],[694,624],[676,610],[655,609],[638,625],[619,650]]},
      {dz:-.20,blade:2, pts:[[713,650],[720,625],[739,607],[756,608],[778,619],[790,634]]},
      {dz:.18, blade:0, pts:[[718,647],[741,610],[768,593],[797,588],[821,601]]},
      {dz:-.13,blade:1, pts:[[707,648],[681,620],[654,606],[622,605],[604,619],[594,647]]},
      {dz:.11, blade:0, pts:[[702,649],[676,612],[648,583],[614,575],[595,573],[578,581]]}
    ];
    const greens=[{color:[.232,.297,.105]},{color:[.277,.335,.13]},{color:[.185,.256,.12]}];
    const stemOpt={color:[.31,.32,.118],segments:5};
    const paths=stems.map(({dz,pts},idx)=>pts.map(([u,v],i)=>{
      const t=i/(pts.length-1), spread=Math.sin(t*Math.PI)*.022*Math.cos(idx*.84);
      return {u,v,d:pz+dz*t+spread,t};
    }));
    for(let k=0;k<paths.length;k++) {
      const path=paths[k], spec=stems[k];
      for(let j=1;j<path.length;j++) {
        const a=path[j-1],c=path[j];
        b.rod(b.at(a.u,a.v,a.d),b.at(c.u,c.v,c.d),Math.max(.0017,.006*(1-.75*c.t)),'leaf',stemOpt);
        for(let side=-1;side<=1;side+=2) {
          const t=side>0?.31:.67;
          const stem=mix([a.u,a.v,a.d],[c.u,c.v,c.d],t);
          const dx=c.u-a.u,dy=c.v-a.v,mag=Math.hypot(dx,dy)||1;
          const bladeLength=(spec.blade===2?12:spec.blade===1?8:5.4)*(1.22-.44*c.t);
          const spread=.78, sweep=.62;
          const vx=(dx*sweep+side*dy*spread)/mag,vy=(dy*sweep-side*dx*spread)/mag;
          const width=bladeLength*(spec.blade===2?.285:.19);
          const [u,v,d]=stem;
          const along=.51*bladeLength;
          const base=b.at(u,v,d);
          const tip=b.at(u+vx*bladeLength,v+vy*bladeLength,d-.014*side);
          const ridge=b.at(u+vx*along,v+vy*along,d-.017);
          const flank1=b.at(u+vx*along+vy*width,v+vy*along-vx*width,d+.010*side);
          const flank2=b.at(u+vx*along-vy*width,v+vy*along+vx*width,d-.008*side);
          const material=greens[(j+spec.blade)%3];
          face([base,flank1,ridge], 'leaf',material);face([flank1,tip,ridge],'leaf',material);
          face([ridge,tip,flank2],'leaf',material);face([base,ridge,flank2],'leaf',material);
        }
      }
    }
    // Thin secondary stems and small compound leaves preserve the source canopy's
    // openings. These three-pixel scan intervals were traced from its olive channels.
    function canopyDepth(x,y) {
      let bestDistance=Infinity, result=pz;
      for(const path of paths) for(let i=1;i<path.length;i++) {
        const a=path[i-1],c=path[i]; const dx=c.u-a.u,dy=c.v-a.v;
        const t=Math.max(0,Math.min(1,((x-a.u)*dx+(y-a.v)*dy)/(dx*dx+dy*dy)));
        const d=(x-a.u-t*dx)**2+(y-a.v-t*dy)**2;
        if(d<bestDistance) {bestDistance=d;result=a.d+(c.d-a.d)*t;}
      }
      return result-.024+.016*Math.sin(x*.075+y*.083);
    }
    const fernPatch=(u,v)=>b.at(u,v,canopyDepth(u,v));
    const rows=fernSilhouette();
    rows.forEach((row,j)=>{
      const v=484+j*3;
      for(let k=0;k<row.length;k+=2) {
        const a=552+row[k]*3, end=552+(row[k+1]+1)*3;
        for(let u=a;u<end;u+=12) {
          const r=Math.min(end,u+12);
          face([fernPatch(u,v),fernPatch(r,v),fernPatch(r,v+3),fernPatch(u,v+3)],'leaf',greens[1]);
        }
      }
    });
  }
}

// Occupied intervals on each sampled row of the fern, inclusive at both ends.
function fernSilhouette() {
  return [
    [],
    [],
    [],
    [],
    [74, 74],
    [71, 71, 73, 74],
    [71, 73],
    [66, 66, 70, 72],
    [67, 67, 70, 70],
    [67, 68],
    [68, 68],
    [64, 65, 68, 68],
    [65, 65, 68, 68],
    [18, 18, 65, 66],
    [19, 20, 61, 63],
    [24, 24, 63, 64, 67, 67],
    [21, 25, 41, 41, 63, 64],
    [24, 25, 64, 65],
    [26, 26, 64, 64],
    [59, 59, 62, 62, 67, 70],
    [25, 29, 35, 35, 42, 43, 62, 64, 66, 69],
    [25, 25, 34, 35, 42, 46, 62, 64, 67, 68],
    [30, 30, 32, 35, 46, 47, 60, 61, 63, 64],
    [31, 32, 34, 37, 46, 48, 60, 61, 63, 63],
    [28, 32, 35, 37, 39, 41, 47, 49, 51, 51, 57, 63, 65, 67, 71, 73, 75, 76, 78, 78],
    [32, 41, 43, 44, 46, 49, 52, 52, 58, 60, 62, 63, 67, 67, 71, 71, 76, 77],
    [11, 16, 19, 19, 31, 33, 37, 44, 46, 48, 54, 55, 58, 62, 64, 65, 67, 67, 75, 76],
    [11, 11, 17, 18, 20, 23, 34, 34, 37, 44, 46, 48, 50, 51, 54, 55, 59, 62, 65, 66, 71, 71, 75, 75],
    [18, 18, 22, 26, 28, 29, 34, 45, 47, 49, 51, 51, 53, 55, 59, 73],
    [8, 8, 21, 21, 23, 39, 41, 55, 58, 73],
    [7, 7, 20, 26, 28, 57, 59, 68],
    [19, 62, 64, 68],
    [15, 15, 22, 62, 64, 68, 74, 75],
    [15, 15, 25, 54, 57, 68, 73, 74],
    [11, 14, 25, 68, 73, 74],
    [9, 9, 13, 13, 25, 68, 70, 72],
    [24, 69, 71, 71],
    [22, 22, 24, 68],
    [19, 19, 22, 22, 24, 67],
    [21, 67, 73, 74, 76, 76],
    [14, 15, 19, 19, 23, 67, 74, 74],
    [13, 13, 21, 63, 65, 66],
    [20, 22, 31, 67],
    [22, 22, 27, 27, 30, 66, 71, 72],
    [20, 20, 27, 65, 75, 75],
    [26, 28, 31, 31, 35, 65, 72, 74],
    [23, 23, 25, 29, 32, 64],
    [23, 26, 30, 50, 52, 63, 65, 65],
    [21, 21, 29, 60, 62, 63],
    [29, 34, 36, 62],
    [28, 61],
    [28, 30, 35, 35, 38, 61],
    [28, 30, 35, 36, 40, 40, 42, 43, 45, 61],
    [27, 29, 35, 36, 39, 39, 45, 59],
    [26, 28, 34, 35, 39, 39, 46, 47, 49, 50, 55, 56],
    [26, 27, 34, 35, 45, 46],
    [25, 27, 35, 35, 46, 46],
    [24, 26, 35, 35],
    [24, 24, 34, 35],
    [34, 34],
    [],
    [],
    [],
    [],
    [],
  ];
}
