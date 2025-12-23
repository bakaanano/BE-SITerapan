import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import chatbotRoutes from "./routes/chatbot.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import profileRoutes from "./routes/profile.routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ====== CORS FIX =======
const allowedOrigins = [
  "https://fe-si-terapan.vercel.app",
  "http://localhost:5173",
  /^https:\/\/.*\.vercel\.app$/,
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Jika origin cocok, izinkan
  if (
    allowedOrigins.some((o) =>
      o instanceof RegExp ? o.test(origin) : o === origin
    )
  ) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, ngrok-skip-browser-warning"
  );

  // Ngrok warning bypass
  res.header("ngrok-skip-browser-warning", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/profile", profileRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend is running with proper CORS." });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
