// src/index.js
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import prisma from "./lib/prisma.js";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";

// Create the Apollo Server instance
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Start the server
async function startServer() {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req, res }) => ({
      // This context object is passed to all your resolvers,
      // making `prisma` client accessible
      prisma,
      // You can also add authentication information here
      // user: getUserFromAuthHeader(req.headers.authorization),
    }),
  });

  console.log(`🚀 Server ready at ${url}`);
  console.log(`Explore your API at ${url}`);
}

startServer();
