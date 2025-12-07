import { Request, Response } from "express";
import { IUser, default as User } from "../models/user";

interface AuthRequest extends Request {
  user?: IUser;
}

// TODO: make this proper type
// interface UserSetupData {
//   bloodGroup?: string;
//   location?: {
//     lat: number;
//     lon: number;
//   };
// }

interface SearchQuery {
  bloodGroup?: string; // can be comma-separated like "O+,A+"
  lat?: string;
  lon?: string;
  radius?: string; // in km
}

export const setupUser = async (req: AuthRequest, res: Response) => {
  try {
    const { bloodGroup, location } = req.body;
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    if (bloodGroup) user.bloodGroup = bloodGroup;

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

export const searchUsers = async (
  req: Request<{}, {}, {}, SearchQuery>,
  res: Response
) => {
  try {
    const { bloodGroup, lat, lon, radius = "2" } = req.query;

    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    const center: [number, number] = [parseFloat(lon), parseFloat(lat)];
    const distance = parseFloat(radius) * 1000; // convert km -> meters

    // Convert comma-separated blood groups into an array (if present)
    let bloodGroups: string[] | undefined = undefined;
    if (bloodGroup) {
      bloodGroups = bloodGroup.split(",").map((bg) => bg.trim().toUpperCase());
    }

    const match: any = {};
    if (bloodGroups && bloodGroups.length > 0) {
      match.bloodGroup = { $in: bloodGroups };
    }

    const users = await User.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: center },
          distanceField: "distance",
          spherical: true,
          maxDistance: distance,
          query: match
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          bloodGroup: 1,
          distance: { $divide: ["$distance", 1000] } // convert meters -> km
        }
      },
      { $sort: { distance: 1 } } // nearest first
    ]);

    res.json({ count: users.length, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search users" });
  }
};
