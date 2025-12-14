import locationsData from './locations.json' with { type: 'json' };

export interface Location {
  id: string | number;
  name: string | null;
  nameEn: string | null;
  lat: number;
  lon: number;
}

export const locations: Location[] = locationsData as Location[];

/**
 * Get a location by its ID
 * @param id - Location ID
 * @returns Location or undefined if not found
 */
export function getById(id: string | number): Location | undefined {
  return locations.find(loc => loc.id === id || loc.id === String(id));
}

/**
 * Get locations by exact name match
 * @param name - Exact name to match (Hebrew or English)
 * @returns Array of matching locations
 */
export function getByName(name: string): Location[] {
  return locations.filter(loc =>
    loc.name === name || loc.nameEn === name
  );
}

/**
 * Search locations by name
 * @param query - Search query string
 * @param lang - Language to search in: 'en', 'he', or 'both' (default)
 * @returns Array of matching locations
 */
export function searchByName(query: string, lang: 'en' | 'he' | 'both' = 'both'): Location[] {
  const lowerQuery = query.toLowerCase();
  return locations.filter(loc => {
    if (lang === 'en' || lang === 'both') {
      if (loc.nameEn && loc.nameEn.toLowerCase().includes(lowerQuery)) {
        return true;
      }
    }
    if (lang === 'he' || lang === 'both') {
      if (loc.name && loc.name.includes(query)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Find nearest locations to given coordinates
 * @param lat - Latitude
 * @param lon - Longitude
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of nearest locations, sorted by distance
 */
export function findNearest(lat: number, lon: number, limit: number = 10): Location[] {
  const withDistance = locations.map(loc => ({
    ...loc,
    distance: Math.sqrt(
      Math.pow(loc.lat - lat, 2) + Math.pow(loc.lon - lon, 2)
    )
  }));

  return withDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ distance, ...loc }) => loc);
}

export default {
  locations,
  getById,
  getByName,
  searchByName,
  findNearest
};
