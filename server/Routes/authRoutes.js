const express = require("express");
const { login, register, socialAuth } = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/social-auth", socialAuth);

module.exports = router;
