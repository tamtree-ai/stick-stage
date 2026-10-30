/**
 * Map projection for the `map` figure: Natural Earth I (Šavrič et al. 2011), in map units
 * ×1000 with y down, the units `src/data/maps/world-110m.json` is stored in. Pure maths.
 */
const RAD = Math.PI / 180;

/** Longitude, latitude (degrees) → map units (x right, y down). */
export const project = (lon: number, lat: number): [number, number] => {
  const l = lon * RAD;
  const p = lat * RAD;
  const p2 = p * p;
  const p4 = p2 * p2;
  const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
  const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
  return [x * 1000, -y * 1000];
};

/** A lon/lat box → a map-units box `[x0, y0, x1, y1]`. */
export const projectBox = ([lon0, lat0, lon1, lat1]: readonly number[]): [number, number, number, number] => {
  const pts = [project(lon0!, lat0!), project(lon1!, lat1!), project(lon0!, lat1!), project(lon1!, lat0!), project((lon0! + lon1!) / 2, lat1!), project((lon0! + lon1!) / 2, lat0!)];
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

/** The world without Antarctica, the default view. */
export const WORLD_VIEW = projectBox([-180, -58, 180, 84]);
