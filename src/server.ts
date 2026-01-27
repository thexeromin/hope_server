import { createServer } from "http";
import app from "./app";
import connectDB from "./config/db";
import { initSocket } from "./config/socket";

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
initSocket(httpServer);

connectDB();

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Socket.io is ready for connections`);
});
