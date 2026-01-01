const express = require("express");
const app = express();
const mongoose = require("mongoose");
require('dotenv').config({ quiet: true });

const PORT = process.env.PORT;
const HOST = process.env.HOST;
const DB_USER = encodeURIComponent(process.env.DB_USER);
const DB_PSWD = encodeURIComponent(process.env.DB_PSWD);
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_COLL = process.env.DB_COLL;
const DB_AUTH = process.env.DB_AUTH;
const DB_URL = `mongodb://${DB_USER}:${DB_PSWD}@${DB_HOST}:${DB_PORT}/${DB_COLL}?authSource=${DB_AUTH}`;

const authFilter = require("./utils/middleware");

const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const facultyRouter = require("./routes/faculty");

app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/track", authFilter, profileRouter);
app.use("/api/faculty", authFilter, facultyRouter);

const serverStartup = async () => {
  try {
    
    const conn = await mongoose.connect(DB_URL, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected ${conn.connection.host}`);

    app.listen(PORT, HOST, () => {
      console.log(`Server has started at ${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("Error occured while starting the server");
    console.error(err);
  }
};

serverStartup();
