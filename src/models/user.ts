import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  name: string;
  bloodGroup?: string;
  address?: string;
  lastDonated?: Date;
  totalDonation: number;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
}

const userSchema: Schema<IUser> = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    bloodGroup: { type: String },
    totalDonation: { type: Number, default: 0 },
    lastDonated: { type: Date },
    address: { type: String },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: "2dsphere" // required for geo search
      }
    }
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;
