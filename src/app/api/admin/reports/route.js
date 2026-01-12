import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";

  try {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [{ reason: { contains: search, mode: "insensitive" } }],
        }
      : {};

    const [reportsData, totalReports] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    // Manually populate targetContent and targetAuthor based on targetType/targetId
    const reports = await Promise.all(
      reportsData.map(async (report) => {
        let targetContent = null;
        let targetAuthor = null;

        if (report.targetType === "POST") {
          const post = await prisma.post.findUnique({
            where: { id: report.targetId },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  isBanned: true,
                },
              },
            },
          });
          if (post) {
            targetContent = post.content;
            targetAuthor = post.author;
          }
        } else if (report.targetType === "COMMENT") {
          const comment = await prisma.comment.findUnique({
            where: { id: report.targetId },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  isBanned: true,
                },
              },
            },
          });
          if (comment) {
            targetContent = comment.content;
            targetAuthor = comment.user;
          }
        } else if (report.targetType === "USER") {
          const user = await prisma.user.findUnique({
            where: { id: report.targetId },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              createdAt: true,
              isBanned: true,
            },
          });
          if (user) {
            targetAuthor = user;
            targetContent = `User Profile: ${user.name}`;
          }
        }

        return {
          ...report,
          targetContent,
          targetAuthor,
        };
      })
    );

    const totalPages = Math.ceil(totalReports / limit) || 1;

    return NextResponse.json({
      reports,
      pagination: {
        currentPage: page,
        totalPages,
        totalReports,
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const action = searchParams.get("action");

  if (!id || !action) {
    return NextResponse.json(
      { message: "Missing id or action" },
      { status: 400 }
    );
  }

  try {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json(
        { message: "Report not found" },
        { status: 404 }
      );
    }

    if (action === "dismiss") {
      await prisma.report.delete({ where: { id } });
    } else if (action === "delete_content") {
      if (report.targetType === "POST") {
        await prisma.post.delete({ where: { id: report.targetId } });
      } else if (report.targetType === "COMMENT") {
        await prisma.comment.delete({ where: { id: report.targetId } });
      }
      await prisma.report.delete({ where: { id } });
    } else if (action === "ban_user" || action === "unban_user") {
      let userIdToUpdate = null;
      if (report.targetType === "USER") {
        userIdToUpdate = report.targetId;
      } else if (report.targetType === "POST") {
        const post = await prisma.post.findUnique({
          where: { id: report.targetId },
          select: { authorId: true },
        });
        userIdToUpdate = post?.authorId;
      } else if (report.targetType === "COMMENT") {
        const comment = await prisma.comment.findUnique({
          where: { id: report.targetId },
          select: { userId: true },
        });
        userIdToUpdate = comment?.userId;
      }

      if (userIdToUpdate) {
        await prisma.user.update({
          where: { id: userIdToUpdate },
          data: { isBanned: action === "ban_user" },
        });
      }
      await prisma.report.delete({ where: { id } });
    }

    return NextResponse.json({ message: "Action performed successfully" });
  } catch (error) {
    console.error("Error performing action:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
