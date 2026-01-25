import { Response, Request } from "express";
import BloodRequest from "../models/bloodRequest";
import { AuthRequest, BloodGroup } from "../types";

export const createBloodRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bloodType, location, city, phone, neededBy } = req.body;

    // Ensure user didn't send empty strings
    if (!bloodType || !location || !city || !phone) {
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
      location,
      city,
      phone,
      neededBy: neededBy || new Date()
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
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { city, bloodType } = req.query;

    const filter: any = {};

    if (city) {
      filter.city = { $regex: city, $options: "i" };
    }

    if (bloodType) {
      filter.bloodType = bloodType;
    }

    const requests = await BloodRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email avatar")
      .limit(50);

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error("Get Requests Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Could not fetch requests."
    });
  }
};
