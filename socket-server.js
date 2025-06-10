// socket-server.js (simplified example)
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Your Next.js app's URL
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Example: Join a room based on userId (from client query)
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(userId); // Each user joins their own private room for direct messages
    console.log(`User ${userId} joined room ${userId}`);
  }

  // Example: Join a specific conversation room (from client emit)
  socket.on("joinRoom", (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${userId} joined conversation room: ${conversationId}`);
  });

  socket.on("sendMessage", async (message) => {
    console.log("Message received:", message);
    // Save message to database using Prisma
    // This is where you'd use your actual Prisma client
    try {
      // const newMessage = await prisma.message.create({
      //   data: {
      //     conversationId: message.conversationId,
      //     senderId: message.senderId,
      //     content: message.content,
      //   },
      // });
      // console.log("Message saved to DB:", newMessage);

      // Emit message to all clients in the conversation room
      io.to(message.conversationId).emit("newMessage", message); // Or newMessage
    } catch (error) {
      console.error("Failed to save message to DB or emit:", error);
      // Handle error, maybe emit an error back to the sender
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.SOCKET_PORT || 3001; // Choose a different port than Next.js
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
