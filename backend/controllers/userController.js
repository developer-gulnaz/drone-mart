
const crypto = require("crypto");
const User = require("../models/User");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const bcrypt = require("bcryptjs");

// -----------------------------
// REGISTER USER
// -----------------------------
exports.registerUser = async (req, res) => {
  const { firstName, lastName, email, password, mobile, city, state, pincode } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      mobile,
      city,
      state,
      pincode,
    });

    if (user) {
      res.status(201).json({
        message: "User registered successfully. Please login.",
        firstName: user.firstName,
        email: user.email
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------
// LOGIN USER (SESSION)
// -----------------------------
exports.loginUserSession = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });
    req.session.userId = user._id;   // store user ID in session

    res.json({
      message: "Login successfully !",
      firstName: user.firstName,
      email: user.email
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------
// USER PROFILE (SESSION USER)
// -----------------------------
exports.getUserProfile = async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await User.findById(req.session.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });

    const updates = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
    };

    const user = await User.findByIdAndUpdate(req.session.userId, updates, { new: true }).select("-password");
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------
// OTHER USER ROUTES (ADMIN)
// -----------------------------

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (user) res.json(user);
    else res.status(404).json({ message: "User not found" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.email = req.body.email || user.email;
      user.userType = req.body.userType || user.userType;

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        userType: updatedUser.userType
      });
    } else res.status(404).json({ message: "User not found" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


// -----------------------------
// ADMIN DASHBOARD & RECENT USERS
// -----------------------------
const checkAdminSession = (req, res, next) => {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Unauthorized - Admin login required" });
  }
  next();
};

exports.getAllUsers = [
  checkAdminSession,
  async (req, res) => {
    try {
      const users = await User.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 });

      res.json(users);
    } catch (err) {
      console.error("Error fetching all users:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
];

exports.getDashboardStatus = [
  checkAdminSession,
  async (req, res) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const totalUsers = await User.countDocuments();
      // const totalOrders = await Order.countDocuments();
      const newLeads = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

      let totalOrders = 0;
      let newOrders = 0;
      let revenue = 0;

      try {
        const Order = require("../models/Order");
        if (Order) {
          totalOrders = await Order.countDocuments();
          newOrders = await Order.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

          const revenueData = await Order.aggregate([
            { $match: { status: "completed" } },
            { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
          ]);
          revenue = revenueData[0]?.totalRevenue || 0;
        }
      } catch (e) { }

      let totalLeads = 0;
      try {
        const Lead = require("../models/Leads");
        if (Lead) {
          totalLeads = await Lead.countDocuments();
        }
      } catch (e) { }

      res.json({
        totalUsers,
        newLeads,
        newOrders,
        revenue,
        totalLeads
      });
    } catch (err) {
      console.error("Error fetching dashboard status:", err);
      res.status(500).json({ message: "Server error fetching dashboard status" });
    }
  }
];

// Update Address
exports.updateAddress = async (req, res) => {
  const { street, apartment } = req.body;

  if (!street || !apartment) {
    return res.status(400).json({ message: "Street and Apartment are required" });
  }

  const user = await User.findById(req.session.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  // Initialize address if not present
  if (!user.address) user.address = {};

  user.address.street = street;
  user.address.apartment = apartment;

  await user.save();

  res.json({ message: "Address updated successfully", address: user.address });
};

// Update User Status / Lead Tag
exports.updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { statusTag } = req.body; // Expecting { statusTag: "High Priority" } or similar

    if (!statusTag) {
      return res.status(400).json({ message: "Status tag is required" });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { statusTag },   // update your field
      { new: true }    // return updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User status updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Update User Status Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


function assignUserStatusTag(user) {
  // Example logic:
  // New: No orders
  // Priority: Failed orders or abandoned carts > 3-5 days
  if (!user.orders || user.orders.length === 0) return "New";

  const hasFailedOrder = user.orders.some(o => o.status === "failed");
  if (hasFailedOrder) return "High Priority";

  const abandonedCart = user.cart && user.cart.some(c => {
    const diffDays = (new Date() - new Date(c.updatedAt)) / (1000 * 60 * 60 * 24);
    return diffDays >= 3;
  });
  if (abandonedCart) return "Abandoned Cart";

  return "Regular";
}

// -------------------------------
// Get Recent Users
// -------------------------------
exports.getRecentLeads = [
  checkAdminSession,
  async (req, res) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch users who were modified/active in last 7 days
      const users = await User.find({
        isDeleted: { $ne: true },
        modifiedAt: { $gte: sevenDaysAgo }
      }).sort({ modifiedAt: -1 });

      const usersWithDetails = await Promise.all(users.map(async u => {
        const userObj = u.toObject();

        const orders = await Order.find({ user: u._id });
        const cart = await Cart.find({ user: u._id });

        userObj.orders = orders;
        userObj.cart = cart;

        // Use manual status if exists, otherwise assign automatic
        if (!userObj.statusTag) {
          userObj.statusTag = assignUserStatusTag(userObj);
        }

        return userObj;
      }));

      res.json(usersWithDetails);
    } catch (err) {
      console.error("Get Recent Leads Error:", err);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  }
];



// Soft delete user
exports.deleteUser = [
  checkAdminSession, async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isDeleted: true },
        { new: true }
      );

      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ message: "User soft deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }];

// Update user status
exports.updateUserStatus = [
  checkAdminSession,
  async (req, res) => {
    try {
      const { statusTag } = req.body;

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { statusTag, modifiedAt: Date.now() },  // update modifiedAt
        { new: true }
      );

      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
];
















