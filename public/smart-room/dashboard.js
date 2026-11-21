// Paint updated readouts into the two photographed displays, at source resolution.
// Keeping the neutral setting untouched preserves every detail of the reference angle.
export function dashboardPlate(source, temperature, armed) {
  if (temperature === 72 && !armed)return source;
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const g = canvas.getContext('2d');
  g.drawImage(source, 0, 0);
  if (temperature !== 72) {
    g.save();
    g.translate(1023, 393);
    g.transform(1, -.095, .028, 1, 0, 0);
    let fill = g.createLinearGradient(0, -8, 0, 8);
    fill.addColorStop(0, '#163351');
    fill.addColorStop(1, '#10243e');
    g.fillStyle = fill;
    g.fillRect(-10.8, -7.6, 22.1, 15.2);
    g.fillStyle = '#f3f7fa';
    g.font = '15px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(`${temperature}°`, .5, 0.2);
    g.restore();
    g.save();
    g.translate(922.7, 691);
    g.transform(.96, .09, -.22, 1, 0, 0);
    g.fillStyle = '#162642';
    g.fillRect(-10, -7.8, 22, 15);
    g.fillStyle = '#f2f7ff';
    g.font = 'italic 14px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(`${temperature}°`, .5, 0);
    g.restore();
  }
  if (armed) {
    g.save();
    g.translate(1085, 389);
    g.fillStyle = '#9ff2c2';
    g.shadowColor = '#65eaa4';
    g.shadowBlur = 3;
    g.beginPath();
    g.arc(9, -13, 2.6, 0, Math.PI*2);
    g.fill();
    g.restore();
  }
  return canvas;
}
export function tvTile(u, v) {
  if (v<374-(u-944)*.102 || v>444-(u-944)*.059)return null;
  const tiles = [[943, 991, 'lighting'], [997, 1048, 'climate'], [1054, 1110, 'security'], [1117, 1175, 'sound'], [1182, 1246, 'blinds'], [1252, 1323, 'scenes']];
  return tiles.find(([a, b]) => u>=a && u<=b)?.[2] || null;
}
