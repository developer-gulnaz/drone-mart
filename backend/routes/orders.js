const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const Payment = require("../models/Payment");
const orderController = require("../controllers/orderController");
// -----------------------------
// Middleware
// -----------------------------
const checkUserSession = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized - Please login" });
  }
  next();
};

const checkAdminSession = (req, res, next) => {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Unauthorized - Admin login required" });
  }
  next();
};


// -----------------------------
// USER ROUTES
// -----------------------------

// Get logged-in user's orders
router.get("/my", checkUserSession, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.session.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Get order by ID with user & payment details
router.get("/:id", checkUserSession, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.user.toString() !== req.session.userId.toString())
      return res.status(403).json({ message: "Unauthorized" });

    // Fetch user details
    const user = await User.findById(order.user).lean();
    const shippingAddress = {
      name: `${user.firstName} ${user.lastName}`,
      street: user.street || "",
      apartment: user.apartment || "",
      city: user.city || "",
      state: user.state || "",
      pincode: user.pincode || "",
      country: user.country || "INDIA",
      email: user.email || "",
      phone: user.mobile || "",
    };

    // Fetch payment details (if exists)
    let paymentDetails = {};
    if (order.paymentMethod !== "COD") {
      const payment = await Payment.findOne({ order: order._id }).lean();
      if (payment) {
        paymentDetails = {
          method: payment.method,
          cardNumber: payment.cardNumber,
          upiId: payment.upiId,
          txnId: payment.txnId,
          status: payment.status,
          amount: payment.amount,
        };
      }
    } else {
      // COD fallback
      paymentDetails = {
        method: "COD",
        status: order.paymentStatus,
        amount: order.total,
      };
    }

    // Optional: calculate subtotal, tax, shipping (can hardcode or calculate)
    const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingCost = 0;
    const tax = 0;

    res.json({
      ...order,
      shippingAddress,
      paymentDetails,
      subtotal,
      shippingCost,
      tax,
      total: order.total,
      estimatedDelivery: "3-5 business days", // optional
    });
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Cancel order
router.delete("/:id", checkUserSession, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.user.toString() !== req.session.userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await order.deleteOne();
    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    console.error("Error cancelling order:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------------
// ADMIN ROUTES
// -----------------------------

// Get all orders
router.get("/", checkAdminSession, async (req, res) => {
  try {
    const orders = await Order.find().populate("user", "firstName lastName email mobile").sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching all orders:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update order + payment status
router.patch("/:id/status", checkAdminSession, async (req, res) => {
  try {
    const updateData = {};

    if (req.body.status) updateData.status = req.body.status;
    if (req.body.paymentStatus) updateData.paymentStatus = req.body.paymentStatus;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true } // return updated document
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Delete order (admin override)
router.delete("/:id/admin", checkAdminSession, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    await order.deleteOne();
    res.json({ message: "Order deleted by admin" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// COD order
router.post("/cod", checkUserSession, orderController.createCodOrder);

// PayU payment
router.post("/payu/initiate", checkUserSession, orderController.initiatePayuPayment);
router.post("/payu-success", orderController.payuSuccess);
router.post("/payu-failure", orderController.payuFailure);

// Save cart in session (for PayU order creation)
router.post("/session/save-cart", (req, res) => {
  req.session.cartItems = req.body.items || [];
  res.json({ success: true });
});


module.exports = router;
