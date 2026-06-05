import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { generateRouter } from "./routes/generate";
import { historyRouter } from "./routes/history";
import { healthRouter } from "./routes/health";
import { initDatabase } from "./db/database";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/health", healthRouter);
app.use("/api/generate", generateRouter);
app.use("/api/history", historyRouter);

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
);

// Initialize database and start server
initDatabase();

app.listen(PORT, () => {
  console.log(`InfraSketch AI server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
