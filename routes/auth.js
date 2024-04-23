import express from "express";
import User from "../models/User.js";
import FetchUser from "../middleware/FetchUser.js";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jsonWebToken from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import path from "path";
import { SMTPClient } from "emailjs";

const Router = express.Router();
const Profile = path.join(process.cwd(), "Profile");
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

//--------------------------------------route 1---------------------------------------
//----------create a user using Router.post------auth/createuser----------------------
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
      let { email, name, password, googleLogin, googleCredentail } = req.body;
      // Check if user with email exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, msg: "User already exists" });
      }

      // set email and password for google login
      if (googleLogin === "true") {
        googleCredentail = JSON.parse(googleCredentail);
        email = googleCredentail.email;
        password = googleCredentail.sub + process.env.secret;
        name = googleCredentail.name;
      }

      // Validate request body
      if (googleLogin === "false") {
        const errors = validationResult(JSON.parse(JSON.stringify(req.body)));
        if (!errors.isEmpty()) {
          return res
            .status(400)
            .json({ errors: errors.array(), msg: "Validation Error" });
        }
      }

      //setting profilepic
      const uploadedPic = req.file
        ? fs.readFileSync(
            path.join(req.file.destination, req.file.originalname)
          )
        : fs.readFileSync(path.join(Profile, "defaultProfilePic.jpg"));

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      await User.create({
        name,
        email,
        googleLogin,
        password: hashedPassword,
        imageBuffer: uploadedPic.toString("base64"),
      });

      // delete the image from local storage
      if (req.file) {
        fs.unlinkSync(path.join(req.file.destination, req.file.originalname));
      }

      return res.json({ success: true, msg: "Registration Successful" });
    } catch (error) {
      return res.status(500).json({ msg: "Internal Server Error" });
    }
  }
);

//---------------------------------------route 2--------------------------------------
//-----------login token generator using Router.post------auth/login------------------
Router.post(
  "/login",
  [
    // Validate email and password
    body("email", "Enter a valid email").isEmail(),
    body("password", "Password cannot be blank").notEmpty(),
  ],
  async (req, res) => {
    try {
      let { email, password, googleLogin, googleCredentail } = req.body;
      // get email and password for google login
      if (googleLogin === true) {
        email = googleCredentail.email;
        password = googleCredentail.sub + process.env.secret;
      }
      // Check for validation errors
      if (googleLogin === false) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res
            .status(400)
            .json({ errors: errors.array(), msg: "Validation Error" });
        }
      }
      // Find user by email
      const user = await User.findOne({ email: email });

      // If user not found, return error
      if (!user) {
        return res
          .status(400)
          .json({ msg: "Invalid credentials", user: "Not Found" });
      }

      // Check if password matches
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ msg: "Invalid credentials" });
      }

      // Generate JWT token
      const payload = {
        id: user.id,
      };
      jsonWebToken.sign(
        payload,
        process.env.JWT_TOKEN, // Use environment variable for JWT secret
        // { expiresIn: "1h" }, //Token expires in 1 hour
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

//--------------------------------------route 3---------------------------------------
//-----------Get loggedin user details using Router.post------auth/getuser------------
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

// ------------------------------------------route 4---------------------------------
// ------------------------------------------updateUser------------------------------
Router.post(
  "/updateuser",
  upload.single("image"),
  FetchUser,
  async (req, res) => {
    try {
      /*---------------------------finding and updating the note-----------------------------------*/
      const { name } = req.body;
      const newUser = {};
      if (name) {
        newUser.name = name;
      }
      if (req.file) {
        const uploadedPic = fs.readFileSync(
          path.join(req.file.destination, req.file.originalname)
        );
        newUser.imageBuffer = uploadedPic.toString("base64");
      }
      let user = await User.findByIdAndUpdate(
        req.userData,
        { $set: newUser },
        { new: true }
      );
      if (req.file) {
        fs.unlinkSync(path.join(req.file.destination, req.file.originalname));
      }
      res.json({
        name: user.name,
        image: user.imageBuffer,
        msg: "Successfull Updated",
      });
    } catch (error) {
      res.status(500).send({ msg: "Internal Server Error" });
    }
  }
);

// ----------------------------------route 5-----------------------------------------
// ------------------------------forgot password-------------------------------------
Router.post("/forgotpassword", async (req, res) => {
  const client = new SMTPClient({
    user: process.env.user,
    password: process.env.password,
    host: "smtp.gmail.com",
    ssl: true,
  });
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    if (user.googleLogin) {
      return res
        .status(400)
        .json({ msg: "Cannot reset password for Google login users" });
    }

    const { _id } = user;
    // generate new password
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    // Send email with credentials
    try {
      await client.sendAsync({
        text: `Your Credentials For EnoteBook \nEmail: ${email} \nPassword: ${password}`,
        from: "Enotebook",
        to: email,
        cc: "",
        subject: "Enotebook Credentials",
      });
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      // Update user's password
      await User.findByIdAndUpdate(_id, {
        $set: { password: hashedPassword },
      });
      return res.json({
        msg: "Check Email For New Password",
      });
    } catch (error) {
      return res.status(500).json({ msg: "Error sending email" });
    }
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

export default Router;
