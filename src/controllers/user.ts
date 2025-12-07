import { Request, Response } from "express";
import { IUser } from "../models/user";

interface AuthRequest extends Request {
  user?: IUser;
}

export const setupUser = async (req: AuthRequest, res: Response) => {
  try {
    const { bloodGroup, location } = req.body;
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    if (bloodGroup) user.bloodGroup = bloodGroup;
    if (location) user.location = location;

    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
};
