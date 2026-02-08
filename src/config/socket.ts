import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import * as jose from "jose";
import { Message, ChatRoom } from "../models/chat";
import { JWT_SECRET } from "../utils/constants";

export const initSocket = (httpServer: HttpServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" }
  });

  // Security middleware
  io.use(async (socket, next) => {
    try {
      // Client sends token in handshake: { auth: { token: "..." } }
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication Error: Token missing"));
      }

      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);
      console.log("🔍 DEBUG TOKEN PAYLOAD:", payload);
      socket.data.user = payload;

      console.log(
        `Authenticated Socket: ${socket.id} for User: ${payload.sub}`
      );
      next();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown Authentication Error";

      console.error("Socket Auth Failed:", errorMessage);
      next(new Error("Authentication Error: Invalid Token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.user?.sub;
    console.log(`User connected: ${userId} (${socket.id})`);

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${userId} joined room: ${roomId}`);
    });

    socket.on("send_message", async (data) => {
      const senderId = socket.data.user.sub;
      const { chatRoomId, content } = data;

      const newMessage = await Message.create({
        chatRoomId,
        sender: senderId,
        content
      });

      await ChatRoom.findByIdAndUpdate(chatRoomId, {
        lastMessage: content,
        lastMessageTime: new Date()
      });

      io.to(chatRoomId).emit("receive_message", newMessage);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};
