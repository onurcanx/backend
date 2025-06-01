const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Rotalar
const authRoutes = require("./routes/authRoutes");
const commentRoutes = require("./routes/commentRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/analyzer", commentRoutes);

// Test endpoint
app.get("/", (req, res) => {
  res.send("Server çalışıyor!");
});

app.listen(port, () => {
  console.log(`Server ${port} numaralı portta çalışıyor`);
});
