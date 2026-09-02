const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    application: "Agentic Documentation Sync",
    status: "running"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "UP"
  });
});

app.listen(PORT, () => {
  console.log(`Application running on port ${PORT}`);
});

module.exports = app;