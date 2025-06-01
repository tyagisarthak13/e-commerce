import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: "Ecommerce",
    });
    console.log("Mongo DB connected");
  } catch (error) {
    console.log(error);
  }
};

export default connectDB;
