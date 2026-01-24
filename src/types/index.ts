import { Request } from "express";
import { IUser } from "../models/user";

export interface AuthRequest extends Request {
  user?: IUser;
}

export * from "./bloodRequest.types";
