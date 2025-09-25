const express = require("express");
const router = express.Router();
const Wishlist = require("../models/Wishlist");

// -----------------------------
// Middleware to check user session
// -----------------------------
const checkUserSession = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Please login to continue" });
  }
  next();
};

// -----------------------------
// Get wishlist
// -----------------------------
router.get("/", checkUserSession, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.session.userId }).populate("items.product");

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.session.userId, items: [] });
      await wishlist.save();
    }

    // Map items safely to include product info for frontend
    const wishlistWithDetails = {
      ...wishlist.toObject(),
      items: wishlist.items
        .filter(item => item.product) // Skip null/deleted products
        .map(item => ({
          _id: item._id,
          product: item.product._id,
          title: item.product.title,
          price: item.product.price,
          image: item.product.image,
          quantity: item.quantity || 1
        }))
    };

    res.json(wishlistWithDetails);
  } catch (err) {
    console.error("Error fetching wishlist:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// -----------------------------
// Add to wishlist
// -----------------------------
router.post("/", checkUserSession, async (req, res) => {
  try {
    const { product } = req.body;
    if (!product) return res.status(400).json({ message: "Product ID missing" });

    let wishlist = await Wishlist.findOne({ user: req.session.userId });
    if (!wishlist) wishlist = new Wishlist({ user: req.session.userId, items: [] });

    const exists = wishlist.items.find(item => item.product.toString() === product);
    if (!exists) wishlist.items.push({ product });

    await wishlist.save();
    res.status(201).json(wishlist);
  } catch (err) {
    console.error("Error adding to wishlist:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------------
// Remove from wishlist
// -----------------------------
router.delete("/:productId", checkUserSession, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.session.userId });
    if (!wishlist) return res.status(404).json({ message: "Wishlist not found" });

    wishlist.items = wishlist.items.filter(i => i.product.toString() !== req.params.productId);
    await wishlist.save();
    res.json(wishlist);
  } catch (err) {
    console.error("Error removing wishlist item:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------------
// Clear wishlist
// -----------------------------
router.delete("/", checkUserSession, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.session.userId });
    if (!wishlist) return res.status(404).json({ message: "Wishlist not found" });

    wishlist.items = [];
    await wishlist.save();
    res.json(wishlist);
  } catch (err) {
    console.error("Error clearing wishlist:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
