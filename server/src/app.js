import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import prisma from './config/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import teacherRoutes from './routes/teacher.routes.js'; 
import roomRoutes from './routes/room.routes.js'; // Import the room routes
import auditLogRoutes from './routes/auditLog.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Global Middleware Configuration
app.use(cors());
app.use(express.json()); // Handles incoming JSON payloads cleanly

// Base health verification endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: "healthy", system: "OptimaSched Engine" });
});

// App API Routers
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/teachers', teacherRoutes); // Cleanly structured mounting point
app.use('/api/rooms', roomRoutes); // Mount the room route
app.use('/api/audit-logs', auditLogRoutes);
// Centralized error interceptor fallback hook (Must remain last)
app.use(errorHandler);

// Database connection verification & server startup initialization
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