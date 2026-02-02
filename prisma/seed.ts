import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      name: 'Manager User',
      password: managerPassword,
      role: 'MANAGER',
    },
  });

  // Create field user
  const fieldPassword = await bcrypt.hash('field123', 10);
  const field = await prisma.user.upsert({
    where: { email: 'field@example.com' },
    update: {},
    create: {
      email: 'field@example.com',
      name: 'Field User',
      password: fieldPassword,
      role: 'FIELD',
    },
  });

  // Create sample equipment
  const equipment1 = await prisma.equipment.upsert({
    where: { sku: 'BOLT-14-MACHINE' },
    update: {},
    create: {
      name: '14" Machine Bolt',
      sku: 'BOLT-14-MACHINE',
      description: '14 inch machine bolt',
      pricePerUnit: 2.50,
      unitType: 'UNIT',
      inventory: {
        create: {
          quantity: 100,
        },
      },
    },
  });

  const equipment2 = await prisma.equipment.upsert({
    where: { sku: 'CABLE-STRAND-500' },
    update: {},
    create: {
      name: '500ft Strand Cable',
      sku: 'CABLE-STRAND-500',
      description: '500 foot strand cable',
      pricePerUnit: 150.00,
      unitType: 'FOOT',
      inventory: {
        create: {
          quantity: 5000,
        },
      },
    },
  });

  // Create default permit types
  const defaultPermitTypes = [
    { name: "RMP Permit", description: "Right of Way Management Permit", isDefault: true },
    { name: "SESD Permit", description: "State Environmental Services Division Permit", isDefault: true },
    { name: "Make-Ready", description: "Make-Ready work completion verification", isDefault: true },
    { name: "Easements", description: "Easement clearance verification", isDefault: true },
    { name: "DOT Permit", description: "Department of Transportation Permit", isDefault: true },
    { name: "Railroad Crossing", description: "Railroad crossing permit", isDefault: true },
    { name: "County Permit", description: "County-level permit", isDefault: true },
    { name: "City Permit", description: "City-level permit", isDefault: true },
  ];

  const createdPermitTypes = [];
  for (const permitType of defaultPermitTypes) {
    const created = await prisma.permitType.upsert({
      where: { name: permitType.name },
      update: {},
      create: permitType,
    });
    createdPermitTypes.push(created.name);
  }

  // ============================================
  // ASSEMBLY CATEGORIES (visual grouping only)
  // ============================================
  const assemblyCategories = [
    { 
      name: "Strand", 
      description: "Strand pole attachments", 
      order: 1 
    },
    { 
      name: "Fiber", 
      description: "Fiber pole attachments and infrastructure", 
      order: 2 
    },
    { 
      name: "Underground", 
      description: "Below-grade infrastructure", 
      order: 3 
    },
    { 
      name: "Service", 
      description: "MSTs, pedestals, service points", 
      order: 4 
    },
    { 
      name: "Hardware", 
      description: "Anchoring, guying equipment", 
      order: 5 
    },
  ];

  const createdCategories: Record<string, string> = {};
  for (const category of assemblyCategories) {
    const created = await prisma.assemblyCategory.upsert({
      where: { name: category.name },
      update: { description: category.description, order: category.order },
      create: category,
    });
    createdCategories[category.name] = created.id;
  }

  // ============================================
  // ASSEMBLY TYPES
  // ============================================
  // Slugs MUST match the TypeScript union in lib/assembly-detection.ts
  const assemblyTypes = [
    // Strand Group - Pole attachments for strand
    { 
      slug: "strand.terminal",
      name: "Strand: Terminal Pole", 
      description: "Dead end attachment with 1 connection", 
      categoryName: "Strand", 
      order: 1 
    },
    { 
      slug: "strand.tangent",
      name: "Strand: Tangent Pole", 
      description: "Straight pass-through, 2 connections at ~180 degrees", 
      categoryName: "Strand", 
      order: 2 
    },
    { 
      slug: "strand.corner",
      name: "Strand: Corner Pole", 
      description: "Angle change, 2 connections at sharp angle", 
      categoryName: "Strand", 
      order: 3 
    },
    { 
      slug: "strand.junction",
      name: "Strand: Junction Pole", 
      description: "Branch point with 3+ connections", 
      categoryName: "Strand", 
      order: 4 
    },
    
    // Fiber Group - Fiber pole attachments
    { 
      slug: "fiber.terminal",
      name: "Fiber: Terminal", 
      description: "Dead end fiber attachment with slack storage", 
      categoryName: "Fiber", 
      order: 1 
    },
    { 
      slug: "fiber.tangent",
      name: "Fiber: Tangent", 
      description: "Pass-through fiber attachment (P-clamps, snowshoes)", 
      categoryName: "Fiber", 
      order: 2 
    },
    { 
      slug: "fiber.corner",
      name: "Fiber: Corner", 
      description: "Angle fiber attachment with additional hardware", 
      categoryName: "Fiber", 
      order: 3 
    },
    { 
      slug: "fiber.junction",
      name: "Fiber: Junction", 
      description: "Multi-direction fiber attachment at branch points", 
      categoryName: "Fiber", 
      order: 4 
    },
    { 
      slug: "fiber.splice",
      name: "Fiber: Splice Case", 
      description: "Fiber splice enclosure", 
      categoryName: "Fiber", 
      order: 5 
    },
    { 
      slug: "fiber.slack",
      name: "Fiber: Slack Loop", 
      description: "Fiber slack storage", 
      categoryName: "Fiber", 
      order: 6 
    },
    
    // Underground Group - Below-grade infrastructure
    { 
      slug: "underground.vault",
      name: "Underground: Vault", 
      description: "Underground vault for equipment access", 
      categoryName: "Underground", 
      order: 1 
    },
    { 
      slug: "underground.handhole",
      name: "Underground: Handhole", 
      description: "Underground handhole for cable access", 
      categoryName: "Underground", 
      order: 2 
    },
    { 
      slug: "underground.riser",
      name: "Underground: Riser", 
      description: "Pole-to-underground transition", 
      categoryName: "Underground", 
      order: 3 
    },
    
    // Service Group - MSTs, pedestals, service points
    { 
      slug: "service.mst2",
      name: "Service: MST 2-Port", 
      description: "2-port multi-service terminal", 
      categoryName: "Service", 
      order: 1 
    },
    { 
      slug: "service.mst6",
      name: "Service: MST 6-Port", 
      description: "6-port multi-service terminal", 
      categoryName: "Service", 
      order: 2 
    },
    { 
      slug: "service.mst8",
      name: "Service: MST 8-Port", 
      description: "8-port multi-service terminal", 
      categoryName: "Service", 
      order: 3 
    },
    { 
      slug: "service.pedestal",
      name: "Service: Pedestal", 
      description: "Above-ground pedestal for service access", 
      categoryName: "Service", 
      order: 4 
    },
    
    // Hardware Group - Anchoring, guying equipment
    { 
      slug: "hardware.anchor",
      name: "Hardware: Guy/Anchor", 
      description: "Guying and anchoring hardware", 
      categoryName: "Hardware", 
      order: 1 
    },
    { 
      slug: "hardware.crossing",
      name: "Hardware: Crossing", 
      description: "Crossing infrastructure (road, railroad, etc.)", 
      categoryName: "Hardware", 
      order: 2 
    },
  ];

  const createdTypes: string[] = [];
  for (const assemblyType of assemblyTypes) {
    const categoryId = createdCategories[assemblyType.categoryName];
    if (!categoryId) {
      console.warn(`Category not found for type: ${assemblyType.slug}`);
      continue;
    }
    
    // Upsert by slug (unique identifier)
    await prisma.assemblyType.upsert({
      where: { slug: assemblyType.slug },
      update: { 
        name: assemblyType.name,
        description: assemblyType.description, 
        order: assemblyType.order,
        categoryId: categoryId,
      },
      create: {
        slug: assemblyType.slug,
        name: assemblyType.name,
        description: assemblyType.description,
        order: assemblyType.order,
        categoryId: categoryId,
      },
    });
    createdTypes.push(assemblyType.slug);
  }

  // ============================================
  // EQUIPMENT PATTERN MATCHING HELPER
  // ============================================
  // Helper to find equipment by name patterns (searches BoxHero-synced inventory)
  const findEquipmentByPatterns = async (patterns: string[]): Promise<{ id: string; name: string } | null> => {
    for (const pattern of patterns) {
      const equipment = await prisma.equipment.findFirst({
        where: {
          name: {
            contains: pattern,
            mode: 'insensitive',
          },
        },
        select: { id: true, name: true },
      });
      if (equipment) return equipment;
    }
    return null;
  };

  // Helper to find assembly type by slug
  const findAssemblyType = async (typeSlug: string) => {
    return prisma.assemblyType.findUnique({
      where: { slug: typeSlug },
    });
  };

  // Helper to find category by name
  const findCategory = async (categoryName: string) => {
    return prisma.assemblyCategory.findFirst({
      where: { name: categoryName },
    });
  };

  // Helper to create or update assembly with equipment items
  const createOrUpdateAssembly = async (
    name: string,
    description: string,
    typeSlug: string,
    categoryName: string,
    equipmentItems: { patterns: string[]; quantity: number; description: string }[]
  ) => {
    const type = await findAssemblyType(typeSlug);
    const category = await findCategory(categoryName);
    
    if (!type || !category) {
      console.warn(`Could not find type "${typeSlug}" or category "${categoryName}" for assembly "${name}"`);
      return null;
    }

    // Find equipment for each item
    const itemsToCreate: { equipmentId: string; quantity: number }[] = [];
    const missingItems: string[] = [];
    
    for (const item of equipmentItems) {
      const equipment = await findEquipmentByPatterns(item.patterns);
      if (equipment) {
        itemsToCreate.push({ equipmentId: equipment.id, quantity: item.quantity });
      } else {
        missingItems.push(item.description);
      }
    }

    if (missingItems.length > 0) {
      console.warn(`Assembly "${name}" missing equipment: ${missingItems.join(', ')}`);
    }

    // Check if assembly already exists
    const existing = await prisma.assembly.findFirst({
      where: { name },
      include: { items: true },
    });

    if (existing) {
      // Delete existing items and recreate with new equipment
      await prisma.assemblyItem.deleteMany({
        where: { assemblyId: existing.id },
      });
      
      if (itemsToCreate.length > 0) {
        await prisma.assembly.update({
          where: { id: existing.id },
          data: {
            description,
            typeId: type.id,
            categoryId: category.id,
            items: {
              create: itemsToCreate,
            },
          },
        });
      }
      return existing.name;
    } else {
      // Create new assembly (only if we have at least one equipment item)
      if (itemsToCreate.length > 0) {
        const assembly = await prisma.assembly.create({
          data: {
            name,
            description,
            status: "APPROVED",
            categoryId: category.id,
            typeId: type.id,
            createdById: admin.id,
            items: {
              create: itemsToCreate,
            },
          },
        });
        return assembly.name;
      } else {
        console.warn(`Skipping assembly "${name}" - no equipment found`);
        return null;
      }
    }
  };

  const createdAssemblies: string[] = [];

  // ============================================
  // STRAND ASSEMBLIES
  // ============================================

  // Terminal Pole: Dead end with 1 connection
  // Equipment: 1x Thimble Eye Bolt, 1x Square Nut, 2x Square Washer, 1x Deadend Grip/Strandvise, 1x Guy Hook (B Hook)
  const terminalResult = await createOrUpdateAssembly(
    "Standard Terminal Pole",
    "Dead end pole assembly with thimble eye bolt and deadend hardware",
    "strand.terminal",
    "Strand",
    [
      { patterns: ["thimble eye", "thimble bolt", "eye bolt"], quantity: 1, description: "Thimble Eye Bolt" },
      { patterns: ["square nut", "nut square", "nut, square"], quantity: 1, description: "Square Nut" },
      { patterns: ["square washer", "washer square", "washer, square"], quantity: 2, description: "Square Washer" },
      { patterns: ["deadend", "dead end", "strandvise", "dead-end grip"], quantity: 1, description: "Deadend Grip" },
      { patterns: ["guy hook", "b hook", "b-hook", "rams head"], quantity: 1, description: "Guy Hook (B Hook)" },
    ]
  );
  if (terminalResult) createdAssemblies.push(terminalResult);

  // Tangent Pole: Straight pass-through with 2 connections at ~180 degrees
  // Equipment: 1x 14" Machine Bolt, 2x Square Nut, 2x Square Washer, 1x Suspension Clamp (B Clamp or 3 hole)
  const tangentResult = await createOrUpdateAssembly(
    "Standard Tangent Pole",
    "Straight pass-through pole assembly with suspension clamp",
    "strand.tangent",
    "Strand",
    [
      { patterns: ["14\" machine bolt", "14 machine bolt", "machine bolt", "14in bolt"], quantity: 1, description: "14\" Machine Bolt" },
      { patterns: ["square nut", "nut square", "nut, square"], quantity: 2, description: "Square Nut" },
      { patterns: ["square washer", "washer square", "washer, square"], quantity: 2, description: "Square Washer" },
      { patterns: ["suspension clamp", "b clamp", "b-clamp", "3 hole clamp", "3-hole"], quantity: 1, description: "Suspension Clamp" },
    ]
  );
  if (tangentResult) createdAssemblies.push(tangentResult);

  // Corner Pole: Angle change with 2 connections at sharp angle
  // Equipment: 2x Thimble Eye Bolt, 2x Square Nut, 4x Square Washer, 2x Deadend Grip, 2x Ram Head
  const cornerResult = await createOrUpdateAssembly(
    "Standard Corner Pole",
    "Angle change pole assembly with dual deadends",
    "strand.corner",
    "Strand",
    [
      { patterns: ["thimble eye", "thimble bolt", "eye bolt"], quantity: 2, description: "Thimble Eye Bolt" },
      { patterns: ["square nut", "nut square", "nut, square"], quantity: 2, description: "Square Nut" },
      { patterns: ["square washer", "washer square", "washer, square"], quantity: 4, description: "Square Washer" },
      { patterns: ["deadend", "dead end", "strandvise", "dead-end grip"], quantity: 2, description: "Deadend Grip" },
      { patterns: ["rams head", "ram head", "ram's head", "ramshead"], quantity: 2, description: "Ram Head" },
    ]
  );
  if (cornerResult) createdAssemblies.push(cornerResult);

  // ============================================
  // HARDWARE ASSEMBLIES
  // ============================================

  // Guy/Anchor: Guying and anchoring hardware
  // Equipment: 1x Deadend Grip, 50ft Guy Wire (EHS), 1x Guy Guard (96"), 1x Anchor Rod, 1x Guy Insulator
  const guyAnchorResult = await createOrUpdateAssembly(
    "Standard Guy/Anchor",
    "Standard guying and anchoring hardware assembly",
    "hardware.anchor",
    "Hardware",
    [
      { patterns: ["deadend", "dead end", "strandvise", "dead-end grip"], quantity: 1, description: "Deadend Grip" },
      { patterns: ["guy wire", "ehs", "strand", "guy strand"], quantity: 50, description: "Guy Wire (EHS) - 50ft" },
      { patterns: ["guy guard", "guard", "96"], quantity: 1, description: "Guy Guard (96\")" },
      { patterns: ["anchor rod", "anchor", "rod"], quantity: 1, description: "Anchor Rod" },
      { patterns: ["guy insulator", "insulator"], quantity: 1, description: "Guy Insulator" },
    ]
  );
  if (guyAnchorResult) createdAssemblies.push(guyAnchorResult);

  // ============================================
  // FIBER ASSEMBLIES
  // ============================================

  // Splice Case: Fiber splice enclosure
  // Equipment: 1x Splice Closure (FOSC or OFDC), 1x Splice Tray (24-fiber), 12x Protection Sleeve, 2x Machine Bolt, 1x Lashing Clamp
  const spliceCaseResult = await createOrUpdateAssembly(
    "Standard Splice Case",
    "Fiber splice enclosure with tray and protection sleeves",
    "fiber.splice",
    "Fiber",
    [
      { patterns: ["splice closure", "fosc", "ofdc", "closure"], quantity: 1, description: "Splice Closure" },
      { patterns: ["splice tray", "tray", "24 fiber", "fusion tray"], quantity: 1, description: "Splice Tray" },
      { patterns: ["protection sleeve", "sleeve", "splice sleeve", "heat shrink"], quantity: 12, description: "Protection Sleeve" },
      { patterns: ["machine bolt", "14\" machine bolt", "bolt"], quantity: 2, description: "Machine Bolt" },
      { patterns: ["lashing clamp", "d clamp", "d-clamp", "lashing"], quantity: 1, description: "Lashing Clamp" },
    ]
  );
  if (spliceCaseResult) createdAssemblies.push(spliceCaseResult);

  // Slack Loop: Fiber slack storage
  // Equipment: 1x Snowshoe/Fiber Storage, 5x Lashing Strap
  const slackLoopResult = await createOrUpdateAssembly(
    "Standard Slack Loop",
    "Fiber slack storage loop",
    "fiber.slack",
    "Fiber",
    [
      { patterns: ["snowshoe", "fiber storage", "slack storage", "storage"], quantity: 1, description: "Snowshoe/Fiber Storage" },
      { patterns: ["lashing strap", "strap", "support strap", "lashing"], quantity: 5, description: "Lashing Strap" },
    ]
  );
  if (slackLoopResult) createdAssemblies.push(slackLoopResult);

  // ============================================
  // SERVICE ASSEMBLIES
  // ============================================

  // MST 2-Port: 2-port multi-service terminal (mounting hardware only - MST unit from GIS)
  // Equipment: 2x Machine Bolt, 1x Lashing Clamp
  const mst2Result = await createOrUpdateAssembly(
    "Standard MST 2-Port",
    "2-port MST mounting hardware (MST unit selected from GIS data)",
    "service.mst2",
    "Service",
    [
      { patterns: ["machine bolt", "14\" machine bolt", "bolt"], quantity: 2, description: "Machine Bolt" },
      { patterns: ["lashing clamp", "d clamp", "d-clamp", "lashing"], quantity: 1, description: "Lashing Clamp" },
    ]
  );
  if (mst2Result) createdAssemblies.push(mst2Result);

  // MST 6-Port: 6-port multi-service terminal (mounting hardware only - MST unit from GIS)
  // Equipment: 2x Machine Bolt, 1x Lashing Clamp
  const mst6Result = await createOrUpdateAssembly(
    "Standard MST 6-Port",
    "6-port MST mounting hardware (MST unit selected from GIS data)",
    "service.mst6",
    "Service",
    [
      { patterns: ["machine bolt", "14\" machine bolt", "bolt"], quantity: 2, description: "Machine Bolt" },
      { patterns: ["lashing clamp", "d clamp", "d-clamp", "lashing"], quantity: 1, description: "Lashing Clamp" },
    ]
  );
  if (mst6Result) createdAssemblies.push(mst6Result);

  // ============================================
  // UNDERGROUND ASSEMBLIES
  // ============================================

  // Riser: Pole-to-underground transition
  // Equipment: 10ft 2" Conduit, 2x Conduit Coupler, 2x Conduit Strap, 2x Machine Bolt
  const riserResult = await createOrUpdateAssembly(
    "Standard Riser",
    "Pole-to-underground transition with conduit",
    "underground.riser",
    "Underground",
    [
      { patterns: ["2\" conduit", "2 conduit", "conduit 2", "pvc 2"], quantity: 10, description: "2\" Conduit (10ft)" },
      { patterns: ["conduit coupler", "coupler", "coupling", "conduit coupling"], quantity: 2, description: "Conduit Coupler" },
      { patterns: ["conduit strap", "strap", "pipe strap"], quantity: 2, description: "Conduit Strap" },
      { patterns: ["machine bolt", "14\" machine bolt", "bolt"], quantity: 2, description: "Machine Bolt" },
    ]
  );
  if (riserResult) createdAssemblies.push(riserResult);

  console.log('Seed data created:');
  console.log('- Admin:', admin.email);
  console.log('- Manager:', manager.email);
  console.log('- Field:', field.email);
  console.log('- Equipment:', equipment1.name, equipment2.name);
  console.log('- Permit Types:', createdPermitTypes.join(', '));
  console.log('- Assembly Categories:', Object.keys(createdCategories).join(', '));
  console.log('- Assembly Types:', createdTypes.join(', '));
  console.log('- Assembly Templates:', createdAssemblies.length > 0 ? createdAssemblies.join(', ') : 'Already exist');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


