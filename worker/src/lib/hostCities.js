export const HOST_CITIES = [
  { id: 'atlanta', city: 'Atlanta', stadium: 'Mercedes-Benz Stadium', country: 'USA', lat: 33.755, lng: -84.401 },
  { id: 'boston', city: 'Boston', stadium: 'Gillette Stadium', country: 'USA', lat: 42.091, lng: -71.264 },
  { id: 'dallas', city: 'Dallas', stadium: 'AT&T Stadium', country: 'USA', lat: 32.748, lng: -97.093 },
  { id: 'houston', city: 'Houston', stadium: 'NRG Stadium', country: 'USA', lat: 29.685, lng: -95.411 },
  { id: 'kansas-city', city: 'Kansas City', stadium: 'Arrowhead Stadium', country: 'USA', lat: 39.049, lng: -94.484 },
  { id: 'los-angeles', city: 'Los Angeles', stadium: 'SoFi Stadium', country: 'USA', lat: 33.953, lng: -118.339 },
  { id: 'miami', city: 'Miami', stadium: 'Hard Rock Stadium', country: 'USA', lat: 25.958, lng: -80.239 },
  { id: 'new-york', city: 'New York / New Jersey', stadium: 'MetLife Stadium', country: 'USA', lat: 40.814, lng: -74.074 },
  { id: 'philadelphia', city: 'Philadelphia', stadium: 'Lincoln Financial Field', country: 'USA', lat: 39.901, lng: -75.168 },
  { id: 'bay-area', city: 'San Francisco Bay Area', stadium: "Levi's Stadium", country: 'USA', lat: 37.403, lng: -121.970 },
  { id: 'seattle', city: 'Seattle', stadium: 'Lumen Field', country: 'USA', lat: 47.595, lng: -122.332 },
  { id: 'guadalajara', city: 'Guadalajara', stadium: 'Estadio Akron', country: 'Mexico', lat: 20.682, lng: -103.462 },
  { id: 'mexico-city', city: 'Mexico City', stadium: 'Estadio Azteca', country: 'Mexico', lat: 19.303, lng: -99.150 },
  { id: 'monterrey', city: 'Monterrey', stadium: 'Estadio BBVA', country: 'Mexico', lat: 25.669, lng: -100.244 },
  { id: 'toronto', city: 'Toronto', stadium: 'BMO Field', country: 'Canada', lat: 43.633, lng: -79.418 },
  { id: 'vancouver', city: 'Vancouver', stadium: 'BC Place', country: 'Canada', lat: 49.277, lng: -123.112 },
];

const byId = new Map(HOST_CITIES.map((c) => [c.id, c]));
export function getHostCity(id) {
  return byId.get(id);
}
