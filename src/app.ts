import express, { Request, Response } from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from server!");
});

app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);

export default app;
