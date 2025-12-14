# israel-geolocation 🇮🇱

Complete geolocation data for Israeli cities, towns, and villages with Hebrew and English names.

**936 locations** including 59 official cities, 28 towns, and 849 villages.

Based on official data from the Israeli Central Bureau of Statistics (CBS), OpenStreetMap, and google maps.

## Features

- ✅ Complete data for all Israeli localities
- ✅ Hebrew and English names
- ✅ Precise coordinates (latitude/longitude)
- ✅ TypeScript support with full type definitions
- ✅ Zero dependencies
- ✅ Tree-shakeable ES modules
- ✅ Works offline (no API calls)
- ✅ Perfect for React, Vue, Next.js, and any JavaScript framework

## Installation

```bash
npm install israel-geolocation
```

## Data Sources

- **Official locality list**: Israeli Central Bureau of Statistics (data.gov.il)
- **Geolocation coordinates**: [OpenStreetMap](https://www.openstreetmap.org/) (ODbL license)

**Coverage**: Includes 936 out of 1,282 officially recognized localities (73%). Missing locations are primarily small Bedouin tribes and settlements in disputed territories that lack precise coordinates in OpenStreetMap.

## Usage

### Basic Usage

```javascript
import { locations, getCities, getTowns, searchByName, getByDistrict } from 'israel-geolocation';

// Get all locations
console.log(locations.length); // 936

// Get only cities (59 official Israeli cities)
const cities = getCities();
console.log(cities); // [{ name: 'תל אביב - יפו', nameEn: 'TEL AVIV - YAFO', type: 'city', ... }]

// Search by name
const results = searchByName('תל אביב');
const resultsEn = searchByName('jerusalem', 'en');

// Get locations by district
const haifaTowns = getByDistrict('חיפה');
```

### React Example with Leaflet

```jsx
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { locations } from 'israel-geolocation';

function IsraelMap() {
  const [selectedCity, setSelectedCity] = useState(null);

  return (
    <MapContainer center={[31.5, 34.75]} zoom={8} style={{ height: '600px' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {locations.map((location) => (
        <Marker
          key={location.id}
          position={[location.lat, location.lon]}
          eventHandlers={{
            click: () => setSelectedCity(location),
          }}
        >
          <Popup>
            <div>
              <h3>{location.nameEn || location.name}</h3>
              <p>{location.name}</p>
              {location.population && <p>Population: {location.population.toLocaleString()}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default IsraelMap;
```

### Next.js Example

```jsx
'use client';

import dynamic from 'next/dynamic';
import { getCities } from 'israel-geolocation';

// Dynamically import map component (Leaflet doesn't work with SSR)
const Map = dynamic(() => import('./Map'), { ssr: false });

export default function Page() {
  const cities = getCities();

  return (
    <div>
      <h1>Israeli Cities</h1>
      <ul>
        {cities.map((city) => (
          <li key={city.id}>
            {city.nameEn || city.name} - Population: {city.population}
          </li>
        ))}
      </ul>
      <Map locations={cities} />
    </div>
  );
}
```

### Vue 3 Example

```vue
<template>
  <div>
    <input v-model="searchQuery" placeholder="Search for a city..." />
    <ul>
      <li v-for="location in filteredLocations" :key="location.id">
        {{ location.nameEn || location.name }}
        ({{ location.lat }}, {{ location.lon }})
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { searchByName } from 'israel-geolocation';

const searchQuery = ref('');

const filteredLocations = computed(() => {
  if (!searchQuery.value) return [];
  return searchByName(searchQuery.value);
});
</script>
```

### Find Nearest Locations

```javascript
import { findNearest } from 'israel-geolocation';

// Find 5 nearest locations to Tel Aviv
const nearbyLocations = findNearest(32.0853, 34.7818, 5);
console.log(nearbyLocations);
```

## API

### `locations: Location[]`

Array of all 936 locations in Israel.

### `getCities(): Location[]`

Returns all official cities (59 locations with official city status).

### `getTowns(): Location[]`

Returns all towns (28 locations).

### `getVillages(): Location[]`

Returns all villages (849 locations).

### `searchByName(query: string, lang?: 'en' | 'he' | 'both'): Location[]`

Search locations by name. Default language is 'both'.

### `getByDistrict(districtName: string): Location[]`

Get all locations in a specific district (in Hebrew). Example: `getByDistrict('חיפה')`

### `findNearest(lat: number, lon: number, limit?: number): Location[]`

Find nearest locations to given coordinates. Default limit is 10.

## Location Object Structure

```typescript
interface Location {
  id: string | number;       // Town code or OpenStreetMap node ID
  name: string | null;       // Hebrew name
  nameEn: string | null;     // English name
  lat: number;               // Latitude
  lon: number;               // Longitude
  type: 'city' | 'town' | 'village' | 'unknown';
  population: number | null; // Population (if available)
  wikidata: string | null;   // Wikidata ID (if available)
  district: string | null;   // District name in Hebrew (if available)
  districtCode: number | null; // District code (if available)
}
```

## TypeScript

Full TypeScript support is included. Import types:

```typescript
import type { Location } from 'israel-geolocation';

const city: Location = {
  id: '5000',
  name: 'תל אביב-יפו',
  nameEn: 'Tel Aviv-Yafo',
  lat: 32.0853,
  lon: 34.7818,
  type: 'city',
  population: 460613,
  wikidata: 'Q33935',
  district: 'תל אביב',
  districtCode: 61
};
```

## Bundle Size

- Minified: ~180KB
- Gzipped: ~35KB

Tree-shakeable, so if you only import specific functions, you'll get a smaller bundle.

## License

MIT

Data from OpenStreetMap © OpenStreetMap contributors, available under the Open Database License (ODbL).

## Contributing

Issues and pull requests are welcome!

Repository: https://github.com/yourusername/israel-geolocation

## Credits

Built with data from [OpenStreetMap](https://www.openstreetmap.org/)
