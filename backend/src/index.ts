import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { initStorage } from './config/storage';
import authRoutes from './routes/auth';
import generationRoutes from './routes/generation';
import adminRoutes from './routes/admin';
import publicRoutes from './routes/public';
import authMiddleware from './middleware/auth';
import adminMiddleware from './middleware/admin';
import { ensureSchema, seedAdmin } from './seed';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize storage folders
initStorage();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from prod_s3
app.use('/files', express.static(path.join(__dirname, '../prod_s3')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/api', authMiddleware, publicRoutes);
app.use('/api/generation', authMiddleware, generationRoutes);

// Start server and seed admin
app.listen(PORT, async () => {
  console.log(`Backend server running on port ${PORT}`);
  
  // Ensure schema migrations before seeding
  await ensureSchema();

  // Seed admin user on startup
  await seedAdmin();
});
