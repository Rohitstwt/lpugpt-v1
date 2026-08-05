/**
 * LPU campus + Law Gate map data.
 * - `openstreetmap`: verified OSM Overpass extract
 * - `campus_guide`: well-known LPU spots placed relative to OSM anchors
 *   (for blocks OSM doesn't name yet — still inside campus bbox)
 */

export const LPU_CENTER = { lat: 31.253361, lng: 75.703539 };

export const LPU_BOUNDS = {
  south: 31.2457534,
  north: 31.2609695,
  west: 75.6978407,
  east: 75.7105,
};

export type PlaceCategory =
  | "block"
  | "institute"
  | "facility"
  | "food"
  | "bank"
  | "sports"
  | "medical"
  | "hostel"
  | "shop"
  | "admin"
  | "landmark";

export type CampusPlace = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  description?: string;
  category: PlaceCategory;
  source: "openstreetmap" | "campus_guide";
  osmName?: string;
};

/** Verified OSM features on / beside LPU */
const OSM_CORE: CampusPlace[] = [
  {
    id: "lpu",
    lat: 31.253361,
    lng: 75.703539,
    name: "LPU Campus",
    description: "Lovely Professional University",
    category: "landmark",
    source: "openstreetmap",
    osmName: "Lovely Professional University",
  },
  {
    id: "library",
    lat: 31.251822,
    lng: 75.70344,
    name: "Central Library",
    description: "Main campus library",
    category: "facility",
    source: "openstreetmap",
    osmName: "Central Library",
  },
  {
    id: "uni-mall",
    lat: 31.255828,
    lng: 75.704856,
    name: "LPU Mall",
    description: "Campus mall & shopping",
    category: "facility",
    source: "openstreetmap",
    osmName: "LPU Mall",
  },
  {
    id: "block-18",
    lat: 31.255259,
    lng: 75.703346,
    name: "Block 18",
    description: "Academic block",
    category: "block",
    source: "openstreetmap",
    osmName: "Block 18, LPU",
  },
  {
    id: "lit",
    lat: 31.257965,
    lng: 75.706842,
    name: "Institute of Technology",
    description: "Lovely Institute of Technology",
    category: "institute",
    source: "openstreetmap",
    osmName: "Lovely Institute of Technology",
  },
  {
    id: "lim",
    lat: 31.258659,
    lng: 75.708832,
    name: "Institute of Management",
    description: "Lovely Institute Of Management",
    category: "institute",
    source: "openstreetmap",
    osmName: "Lovely Institute Of Management",
  },
  {
    id: "pharmacy",
    lat: 31.257621,
    lng: 75.707196,
    name: "Institute of Pharmacy",
    description: "Lovely Institute of Pharmacy",
    category: "institute",
    source: "openstreetmap",
    osmName: "Lovely Institute of Pharmacy",
  },
  {
    id: "design",
    lat: 31.256625,
    lng: 75.707019,
    name: "School of Design",
    category: "institute",
    source: "openstreetmap",
    osmName: "School of Design",
  },
  {
    id: "ground",
    lat: 31.255779,
    lng: 75.710374,
    name: "LPU Ground",
    description: "Open ground / field",
    category: "sports",
    source: "openstreetmap",
    osmName: "LPU Ground",
  },
  {
    id: "voll",
    lat: 31.248208,
    lng: 75.702118,
    name: "Volleyball Court",
    category: "sports",
    source: "openstreetmap",
    osmName: "voll",
  },
];

/** OSM amenities around Law Gate (student life — food, banks, gyms) */
const OSM_NEARBY: CampusPlace[] = [
  { id: "pnb", lat: 31.254455, lng: 75.699189, name: "Punjab National Bank", category: "bank", source: "openstreetmap", osmName: "Punjab National Bank" },
  { id: "hdfc", lat: 31.254181, lng: 75.699081, name: "HDFC Bank", category: "bank", source: "openstreetmap", osmName: "HDFC Bank" },
  { id: "amit-food", lat: 31.254528, lng: 75.699071, name: "Amit Food", category: "food", source: "openstreetmap", osmName: "Amit Food" },
  { id: "majlis", lat: 31.254611, lng: 75.698987, name: "Majlis Restaurant", category: "food", source: "openstreetmap", osmName: "Majlis Restaurant" },
  { id: "friends-cafe", lat: 31.254241, lng: 75.698941, name: "Friend's Cafe", category: "food", source: "openstreetmap", osmName: "Friend's Cafe" },
  { id: "house-of-shakes", lat: 31.254035, lng: 75.699287, name: "House Of Shakes", category: "food", source: "openstreetmap", osmName: "House Of Shakes" },
  { id: "kulhad-masti", lat: 31.254285, lng: 75.699537, name: "Kulhad Masti", category: "food", source: "openstreetmap", osmName: "Kulhad Masti" },
  { id: "dogra-dhaba", lat: 31.2541, lng: 75.699739, name: "Dogra Dhaba", category: "food", source: "openstreetmap", osmName: "dogra dhaba" },
  { id: "desi-delicious", lat: 31.254827, lng: 75.698554, name: "Desi & Delicious", category: "food", source: "openstreetmap", osmName: "desi & delicious" },
  { id: "ghost-shooter", lat: 31.254399, lng: 75.699414, name: "Ghost Shooter", category: "food", source: "openstreetmap", osmName: "Ghost Shooter" },
  { id: "angad-dairy", lat: 31.254042, lng: 75.699367, name: "Angad Dairy", category: "food", source: "openstreetmap", osmName: "Angad Dairy" },
  { id: "oven-express", lat: 31.251872, lng: 75.69796, name: "Oven Express", category: "food", source: "openstreetmap", osmName: "Oven Express restaurant" },
  { id: "golden-gym", lat: 31.254753, lng: 75.698386, name: "Golden Gym", category: "sports", source: "openstreetmap", osmName: "golden gym" },
  { id: "target-gym", lat: 31.253677, lng: 75.699123, name: "The Target Gym", category: "sports", source: "openstreetmap", osmName: "The Target Gym" },
  { id: "mg-fitness", lat: 31.2518, lng: 75.697979, name: "MG Fitness Gym", category: "sports", source: "openstreetmap", osmName: "MG fitness gym" },
  { id: "owl-store", lat: 31.252842, lng: 75.698349, name: "The Owl Store", category: "shop", source: "openstreetmap", osmName: "The Owl Store" },
  { id: "it-world", lat: 31.254483, lng: 75.698433, name: "IT World", category: "shop", source: "openstreetmap", osmName: "IT World" },
  { id: "balaji-mart", lat: 31.2518, lng: 75.697903, name: "Balaji Mart", category: "shop", source: "openstreetmap", osmName: "Balaji Mart" },
  { id: "universal-medicos", lat: 31.254397, lng: 75.697847, name: "Universal Medicos", category: "medical", source: "openstreetmap", osmName: "Universal Medicos" },
  { id: "oyo-conclave", lat: 31.254219, lng: 75.698904, name: "OYO Conclave Suites", category: "hostel", source: "openstreetmap", osmName: "OYO - Conclave Suites" },
  { id: "noor-inn", lat: 31.254153, lng: 75.699072, name: "Noor Inn", category: "hostel", source: "openstreetmap", osmName: "Noor Inn" },
  { id: "hotel-dwarka", lat: 31.254131, lng: 75.699046, name: "Hotel Dwarka Inn", category: "hostel", source: "openstreetmap", osmName: "Hotel Dwarka Inn" },
  { id: "law-gate", lat: 31.252467, lng: 75.695869, name: "Law Gate", description: "Main off-campus student hub", category: "landmark", source: "openstreetmap", osmName: "Law gate" },
];

/**
 * Campus guide points — academic / hostel / facilities students expect.
 * Anchored to OSM library / mall / Block 18 / institutes so they sit on campus.
 */
const CAMPUS_GUIDE: CampusPlace[] = [
  // Academic blocks (relative to Block 18 + Library + Mall cluster)
  { id: "block-13", lat: 31.2564, lng: 75.7058, name: "Block 13", description: "Academic block", category: "block", source: "campus_guide" },
  { id: "block-14", lat: 31.2561, lng: 75.7049, name: "Block 14", category: "block", source: "campus_guide" },
  { id: "block-25", lat: 31.2546, lng: 75.7026, name: "Block 25", category: "block", source: "campus_guide" },
  { id: "block-26", lat: 31.2542, lng: 75.7021, name: "Block 26", category: "block", source: "campus_guide" },
  { id: "block-27", lat: 31.2538, lng: 75.7017, name: "Block 27", category: "block", source: "campus_guide" },
  { id: "block-28", lat: 31.2534, lng: 75.7012, name: "Block 28", category: "block", source: "campus_guide" },
  { id: "block-29", lat: 31.2549, lng: 75.7029, name: "Block 29", description: "Engineering lecture halls", category: "block", source: "campus_guide" },
  { id: "block-30", lat: 31.2539, lng: 75.7041, name: "Block 30", category: "block", source: "campus_guide" },
  { id: "block-32", lat: 31.2532, lng: 75.7048, name: "Block 32", description: "Near library side", category: "block", source: "campus_guide" },
  { id: "block-33", lat: 31.2527, lng: 75.7054, name: "Block 33", description: "Labs & classrooms", category: "block", source: "campus_guide" },
  { id: "block-34", lat: 31.2523, lng: 75.7042, name: "Block 34", description: "CSE / IT area", category: "block", source: "campus_guide" },
  { id: "block-36", lat: 31.2556, lng: 75.7024, name: "Block 36", category: "block", source: "campus_guide" },
  { id: "block-37", lat: 31.256, lng: 75.7018, name: "Block 37", category: "block", source: "campus_guide" },
  { id: "block-38", lat: 31.2565, lng: 75.7012, name: "Block 38", description: "Engineering labs", category: "block", source: "campus_guide" },
  { id: "block-55", lat: 31.2572, lng: 75.7055, name: "Block 55", category: "block", source: "campus_guide" },
  { id: "block-56", lat: 31.2576, lng: 75.7061, name: "Block 56", category: "block", source: "campus_guide" },
  { id: "block-57", lat: 31.258, lng: 75.7066, name: "Block 57", category: "block", source: "campus_guide" },

  // Facilities
  { id: "admin", lat: 31.2548, lng: 75.7038, name: "Admin Block", description: "University administration", category: "admin", source: "campus_guide" },
  { id: "auditorium", lat: 31.2554, lng: 75.7043, name: "Shanti Devi Mittal Auditorium", category: "facility", source: "campus_guide" },
  { id: "food-court", lat: 31.2544, lng: 75.7032, name: "Campus Food Court", category: "food", source: "campus_guide" },
  { id: "uni-hospital", lat: 31.2526, lng: 75.7062, name: "Uni Hospital / Medical", category: "medical", source: "campus_guide" },
  { id: "main-gate", lat: 31.2594, lng: 75.7042, name: "Main Gate", description: "Primary campus entrance", category: "landmark", source: "campus_guide" },
  { id: "uni-hospital-gate", lat: 31.2512, lng: 75.7018, name: "Hospital Gate", category: "landmark", source: "campus_guide" },
  { id: "sports-complex", lat: 31.2492, lng: 75.7038, name: "Sports Complex", description: "Indoor / outdoor sports", category: "sports", source: "campus_guide" },
  { id: "stadium", lat: 31.2486, lng: 75.7048, name: "Athletic Stadium", category: "sports", source: "campus_guide" },
  { id: "swimming", lat: 31.2496, lng: 75.7055, name: "Swimming Pool", category: "sports", source: "campus_guide" },
  { id: "amphitheatre", lat: 31.2541, lng: 75.7051, name: "Open Air Theatre", category: "facility", source: "campus_guide" },
  { id: "architecture", lat: 31.2569, lng: 75.7078, name: "School of Architecture", category: "institute", source: "campus_guide" },
  { id: "law-school", lat: 31.2574, lng: 75.7084, name: "School of Law", category: "institute", source: "campus_guide" },
  { id: "agriculture", lat: 31.2508, lng: 75.7072, name: "School of Agriculture", category: "institute", source: "campus_guide" },
  { id: "hotel-mgmt", lat: 31.2551, lng: 75.7064, name: "Hotel Management Block", category: "institute", source: "campus_guide" },

  // Hostels (boys/girls clusters — guide positions)
  { id: "bh-1", lat: 31.2489, lng: 75.7078, name: "Boys Hostel BH-1", category: "hostel", source: "campus_guide" },
  { id: "bh-2", lat: 31.2484, lng: 75.7084, name: "Boys Hostel BH-2", category: "hostel", source: "campus_guide" },
  { id: "bh-3", lat: 31.2479, lng: 75.709, name: "Boys Hostel BH-3", category: "hostel", source: "campus_guide" },
  { id: "bh-4", lat: 31.2475, lng: 75.7072, name: "Boys Hostel BH-4", category: "hostel", source: "campus_guide" },
  { id: "bh-5", lat: 31.2471, lng: 75.708, name: "Boys Hostel BH-5", category: "hostel", source: "campus_guide" },
  { id: "bh-6", lat: 31.2468, lng: 75.7088, name: "Boys Hostel BH-6", category: "hostel", source: "campus_guide" },
  { id: "gh-1", lat: 31.2502, lng: 75.7086, name: "Girls Hostel GH-1", category: "hostel", source: "campus_guide" },
  { id: "gh-2", lat: 31.2498, lng: 75.7092, name: "Girls Hostel GH-2", category: "hostel", source: "campus_guide" },
  { id: "gh-3", lat: 31.2494, lng: 75.7098, name: "Girls Hostel GH-3", category: "hostel", source: "campus_guide" },
  { id: "gh-4", lat: 31.2506, lng: 75.7094, name: "Girls Hostel GH-4", category: "hostel", source: "campus_guide" },
  { id: "gh-5", lat: 31.2501, lng: 75.710, name: "Girls Hostel GH-5", category: "hostel", source: "campus_guide" },
  { id: "gh-6", lat: 31.2496, lng: 75.7104, name: "Girls Hostel GH-6", category: "hostel", source: "campus_guide" },

  // More student spots
  { id: "uni-hospital-pharmacy", lat: 31.2529, lng: 75.7066, name: "Campus Pharmacy", category: "medical", source: "campus_guide" },
  { id: "post-office", lat: 31.2546, lng: 75.7046, name: "Campus Post Office", category: "facility", source: "campus_guide" },
  { id: "stationery", lat: 31.2552, lng: 75.7052, name: "Campus Stationery", category: "shop", source: "campus_guide" },
  { id: "mac", lat: 31.2555, lng: 75.7041, name: "MAC (Student Activity)", category: "facility", source: "campus_guide" },
  { id: "placement", lat: 31.2542, lng: 75.7044, name: "Division of Career Services", category: "admin", source: "campus_guide" },
  { id: "exam-block", lat: 31.2536, lng: 75.7056, name: "Examination Wing", category: "admin", source: "campus_guide" },
  { id: "cse-labs", lat: 31.2521, lng: 75.7038, name: "CSE Lab Complex", category: "block", source: "campus_guide" },
  { id: "workshop", lat: 31.2516, lng: 75.7026, name: "Central Workshop", category: "facility", source: "campus_guide" },
  { id: "temple", lat: 31.253, lng: 75.7024, name: "Campus Temple", category: "landmark", source: "campus_guide" },
  { id: "gurudwara", lat: 31.2535, lng: 75.702, name: "Campus Gurudwara", category: "landmark", source: "campus_guide" },
];

export const CAMPUS_PLACES: CampusPlace[] = [
  ...OSM_CORE,
  ...OSM_NEARBY,
  ...CAMPUS_GUIDE,
];

export const CAMPUS_BLOCKS: Record<
  string,
  { lat: number; lng: number; name: string; description?: string }
> = Object.fromEntries(
  CAMPUS_PLACES.map((p) => [
    p.id,
    { lat: p.lat, lng: p.lng, name: p.name, description: p.description },
  ])
);

// Numeric block aliases: "38" → block-38
for (const p of CAMPUS_PLACES) {
  const m = p.id.match(/^block-(\d+)$/);
  if (m) CAMPUS_BLOCKS[m[1]] = CAMPUS_BLOCKS[p.id];
}
CAMPUS_BLOCKS["mall"] = CAMPUS_BLOCKS["uni-mall"];
CAMPUS_BLOCKS["foodcourt"] = CAMPUS_BLOCKS["food-court"];
CAMPUS_BLOCKS["canteen"] = CAMPUS_BLOCKS["food-court"];
CAMPUS_BLOCKS["gate"] = CAMPUS_BLOCKS["main-gate"];
CAMPUS_BLOCKS["sports"] = CAMPUS_BLOCKS["sports-complex"];
CAMPUS_BLOCKS["medical"] = CAMPUS_BLOCKS["uni-hospital"];
CAMPUS_BLOCKS["hospital"] = CAMPUS_BLOCKS["uni-hospital"];
CAMPUS_BLOCKS["hostel"] = CAMPUS_BLOCKS["bh-3"];

export function listCampusPlaces(): CampusPlace[] {
  return CAMPUS_PLACES;
}

export function placesByCategory(category: PlaceCategory | "all") {
  if (category === "all") return CAMPUS_PLACES;
  return CAMPUS_PLACES.filter((p) => p.category === category);
}

export function extractBlockNumber(text: string): string | null {
  const match = text.match(/\bblock\s*(\d+)\b/i);
  return match ? match[1] : null;
}

export function resolveLocation(text: string): {
  lat: number;
  lng: number;
  name: string;
  description?: string;
} | null {
  const lower = text.toLowerCase().trim();

  const blockNum = extractBlockNumber(text);
  if (blockNum && CAMPUS_BLOCKS[blockNum]) {
    return CAMPUS_BLOCKS[blockNum];
  }

  const ranked = [...CAMPUS_PLACES].sort(
    (a, b) => b.name.length - a.name.length
  );

  for (const place of ranked) {
    const n = place.name.toLowerCase();
    const osm = place.osmName?.toLowerCase() || "";
    if (lower === n || lower === osm || lower === place.id) return place;
    if (lower.includes(n) || (osm && lower.includes(osm))) return place;
  }

  const aliases: Array<[string, string]> = [
    ["central library", "library"],
    ["library", "library"],
    ["lpu mall", "uni-mall"],
    ["uni mall", "uni-mall"],
    ["mall", "uni-mall"],
    ["food court", "food-court"],
    ["canteen", "food-court"],
    ["mess", "food-court"],
    ["law gate", "law-gate"],
    ["main gate", "main-gate"],
    ["hospital gate", "uni-hospital-gate"],
    ["uni hospital", "uni-hospital"],
    ["medical", "uni-hospital"],
    ["sports complex", "sports-complex"],
    ["stadium", "stadium"],
    ["auditorium", "auditorium"],
    ["admin", "admin"],
    ["boys hostel", "bh-3"],
    ["girls hostel", "gh-1"],
    ["hostel", "bh-3"],
    ["school of design", "design"],
    ["pharmacy", "pharmacy"],
    ["technology", "lit"],
    ["management", "lim"],
    ["architecture", "architecture"],
    ["placement", "placement"],
    ["lpu campus", "lpu"],
    ["campus", "lpu"],
  ];
  for (const [alias, id] of aliases) {
    if (lower.includes(alias) && CAMPUS_BLOCKS[id]) return CAMPUS_BLOCKS[id];
  }

  return null;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateWalkTime(distanceMeters: number): number {
  return Math.round(distanceMeters / 80) * 60;
}

export function buildMapsDirectionsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${fromLat}%2C${fromLng}%3B${toLat}%2C${toLng}`;
}

export function getGoogleMapsBrowserKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

export function getGoogleMapsServerKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  );
}
