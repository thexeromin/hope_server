import express, { Request, Response } from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import bloodRequest from "./routes/bloodRequest";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from server!");
});

app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api", bloodRequest);

export default app;
