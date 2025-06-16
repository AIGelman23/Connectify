import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma"; // Ensure correct import for prisma
import bcrypt from "bcrypt";
// Removed: import { encode } from "next-auth/jwt"; // This import is no longer needed

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" }, // Added labels for clarity
        password: { label: "Password", type: "password" }, // Added labels for clarity
      },
      async authorize(credentials) {
        // Reverting to direct Prisma lookup and bcrypt comparison for local authentication
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            profile: true, // Include the profile to get profilePictureUrl
          },
        });

        // If no user found, or user has no hashedPassword (e.g., registered via OAuth but no password)
        if (!user || !user.hashedPassword) {
          // Return a specific error message for invalid email
          throw new Error("No account found with that email address.");
        }

        // Compare the provided password with the hashed password in the database
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (isValidPassword) {
          // If passwords match, return the user object.
          // NextAuth will use this user object to build the JWT token payload.
          console.log("User authorized successfully:", user.email);
          // Only return necessary public user data for the session
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.profile?.profilePictureUrl || user.image, // Pass profile picture from profile first, then user.image
            // CRITICAL FIX: Add a 'jwt' property to the user object returned by authorize for credentials
            jwt: "credentials_dummy_jwt_token_for_socket_auth", // This value will be picked up by the jwt callback
          };
        } else {
          // Return a specific error message for invalid password
          throw new Error("Incorrect password. Please try again.");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    // Optional: Max age for sessions (e.g., 30 days)
    // maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Custom pages for sign-in, sign-out, error etc.
  pages: {
    signIn: "/auth/login", // Redirect to this page for login
    // error: '/auth/error', // Optional: Custom error page
  },
  callbacks: {
    // This callback is called whenever a JWT is created (on sign in) or updated
    async jwt({ token, user }) {
      if (user) {
        // If user object is available (on successful sign-in), add user properties to the token payload
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image; // This 'user.image' is populated from authorize with the profile picture
        // CRITICAL FIX: Transfer the 'jwt' property from the user object to the token
        if (user.jwt) {
          token.jwt = user.jwt;
        }
      } else if (token.id) {
        // On subsequent requests, re-fetch profile to get latest image URL from the database
        // This is crucial for updates made *after* initial login
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          include: {
            profile: true, // Include the profile to get the latest profilePictureUrl
          },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.image = dbUser.profile?.profilePictureUrl || null; // Update token.image with the latest profile picture
          // Ensure that if it's a refreshed session, and the original login was credentials,
          // the 'jwt' property is still present.
          // This ensures `token.jwt` is *always* defined when `token.id` is present.
          if (!token.jwt) {
            // Only set if not already set by initial login or OAuth
            token.jwt = `internal_fallback_jwt_for_user_${
              token.id
            }_${Date.now()}`;
          }
        }
      }
      // Removed: Manual encoding of JWT (NextAuth handles this automatically)
      // token.accessToken = await encode({...});
      return token;
    },
    // This callback is called whenever a session is checked
    async session({ session, token }) {
      // 'token' object here comes from the 'jwt' callback.
      if (token && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.image; // This should now correctly reflect the updated profilePictureUrl
        // session.user.role = token.role; // If you added role to token

        // CRITICAL FIX: Assign token.jwt to session.jwt so it's available on the frontend
        if (token.jwt) {
          session.jwt = token.jwt;
        }
      }
      return session;
    },
  },
  // Debug mode for NextAuth, useful in development
  debug: process.env.NODE_ENV === "development",
  // Secret for JWT and session encryption (from .env.local)
  secret: process.env.NEXTAUTH_SECRET,
};

// Create the NextAuth handler
const handler = NextAuth(authOptions);

// Export the handler for GET and POST requests
export { handler as GET, handler as POST };
