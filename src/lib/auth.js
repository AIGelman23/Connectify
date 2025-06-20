// lib/auth.js - Fixed for credential login issues

import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Enhanced authOptions with better error handling for debugging
const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials - email or password is undefined");
          return null;
        }

        try {
          // Find user by email with minimal fields to avoid join issues
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            select: {
              id: true,
              email: true,
              name: true,
              hashedPassword: true,
            },
          });

          if (!user) {
            console.log(`No user found with email: ${credentials.email}`);
            return null;
          }

          if (!user.hashedPassword) {
            console.log(
              `User exists but has no password: ${credentials.email}`
            );
            return null;
          }

          // Debug log
          console.log(`Found user: ${user.email}, comparing passwords...`);

          // Compare passwords
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          );

          if (!passwordMatch) {
            console.log("Password does not match");
            return null;
          }

          console.log("Password matches, authentication successful");

          // Return user object (without hashedPassword)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null; // Return null on error
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    "your-fallback-secret-make-sure-to-change-me",
};

export default authOptions;
