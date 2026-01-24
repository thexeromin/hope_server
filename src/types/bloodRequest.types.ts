import mongoose, { Document } from "mongoose";

export enum BloodGroup {
  A_POS = "A+",
  A_NEG = "A-",
  B_POS = "B+",
  B_NEG = "B-",
  AB_POS = "AB+",
  AB_NEG = "AB-",
  O_POS = "O+",
  O_NEG = "O-"
}

export interface IBloodRequest extends Document {
  user: mongoose.Types.ObjectId;
  bloodType: BloodGroup;
  location: string;
  city: string;
  phone: string;
  neededBy: Date;
  createdAt: Date;
}
