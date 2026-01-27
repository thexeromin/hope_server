import mongoose, { Document } from "mongoose";

export interface IChatRoom extends Document {
  participants: mongoose.Types.ObjectId[]; // [UserA, UserB]
  lastMessage?: string;
  lastMessageTime?: Date;
}

export interface IMessage extends Document {
  chatRoomId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  read: boolean;
}
