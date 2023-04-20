import express from "express";
import bodyParser from "body-parser";
const redis = require("redis");
const { v4: uuidv4 } = require("uuid");
const app = express();

// Set up Redis client
const client = redis.createClient({
  host: "localhost",
  port: 6379,
});

client.on("connect", () => {
  console.log("Redis client connected");
});
client.connect();

client.on("error", (err) => {
  console.log(`Error: ${err}`);
});

// Use middleware to parse request bodies as JSON
app.use(bodyParser.json());

// POST new user
app.post("/v1/user", async (req, res) => {
  const { name, email, password, address } = req.body;

  const uuid_id = uuidv4();
  // Store the user data in Redis
  const user_data = JSON.stringify({
    id: uuid_id,
    name,
    email,
    password,
    address,
  });
  try {
    const is_user_saved = await client.set(uuid_id, user_data);
    if (is_user_saved === "OK") {
      const {
        id: uuid_id,
        name,
        email,
        address,
        password,
      } = JSON.parse(user_data);
      const userData = { id: uuid_id, name, email, address, password };
      return res.status(200).json({ message: "User is saved", userData });
    } else {
      return res.status(500).json({ message: "Error setting user data" });
    }
  } catch (error) {
    console.error(error);
  }
});

// GET user by ID
app.get("/v1/user/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    // Check if user exists in Redis
    const user = await client.get(userId);
    if (user === null) {
      return res.status(404).json({ message: "User not found" });
    } else {
      const { id, name, email, address, password } = JSON.parse(user);
      const userData = { id, name, email, address, password };
      return res.status(200).json({ message: "User found", userData });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error retrieving user data" });
  }
});

// PUT update user by ID
app.put("/v1/updateuser/:id", async (req, res) => {
  const id = req.params.id;
  const { name, email, password, address } = req.body;
  try {
    const user_data = await client.get(id);
    if (user_data) {
      const { id: uuid_id } = JSON.parse(user_data);
      const updated_user_data = JSON.stringify({
        id: uuid_id,
        name,
        email,
        password,
        address,
      });
      const is_user_updated = await client.set(id, updated_user_data);
      if (is_user_updated === "OK") {
        const userData = { id: uuid_id, name, email, address, password };
        return res.status(200).json({ message: "User is updated", userData });
      } else {
        return res.status(500).send({ message: "Error updating user data" });
      }
    } else {
      return res.status(404).send({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
  }
});

// DELETE user by ID
app.delete("/v1/deleteuser/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const is_user_deleted = await client.del(id);
    if (is_user_deleted === 1) {
      return res.status(200).json({ message: "User is deleted" });
    } else {
      return res.status(404).send({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
  }
});

// Start server
const port = 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
