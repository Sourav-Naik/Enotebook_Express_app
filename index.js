import ConnectToMongo from "./DataBase.js";
import express from "express";
import auth from "./routes/auth.js";
import notes from "./routes/notes.js";
import cors from "cors";
import path from "path";

ConnectToMongo();

const __dirname = process.cwd();

const app = express();
app.use(express.json());

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
app.use(express.static(path.join(__dirname, "build")));
// Serve the React app for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Start the server
const port = 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
