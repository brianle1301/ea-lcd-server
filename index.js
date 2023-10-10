const express = require("express");

const app = express();

app.use(express.json());

app.post("/test", (req, res) => {
  console.log("Signal received: ", req.body.code);
  res.end();
});

app.listen(9000, () => {
  console.log("Server listening at 9000");
});
