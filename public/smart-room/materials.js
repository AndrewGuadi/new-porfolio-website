// Tiles run left to right from the top of the photograph-derived atlas.
// Scale is repeat count per meter; RGB is an sRGB tint multiplier.
export const TILE_GRID = 4;

const finish = (tile, scale, color = [1, 1, 1]) => ({ tile, scale, color });

export const MATERIALS = {
  stone:       finish(0, 0.83),
  walnut:      finish(1, 0.94),
  wood:        finish(1, 1.05, [1.07, 1.06, 1.03]),
  woodGrain:   finish(1, 1.05),
  oak:         finish(2, 0.92),
  leather:     finish(3, 2.5),
  darkLeather: finish(3, 2.5, [0.74, 0.70, 0.67]),
  fabric:      finish(4, 2.9),
  knit:        finish(5, 3.9),
  rug:         finish(6, 1.13),
  curtain:     finish(7, 1.15),
  shade:       finish(8, 2.4),
  wall:        finish(9, 1.55),
  ceiling:     finish(9, 1.3, [1.04, 1.05, 1.06]),
  metal:       finish(10, 3.0),
  brass:       finish(10, 3.0, [1.14, 0.80, 0.45]),
  black:       finish(10, 3.0, [0.15, 0.16, 0.17]),
  leaf:        finish(11, 7.0),
  darkWood:    finish(12, 1.05),
  ceramic:     finish(13, 3.0),
  wax:         finish(13, 4.9, [1.12, 1.05, 0.91]),
  glow:        finish(14, 3.0, [1.16, 1.08, 0.94]),
  paper:       finish(14, 4.3),
  book:        finish(14, 3.5, [0.58, 0.49, 0.39]),
  glass:       finish(15, 1.2, [0.70, 0.77, 0.78]),
  window:      finish(15, 1.0, [0.70, 0.89, 0.99]),
  screen:      finish(15, 1.0, [0.17, 0.19, 0.21]),
  firebox:     finish(15, 2.0, [0.25, 0.20, 0.16]),
};
