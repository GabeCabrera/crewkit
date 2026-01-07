/**
 * BoxHero Sync Service
 * Syncs equipment from BoxHero to local database
 * Optimized with batch database operations
 */

import { prisma } from "@/lib/prisma";
import { getBoxHeroItems, BoxHeroItem } from "@/lib/boxhero";
import { UnitType, Prisma } from "@prisma/client";

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  archived: number;
  errors: string[];
  syncedAt: Date;
}

/**
 * Map BoxHero unit type to Prisma UnitType enum
 */
function mapUnitType(boxheroUnit?: string): UnitType {
  if (!boxheroUnit) return "UNIT";
  
  const normalized = boxheroUnit.toUpperCase();
  
  const mapping: Record<string, UnitType> = {
    "UNIT": "UNIT",
    "UNITS": "UNIT",
    "EA": "UNIT",
    "EACH": "UNIT",
    "PCS": "UNIT",
    "PIECE": "UNIT",
    "PIECES": "UNIT",
    "BOX": "BOX",
    "BOXES": "BOX",
    "BX": "BOX",
    "CASE": "CASE",
    "CASES": "CASE",
    "CS": "CASE",
    "PALLET": "PALLET",
    "PALLETS": "PALLET",
    "PLT": "PALLET",
    "FOOT": "FOOT",
    "FEET": "FOOT",
    "FT": "FOOT",
    "YARD": "YARD",
    "YARDS": "YARD",
    "YD": "YARD",
    "POUND": "POUND",
    "POUNDS": "POUND",
    "LB": "POUND",
    "LBS": "POUND",
  };
  
  return mapping[normalized] || "OTHER";
}

/**
 * Extract price from BoxHero item attributes
 * Tries multiple common attribute names for price
 */
function extractPrice(item: BoxHeroItem): number {
  if (!item.attributes) return 0;
  
  // Common attribute names for price (case-insensitive check)
  const priceKeys = [
    "price", "Price", "PRICE",
    "unit_price", "Unit_Price", "Unit Price", "UNIT_PRICE",
    "cost", "Cost", "COST",
    "unit_cost", "Unit_Cost", "Unit Cost", "UNIT_COST",
    "price_per_unit", "Price_Per_Unit", "PRICE_PER_UNIT",
    "retail_price", "Retail_Price", "RETAIL_PRICE",
    "sale_price", "Sale_Price", "SALE_PRICE",
  ];
  
  for (const key of priceKeys) {
    const value = item.attributes[key];
    if (value !== undefined && value !== null && value !== "") {
      const parsed = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  }
  
  // Also check for any key containing "price" or "cost" (case-insensitive)
  for (const [key, value] of Object.entries(item.attributes)) {
    const lowerKey = key.toLowerCase();
    if ((lowerKey.includes("price") || lowerKey.includes("cost")) && value !== undefined && value !== null && value !== "") {
      const parsed = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  }
  
  return 0;
}

/**
 * Generate a unique SKU for BoxHero items
 */
function generateSku(item: BoxHeroItem): string {
  // Prefer barcode, then sku attribute, then generate from ID
  if (item.barcode && item.barcode.trim()) {
    return item.barcode.trim();
  }
  if (item.sku && item.sku.trim()) {
    return item.sku.trim();
  }
  return `BH-${item.id}`;
}

/**
 * Calculate total quantity across all locations
 */
function calculateTotalQuantity(item: BoxHeroItem): number {
  if (!item.quantities || item.quantities.length === 0) {
    return 0;
  }
  return item.quantities.reduce((sum, q) => sum + q.quantity, 0);
}

/**
 * Sync all equipment from BoxHero to local database using batch operations
 * - Creates new equipment for new BoxHero items
 * - Updates existing equipment matched by boxheroId
 * - Archives equipment that no longer exists in BoxHero
 */
export async function syncFromBoxHero(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    created: 0,
    updated: 0,
    archived: 0,
    errors: [],
    syncedAt: new Date(),
  };

  try {
    console.log("[Sync] Starting BoxHero sync with batch operations...");
    
    // Fetch all items from BoxHero
    const boxheroItems = await getBoxHeroItems();
    console.log(`[Sync] Fetched ${boxheroItems.length} items from BoxHero`);

    // Get all current equipment with boxheroId
    const existingEquipment = await prisma.equipment.findMany({
      where: { boxheroId: { not: null } },
      select: { id: true, boxheroId: true, sku: true },
    });
    
    const existingByBoxheroId = new Map(
      existingEquipment.map(e => [e.boxheroId!, e])
    );
    
    // Get all existing SKUs for conflict detection
    const existingSKUs = await prisma.equipment.findMany({
      select: { sku: true, boxheroId: true },
    });
    const skuSet = new Set(existingSKUs.map(e => e.sku));
    
    // Track which BoxHero IDs we've processed
    const processedBoxheroIds = new Set<number>();

    // Prepare batch data
    const itemsToUpdate: Array<{
      id: string;
      data: Prisma.EquipmentUpdateInput;
      quantity: number;
    }> = [];
    
    const itemsToCreate: Array<{
      data: Prisma.EquipmentCreateInput;
      quantity: number;
    }> = [];

    // Log first item's attributes to help debug price extraction
    if (boxheroItems.length > 0 && boxheroItems[0].attributes) {
      console.log(`[Sync] Sample item attributes:`, JSON.stringify(boxheroItems[0].attributes));
    }

    // Process each BoxHero item and categorize
    for (const item of boxheroItems) {
      try {
        let sku = generateSku(item);
        const totalQuantity = calculateTotalQuantity(item);
        const unitType = mapUnitType(item.attributes?.unit_type as string);
        const price = extractPrice(item);
        
        const existing = existingByBoxheroId.get(item.id);
        
        if (existing) {
          // Existing item - prepare update
          itemsToUpdate.push({
            id: existing.id,
            data: {
              name: item.name || "Unnamed Item",
              sku: existing.sku, // Keep existing SKU to avoid conflicts
              description: item.memo || null,
              pricePerUnit: price,
              unitType,
              photoUrl: item.photo_url || null,
              boxheroId: item.id,
              lastSyncedAt: new Date(),
              isArchived: false,
            },
            quantity: totalQuantity,
          });
        } else {
          // New item - handle SKU conflicts
          if (skuSet.has(sku)) {
            sku = `${sku}-BH${item.id}`;
          }
          // Add to set to prevent duplicates within this batch
          skuSet.add(sku);
          
          itemsToCreate.push({
            data: {
              name: item.name || "Unnamed Item",
              sku,
              description: item.memo || null,
              pricePerUnit: price,
              unitType,
              photoUrl: item.photo_url || null,
              boxheroId: item.id,
              lastSyncedAt: new Date(),
              isArchived: false,
            },
            quantity: totalQuantity,
          });
        }
        
        processedBoxheroIds.add(item.id);
      } catch (itemError) {
        const errorMsg = `Failed to process item ${item.id} (${item.name}): ${itemError}`;
        console.error(`[Sync] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    console.log(`[Sync] Prepared ${itemsToUpdate.length} updates, ${itemsToCreate.length} creates`);

    // Execute batch operations without a transaction for better performance
    // For sync operations, partial progress is acceptable
    const CHUNK_SIZE = 100; // Larger chunks for faster processing
    
    // Process updates in chunks with parallel execution
    console.log(`[Sync] Updating ${itemsToUpdate.length} existing items...`);
    for (let i = 0; i < itemsToUpdate.length; i += CHUNK_SIZE) {
      const chunk = itemsToUpdate.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(item => 
          prisma.equipment.update({
            where: { id: item.id },
            data: item.data,
          })
        )
      );
      console.log(`[Sync] Updated ${Math.min(i + CHUNK_SIZE, itemsToUpdate.length)}/${itemsToUpdate.length} items`);
    }
    result.updated = itemsToUpdate.length;

    // Create new equipment and inventory
    console.log(`[Sync] Creating ${itemsToCreate.length} new items...`);
    for (const item of itemsToCreate) {
      const newEquipment = await prisma.equipment.create({
        data: item.data,
      });
      await prisma.inventory.create({
        data: {
          equipmentId: newEquipment.id,
          quantity: item.quantity,
        },
      });
    }
    result.created = itemsToCreate.length;

    // Batch upsert inventory for existing items
    if (itemsToUpdate.length > 0) {
      console.log(`[Sync] Updating inventory for ${itemsToUpdate.length} items...`);
      for (let i = 0; i < itemsToUpdate.length; i += CHUNK_SIZE) {
        const chunk = itemsToUpdate.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(item =>
            prisma.inventory.upsert({
              where: { equipmentId: item.id },
              create: {
                equipmentId: item.id,
                quantity: item.quantity,
              },
              update: {
                quantity: item.quantity,
              },
            })
          )
        );
        console.log(`[Sync] Updated inventory ${Math.min(i + CHUNK_SIZE, itemsToUpdate.length)}/${itemsToUpdate.length}`);
      }
    }

    // Archive equipment that no longer exists in BoxHero (single batch operation)
    const toArchive = existingEquipment.filter(
      e => e.boxheroId && !processedBoxheroIds.has(e.boxheroId)
    );
    
    if (toArchive.length > 0) {
      await prisma.equipment.updateMany({
        where: {
          id: { in: toArchive.map(e => e.id) },
        },
        data: {
          isArchived: true,
          lastSyncedAt: new Date(),
        },
      });
      result.archived = toArchive.length;
      console.log(`[Sync] Archived ${toArchive.length} items no longer in BoxHero`);
    }

    // Archive any non-BoxHero equipment (legacy items) - single batch operation
    const legacyResult = await prisma.equipment.updateMany({
      where: {
        boxheroId: null,
        isArchived: false,
      },
      data: {
        isArchived: true,
      },
    });
    
    if (legacyResult.count > 0) {
      result.archived += legacyResult.count;
      console.log(`[Sync] Archived ${legacyResult.count} legacy (non-BoxHero) items`);
    }

    result.success = true;
    console.log(`[Sync] Completed: ${result.created} created, ${result.updated} updated, ${result.archived} archived`);
    
  } catch (error) {
    const errorMsg = `Sync failed: ${error}`;
    console.error(`[Sync] ${errorMsg}`);
    result.errors.push(errorMsg);
  }

  return result;
}

/**
 * Get the last sync timestamp
 */
export async function getLastSyncTime(): Promise<Date | null> {
  const latest = await prisma.equipment.findFirst({
    where: { lastSyncedAt: { not: null } },
    orderBy: { lastSyncedAt: "desc" },
    select: { lastSyncedAt: true },
  });
  
  return latest?.lastSyncedAt || null;
}

/**
 * Get sync statistics
 */
export async function getSyncStats(): Promise<{
  totalEquipment: number;
  syncedFromBoxHero: number;
  archivedCount: number;
  lastSyncedAt: Date | null;
}> {
  const [total, synced, archived, lastSync] = await Promise.all([
    prisma.equipment.count({ where: { isArchived: false } }),
    prisma.equipment.count({ where: { boxheroId: { not: null }, isArchived: false } }),
    prisma.equipment.count({ where: { isArchived: true } }),
    getLastSyncTime(),
  ]);
  
  return {
    totalEquipment: total,
    syncedFromBoxHero: synced,
    archivedCount: archived,
    lastSyncedAt: lastSync,
  };
}
