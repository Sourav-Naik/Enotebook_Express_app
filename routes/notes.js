import express from "express";
import { body, validationResult } from "express-validator";
import Note from "../models/Note.js";
import FetchUser from "../middleware/FetchUser.js";
const Router = express.Router();

/*---------------get all user notes using get--------/notes/fetchallnotes-----*/
Router.get("/fetchallnotes", FetchUser, async (req, res) => {
  try {
    let userId = req.userData;
    const notes = await Note.find({ user: userId });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

/*---------------add a new note using post--------/notes/fetchallnotes-----------------login reqiured------------*/
Router.post(
  "/addnewnote", //end point
  FetchUser, //middleware to fetch user
  [
    body("title", "Enter a valid title").isLength({ min: 4 }),
    body("description", "Description must be atleast 10 chararcters ").isLength(
      { min: 10 }
    ),
    body("content", "content must containt something").isLength({ min: 1 }),
  ], //express-validator-setting-limits
  async (req, res) => {
    let userId = req.userData;
    const { title, description, tag, content } = req.body;
    const result = validationResult(req); //express-validator-validating-result

    if (result.isEmpty()) {
      try {
        const note = new Note({
          tag,
          title,
          content,
          description,
          user: userId,
        });
        const savedNote = await note.save();
        return res.json({ msg: "Note Saved" });
      } catch (error) {
        res.status(500).json({ msg: "Internal Server Error" });
      }
    } else {
      return res.send({ errors: result.array(), msg: "Validation Error" });
    }
  }
);

/*---------------update a notes using post--------/notes/updatenote-----*/
Router.put("/update/:Id", FetchUser, async (req, res) => {
  const { title, description, tag, content } = req.body; //destructuring\
  //create a newNote object
  const newNote = {};
  if (title) {
    newNote.title = title;
  }
  if (content) {
    newNote.content = content;
  }
  if (description) {
    newNote.description = description;
  }
  if (tag) {
    newNote.tag = tag;
  }

  try {
    /*---------------------------finding and updating the note-----------------------------------*/
    let note = await Note.findById(req.params.Id);
    if (!note) {
      return res.status(404).send("Not Found");
    }
    if (note.user.toString() !== req.userData) {
      return res.status(404).send("Not Allowed");
    }
    note = await Note.findByIdAndUpdate(
      req.params.Id,
      { $set: newNote },
      { new: true }
    );
    res.json({ msg: "Successfully Saved" });
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

/*---------------delete a notes using delete request--------/notes/delete-----*/
Router.delete("/deletenote/:Id", FetchUser, async (req, res) => {
  let userId = req.userData;
  try {
    let note = await Note.findById(req.params.Id);
    if (!note) {
      return res.status(404).json({ msg: "Not Found" });
    }
    if (note.user.toString() !== userId) {
      return res.status(404).json({ msg: "Not Allowed" });
    }
    note = await Note.findByIdAndDelete(req.params.Id);
    res.json({ msg: "Note has Been deleted", success: true });
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
  /*---------------------------finding and deleting the note-----------------------------------*/
});

export default Router;
