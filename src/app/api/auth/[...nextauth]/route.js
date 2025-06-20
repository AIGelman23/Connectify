import NextAuth from "next-auth";
import authOptions from "@/lib/auth";

// For debugging
console.log("Loading NextAuth route handler");

// Make sure authOptions is properly exported and imported
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
