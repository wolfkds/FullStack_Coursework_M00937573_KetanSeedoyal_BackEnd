const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const morgan = require('morgan');
const path = require('path');

const app = express();
const port = 3000;

// MongoDB connection setup
const mongoUri = 'mongodb+srv://test:test@cluster0.j29h4.mongodb.net/'; // replace with your MongoDB Atlas URI
const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware
app.use(express.json()); // Parses incoming JSON requests
app.use(morgan('dev')); // Logs requests to the console

// Static files middleware for lesson images
app.use('/images', express.static(path.join(__dirname, 'images')));

// Database and collection references
let lessonsCollection, ordersCollection;

// Connect to MongoDB
client.connect()
  .then(() => {
    const db = client.db('your-database-name');
    lessonsCollection = db.collection('lessons');
    ordersCollection = db.collection('orders');
    console.log('Connected to MongoDB');
    
    // Start the server only after connecting to the database
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch(error => console.error('Failed to connect to MongoDB:', error));

// Logger middleware for logging each request to the console
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

