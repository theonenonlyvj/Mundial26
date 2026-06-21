const BOUNDS = { minLat: 14, maxLat: 60, minLng: -130, maxLng: -66 };

export function project(lat, lng, { width, height }) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * width;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * height;
  return { x, y };
}
