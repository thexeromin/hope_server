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
    address: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    phone: { type: String, required: true },
    neededBy: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

BloodRequestSchema.index({ location: "2dsphere" });

// Export the Model
const BloodRequest = mongoose.model<IBloodRequest>(
  "BloodRequest",
  BloodRequestSchema
);

export default BloodRequest;
