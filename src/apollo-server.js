// src/apollo-server.js
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import prisma from "./lib/prisma.js";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const DEFAULT_PORT = parseInt(
  process.env.APOLLO_PORT || process.env.PORT || "4000",
  10
);

async function startServer() {
  let port = DEFAULT_PORT;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { url } = await startStandaloneServer(server, {
        listen: { port },
        context: async ({ req, res }) => ({ prisma }),
      });

      console.log(`🚀 Server ready at ${url}`);
      return;
    } catch (err) {
      const msg = String(err?.message || err);
      if (msg.includes("EADDRINUSE") || err?.code === "EADDRINUSE") {
        console.warn(`Port ${port} in use, trying ${port + 1}...`);
        port += 1;
        continue;
      }
      console.error(err);
      process.exit(1);
    }
  }

  console.error("Failed to start Apollo server after multiple attempts");
  process.exit(1);
}

startServer();
