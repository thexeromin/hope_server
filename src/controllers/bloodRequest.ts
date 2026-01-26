import { Response } from "express";
import BloodRequest from "../models/bloodRequest";
import { AuthRequest } from "../types";

export const createBloodRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bloodType, address, phone, neededBy, latitude, longitude } =
      req.body;

    // Ensure user didn't send empty strings
    if (!bloodType || !address || !phone || !latitude || !longitude) {
      res.status(400).json({
        success: false,
        message: "Please fill in all required fields."
      });
      return;
    }

    // Create the request
    const newRequest = await BloodRequest.create({
      user: req.user!._id,
      bloodType,
      address,
      phone,
      neededBy: neededBy || new Date(),
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      }
    });

    res.status(201).json({
      success: true,
      message: "Blood request created successfully",
      data: newRequest
    });
  } catch (error: any) {
    console.error("Create Request Error:", error);

    // Handle specific Mongoose validation errors (like invalid Enum value)
    if (error.name === "ValidationError") {
      res.status(400).json({ success: false, message: error.message });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Server error. Could not create request."
    });
  }
};

export const getBloodRequests = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { radius, bloodType } = req.query;
    const lng = req.user?.location?.coordinates[0];
    const lat = req.user?.location?.coordinates[1];

    const filter: any = {};

    // Filter by Blood Type (Optional)
    if (bloodType) {
      filter.bloodType = bloodType;
    }

    // Filter by Radius (Geospatial)
    // If user provides lat/lng, we filter by distance.
    if (lat && lng) {
      const distanceInKilometers = Number(radius) || 10; // Default 10km radius
      const distanceInMeters = distanceInKilometers * 1000;

      filter.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: distanceInMeters
        }
      };
    }

    const requests = await BloodRequest.find(filter)
      .populate("user", "name email avatar")
      .limit(50);

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
