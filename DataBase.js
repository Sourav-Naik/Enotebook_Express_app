import mongoose from "mongoose";
const ConnectToMongo = async () => {
  await mongoose.connect("mongodb://localhost:27017/enotebook");
};
export default ConnectToMongo;
