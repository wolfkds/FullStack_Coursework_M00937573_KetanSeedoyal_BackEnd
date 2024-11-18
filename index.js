const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3000;

// MongoDB connection setup
const mongoUri = "mongodb+srv://test:test@cluster0.j29h4.mongodb.net/"; // replace with your MongoDB Atlas URI
const client = new MongoClient(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Enable CORS
app.use(cors());

// Middleware
app.use(express.json()); // Parses incoming JSON requests
app.use(morgan("dev")); // Logs requests to the console

// Static files middleware for lesson images
app.use("/images", express.static(path.join(__dirname, "images")));
// app.use('/images', (req, res, next) => {
//   const filePath = path.join(__dirname, 'images', req.path);

//   // Check if the file exists
//   fs.access(filePath, fs.constants.F_OK, (err) => {
//     if (err) {
//       // File does not exist
//       res.status(404).json({ message: 'Image not found' });
//     } else {
//       // Serve the image
//       res.sendFile(filePath);
//     }
//   });
// });

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
    const lessons = await lessonsCollection.find().toArray();
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ message: "Error fetching lessons", error });
  }
});

// POST route to create a new order
app.post("/orders", async (req, res) => {
  const { name, phone, lessonIDs, spaces } = req.body;

  if (!name || !phone || !Array.isArray(lessonIDs) || lessonIDs.length === 0) {
    return res.status(400).json({ message: "Invalid order data" });
  }

  try {
    const order = {
      name,
      phone,
      lessonIDs: lessonIDs.map((id) => new ObjectId(id)),
      spaces,
    };
    const result = await ordersCollection.insertOne(order);
    res.json({
      message: "Order created successfully",
      orderId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating order", error });
  }
});

// PUT route to update lesson availability after an order
// app.put("/lessons/:id", async (req, res) => {
//   const lessonId = req.params.id;
//   const { space } = req.body;

//   if (typeof space !== "number" || space < 0) {
//     return res.status(400).json({ message: "Invalid space value" });
//   }

//   try {
//     const result = await lessonsCollection.updateOne(
//       { _id: new ObjectId(lessonId) },
//       { $set: { space } }
//     );

//     if (result.matchedCount === 0) {
//       res.status(404).json({ message: "Lesson not found" });
//     } else {
//       res.json({ message: "Lesson updated successfully" });
//     }
//   } catch (error) {
//     res.status(500).json({ message: "Error updating lesson", error });
//   }
// });

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



// PUT route to update lesson details
// app.put("/lessons/:lessonId", async (req, res) => {
//   try {
//     const lessonId = req.params.lessonId;
//     const { space } = req.body; // Only expecting the space field

//     if (space < 0) {
//       return res.status(400).json({ message: "Space cannot be negative" });
//     }

//     // Update the space field of the specified lesson
//     const updatedLesson = await Lesson.findByIdAndUpdate(
//       lessonId,
//       { space },
//       { new: true, runValidators: true } // Return the updated document and enforce validation
//     );

//     if (!updatedLesson) {
//       return res.status(404).json({ message: "Lesson not found" });
//     }

//     res.status(200).json({
//       message: "Lesson updated successfully",
//       lesson: updatedLesson,
//     });
//   } catch (error) {
//     console.error("Error updating lesson:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });



// Search functionality for lessons (GET /search)
app.get("/search", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ message: "Search query cannot be empty" });
  }

  const searchCriteria = {
    $or: [
      { subject: { $regex: query, $options: "i" } },
      { location: { $regex: query, $options: "i" } },
      { price: { $regex: query, $options: "i" } },
      { space: { $regex: query, $options: "i" } },
    ],
  };

  try {
    const results = await lessonsCollection.find(searchCriteria).toArray();
    res.json({ success: true, results });
  } catch (error) {
    console.error("Error in /search:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
});
