const express = require("express");
const cors = require("cors");
const axios = require('axios');
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // JSON verileri almak için

// Rotalar
const authRoutes = require("./routes/authRoutes");

app.use("/api/auth", authRoutes);

// Test endpoint
app.get("/", (req, res) => {
  res.send("Server çalışıyor!");
});


app.listen(PORT, () => {
  console.log(`Server ${PORT} numaralı portta çalışıyor`);
});
