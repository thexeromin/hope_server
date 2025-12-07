import { Request, Response } from "express";
import { client } from "../config/googleClient";
import User from "../models/user";
import { signToken } from "../utils/jwt";

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.name) {
      return res.status(400).json({ error: "Invalid token" });
    }

    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = new User({ email: payload.email, name: payload.name });
      await user.save();
      return res.json({ user, token, isNew: true });
    }

    const jwtToken = signToken(user);

    res.json({ user, token: jwtToken, isNew: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Authentication failed" });
  }
};
