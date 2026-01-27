import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { Message, ChatRoom } from "../models/chat";

export const initSocket = (httpServer: HttpServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" } // Allow Expo to connect
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join a specific chat room
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`User joined room: ${roomId}`);
    });

    // Handle sending a message
    socket.on("send_message", async (data) => {
      const { chatRoomId, senderId, content } = data;

      // Save to DB
      const newMessage = await Message.create({
        chatRoomId,
        sender: senderId,
        content
      });

      // Update ChatRoom "Last Message" for the Inbox view
      await ChatRoom.findByIdAndUpdate(chatRoomId, {
        lastMessage: content,
        lastMessageTime: new Date()
      });

      // Broadcast to everyone in that room (including sender)
      io.to(chatRoomId).emit("receive_message", newMessage);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};
