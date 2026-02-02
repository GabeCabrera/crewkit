import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

// GET /api/job-plans/[id]/assemblies - Get all required assemblies for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    const assemblies = await prisma.jobPlanAssembly.findMany({
      where: { jobPlanId: id },
      include: {
        assembly: {
          include: {
            type: {
              select: {
                id: true,
                name: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            items: {
              include: {
                equipment: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    pricePerUnit: true,
                    unitType: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(assemblies);
  } catch (error) {
    console.error("Error fetching job assemblies:", error);
    return NextResponse.json(
      { error: "Failed to fetch assemblies" },
      { status: 500 }
    );
  }
}

// Input type for POST request
interface AssemblyInput {
  assemblyType: string;
  quantity: number;
  assemblyId?: string; // Optional: specific assembly ID to use
}

// POST /api/job-plans/[id]/assemblies - Add assemblies to job
// Accepts array of {assemblyType, quantity, assemblyId?}
// If assemblyId not provided, looks up best matching assembly by type name
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = writeRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only managers, admins, and superusers can modify assemblies
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can modify job assemblies" },
        { status: 403 }
      );
    }

    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    const body = await request.json();
    const { assemblies, clearExisting = true } = body as { 
      assemblies: AssemblyInput[]; 
      clearExisting?: boolean;
    };

    if (!assemblies || !Array.isArray(assemblies)) {
      return NextResponse.json(
        { error: "assemblies array is required" },
        { status: 400 }
      );
    }

    // Clear existing assemblies if requested (default behavior)
    if (clearExisting) {
      await prisma.jobPlanAssembly.deleteMany({
        where: { jobPlanId: id },
      });
    }

    // Process each assembly input
    const createdAssemblies = [];
    const warnings: string[] = [];

    for (const input of assemblies) {
      const { assemblyType, quantity, assemblyId } = input;

      if (!assemblyType || quantity <= 0) {
        continue; // Skip invalid entries
      }

      let targetAssemblyId: string | null = assemblyId || null;

      // If no specific assembly ID provided, try to look up by type name
      if (!targetAssemblyId) {
        // First, try exact match on AssemblyType name
        const exactTypeMatch = await prisma.assemblyType.findFirst({
          where: {
            name: {
              equals: assemblyType,
              mode: "insensitive",
            },
          },
          select: { id: true },
        });

        if (exactTypeMatch) {
          // Find an APPROVED assembly of this type
          const matchingAssembly = await prisma.assembly.findFirst({
            where: {
              typeId: exactTypeMatch.id,
              status: "APPROVED",
            },
            select: { id: true },
          });

          if (matchingAssembly) {
            targetAssemblyId = matchingAssembly.id;
          } else {
            // Try any assembly of this type
            const anyAssembly = await prisma.assembly.findFirst({
              where: { typeId: exactTypeMatch.id },
              select: { id: true },
            });
            if (anyAssembly) {
              targetAssemblyId = anyAssembly.id;
            }
          }
        }

        // If still no match, try prefixed type match (e.g., "MST 6-Port" matches "Service: MST 6-Port")
        if (!targetAssemblyId) {
          const prefixedTypeMatch = await prisma.assemblyType.findFirst({
            where: {
              name: {
                endsWith: assemblyType,
                mode: "insensitive",
              },
            },
            select: { id: true },
          });

          if (prefixedTypeMatch) {
            const matchingAssembly = await prisma.assembly.findFirst({
              where: {
                typeId: prefixedTypeMatch.id,
                status: "APPROVED",
              },
              select: { id: true },
            });

            if (matchingAssembly) {
              targetAssemblyId = matchingAssembly.id;
            } else {
              const anyAssembly = await prisma.assembly.findFirst({
                where: { typeId: prefixedTypeMatch.id },
                select: { id: true },
              });
              if (anyAssembly) {
                targetAssemblyId = anyAssembly.id;
              }
            }
          }
        }

        // If still no match, try partial match by assembly name containing the type
        if (!targetAssemblyId) {
          const assemblyByName = await prisma.assembly.findFirst({
            where: {
              name: {
                contains: assemblyType,
                mode: "insensitive",
              },
              status: "APPROVED",
            },
            select: { id: true },
          });

          if (assemblyByName) {
            targetAssemblyId = assemblyByName.id;
          } else {
            // Try any non-approved assembly with partial match
            const anyAssemblyByName = await prisma.assembly.findFirst({
              where: {
                name: {
                  contains: assemblyType,
                  mode: "insensitive",
                },
              },
              select: { id: true },
            });
            if (anyAssemblyByName) {
              targetAssemblyId = anyAssemblyByName.id;
            }
          }
        }

        // If still no match, try exact match by assembly name
        if (!targetAssemblyId) {
          const assemblyByName = await prisma.assembly.findFirst({
            where: {
              name: {
                equals: assemblyType,
                mode: "insensitive",
              },
              status: "APPROVED",
            },
            select: { id: true },
          });

          if (assemblyByName) {
            targetAssemblyId = assemblyByName.id;
          }
        }
      }

      // Always create the record - assemblyId can be null if no match found
      try {
        // Upsert by assemblyType (unique per job)
        const created = await prisma.jobPlanAssembly.upsert({
          where: {
            jobPlanId_assemblyType: {
              jobPlanId: id,
              assemblyType,
            },
          },
          update: {
            quantity,
            assemblyId: targetAssemblyId,
            isAutoDetected: true,
          },
          create: {
            jobPlanId: id,
            assemblyId: targetAssemblyId,
            quantity,
            assemblyType,
            isAutoDetected: true,
          },
          include: {
            assembly: {
              include: {
                type: {
                  select: { id: true, name: true },
                },
                category: {
                  select: { id: true, name: true },
                },
                items: {
                  include: {
                    equipment: {
                      select: {
                        id: true,
                        name: true,
                        sku: true,
                        pricePerUnit: true,
                        unitType: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
        createdAssemblies.push(created);
        
        // Track if no assembly was linked
        if (!targetAssemblyId) {
          warnings.push(`No matching assembly template for: ${assemblyType}`);
        }
      } catch (error) {
        console.error(`Error creating assembly for type ${assemblyType}:`, error);
        warnings.push(`Failed to add ${assemblyType}`);
      }
    }

    return NextResponse.json({
      assemblies: createdAssemblies,
      warnings: warnings.length > 0 ? warnings : undefined,
      message: `Added ${createdAssemblies.length} assembly types to job`,
    });
  } catch (error) {
    console.error("Error adding assemblies:", error);
    return NextResponse.json(
      { error: "Failed to add assemblies" },
      { status: 500 }
    );
  }
}

// DELETE /api/job-plans/[id]/assemblies - Clear all assemblies from job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = writeRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only managers, admins, and superusers can modify assemblies
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can modify job assemblies" },
        { status: 403 }
      );
    }

    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    // Check for specific assembly type in query params
    const { searchParams } = new URL(request.url);
    const assemblyType = searchParams.get("assemblyType");

    if (assemblyType) {
      // Delete specific assembly by type
      await prisma.jobPlanAssembly.delete({
        where: {
          jobPlanId_assemblyType: {
            jobPlanId: id,
            assemblyType,
          },
        },
      });
      return NextResponse.json({ success: true, message: "Assembly removed" });
    }

    // Delete all assemblies for this job
    const result = await prisma.jobPlanAssembly.deleteMany({
      where: { jobPlanId: id },
    });

    return NextResponse.json({ 
      success: true, 
      message: `Removed ${result.count} assemblies from job` 
    });
  } catch (error) {
    console.error("Error deleting assemblies:", error);
    return NextResponse.json(
      { error: "Failed to delete assemblies" },
      { status: 500 }
    );
  }
}
