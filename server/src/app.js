import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import teacherRoutes from './routes/teacher.routes.js'; // Import the new teacher routes


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
app.use('/api/dashboard', dashboardRoutes);
// Centralized error interceptor fallback hook (Must remain last)
app.use(errorHandler);


import { prisma } from './config/prisma.js';

async function startServer() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection verified.');

    app.listen(PORT, () => {
      console.log(`🚀 OptimaSched core service running smoothly on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server due to database connection error:');
    console.error(error);
    process.exit(1);
  }
}

startServer();