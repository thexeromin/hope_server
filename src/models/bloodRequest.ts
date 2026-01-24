import mongoose, { Schema } from "mongoose";

import { IBloodRequest, BloodGroup } from "../types";

const BloodRequestSchema = new Schema<IBloodRequest>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bloodType: {
      type: String,
      enum: Object.values(BloodGroup),
      required: true
    },
    location: { type: String, required: true },
    city: { type: String, required: true, index: true },
    phone: { type: String, required: true },
    neededBy: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Export the Model
const BloodRequest = mongoose.model<IBloodRequest>(
  "BloodRequest",
  BloodRequestSchema
);

export default BloodRequest;
