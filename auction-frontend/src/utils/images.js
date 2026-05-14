/* Curated Unsplash photo IDs per sector — keeps image logic in one place */
const PHOTOS = {
  Technology:   "photo-1518770660439-4636190af475", // circuit board
  Finance:      "photo-1611974789855-9c2a0a7236a3", // stock charts
  Healthcare:   "photo-1559757175-0eb30cd8c063",    // medical lab
  Energy:       "photo-1466611653911-95081537e5b7", // solar field
  Consumer:     "photo-1556742049-0cfed4f6a45d",    // retail
  Industrial:   "photo-1565098772267-60af42b81ef2", // factory floor
  "Real Estate":"photo-1560518883-ce09059eeffa",    // building
  Utilities:    "photo-1473341304170-971dccb5ac1e", // power lines
};

const FALLBACK = "photo-1611974789855-9c2a0a7236a3";

export function sectorImage(sector, w = 600, h = 200) {
  const id = PHOTOS[sector] || FALLBACK;
  return `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=75&auto=format`;
}

export const LOGIN_BG = "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1200&h=900&fit=crop&q=80&auto=format";
