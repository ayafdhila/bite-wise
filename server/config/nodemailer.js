const nodemailer = require("nodemailer");
require("dotenv").config();

// ✅ Correct environment variable names
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // 🔥 FIXED: Must match `.env` variable
    pass: process.env.EMAIL_PASS, // 🔥 FIXED: Must match `.env` variable
  },
});

module.exports = transporter;
