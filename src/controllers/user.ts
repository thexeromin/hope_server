import { Request, Response } from "express";
import User from "../models/user";

export const setupUser = async (req: Request, res: Response) => {
  try {
    const { email, bloodGroup, location } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (bloodGroup) user.bloodGroup = bloodGroup;
    if (location) user.location = location;

    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
};
