import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            profile: true,
          },
        });

        if (!user || !user.hashedPassword) {
          throw new Error("No account found with that email address.");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (isValidPassword) {
          console.log("User authorized successfully:", user.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.profile?.profilePictureUrl || user.image,
            jwt: "credentials_dummy_jwt_token_for_socket_auth",
          };
        } else {
          throw new Error("Incorrect password. Please try again.");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        if (user.jwt) {
          token.jwt = user.jwt;
        }
      } else if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          include: {
            profile: true,
          },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.image = dbUser.profile?.profilePictureUrl || null;
          if (!token.jwt) {
            token.jwt = `internal_fallback_jwt_for_user_${
              token.id
            }_${Date.now()}`;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.image;
        if (token.jwt) {
          session.jwt = token.jwt;
        }
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};
