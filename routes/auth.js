import express from "express";
import User from "../models/User.js";
import FetchUser from "../middleware/FetchUser.js";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jsonWebToken from "jsonwebtoken";
import multer from "multer";
import fs from "fs";

const Router = express.Router();

let Profile = process.cwd();
Profile = Profile + "\\Profile"; //location

// Configure Multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, Profile);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });
/*---------------------------------------route 1-------------------------------------------- */

/*-----------create a user using Router.post------auth/createuser---------------------- */
Router.post(
  "/createuser",
  [
    // Validation middleware
    body("email", "Enter a valid Email").isEmail(),
    body("name", "Enter a valid Name").isLength({ min: 5 }),
    body("password", "Password must be at least 8 characters long").isLength({
      min: 8,
    }),
  ],
  upload.single("image"),
  async (req, res) => {
    try {
      // Validate request body
      const errors = validationResult(JSON.parse(JSON.stringify(req.body)));
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ errors: errors.array(), msg: "Validation Error" });
      }

      const { email, name, password } = req.body;
      const uploadedPic = req.file
        ? fs.readFileSync(req.file.destination + "\\" + req.file.originalname)
        : fs.readFileSync(Profile + "\\defaultProfilePic.jpg");

      // Check if user with email exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, msg: "User already exists" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        image: uploadedPic,
        imageBuffer: uploadedPic.toString("base64"),
      });

      await newUser.save();

      return res.json({ success: true, msg: "Registration Successful" });
    } catch (error) {
      return res.status(500).json({ msg: "Internal Server Error" });
    }
  }
);

/*---------------------------------------route 2-------------------------------------------- */

/*-----------login token generator using Router.post------auth/login-------------------- */
Router.post(
  "/login",
  [
    // Validate email and password
    body("email", "Enter a valid email").isEmail(),
    body("password", "Password cannot be blank").notEmpty(),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ errors: errors.array(), msg: "Validation Error" });
      }

      // Find user by email
      const user = await User.findOne({ email: req.body.email });

      // If user not found, return error
      if (!user) {
        return res
          .status(400)
          .json({ msg: "Invalid credentials", user: "Not Found" });
      }

      // Check if password matches
      const passwordMatch = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (!passwordMatch) {
        return res.status(400).json({ msg: "Invalid credentials" });
      }

      // Generate JWT token
      const payload = {
        id: user.id,
      };
      jsonWebToken.sign(
        payload,
        "Sourav", // Use environment variable for JWT secret
        // { expiresIn: "1h" }, // Token expires in 1 hour
        (err, token) => {
          if (err) throw err;
          res.json({ token: token, success: true });
        }
      );
    } catch (err) {
      res.status(500).send("Server Error");
    }
  }
);

/*---------------------------------------route 3-------------------------------------------- */
/*-----------Get loggedin user details using Router.post------auth/getuser----------------------- */
Router.post("/getuser", FetchUser, async (req, res) => {
  try {
    let userId = req.userData;
    let user = await User.findById(userId);
    res.json({
      name: user.name,
      imageBuffer: user.imageBuffer,
      email: user.email,
    });
  } catch (error) {
    /*-----------catching error----------- */

    res.status(500).json({ msg: "Internal Server Error" });
  }
});

// ------------------------------------------route 4----------------------
// ------------------------------------------updateUser-====-==-=-=-===
Router.post(
  "/updateuser",
  upload.single("image"),
  FetchUser,
  async (req, res) => {
    try {
      /*---------------------------finding and updating the note-----------------------------------*/
      const { name } = req.body;
      const newUserName = {};
      if (name) {
        newUserName.name = name;
      }
      if (req.file) {
        const uploadedPic = req.file
          ? fs.readFileSync(req.file.destination + "\\" + req.file.originalname)
          : fs.readFileSync(Profile + "\\defaultProfilePic.jpg");
        newUserName.image = uploadedPic;
        newUserName.imageBuffer = uploadedPic.toString("base64");
      }
      let user = await User.findByIdAndUpdate(
        req.userData,
        { $set: newUserName },
        { new: true }
      );
      res.json({
        name: user.name,
        image: user.imageBuffer,
        msg: "Successfull",
      });
    } catch (error) {
      res.status(500).send("Internal Server Error");
    }
  }
);

export default Router;
