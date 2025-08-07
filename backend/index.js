import { createServer } from "http";
import { createApplication } from "./app.js";

const httpServer = createServer();

createApplication(
  httpServer,
  {
    cors: {
      origin: ["http://localhost"],
    },
  }
);

console.log("server started on http://localhost:3000");

httpServer.listen(3000);