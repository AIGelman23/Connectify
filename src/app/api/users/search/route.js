// src/app/api/users/search/route.js

import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import authOptions from "@/lib/auth";
// import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    // 1. Authenticate the user session
    // const session = await getServerSession(authOptions);

    // if (!session || !session.user?.id) {
    //   console.warn("Unauthorized attempt to access /api/users/search");
    //   return NextResponse.json(
    //     { message: "Unauthorized. Please log in." },
    //     { status: 401 }
    //   );
    // }

    // const userId = session.user.id; // The ID of the currently authenticated user
    // console.log(`DEBUG: Search request from user: ${userId}`);

    // 2. Extract the search query parameter 'q'
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("q");
    console.log(`DEBUG: Received search term: '${searchTerm}'`);

    if (!searchTerm || searchTerm.trim() === "") {
      // If no search term, return an empty array or an appropriate message
      console.log(
        "DEBUG: No search term provided, returning empty users array."
      );
      return NextResponse.json(
        { users: [], message: "No search term provided." },
        { status: 200 }
      );
    }

    // Convert search term to lowercase for potential future client-side case-insensitivity,
    // or if database collation handles it implicitly.
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    console.log(`DEBUG: Lowercase search term: '${lowerCaseSearchTerm}'`);

    // 3. Search the database for users whose names or emails match the search term
    // Exclude the current user from the search results
    const whereCondition = {
      id: {
        not: userId, // Exclude the current authenticated user
      },
      OR: [
        {
          name: {
            contains: searchTerm, // Removed 'mode: "insensitive"'
          },
        },
        {
          email: {
            contains: searchTerm, // Removed 'mode: "insensitive"'
          },
        },
      ],
    };
    console.log(
      "DEBUG: Prisma query 'where' condition:",
      JSON.stringify(whereCondition, null, 2)
    );

    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        email: true,
        image: true, // Include the user's profile image
      },
      take: 20, // Limit the number of results to prevent excessively large responses
      orderBy: {
        name: "asc", // Order results by name
      },
    });

    // 4. Return a list of matching users
    console.log(
      `DEBUG: Found ${users.length} users for search term: '${searchTerm}'`
    );
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("CRITICAL ERROR in /api/users/search:", error);
    // Provide a more descriptive error message based on the actual error object
    let errorMessage = "Internal server error during user search.";
    if (error instanceof Error) {
      errorMessage += ` Details: ${error.message}`;
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }
    } else if (typeof error === "object" && error !== null) {
      errorMessage += ` Raw error: ${JSON.stringify(error)}`;
    }

    return NextResponse.json(
      {
        message: errorMessage,
        error: error.message, // Still provide raw error message for client-side visibility
      },
      { status: 500 }
    );
  }
}
