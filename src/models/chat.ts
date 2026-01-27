import mongoose, { Schema, Document } from "mongoose";
import { IChatRoom, IMessage } from "../types";

const ChatRoomSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: String },
    lastMessageTime: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Index for fast lookup of existing rooms
ChatRoomSchema.index({ participants: 1 });

export const ChatRoom = mongoose.model<IChatRoom>("ChatRoom", ChatRoomSchema);

const MessageSchema = new Schema(
  {
    chatRoomId: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true
    },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Message = mongoose.model<IMessage>("Message", MessageSchema);
