/**
 * BoxHero API Client
 * Read-only integration with BoxHero inventory management
 * API Docs: https://docs-en.boxhero.io/integrations/open-api
 * API Reference: https://rest.boxhero-app.com/docs/api
 */

const BOXHERO_BASE_URL = "https://rest.boxhero-app.com";
const BOXHERO_API_TOKEN = process.env.BOXHERO_API_TOKEN;

// Rate limiting: 5 requests per second
const RATE_LIMIT_DELAY = 200; // ms between requests
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// BoxHero API Types
export interface BoxHeroItem {
  id: number;
  name: string;
  barcode?: string;
  sku?: string;
  memo?: string;
  photo_url?: string;
  attributes?: Record<string, string | number>;
  quantities?: BoxHeroQuantity[];
  created_at?: string;
  updated_at?: string;
}

export interface BoxHeroQuantity {
  location_id: number;
  location_name: string;
  quantity: number;
}

export interface BoxHeroLocation {
  id: number;
  name: string;
}

// Generic response type that handles various formats BoxHero might return
export interface BoxHeroListResponse {
  // Could be under 'data', 'items', or at root level as array
  data?: BoxHeroItem[];
  items?: BoxHeroItem[];
  has_more?: boolean;
  hasMore?: boolean;
  cursor?: string;
  next_cursor?: string;
}

export interface BoxHeroError {
  id: string;
  type: string;
  title: string;
  correlation_id: string;
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make authenticated requests with retry logic
async function boxheroFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<T> {
  if (!BOXHERO_API_TOKEN) {
    throw new Error("BOXHERO_API_TOKEN is not configured");
  }

  const url = `${BOXHERO_BASE_URL}${endpoint}`;
  console.log(`[BoxHero] Fetching: ${endpoint}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${BOXHERO_API_TOKEN}`,
      ...options.headers,
    },
  });

  // Handle rate limiting
  if (response.status === 429) {
    if (retries > 0) {
      const resetTime = response.headers.get("X-Ratelimit-Reset");
      const waitTime = resetTime ? parseInt(resetTime) * 1000 : RETRY_DELAY;
      console.log(`[BoxHero] Rate limited, waiting ${waitTime}ms before retry...`);
      await delay(waitTime);
      return boxheroFetch<T>(endpoint, options, retries - 1);
    }
    throw new Error("Rate limit exceeded, max retries reached");
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[BoxHero] Error response:`, errorText);
    
    let error: BoxHeroError;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = {
        id: "unknown",
        type: "/errors/unknown",
        title: `HTTP ${response.status}: ${response.statusText}`,
        correlation_id: "unknown",
      };
    }
    throw new Error(`BoxHero API Error: ${error.title} (${error.type})`);
  }

  const data = await response.json();
  console.log(`[BoxHero] Response keys:`, Object.keys(data));
  
  return data;
}

/**
 * Extract items array from BoxHero response (handles various formats)
 */
function extractItems(response: any): BoxHeroItem[] {
  // If response is an array, return it directly
  if (Array.isArray(response)) {
    return response;
  }
  
  // Try various possible keys
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  if (response.items && Array.isArray(response.items)) {
    return response.items;
  }
  
  // If response has a results key
  if (response.results && Array.isArray(response.results)) {
    return response.results;
  }
  
  // Log the structure for debugging
  console.log(`[BoxHero] Unexpected response structure:`, JSON.stringify(response, null, 2).slice(0, 500));
  
  return [];
}

/**
 * Extract pagination info from BoxHero response
 */
function extractPagination(response: any): { hasMore: boolean; cursor?: string } {
  return {
    hasMore: response.has_more ?? response.hasMore ?? false,
    cursor: response.cursor ?? response.next_cursor ?? undefined,
  };
}

/**
 * Fetch all items from BoxHero with automatic pagination
 */
export async function getBoxHeroItems(locationIds?: number[]): Promise<BoxHeroItem[]> {
  const allItems: BoxHeroItem[] = [];
  let cursor: string | undefined;
  let hasMore = true;
  let pageCount = 0;
  const maxPages = 100; // Safety limit

  while (hasMore && pageCount < maxPages) {
    pageCount++;
    
    // Build query params
    const params = new URLSearchParams();
    params.set("limit", "100");
    
    if (cursor) {
      params.set("cursor", cursor);
    }
    
    if (locationIds && locationIds.length > 0) {
      locationIds.forEach(id => params.append("location_ids", id.toString()));
    }

    const response = await boxheroFetch<any>(`/v1/items?${params.toString()}`);
    
    const items = extractItems(response);
    const pagination = extractPagination(response);
    
    console.log(`[BoxHero] Page ${pageCount}: Got ${items.length} items, hasMore: ${pagination.hasMore}`);
    
    // Log first item from first page to see structure
    if (pageCount === 1 && items.length > 0) {
      console.log(`[BoxHero] Sample item structure:`, JSON.stringify(items[0], null, 2));
    }
    
    allItems.push(...items);
    hasMore = pagination.hasMore;
    cursor = pagination.cursor;

    // Respect rate limits between paginated requests
    if (hasMore && cursor) {
      await delay(RATE_LIMIT_DELAY);
    } else {
      // No more pages or no cursor, stop
      hasMore = false;
    }
  }

  console.log(`[BoxHero] Total items fetched: ${allItems.length}`);
  return allItems;
}

/**
 * Fetch a single item by ID
 */
export async function getBoxHeroItem(itemId: number): Promise<BoxHeroItem> {
  return boxheroFetch<BoxHeroItem>(`/v1/items/${itemId}`);
}

/**
 * Fetch all locations
 */
export async function getBoxHeroLocations(): Promise<BoxHeroLocation[]> {
  const response = await boxheroFetch<any>("/v1/locations");
  
  // Handle various response formats
  if (Array.isArray(response)) {
    return response;
  }
  
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  if (response.locations && Array.isArray(response.locations)) {
    return response.locations;
  }
  
  console.log(`[BoxHero] Unexpected locations response:`, response);
  return [];
}

/**
 * Normalize BoxHero item to match local Equipment interface
 */
export interface NormalizedEquipment {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  pricePerUnit: number;
  unitType: string;
  quantity: number;
  source: "boxhero";
  boxheroId: number;
  photoUrl?: string;
  quantities?: {
    locationId: number;
    locationName: string;
    quantity: number;
  }[];
}

export function normalizeBoxHeroItem(item: BoxHeroItem): NormalizedEquipment {
  // Calculate total quantity across all locations
  const totalQuantity = item.quantities?.reduce((sum, q) => sum + q.quantity, 0) || 0;

  return {
    id: `boxhero-${item.id}`,
    name: item.name || "Unnamed Item",
    sku: item.barcode || item.sku || `BH-${item.id}`,
    description: item.memo || null,
    pricePerUnit: 0, // BoxHero may have this in attributes
    unitType: "UNIT",
    quantity: totalQuantity,
    source: "boxhero",
    boxheroId: item.id,
    photoUrl: item.photo_url,
    quantities: item.quantities?.map(q => ({
      locationId: q.location_id,
      locationName: q.location_name,
      quantity: q.quantity,
    })),
  };
}

/**
 * Fetch and normalize all BoxHero items
 */
export async function getNormalizedBoxHeroItems(locationIds?: number[]): Promise<NormalizedEquipment[]> {
  const items = await getBoxHeroItems(locationIds);
  return items.map(normalizeBoxHeroItem);
}
