import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import profileRoutes from './routes/profile.routes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// FIX CORS
app.use(cors({
  origin: ['http://localhost:5173', 'https://rozanne-duplicable-bently.ngrok-free.dev'],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
  credentials: true,
}));

// FIX OPTIONS preflight
app.options("*", cors());

// FIX ngrok browser warning
app.use((req, res, next) => {
  res.header("ngrok-skip-browser-warning", "true");
  next();
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/profile', profileRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Express + Supabase session auth working' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
