import { Response } from "express";
import BloodRequest from "../models/bloodRequest";
import User from "../models/user";
import { sendPushNotifications } from "../services/notificationService";
import { AuthRequest, RequestStatus } from "../types";

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

    // Find Donors (Background)
    const nearbyDonors = await User.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: 5000
        }
      },
      bloodGroup: bloodType,
      _id: { $ne: req.user!._id },
      pushTokens: { $exists: true, $not: { $size: 0 } }
    });

    const allTokens: string[] = nearbyDonors
      .map((user) => user.pushTokens)
      .flat();

    if (allTokens.length > 0) {
      // Fire & Forget
      sendPushNotifications(
        allTokens,
        "URGENT: Blood Needed Nearby!",
        `Someone near you needs ${bloodType} blood. Tap to help.`,
        { requestId: newRequest._id, screen: "donate" }
      );
    }
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
    const { radius, bloodType, lat: queryLat, lng: queryLng } = req.query;

    // Prefer the live location sent by the client, fallback to profile location
    const lng = queryLng
      ? Number(queryLng)
      : req.user?.location?.coordinates[0];
    const lat = queryLat
      ? Number(queryLat)
      : req.user?.location?.coordinates[1];

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

    filter.status = RequestStatus.ACTIVE;

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

export const getMyRequests = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user?._id;

    // Fetch ALL requests (active & fulfilled) for this user
    const requests = await BloodRequest.find({ user: currentUserId })
      .sort({ createdAt: -1 }) // Newest first
      .populate("user", "name avatar");

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error("Get My Requests Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const updateRequestStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body; // Expect { status: "fulfilled" } or "active"
    const requestId = req.params.id;
    const currentUserId = req.user!._id;

    // 1. Find the request
    const request = await BloodRequest.findById(requestId);

    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }

    // 2. Check Ownership (Crucial Security Step)
    if (request.user.toString() !== currentUserId.toString()) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to update this request"
      });
    }

    // 3. Update & Save
    if (status) request.status = status;
    await request.save();

    res.status(200).json({
      success: true,
      message: `Request marked as ${status}`,
      data: request
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteRequest = async (req: AuthRequest, res: Response) => {
  try {
    const requestId = req.params.id;
    const currentUserId = req.user!._id;

    const request = await BloodRequest.findById(requestId);

    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }

    // Check Ownership
    if (request.user.toString() !== currentUserId.toString()) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to delete this request"
      });
    }

    // Perform Delete
    await request.deleteOne();

    res.status(200).json({
      success: true,
      message: "Request deleted successfully",
      id: requestId
    });
  } catch (error) {
    console.error("Delete Request Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
