// server.js
require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// MongoDB connection setup
let db, lessonsCollection, ordersCollection;
const client = new MongoClient(MONGO_URI);

async function connectToDB() {
  try {
    await client.connect();
    db = client.db("schoolDB");
    lessonsCollection = db.collection("lessons");
    ordersCollection = db.collection("orders");
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  }
}

connectToDB();

// Middleware
app.use(morgan('dev')); // Logger
app.use(express.json()); // JSON parser
app.use('/images', express.static(path.join(__dirname, 'data/images'))); // Static file middleware

// Routes
// GET /lessons - Retrieve all lessons
app.get('/lessons', async (req, res) => {
  try {
    const lessons = await lessonsCollection.find().toArray();
    res.json(lessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ message: "Failed to retrieve lessons." });
  }
});

// POST /orders - Create a new order
app.post('/orders', async (req, res) => {
  const { name, phone, lessonIDs, spaces } = req.body;

  try {
    // Create the order
    const order = { name, phone, lessonIDs, spaces };
    await ordersCollection.insertOne(order);

    // Update space count in each lesson
    for (let id of lessonIDs) {
      await lessonsCollection.updateOne({ _id: new ObjectId(id) }, { $inc: { space: -spaces } });
    }

    res.json({ message: "Order placed successfully!" });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
