import { notFound, errorHandler } from "./middleware/errorHandler.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "node:path";
import profileRoutes from "./routes/profileRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import catalogRoutes from "./routes/catalogRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminCouponRoutes from "./routes/adminCouponRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());

app.use(cookieParser());

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "HealthyBite API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/admin/coupons", adminCouponRoutes);
app.use("/api", catalogRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
