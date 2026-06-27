import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';


const app = express();

app.use(express.json());
const PORT = process.env.PORT || 5000;

// Request parsing configuration
app.use(cors());
app.use(express.json());

// Base health verification endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: "healthy", system: "OptimaSched Engine" });
});

// Future API routes wrapper location
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);
// Centralized error interceptor fallback hook (Must remain last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 OptimaSched core service running smoothly on port ${PORT}`);
});