const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const productController = require("../controllers/productController");

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


// =============================
// Multer setup for images
// =============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + file.fieldname + ext);
  }
});

const upload = multer({ storage });

// =============================
// Routes
// =============================

// Add product
router.post(
  "/",
  checkAdminSession,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "thumbnails", maxCount: 8 },
    { name: "boxImages", maxCount: 12 }
  ]),
  productController.addProduct
);

// Update product
router.put(
  "/:id",
  checkAdminSession,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "thumbnails", maxCount: 8 },
    { name: "boxImages", maxCount: 12 }
  ]),
  productController.updateProduct
);

// Delete product
router.delete("/:id", checkAdminSession, productController.deleteProduct);

// Get all products
router.get("/", productController.getAllProducts);

// Get Product by Id
router.get('/slug/:slug', productController.getProductbySlug);


module.exports = router;
