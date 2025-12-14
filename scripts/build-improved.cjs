const fs = require('fs');
const path = require('path');

// Helper function to normalize Hebrew text for matching
function normalizeHebrew(text) {
  if (!text) return '';
  return text
    .trim()
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/\s*-\s*/g, '-')       // Normalize hyphens (remove spaces around them)
    .replace(/'/g, "'")             // Normalize apostrophes
    .replace(/'/g, "'")
    .toLowerCase();
}

// Helper function to calculate Levenshtein distance
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + 1   // substitution
        );
      }
    }
  }

  return dp[m][n];
}

// Helper function to check if strings are similar (fuzzy match)
function isSimilar(str1, str2, threshold = 2) {
  const norm1 = normalizeHebrew(str1);
  const norm2 = normalizeHebrew(str2);

  // Exact match
  if (norm1 === norm2) return true;

  // One contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Levenshtein distance check (allow up to threshold characters difference)
  const distance = levenshteinDistance(norm1, norm2);
  return distance <= threshold;
}

(async () => {
  console.log('🔍 Fetching official Israeli towns from data.gov.il...');

  // Fetch official government data
  const res = await fetch(
    'https://data.gov.il/api/3/action/datastore_search?' +
    new URLSearchParams({ resource_id: '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba', limit: '1500' })
  );

  const { result } = await res.json();
  const officialTowns = result.records;

  console.log(`✅ Fetched ${officialTowns.length} official towns from data.gov.il`);

  // Load OpenStreetMap geolocation data
  const osmData = JSON.parse(fs.readFileSync('/tmp/israel_places.json', 'utf8'));

  console.log(`🗺️  Loaded ${osmData.elements.length} locations from OpenStreetMap`);

  // Create a lookup map for OSM data by Hebrew and English names
  const osmLookup = new Map();

  osmData.elements.forEach(element => {
    const tags = element.tags || {};
    const nameHe = tags.name || tags['name:he'];
    const nameEn = tags['name:en'] || tags.int_name;

    // Store by multiple normalized keys for better matching
    if (nameHe) {
      const normalized = normalizeHebrew(nameHe);
      if (!osmLookup.has(normalized)) {
        osmLookup.set(normalized, element);
      }
      // Also store original (non-normalized) for exact matches
      osmLookup.set(nameHe.trim(), element);
    }

    if (nameEn) {
      const normalized = nameEn.trim().toLowerCase();
      if (!osmLookup.has(normalized)) {
        osmLookup.set(normalized, element);
      }
    }
  });

  console.log(`🔑 Created OSM lookup with ${osmLookup.size} entries`);

  // Load manual matches
  const manualMatches = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'manual-matches.json'), 'utf8')
  ).matches;

  console.log(`📝 Loaded ${Object.keys(manualMatches).length} manual matches`);

  // Match official towns with geolocation data
  const matched = [];
  const unmatched = [];
  const fuzzyMatches = [];

  officialTowns.forEach(town => {
    const hebrewName = town['שם_ישוב']?.trim();
    const englishName = town['שם_ישוב_לועזי']?.trim();
    const townCode = town['סמל_ישוב']?.trim();

    if (!hebrewName && !englishName) {
      return; // Skip entries without names
    }

    // Try to find matching OSM data
    let osmMatch = null;
    let matchType = 'none';

    // 0. Try manual match first
    if (hebrewName && manualMatches[hebrewName]) {
      const manualOsmName = manualMatches[hebrewName];
      const normalizedManual = normalizeHebrew(manualOsmName);
      if (osmLookup.has(normalizedManual)) {
        osmMatch = osmLookup.get(normalizedManual);
        matchType = 'manual';
      } else if (osmLookup.has(manualOsmName)) {
        osmMatch = osmLookup.get(manualOsmName);
        matchType = 'manual';
      }
    }

    // 1. Try exact match with normalized Hebrew name
    if (!osmMatch && hebrewName) {
      const normalizedHe = normalizeHebrew(hebrewName);
      if (osmLookup.has(normalizedHe)) {
        osmMatch = osmLookup.get(normalizedHe);
        matchType = 'exact_he';
      }
    }

    // 2. Try exact match with English name
    if (!osmMatch && englishName) {
      const normalizedEn = englishName.toLowerCase().trim();
      if (osmLookup.has(normalizedEn)) {
        osmMatch = osmLookup.get(normalizedEn);
        matchType = 'exact_en';
      }
    }

    // 3. Fuzzy matching disabled - will be done manually by LLM
    // No fuzzy matching to avoid false positives

    if (osmMatch) {
      const tags = osmMatch.tags || {};

      matched.push({
        id: townCode || osmMatch.id,
        name: hebrewName,
        nameEn: englishName,
        lat: osmMatch.lat,
        lon: osmMatch.lon,
        _matchType: matchType
      });
    } else {
      unmatched.push({
        name: hebrewName,
        nameEn: englishName,
        townCode: townCode
      });
    }
  });

  console.log(`\n📊 Matching Results:`);
  console.log(`✅ Matched: ${matched.length} towns`);
  console.log(`   - Manual matches: ${matched.filter(m => m._matchType === 'manual').length}`);
  console.log(`   - Exact Hebrew matches: ${matched.filter(m => m._matchType === 'exact_he').length}`);
  console.log(`   - Exact English matches: ${matched.filter(m => m._matchType === 'exact_en').length}`);
  console.log(`❌ Unmatched: ${unmatched.length} towns`);

  // Report fuzzy matches
  if (fuzzyMatches.length > 0) {
    console.log(`\n🔍 Fuzzy Matches Found (${fuzzyMatches.length}):`);
    fuzzyMatches.forEach(fm => {
      console.log(`   "${fm.govName}" → "${fm.osmName}" (distance: ${fm.distance})`);
    });
  }

  // Count cities
  const cities = matched.filter(m => m.type === 'city');
  console.log(`\n🏙️  Official Cities: ${cities.length}`);
  console.log(`   Sample: ${cities.slice(0, 5).map(c => c.nameEn || c.name).join(', ')}`);

  // Load previously geocoded locations if available
  const geocodingReportPath = path.join(__dirname, '..', 'geocoding-report.json');
  if (fs.existsSync(geocodingReportPath)) {
    const geocodingReport = JSON.parse(fs.readFileSync(geocodingReportPath, 'utf8'));
    if (geocodingReport.successful && geocodingReport.successful.length > 0) {
      console.log(`\n🗺️  Merging ${geocodingReport.successful.length} previously geocoded locations...`);
      matched.push(...geocodingReport.successful);
      console.log(`✅ Total after merge: ${matched.length} locations`);
    }
  }

  // Sort matched by population (descending)
  matched.sort((a, b) => {
    const popA = a.population || 0;
    const popB = b.population || 0;
    return popB - popA;
  });

  // Remove _matchType before saving (internal only)
  matched.forEach(m => delete m._matchType);

  // Report unmatched towns
  if (unmatched.length > 0) {
    console.log(`\n⚠️  WARNING: ${unmatched.length} towns without geolocation:`);
    unmatched.slice(0, 20).forEach(town => {
      console.log(`   - ${town.name} (${town.nameEn || 'N/A'}) [${town.district}]`);
    });
    if (unmatched.length > 20) {
      console.log(`   ... and ${unmatched.length - 20} more`);
    }

    // Save unmatched towns to a file for review
    fs.writeFileSync(
      path.join(__dirname, '..', 'unmatched_towns.json'),
      JSON.stringify(unmatched, null, 2)
    );
    console.log(`\n📝 Full list of unmatched towns saved to: unmatched_towns.json`);
  }

  // Create dist directory
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Write the main data file to both dist/ and src/ (TypeScript needs it in src/)
  const locationsJson = JSON.stringify(matched, null, 2);

  fs.writeFileSync(
    path.join(distDir, 'locations.json'),
    locationsJson
  );

  const srcDir = path.join(__dirname, '..', 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(srcDir, 'locations.json'),
    locationsJson
  );

  console.log('\n✅ Build complete!');
  console.log(`📦 Total locations: ${matched.length}`);
  console.log(`📂 Output: ${distDir}`);

  // Statistics
  const towns = matched.filter(l => l.type === 'town').length;
  const villages = matched.filter(l => l.type === 'village').length;

  console.log(`\n📊 Final Statistics:`);
  console.log(`   Cities: ${cities.length}`);
  console.log(`   Towns: ${towns}`);
  console.log(`   Villages: ${villages}`);
})();
