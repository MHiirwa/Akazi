import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import authRoutes from "./routes/auth.routes.js";
import jobRoutes from "./routes/job.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import userRoutes from "./routes/user.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import jobAlertRoutes from "./routes/jobAlert.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import savedJobRoutes from "./routes/savedJob.routes.js";
import documentRoutes from "./routes/document.routes.js";
import errorHandler from "./middleware/errorHandler.js";
import { setupSwagger } from "./config/swagger.js";
import { generalLimiter, strictOnPost } from "./middleware/rateLimiter.js";
const app = express();
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
}
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());
if (process.env.NODE_ENV !== "test") {
  app.use(generalLimiter);
  app.use(strictOnPost);
}
app.get("/health", (req, res) => res.json({ status: "ok" }));
setupSwagger(app);
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api", reviewRoutes);
app.use("/api/job-alerts", jobAlertRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/saved-jobs", savedJobRoutes);
app.use("/api/documents", documentRoutes);
app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use(errorHandler);
var app_default = app;
export { app_default as default };
