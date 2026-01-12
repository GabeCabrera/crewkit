import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * POST /api/assembly-categories/migrate
 * 
 * Migration script to:
 * 1. Create categories from unique assembly.categories values
 * 2. Optionally infer types from assembly names (patterns like "Terminal", "Intermediate", etc.)
 * 3. Link assemblies to their new category/type records
 * 
 * This is a one-time migration script. Run it after deploying the new schema.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["SUPERUSER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to dry run
    const createTypes = body.createTypes === true; // Opt-in to auto-create types

    const results = {
      dryRun,
      categoriesCreated: [] as string[],
      typesCreated: [] as { name: string; category: string }[],
      assembliesUpdated: [] as { id: string; name: string; category: string | null; type: string | null }[],
      errors: [] as string[],
    };

    // 1. Collect all unique categories from existing assemblies
    const assemblies = await prisma.assembly.findMany({
      select: {
        id: true,
        name: true,
        categories: true,
        categoryId: true,
        typeId: true,
      },
    });

    // Get unique category names from old format
    const uniqueCategories = new Set<string>();
    assemblies.forEach((a) => {
      a.categories.forEach((cat) => {
        if (cat && cat.trim()) {
          uniqueCategories.add(cat.trim());
        }
      });
    });

    // 2. Create categories for each unique value
    const categoryMap = new Map<string, string>(); // name -> id

    // First, get existing categories
    const existingCategories = await prisma.assemblyCategory.findMany();
    existingCategories.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    });

    // Create new categories
    for (const catName of Array.from(uniqueCategories)) {
      const normalizedName = catName.toLowerCase();
      if (!categoryMap.has(normalizedName)) {
        if (!dryRun) {
          try {
            const newCat = await prisma.assemblyCategory.create({
              data: { name: catName, order: categoryMap.size },
            });
            categoryMap.set(normalizedName, newCat.id);
            results.categoriesCreated.push(catName);
          } catch (error) {
            results.errors.push(`Failed to create category "${catName}": ${error}`);
          }
        } else {
          results.categoriesCreated.push(catName);
        }
      }
    }

    // 3. Optionally create types based on assembly name patterns
    const typePatterns = [
      { pattern: /terminal/i, type: "Terminal Pole" },
      { pattern: /intermediate/i, type: "Intermediate Pole" },
      { pattern: /snowshoe/i, type: "Snowshoe" },
      { pattern: /anchor/i, type: "Anchor" },
      { pattern: /riser/i, type: "Riser" },
      { pattern: /splice/i, type: "Splice Case" },
      { pattern: /handhole/i, type: "Handhole" },
      { pattern: /vault/i, type: "Vault" },
      { pattern: /mst/i, type: "MST" },
      { pattern: /drop/i, type: "Drop" },
    ];

    const typeMap = new Map<string, Map<string, string>>(); // categoryId -> (typeName -> typeId)

    // Get existing types
    const existingTypes = await prisma.assemblyType.findMany();
    existingTypes.forEach((t) => {
      if (!typeMap.has(t.categoryId)) {
        typeMap.set(t.categoryId, new Map());
      }
      typeMap.get(t.categoryId)!.set(t.name.toLowerCase(), t.id);
    });

    if (createTypes) {
      // For each category, create common types
      for (const [catName, catId] of Array.from(categoryMap.entries())) {
        const resolvedCatId = dryRun ? `temp-${catName}` : catId;
        
        // Analyze assemblies in this category to determine types
        const categoryAssemblies = assemblies.filter((a) =>
          a.categories.some((c) => c.toLowerCase() === catName)
        );

        const typesToCreate = new Set<string>();
        categoryAssemblies.forEach((a) => {
          for (const { pattern, type } of typePatterns) {
            if (pattern.test(a.name)) {
              typesToCreate.add(type);
              break;
            }
          }
        });

        // Create types for this category
        if (!typeMap.has(resolvedCatId)) {
          typeMap.set(resolvedCatId, new Map());
        }

        for (const typeName of Array.from(typesToCreate)) {
          const normalizedType = typeName.toLowerCase();
          if (!typeMap.get(resolvedCatId)!.has(normalizedType)) {
            if (!dryRun) {
              try {
                const newType = await prisma.assemblyType.create({
                  data: {
                    name: typeName,
                    categoryId: catId,
                    order: typeMap.get(resolvedCatId)!.size,
                  },
                });
                typeMap.get(resolvedCatId)!.set(normalizedType, newType.id);
                results.typesCreated.push({ name: typeName, category: catName });
              } catch (error) {
                results.errors.push(`Failed to create type "${typeName}" in "${catName}": ${error}`);
              }
            } else {
              results.typesCreated.push({ name: typeName, category: catName });
            }
          }
        }
      }
    }

    // 4. Update assemblies with new categoryId and typeId
    for (const assembly of assemblies) {
      // Skip if already has categoryId
      if (assembly.categoryId) continue;

      // Find the first matching category
      let assignedCategoryId: string | null = null;
      let assignedCategoryName: string | null = null;

      for (const cat of assembly.categories) {
        const normalizedCat = cat.toLowerCase();
        if (categoryMap.has(normalizedCat)) {
          assignedCategoryId = categoryMap.get(normalizedCat)!;
          assignedCategoryName = cat;
          break;
        }
      }

      // Find matching type
      let assignedTypeId: string | null = null;
      let assignedTypeName: string | null = null;

      if (assignedCategoryId && createTypes) {
        const categoryTypes = typeMap.get(assignedCategoryId);
        if (categoryTypes) {
          for (const { pattern, type } of typePatterns) {
            if (pattern.test(assembly.name)) {
              const typeId = categoryTypes.get(type.toLowerCase());
              if (typeId) {
                assignedTypeId = typeId;
                assignedTypeName = type;
              }
              break;
            }
          }
        }
      }

      if (assignedCategoryId || assignedTypeId) {
        results.assembliesUpdated.push({
          id: assembly.id,
          name: assembly.name,
          category: assignedCategoryName,
          type: assignedTypeName,
        });

        if (!dryRun) {
          try {
            await prisma.assembly.update({
              where: { id: assembly.id },
              data: {
                categoryId: assignedCategoryId,
                typeId: assignedTypeId,
              },
            });
          } catch (error) {
            results.errors.push(`Failed to update assembly "${assembly.name}": ${error}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: dryRun 
        ? "Dry run complete. No changes were made. Set dryRun: false to apply changes."
        : "Migration complete.",
      results,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}
