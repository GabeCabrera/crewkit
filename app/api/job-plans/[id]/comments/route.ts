import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

// Helper to parse @mentions from comment content
function parseMentions(content: string): string[] {
  const mentionPattern = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionPattern.exec(content)) !== null) {
    // match[2] is the user ID
    mentions.push(match[2]);
  }
  
  return Array.from(new Set(mentions)); // Remove duplicates
}

// Helper to truncate message for notifications
function truncateMessage(content: string, maxLength: number = 100): string {
  // Remove mention markup for display
  const cleanContent = content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
  
  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }
  return cleanContent.substring(0, maxLength - 3) + "...";
}

// GET /api/job-plans/[id]/comments - Get comments for a job plan
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
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    // Get top-level comments with replies
    const comments = await prisma.comment.findMany({
      where: {
        jobPlanId: id,
        parentId: null, // Only top-level comments
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/job-plans/[id]/comments - Add a comment
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

    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content, parentId } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    // Parse @mentions from content
    const mentionedUserIds = parseMentions(content);

    // If this is a reply, verify parent comment exists
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        include: { author: true },
      });

      if (!parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }

      // Create reply notification for the parent comment author
      if (parentComment.authorId !== session.user.id) {
        await prisma.notification.create({
          data: {
            type: "COMMENT_REPLY",
            userId: parentComment.authorId,
            jobPlanId: id,
            title: "New Reply",
            message: `${session.user.name || "Someone"} replied to your comment on "${jobPlan.jobName}": ${truncateMessage(content)}`,
          },
        });
      }
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content,
        jobPlanId: id,
        authorId: session.user.id,
        parentId: parentId || null,
        mentions: mentionedUserIds,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Create notifications for mentioned users
    if (mentionedUserIds.length > 0) {
      const notifications = mentionedUserIds
        .filter((userId) => userId !== session.user.id) // Don't notify yourself
        .map((userId) => ({
          type: "COMMENT_MENTION" as const,
          userId,
          jobPlanId: id,
          title: "You were mentioned",
          message: `${session.user.name || "Someone"} mentioned you in "${jobPlan.jobName}" (${jobPlan.status}): ${truncateMessage(content)}`,
        }));

      if (notifications.length > 0) {
        await prisma.notification.createMany({
          data: notifications,
        });
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
