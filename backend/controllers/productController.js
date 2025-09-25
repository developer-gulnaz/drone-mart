const Product = require("../models/Product");


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
// Add Product
// =============================
exports.addProduct = [checkAdminSession, async (req, res) => {
    try {
        const { title, category, price, stock, badge, rating, description, featured, specs } = req.body;

        const productData = {
            title,
            category,
            price,
            stock: parseInt(stock),
            badge,
            rating: parseFloat(rating),
            description,
            featured: featured === "true",
            specs: specs ? JSON.parse(specs) : {}
        };

        // Images
        if (req.files) {
            if (req.files.mainImage) productData.image = "/uploads/" + req.files.mainImage[0].filename;
            if (req.files.thumbnails) productData.thumbnails = req.files.thumbnails.map(f => "/uploads/" + f.filename);
            if (req.files.boxImages) productData.boxImages = req.files.boxImages.map(f => "/uploads/" + f.filename);
        }

        const newProduct = new Product(productData);
        await newProduct.save();

        res.status(201).json({ message: "Product added successfully", product: newProduct });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add product" });
    }
}];

// =============================
// Update Product
// =============================
exports.updateProduct = [checkAdminSession, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        const { title, category, price, stock, badge, rating, description, featured, specs } = req.body;

        product.title = title || product.title;
        product.category = category || product.category;
        product.price = price ? parseFloat(price) : product.price;
        product.stock = stock ? parseInt(stock) : product.stock;
        product.badge = badge || product.badge;
        product.rating = rating ? parseFloat(rating) : product.rating;
        product.description = description || product.description;
        product.featured = featured !== undefined ? featured === "true" : product.featured;
        product.specs = specs ? JSON.parse(specs) : product.specs;

        // Update images if new ones uploaded
        if (req.files) {
            if (req.files.mainImage) product.image = "/uploads/" + req.files.mainImage[0].filename;
            if (req.files.thumbnails) product.thumbnails = req.files.thumbnails.map(f => "/uploads/" + f.filename);
            if (req.files.boxImages) product.boxImages = req.files.boxImages.map(f => "/uploads/" + f.filename);
        }

        await product.save();
        res.json({ message: "Product updated successfully", product });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update product" });
    }
}];

// =============================
// Delete Product
// =============================
exports.deleteProduct = [checkAdminSession, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete product" });
    }
}];

// =============================
// Get all products
// =============================
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch products" });
    }
};


// get product by id
exports.getProductbySlug = async (req, res) => {
    try {
        const slug = req.params.slug;
        const product = await Product.findOne({ slug });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Optionally: fetch related products (same category, exclude self)
        const related = await Product.find({
            category: product.category,
            _id: { $ne: product._id }
        })
        .lean();

        res.json({ product, related });
    } catch (err) {
        console.error("Error fetching product:", err);
        res.status(500).json({ message: "Server error" });
    }
};



// Buy Now Controller
exports.buyNow = async (req, res) => {
    try {
        const userId = req.user._id; // assuming you have auth middleware
        const { product: productId, quantity } = req.body;

        if (!productId) {
            return res.status(400).json({ message: "Product ID is required" });
        }

        // Check product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Add to cart
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        // Check if product already exists in cart
        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += quantity || 1;
        } else {
            cart.items.push({ product: productId, quantity: quantity || 1 });
        }

        await cart.save();

        // Return success and redirect URL
        return res.status(200).json({
            message: `${product.title} added to cart`,
            redirect: "/checkout.html" // frontend should use this to redirect
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

