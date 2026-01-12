import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Pagination & Search
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { reporter: { name: { contains: search, mode: "insensitive" } } },
        { reporter: { email: { contains: search, mode: "insensitive" } } },
        { reason: { contains: search, mode: "insensitive" } },
      ];
    }

    const [reports, totalReports] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.report.count({ where }),
    ]);

    const totalPages = Math.ceil(totalReports / limit);

    // Enrich reports with target content
    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        let targetContent = null;
        let targetAuthor = null;

        try {
          if (report.targetType === "POST") {
            const post = await prisma.post.findUnique({
              where: { id: report.targetId },
              include: {
                author: {
                  select: { id: true, name: true, email: true, isBanned: true },
                },
              },
            });
            if (post) {
              targetContent =
                post.content || (post.imageUrl ? "[Image]" : "[Video]");
              targetAuthor = post.author;
            }
          } else if (report.targetType === "COMMENT") {
            const comment = await prisma.comment.findUnique({
              where: { id: report.targetId },
              include: {
                author: {
                  select: { id: true, name: true, email: true, isBanned: true },
                },
              },
            });
            if (comment) {
              targetContent = comment.content;
              targetAuthor = comment.author;
            }
          } else if (report.targetType === "REPLY") {
            const reply = await prisma.reply.findUnique({
              where: { id: report.targetId },
              include: {
                author: {
                  select: { id: true, name: true, email: true, isBanned: true },
                },
              },
            });
            if (reply) {
              targetContent = reply.content;
              targetAuthor = reply.author;
            }
          }
        } catch (err) {
          console.error(
            `Error fetching target content for report ${report.id}:`,
            err
          );
        }
        return { ...report, targetContent, targetAuthor };
      })
    );

    return NextResponse.json(
      {
        reports: enrichedReports,
        pagination: {
          currentPage: page,
          totalPages,
          totalReports,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("id");
    const action = searchParams.get("action"); // 'dismiss', 'delete_content', 'ban_user', 'unban_user'

    if (!reportId || !action) {
      return NextResponse.json(
        { message: "Missing parameters" },
        { status: 400 }
      );
    }

    if (action === "dismiss") {
      await prisma.report.delete({ where: { id: reportId } });
      return NextResponse.json(
        { message: "Report dismissed" },
        { status: 200 }
      );
    } else if (action === "delete_content") {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });
      if (!report)
        return NextResponse.json(
          { message: "Report not found" },
          { status: 404 }
        );

      // Delete content based on type
      try {
        if (report.targetType === "POST") {
          await prisma.post.delete({ where: { id: report.targetId } });
        } else if (report.targetType === "COMMENT") {
          await prisma.comment.delete({ where: { id: report.targetId } });
        } else if (report.targetType === "REPLY") {
          await prisma.reply.delete({ where: { id: report.targetId } });
        }
      } catch (e) {
        console.log("Content might already be deleted:", e.message);
      }

      // Also delete the report
      await prisma.report.delete({ where: { id: reportId } });
      return NextResponse.json(
        { message: "Content and report deleted" },
        { status: 200 }
      );
    } else if (action === "ban_user") {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });
      if (!report)
        return NextResponse.json(
          { message: "Report not found" },
          { status: 404 }
        );

      let userIdToBan = null;

      if (report.targetType === "POST") {
        const post = await prisma.post.findUnique({
          where: { id: report.targetId },
          select: { authorId: true },
        });
        userIdToBan = post?.authorId;
      } else if (report.targetType === "COMMENT") {
        const comment = await prisma.comment.findUnique({
          where: { id: report.targetId },
          select: { authorId: true },
        });
        userIdToBan = comment?.authorId;
      } else if (report.targetType === "REPLY") {
        const reply = await prisma.reply.findUnique({
          where: { id: report.targetId },
          select: { authorId: true },
        });
        userIdToBan = reply?.authorId;
      }

      if (userIdToBan) {
        await prisma.user.update({
          where: { id: userIdToBan },
          data: { isBanned: true },
        });
        return NextResponse.json(
          { message: "User banned successfully" },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { message: "Content author not found" },
          { status: 404 }
        );
      }
    } else if (action === "unban_user") {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });
      if (!report)
        return NextResponse.json(
          { message: "Report not found" },
          { status: 404 }
        );

      let userIdToUnban = null;

      if (report.targetType === "POST") {
        const post = await prisma.post.findUnique({
          where: { id: report.targetId },
          select: { authorId: true },
        });
        userIdToUnban = post?.authorId;
      } else if (report.targetType === "COMMENT") {
        const comment = await prisma.comment.findUnique({
          where: { id: report.targetId },
          select: { authorId: true },
        });
        userIdToUnban = comment?.authorId;
      } else if (report.targetType === "REPLY") {
        const reply = await prisma.reply.findUnique({
          where: { id: report.targetId },
          select: { authorId: true },
        });
        userIdToUnban = reply?.authorId;
      }

      if (userIdToUnban) {
        await prisma.user.update({
          where: { id: userIdToUnban },
          data: { isBanned: false },
        });
        return NextResponse.json(
          { message: "User unbanned successfully" },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { message: "Content author not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
