const express = require('express');
const path = require('path');
require('dotenv').config();
const session = require('express-session');
const connectDB = require('./config/db');

connectDB();
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Session setup (no CORS needed since same-origin)
app.use(session({
  name: "sessionId",
  secret: process.env.SESSION_SECRET || "secret123",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" // Railway uses HTTPS
  }
}));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/products', require('./routes/products'));

// Define absolute paths
const publicPath = path.resolve(__dirname, '../public');
const adminPath = path.resolve(__dirname, '../admin');

// console.log("Public path:", path.join(publicPath, 'index.html'));
// console.log("Admin path:", path.join(adminPath, 'index.html'));

// Serve static files
app.use('/', express.static(publicPath));
app.use('/admin', express.static(adminPath));

// SPA fallback
app.get(/^\/(?!api).*/, (req, res) => {
  if (req.originalUrl.startsWith('/admin')) {
    res.sendFile(path.join(adminPath, 'index.html'));
  } else {
    res.sendFile(path.join(publicPath, 'index.html'));
  }
});

// Debug route
app.get("/api/debug-session", (req, res) => {
  res.json({ session: req.session });
});

app.get("/test", (req, res) => {
  res.send("Server is live!");
});

// Start server
const PORT = process.env.PORT || 5000;
// const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
