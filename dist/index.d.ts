export interface Location {
    id: string | number;
    name: string | null;
    nameEn: string | null;
    lat: number;
    lon: number;
}
export declare const locations: Location[];
/**
 * Get a location by its ID
 * @param id - Location ID
 * @returns Location or undefined if not found
 */
export declare function getById(id: string | number): Location | undefined;
/**
 * Get locations by exact name match
 * @param name - Exact name to match (Hebrew or English)
 * @returns Array of matching locations
 */
export declare function getByName(name: string): Location[];
/**
 * Search locations by name
 * @param query - Search query string
 * @param lang - Language to search in: 'en', 'he', or 'both' (default)
 * @returns Array of matching locations
 */
export declare function searchByName(query: string, lang?: 'en' | 'he' | 'both'): Location[];
/**
 * Find nearest locations to given coordinates
 * @param lat - Latitude
 * @param lon - Longitude
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of nearest locations, sorted by distance
 */
export declare function findNearest(lat: number, lon: number, limit?: number): Location[];
declare const _default: {
    locations: Location[];
    getById: typeof getById;
    getByName: typeof getByName;
    searchByName: typeof searchByName;
    findNearest: typeof findNearest;
};
export default _default;
//# sourceMappingURL=index.d.ts.map