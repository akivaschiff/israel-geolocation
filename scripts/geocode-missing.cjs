require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: GOOGLE_MAPS_API_KEY not found in .env file');
  process.exit(1);
}

// Load data
const unmatched = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'unmatched_towns.json'), 'utf8')
);

const currentLocations = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'dist', 'locations.json'), 'utf8')
);

console.log(`🔍 Starting geocoding process...`);
console.log(`📋 Unmatched towns: ${unmatched.length}`);
console.log(`📍 Current locations: ${currentLocations.length}`);
console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);

// Helper: Geocode a location
async function geocodeLocation(town) {
  const searchQuery = town.nameEn || town.name;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery + ', Israel')}&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        success: true,
        lat: location.lat,
        lon: location.lng,
        formatted_address: data.results[0].formatted_address
      };
    } else if (data.status === 'ZERO_RESULTS') {
      return { success: false, error: 'No results found' };
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      return { success: false, error: 'API quota exceeded', fatal: true };
    } else {
      return { success: false, error: data.status };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Helper: Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main geocoding process
async function geocodeAll() {
  const results = {
    successful: [],
    failed: [],
    skipped: []
  };

  console.log(`\n⏳ Starting geocoding (this may take a few minutes)...\n`);

  for (let i = 0; i < unmatched.length; i++) {
    const town = unmatched[i];
    const progress = `[${i + 1}/${unmatched.length}]`;

    // Skip certain types
    if (town.name.includes('שבט') || town.name === 'לא רשום') {
      console.log(`${progress} ⏭️  Skipping: ${town.name} (${town.nameEn || 'N/A'})`);
      results.skipped.push(town);
      continue;
    }

    console.log(`${progress} 🔍 Geocoding: ${town.name} (${town.nameEn || 'N/A'})...`);

    const result = await geocodeLocation(town);

    if (result.success) {
      console.log(`${progress} ✅ Found: ${result.lat}, ${result.lon}`);

      const newLocation = {
        id: town.townCode,
        name: town.name,
        nameEn: town.nameEn || '',
        lat: result.lat,
        lon: result.lon
      };

      results.successful.push(newLocation);
    } else {
      console.log(`${progress} ❌ Failed: ${result.error}`);
      results.failed.push({
        ...town,
        error: result.error
      });

      if (result.fatal) {
        console.log('\n❌ Fatal error: API quota exceeded. Stopping.');
        break;
      }
    }

    // Rate limiting: 50 requests/second max, we'll do 10/second to be safe
    await sleep(100);
  }

  return results;
}

// Run the geocoding
(async () => {
  const results = await geocodeAll();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n📊 Geocoding Results:\n`);
  console.log(`✅ Successful: ${results.successful.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);

  if (results.successful.length > 0) {
    // Merge with existing locations
    const mergedLocations = [...currentLocations, ...results.successful];

    // Sort by population (descending)
    mergedLocations.sort((a, b) => {
      const popA = a.population || 0;
      const popB = b.population || 0;
      return popB - popA;
    });

    // Save updated locations
    fs.writeFileSync(
      path.join(__dirname, '..', 'dist', 'locations.json'),
      JSON.stringify(mergedLocations, null, 2)
    );

    console.log(`\n✅ Updated dist/locations.json`);
    console.log(`📦 Total locations now: ${mergedLocations.length}`);

    // Rebuild index.js
    const indexContent = `// Auto-generated file
const locations = ${JSON.stringify(mergedLocations)};

export { locations };

export function getCities() {
  return locations.filter(l => l.type === 'city');
}

export function getTowns() {
  return locations.filter(l => l.type === 'town');
}

export function getVillages() {
  return locations.filter(l => l.type === 'village');
}

export function searchByName(query, lang = 'both') {
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

export function getByDistrict(districtName) {
  return locations.filter(loc =>
    loc.district && loc.district.includes(districtName)
  );
}

export function findNearest(lat, lon, limit = 10) {
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
  getCities,
  getTowns,
  getVillages,
  searchByName,
  getByDistrict,
  findNearest
};
`;

    fs.writeFileSync(
      path.join(__dirname, '..', 'dist', 'index.js'),
      indexContent
    );

    console.log(`✅ Rebuilt dist/index.js`);
  }

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      successful: results.successful.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      total_before: currentLocations.length,
      total_after: currentLocations.length + results.successful.length
    },
    successful: results.successful,
    failed: results.failed,
    skipped: results.skipped
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'geocoding-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log(`\n📄 Detailed report saved to: geocoding-report.json`);

  if (results.failed.length > 0) {
    console.log(`\n⚠️  Failed locations saved in report. You may need to:`);
    console.log(`   1. Check the failed entries manually`);
    console.log(`   2. Try different search terms`);
    console.log(`   3. Add coordinates manually`);
  }

  console.log(`\n${'='.repeat(60)}\n`);
})();
