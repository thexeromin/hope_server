import { Request, Response } from "express";
import { ChatRoom, Message } from "../models/chat";
import { AuthRequest } from "../types";

// Initiate Chat (Find or Create)
export const initiateChat = async (req: AuthRequest, res: Response) => {
  try {
    const myId = req.user!._id;
    const { targetUserId } = req.body; // The owner of the blood request

    if (!targetUserId)
      return res.status(400).json({ message: "Target user required" });

    // Check if a room already exists between these two
    let chatRoom = await ChatRoom.findOne({
      participants: { $all: [myId, targetUserId] }
    }).populate("participants", "name email avatar");

    // If no room, create one
    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        participants: [myId, targetUserId]
      });
      // Populate specifically for the response
      chatRoom = await chatRoom.populate("participants", "name email avatar");
    }

    res.json({ success: true, chatRoom });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get my chat rooms (For inbox screen)
export const getMyChats = async (req: AuthRequest, res: Response) => {
  try {
    const chats = await ChatRoom.find({ participants: req.user!._id })
      .sort({ updatedAt: -1 })
      .populate("participants", "name avatar");
    res.json({ success: true, data: chats });
  } catch (error) {
    res.status(500).json({ message: "Error fetching chats" });
  }
};

// Get messages (For specific room)
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ chatRoomId: roomId }).sort({
      createdAt: 1
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages" });
  }
};
