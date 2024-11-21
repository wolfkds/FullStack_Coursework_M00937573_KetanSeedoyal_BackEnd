const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const morgan = require("morgan");
const path = require("path");

// Initialize the Express application
const app = express();
const port = 3000;

// MongoDB connection setup
const mongoUri = "mongodb+srv://test:test@cluster0.j29h4.mongodb.net/";
const client = new MongoClient(mongoUri, {
  useNewUrlParser: true, // Use new URL parser for connection string
  useUnifiedTopology: true, // Use the unified topology engine
});

// Enable CORS for all routes
app.use(cors());

// Middleware
app.use(express.json()); // Parses incoming JSON requests
app.use(morgan("dev")); // Logs requests to the console

// Static files middleware for lesson images
app.use("/images", express.static(path.join(__dirname, "images")));

// Database and collection references
let lessonsCollection, ordersCollection;

// Connect to MongoDB
client
  .connect()
  .then(() => {
    const db = client.db("EduClassCards");
    lessonsCollection = db.collection("lessons");
    ordersCollection = db.collection("orders");
    console.log("Connected to MongoDB");

    // Start the server only after connecting to the database
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch((error) => console.error("Failed to connect to MongoDB:", error));

// Logger middleware for logging each request to the console
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// GET route to fetch all lessons
app.get("/lessons", async (req, res) => {
  try {
    const lessons = await lessonsCollection.find().toArray(); // Fetch all lessons
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ message: "Error fetching lessons", error });
  }
});

// POST route to create a new order
app.post("/orders", async (req, res) => {
  const { name, phone, lessonIDs, spaces } = req.body; // Extract order data from request body

  if (!name || !phone || !Array.isArray(lessonIDs) || lessonIDs.length === 0) {
    return res.status(400).json({ message: "Invalid order data" });
  }

  try {
    // Create an order object
    const order = {
      name,
      phone,
      lessonIDs: lessonIDs.map((id) => new ObjectId(id)), // Convert lesson IDs to ObjectId
      spaces,
    };

    // Insert the order into the "orders" collection
    const result = await ordersCollection.insertOne(order);
    res.json({
      message: "Order created successfully",
      orderId: result.insertedId, // Send the new order's ID in the response
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating order", error });
  }
});

// PUT route to update a lesson's details
app.put("/lessons/:id", async (req, res) => {
  const lessonId = req.params.id;
  const updatedFields = req.body; // Contains all fields to update

  // Validate input: Ensure the fields provided in `req.body` are valid
  if (Object.keys(updatedFields).length === 0) {
    return res.status(400).json({ message: "No fields provided for update" });
  }

  try {
    // Attempt to update the lesson with the provided fields
    const result = await lessonsCollection.updateOne(
      { _id: new ObjectId(lessonId) },
      { $set: updatedFields } // Dynamically set fields from `req.body`
    );

    if (result.matchedCount === 0) {
      // Lesson with the given ID not found
      res.status(404).json({ message: "Lesson not found" });
    } else {
      // Update successful
      res.json({ message: "Lesson updated successfully" });
    }
  } catch (error) {
    console.error("Error updating lesson:", error);
    res.status(500).json({ message: "Error updating lesson", error });
  }
});

// Search functionality for lessons (GET /search)
app.get("/search", async (req, res) => {
  const query = req.query.q;

  // Validate the search query
  if (!query) {
    return res.status(400).json({ message: "Search query cannot be empty" });
  }

  // Define search criteria for MongoDB query
  const searchCriteria = {
    $or: [
      { subject: { $regex: query, $options: "i" } },
      { location: { $regex: query, $options: "i" } },
      { price: { $regex: query, $options: "i" } },
      { space: { $regex: query, $options: "i" } },
    ],
  };

  try {
    // Find lessons matching the search criteria
    const results = await lessonsCollection.find(searchCriteria).toArray();
    res.json({ success: true, results });
  } catch (error) {
    console.error("Error in /search:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
});
