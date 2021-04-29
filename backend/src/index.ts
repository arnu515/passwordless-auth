if ((process.env.NODE_ENV || "development") === "development")
  require("dotenv").config(require("path").join(__dirname, "..", ".env"));

import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import { createServer } from "http";
import controllers from "./controllers";

mongoose.connect(process.env.MONGODB_URL || "mongodb://localhost:27017/db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
controllers.forEach((c) => app.use(c.path || "/", c.router));

const { PORT = 5000 } = process.env;
createServer(app).listen(PORT, () =>
  console.log("Server started on port " + PORT)
);
