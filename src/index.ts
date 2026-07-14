import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

import mongoose from 'mongoose';

const uri = process.env.MONGO_DB_URL;

if (!uri) {
  console.error('MONGO_DB_URL is not defined in the environment variables');
  process.exit(1);
}

// Connect to MongoDB using Mongoose
mongoose.connect(uri, { dbName: 'nexthirebd' })
  .then(async () => {
    // Send a ping to confirm a successful connection
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Basic health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'NextHireBD Server is running smoothly' });
});

// Job Schema
const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, required: true },
  companyName: { type: String },
  recruiterId: { type: String },
  applications: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
  salary: { type: String },
  description: { type: String },
  requirements: { type: String },
  experienceLevel: { type: String },
  skillsRequired: { type: String },
  postedAt: { type: Date, default: Date.now }
});

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);

// Post Job Route
app.post('/api/jobs', async (req: Request, res: Response) => {
  try {
    const newJob = new Job(req.body);
    const savedJob = await newJob.save();
    res.status(201).json(savedJob);
  } catch (error: any) {
    console.error('Job Posting Error:', error);
    res.status(500).json({ message: error.message || 'Server error while posting job' });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`[server]: Server is running at http://localhost:${PORT}`);
});
