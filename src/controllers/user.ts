import { Request, Response } from "express";
import { IUser, default as User } from "../models/user";

interface AuthRequest extends Request {
  user?: IUser;
}

export const setupUser = async (req: AuthRequest, res: Response) => {
  try {
    const { bloodGroup, location, address } = req.body;
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    if (bloodGroup) user.bloodGroup = bloodGroup;
    if (address) user.address = address;

    // Convert { lat, lon } to GeoJSON { type, coordinates }
    if (location && location.lat && location.lon) {
      user.location = {
        type: "Point",
        coordinates: [location.lon, location.lat]
      };
    }

    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
};

export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!._id).select(
      "bloodGroup totalDonation lastDonated"
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      data: {
        bloodGroup: user.bloodGroup || "N/A",
        totalDonation: user.totalDonation,
        lastDonated: user.lastDonated
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const logDonation = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Prevent spamming (e.g., allow only once every 1 months)
    const oneMonthsAgo = new Date();
    oneMonthsAgo.setMonth(oneMonthsAgo.getMonth() - 1);
    if (user.lastDonated && user.lastDonated > oneMonthsAgo) {
      return res
        .status(400)
        .json({ message: "You can only donate once every months." });
    }

    // Update Logic
    user.totalDonation = (user.totalDonation || 0) + 1;
    user.lastDonated = new Date(); // Set to Now

    await user.save();

    res.json({
      success: true,
      message: "Donation logged successfully!",
      data: {
        totalDonation: user.totalDonation,
        lastDonated: user.lastDonated
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const findDonors = async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, radius, bloodGroup } = req.query;
    const currentUser = req.user;

    let centerLat: number;
    let centerLng: number;

    // Resolve location

    // Priority A: Did the frontend send live GPS?
    if (lat && lng) {
      centerLat = parseFloat(lat as string);
      centerLng = parseFloat(lng as string);
    }
    // Priority B: Does the logged-in user have a saved location?
    else if (
      currentUser?.location &&
      currentUser.location.coordinates &&
      currentUser.location.coordinates.length === 2
    ) {
      centerLng = currentUser.location.coordinates[0];
      centerLat = currentUser.location.coordinates[1];
    } else {
      return res.status(400).json({
        success: false,
        code: "LOCATION_MISSING",
        message:
          "We need your location to find donors. Please enable GPS or update your profile address."
      });
    }

    // Perform search

    const searchRadiusKm = parseFloat(radius as string) || 10; // Default 10km radius
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const query: any = {
      _id: { $ne: currentUser?._id }, // Don't show myself

      location: {
        $geoWithin: {
          $centerSphere: [
            [centerLng, centerLat],
            searchRadiusKm / 6378.1 // Earth radius logic
          ]
        }
      },

      // Eligibility Check
      $or: [
        { lastDonated: { $exists: false } },
        { lastDonated: null },
        { lastDonated: { $lte: threeMonthsAgo } }
      ]
    };

    if (bloodGroup && bloodGroup !== "All") {
      query.bloodGroup = bloodGroup;
    }

    const donors = await User.find(query)
      .select("name email bloodGroup address location avatar lastDonated")
      .limit(50);

    return res.status(200).json({
      success: true,
      count: donors.length,
      data: donors
    });
  } catch (error) {
    console.error("Find Donors Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updatePushToken = async (req: AuthRequest, res: Response) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user!._id;

    if (!pushToken) {
      return res
        .status(400)
        .json({ success: false, message: "Token required" });
    }

    // Prevents duplicate tokens for the same device
    await User.findByIdAndUpdate(userId, {
      $addToSet: { pushTokens: pushToken }
    });

    res.json({ success: true, message: "Push token registered" });
  } catch (error: any) {
    console.error("Token Update Error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Something went wrong in update push token"
    });
  }
};
