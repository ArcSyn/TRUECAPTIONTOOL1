const express = require('express');
const path = require('path');
const router = express.Router();

// Root path response - serve the HTML upload interface
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

router.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

module.exports = router;
