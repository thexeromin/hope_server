import { Request, Response, NextFunction } from "express";
import * as jose from "jose";
import { JWT_SECRET } from "../utils/constants";
import User from "../models/user";

interface AuthRequest extends Request {
  user?: any;
}

export const isAuthenticated = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const accessToken = authHeader.split(" ")[1];

  try {
    const decoded = await jose.jwtVerify(
      accessToken,
      new TextEncoder().encode(JWT_SECRET)
    );
    const user = await User.findOne({ email: decoded.payload.email as string });
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user; // attach user to request object
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid token" });
  }
};
