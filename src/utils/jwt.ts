// TODO: remove this file

import jwt from "jsonwebtoken";
import { IUser } from "../models/user";
import type { StringValue } from "ms";

const secret = process.env.JWT_SECRET || "default_secret";
const expiresIn = (process.env.JWT_EXPIRES_IN as StringValue) || "7d";

export const signToken = (user: IUser) => {
  return jwt.sign({ id: user._id, email: user.email }, secret, { expiresIn });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, secret) as { id: string; email: string };
};
