const express = require("express");

const app = express();

app.get("/", (req, res) => res.send("Test API running at test endpoint"));

const PORT = process.env.PORT || 5000; //if PORT parameter is present in the deployment environment use that else locally use 5000

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
