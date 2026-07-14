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
  companyLogo: { type: String },
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

// Get All Jobs Route
app.get('/api/jobs', async (req: Request, res: Response) => {
  try {
    const { search, location, type } = req.query;
    let query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { skillsRequired: { $regex: search, $options: 'i' } }
      ];
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (type) {
      const types = (type as string).split(',');
      query.type = { $in: types.map(t => new RegExp(`^${t.trim()}$`, 'i')) };
    }

    const jobs = await Job.find(query).sort({ postedAt: -1 });
    res.status(200).json(jobs);
  } catch (error: any) {
    console.error('Fetch Jobs Error:', error);
    res.status(500).json({ message: error.message || 'Server error while fetching jobs' });
  }
});


// Application Schema
const applicationSchema = new mongoose.Schema({
  jobId: { type: String, required: true },
  jobTitle: { type: String, required: true },
  companyName: { type: String, required: true },
  seekerId: { type: String, required: true },
  seekerName: { type: String, required: true },
  coverLetter: { type: String },
  resumeUrl: { type: String, required: true },
  status: { type: String, default: 'applied' },
  createdAt: { type: Date, default: Date.now }
});

const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);

// Apply for a Job Route
app.post('/api/applications', async (req: Request, res: Response) => {
  try {
    const { jobId, jobTitle, companyName, seekerId, seekerName, coverLetter, resumeUrl } = req.body;
    
    if (!jobId || !seekerId) {
      return res.status(400).json({ message: 'Job ID and Seeker ID are required' });
    }

    // Check duplicate application
    const existing = await Application.findOne({ jobId, seekerId });
    if (existing) {
      return res.status(400).json({ message: 'You have already applied for this job' });
    }

    const newApp = new Application({
      jobId,
      jobTitle,
      companyName,
      seekerId,
      seekerName,
      coverLetter,
      resumeUrl,
      status: 'applied'
    });

    const savedApp = await newApp.save();

    // Increment applications count in Job document
    let jobQuery: any = { _id: jobId };
    try {
      if (mongoose.Types.ObjectId.isValid(jobId)) {
        jobQuery = { _id: new mongoose.Types.ObjectId(jobId) };
      }
    } catch (e) {}

    await Job.findOneAndUpdate(
      jobQuery,
      { $inc: { applications: 1 } }
    );

    res.status(201).json(savedApp);
  } catch (error: any) {
    console.error('Job Application Error:', error);
    res.status(500).json({ message: error.message || 'Server error while applying for job' });
  }
});

// Get Applications Route
app.get('/api/applications', async (req: Request, res: Response) => {
  try {
    const { seekerId, jobId } = req.query;
    let query: any = {};
    if (seekerId) query.seekerId = seekerId;
    if (jobId) query.jobId = jobId;

    const apps = await Application.find(query).sort({ createdAt: -1 });
    res.status(200).json(apps);
  } catch (error: any) {
    console.error('Fetch Applications Error:', error);
    res.status(500).json({ message: error.message || 'Server error while fetching applications' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[server]: Server is running at http://localhost:${PORT}`);
});
