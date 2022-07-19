const express = require("express");
const cors = require("cors");
require('dotenv').config()
const app = express();
const port = process.env.PORT || 7000;

app.use(cors());
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Hello Eity! How are you? tui valo na");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
