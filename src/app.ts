import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import bloodRequest from "./routes/bloodRequest";
import chatRoutes from "./routes/chat";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from server!");
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/blood-requests", bloodRequest);

export default app;
