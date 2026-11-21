// The chandelier, electrical fittings and reading lamp occupy real room space.
// Curves measured in the reference camera are lifted onto the physical fixtures.
const TAU = Math.PI * 2;
const segments = (count, fn) => Array.from({ length: count }, (_, i) => fn(i * TAU / count, i));
const room = (s,w,y) => [s * 0.70518 - w * 0.70902, y, s * 0.70902 + w * 0.70518];

function bridge(b, a, c, material, options = {}) {
  for (let i = 0; i < a.length; i++) {
    const j = (i + 1) % a.length;
    b.face([a[i], a[j], c[j], c[i]], material, options);
  }
}

function horizontalPoint(b, u, v, height) {
  return b.at(u, v, height * 1100 / (507 - v));
}

function measuredEllipse(b, cx, cy, rx, ry, slope, height, count = 48) {
  return segments(count, t => {
    const dx = rx * Math.cos(t);
    return horizontalPoint(b, cx + dx, cy + ry * Math.sin(t) + slope * dx, height);
  });
}

function chandelier(b) {
  const referenceRings = [
    { cx: 652.9, cy: 126.6, rx: 168, ry: 45.3, slope: 0.0297, y: 1.49, width: 0.043, height: 0.059 },
    { cx: 658.0, cy: 187.4, rx: 101.4, ry: 22.0, slope: 0.0205, y: 1.29, width: 0.041, height: 0.059 },
  ];
  for (const r of referenceRings) {
    const line = measuredEllipse(b, r.cx, r.cy, r.rx, r.ry, r.slope, r.y, 88);
    let cx = 0;
    let cz = 0;
    for (const p of line) { cx += p[0] / line.length; cz += p[2] / line.length; }
    // Cross section of the bronze channel: a rolled outer rim, opal diffuser,
    // brushed inner lip, dark top and body. Extending the diffuser up the side
    // keeps the line of light visible from floor level and eye level.
    const profile = [
      [-0.5, 0.72, 'brass'], [-0.50, 0.16, 'brass'],
      [-0.46, 0.02, 'glow'], [-0.31, -0.09, 'glow'],
      [0.29, -0.09, 'glow'], [0.47, -0.01, 'glow'],
      [0.50, 0.17, 'black'], [0.49, 0.83, 'black'],
      [0.40, 0.98, 'metal'], [-0.36, 0.98, 'brass'],
    ];
    const bands = profile.map(([width, height]) => line.map(([x,y,z]) => {
      const ex = x - cx, ez = z - cz, length = Math.hypot(ex, ez);
      return [x + width * r.width * ex / length, y + r.height * height,
              z + width * r.width * ez / length];
    }));
    for (let i = 0; i < profile.length; i++) {
      const material = profile[i][2];
      bridge(b, bands[i], bands[(i + 1) % bands.length], material,
             material === 'glow' ? { device: 'pendant' } : {});
    }
  }

  const wires = [
    // [end on extrusion, height of termination, pixel on ceiling canopy]
    [[547, 75], 1.545, [676, -119]],
    [[788, 89], 1.545, [636, -120]],
    [[672, 65], 1.545, [662, -119]],
    [[688, 150], 1.348, [665, -120]],
    [[519, 138], 1.545, [661, -119]],
  ];
  for (const [end, y, start] of wires) {
    const a = horizontalPoint(b, ...end, y);
    const c = horizontalPoint(b, ...start, 2.615);
    b.rod(a, c, 0.0038, 'black', { segments: 6 });
    const sleeve = a.map((v, i) => v + (c[i] - v) * 0.025);
    b.rod(a, sleeve, 0.008, 'brass', { segments: 7 });
  }
  const canopy = horizontalPoint(b, 657, -119, 2.615);
  b.rod([canopy[0], 2.584, canopy[2]], [canopy[0], 2.636, canopy[2]],
        0.205, 'black', { photo: false, segments: 36 });
  b.rod([canopy[0], 2.580, canopy[2]], [canopy[0], 2.588, canopy[2]],
        0.191, 'brass', { photo: false, segments: 36 });
}

function roomLamp(b) {
  const lampDepth = 6.20;
  // Near and far edges both receive depth, including the top opening of the drum.
  function loop(cx, cy, rx, ry, tilt, depth, spread, lean = 0, count = 48) {
    return segments(count, t => {
      const co = Math.cos(t), si = Math.sin(t);
      return b.at(cx + rx * co, cy + ry * si + rx * tilt * co,
                  depth + spread * si + lean * co);
    });
  }
  const shade = [
    loop(77.4, 404.9, 78.2, 3.3, 0.035, lampDepth, 0.34, 0.21),
    loop(77.4, 406.8, 78.6, 3.4, 0.035, lampDepth, 0.34, 0.21),
    loop(77.6, 483.1, 81.2, 2.0, 0.006, lampDepth, 0.36, 0.22),
    loop(77.6, 487.9, 81.4, 1.7, 0.004, lampDepth, 0.36, 0.22),
    loop(77.7, 489.0, 80.0, 1.5, 0.004, lampDepth, 0.35, 0.21),
  ];
  bridge(b, shade[0], shade[1], 'brass');
  bridge(b, shade[1], shade[2], 'shade', { device: 'lamp' });
  bridge(b, shade[2], shade[3], 'shade', { device: 'lamp' });
  bridge(b, shade[3], shade[4], 'brass');
  const drumInside = shade[0].map(([x,y,z]) => [x * 0.994 - 0.026, y - 0.008, z * 0.995 + 0.030]);
  bridge(b, drumInside, shade[0], 'shade', { photo: false, device: 'lamp' });

  // Hammered bronze shoulder, neck, rolled foot, and the socket inside the drum.
  const profile = [
    [485.5, 3.9, 'brass'], [501.1, 3.9, 'brass'], [501.8, 9.6, 'brass'],
    [504.1, 9.7, 'brass'], [505.4, 7.3, 'brass'], [509.4, 10.1, 'brass'],
    [514.0, 21.5, 'brass'], [516.2, 27.5, 'brass'], [520, 28.3, 'brass'],
    [558.5, 26.4, 'brass'], [574, 23.9, 'brass'], [577, 24.9, 'brass'],
    [580, 26.2, 'black'], [581, 26.2, 'black'],
  ];
  const circles = profile.map(([cy, rx]) => {
    const spread = lampDepth * rx / 1410;
    return loop(78.0, cy, rx, (507 - cy) * spread / lampDepth,
                0.002, lampDepth, spread, spread * 0.50, 40);
  });
  for (let i = 0; i < circles.length - 1; i++) bridge(b, circles[i], circles[i + 1], profile[i][2]);
  b.face(circles[circles.length-1], 'black', { photo: false });
  const bulbFoot = b.at(78, 486, lampDepth);
  const bulb = [bulbFoot[0], bulbFoot[1] + 0.16, bulbFoot[2]];
  b.rod(bulbFoot, [bulb[0], bulb[1] - 0.035, bulb[2]], 0.021, 'brass', { photo: false });
  b.ellipsoid(bulb, [0.058, 0.082, 0.058], 'glow', { photo: false, device: 'lamp' });
  for (let i = 0; i < 3; i++) {
    b.rod(bulbFoot, shade[3][i * 16], 0.003, 'brass', { photo: false, segments: 5 });
  }

  const support = b.at(80, 582, lampDepth);
  const top = [support[0],support[1] - 0.035,support[2]];
  b.rod(top, [top[0],top[1] + 0.032,top[2]], 0.32, 'walnut', { photo: false, segments: 32 });
  const legs = [[-0.21,-0.17],[0.21,-0.17],[0,0.23]];
  for (const [x,z] of legs) {
    b.rod([top[0]+x*1.17,-1.48,top[2]+z*1.17], [top[0]+x,top[1],top[2]+z],
          0.019, 'darkWood', { photo: false, segments: 8 });
  }
}

function ceilingFittings(b) {
  function fitting(f) {
    const {u,v,rx,ry,tilt,wallY,type} = f;
    const rings = [[1.0,0.000], [0.96,-0.007], [0.82,-0.009], [0.78,-0.005], [0.73,-0.004]]
       .map(([s,offset]) => measuredEllipse(b,u,v,rx*s,ry*s,tilt,wallY+offset,44));
    for(let i=0;i<rings.length-1;i++){
      const m = type === 'audio' ? ['wall','ceramic','metal','black'][i]
                                 : ['metal','brass','black','brass'][i];
      bridge(b, rings[i], rings[i+1], m);
    }
    b.face(rings[rings.length-1], type === 'audio' ? 'metal' : 'glow', {device:type});
  }
  fitting({u:203.8,v:16.3,rx:30.1,ry:11.4,tilt:0.18,wallY:2.620,type:'spots'});
  fitting({u:1485.0,v:27.6,rx:31,ry:10.7,tilt:-0.2,wallY:2.385,type:'spots'});
  fitting({u:803.4,v:210.2,rx:18.7,ry:5.6,tilt:-0.019,wallY:2.385,type:'spots'});
  fitting({u:438.5,v:36.5,rx:43.5,ry:16.4,tilt:0.107,wallY:2.619,type:'audio'});
  // Continue the same recessed fittings along the two unseen soffits.
  for (const [s,w] of [[-2.06, 1.6],[-2.06, 5.5],[1.9,-1.85]]) {
    const center = room(s,w,2.382);
    const rim = (r,dy) => segments(28,t=>[center[0]+r*Math.cos(t),center[1]+dy,center[2]+r*Math.sin(t)]);
    const outside=rim(.112,-.002), reveal=rim(.094,-.003), aperture=rim(.083,.002);
    bridge(b,outside,reveal,'metal',{photo:false});
    bridge(b,reveal,aperture,'black',{photo:false});
    b.face(aperture,'glow',{photo:false,device:'spots'});
  }
}

function cove(b) {
  const knots = [[-880,-155],[0,49.7],[220,101.7],[460,157.2],[540,175.6],
                 [580,180.8],[620,188.7],[652,193],[679,187.2],[706,178.6],
                 [765,163],[822,149.1],[840,142.5],[1000,91.6],[1200,26],[2040,-250]];
  const y = 2.548;
  const upper = knots.map(([u,v]) => horizontalPoint(b,u,v-3.5,y+0.014));
  const lower = knots.map(([u,v]) => horizontalPoint(b,u,v+4.6,y-0.014));
  for (let i=1;i<knots.length;i++) {
    b.face([upper[i-1],upper[i],lower[i],lower[i-1]],'glow',{device:'cove'});
  }
  // These three corners lie outside the original image. The strip continues
  // around the camera, following the four-sided architectural tray.
  const extra = [[5.53,-1.61],[-1.86,-1.61],[-1.86,7.71]];
  const endUpper = [upper.at(-1), ...extra.map(([s,w]) => room(s,w,y+.014)), upper[0]];
  const endLower = [lower.at(-1), ...extra.map(([s,w]) => room(s,w,y-.014)), lower[0]];
  for (let i=1;i<endUpper.length;i++) {
    b.face([endUpper[i-1],endUpper[i],endLower[i],endLower[i-1]],'glow',{photo:false,device:'cove'});
  }
}

export function addFixtures(b) {
  chandelier(b);
  roomLamp(b);
  ceilingFittings(b);
  cove(b);
}
