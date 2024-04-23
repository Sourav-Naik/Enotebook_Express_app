import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import auth from "./routes/auth.js";
import notes from "./routes/notes.js";
import dotenv from "dotenv";

const app = express();
app.use(express.json());

dotenv.config();

// Enable CORS for frontend access
app.use(
  cors({
    origin: ["http://localhost:3000", "http://192.168.1.8:3000"],
  })
);

// Define API routes
app.use("/api/auth", auth);
app.use("/api/notes", notes);

// Serve static files from the "build" directory
app.use(express.static(path.join(process.cwd(), "build")));
// Serve the React app for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "build", "index.html"));
});

// Start the server
mongoose
  .connect(process.env.Mongo)
  .then(() => {
    console.log("Connected to the database");
    // Start the server
    app.listen(process.env.port || 5000, async () => {
      console.log(`Server is running on port ${process.env.port || 5000}`);
    });
  })
  .catch((err) => {
    console.error(`Error connecting to the database: ${err}`);
  });
