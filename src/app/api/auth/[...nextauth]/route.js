import NextAuth from "next-auth";
import authOptions from "@/lib/auth";

// For debugging
console.log("Loading NextAuth route handler");

const handler = NextAuth({
  ...authOptions,
  callbacks: {
    ...authOptions.callbacks,
    async jwt(params) {
      let token = params.token;
      // Execute the original jwt callback if it exists
      if (authOptions.callbacks?.jwt) {
        token = await authOptions.callbacks.jwt(params);
      }

      const { trigger, session } = params;
      // Handle session update
      if (trigger === "update" && session?.user) {
        token.name = session.user.name;
        token.picture = session.user.image || session.user.picture;
      }
      return token;
    },
    async session(params) {
      let session = params.session;
      // Execute the original session callback if it exists
      if (authOptions.callbacks?.session) {
        session = await authOptions.callbacks.session(params);
      }

      const { token } = params;
      // Pass updated token data to the session (for JWT strategy)
      if (token && session.user) {
        session.user.name = token.name;
        session.user.image = token.picture;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
