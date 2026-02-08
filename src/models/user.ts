import mongoose, { Schema, Document } from "mongoose";
import { BloodGroup } from "../types";

export interface IUser extends Document {
  email: string;
  name: string;
  bloodGroup?: BloodGroup;
  avatar?: string;
  address?: string;
  lastDonated?: Date;
  totalDonation: number;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  pushTokens: string[];
}

const userSchema: Schema<IUser> = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    },
    avatar: { type: String },
    totalDonation: { type: Number, default: 0 },
    lastDonated: { type: Date, default: null },
    address: { type: String },
    location: {
      type: {
        type: String,
        enum: ["Point"]
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: "2dsphere" // required for geo search
      }
    },
    pushTokens: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

userSchema.index({ location: "2dsphere" });

const User = mongoose.model<IUser>("User", userSchema);

export default User;
