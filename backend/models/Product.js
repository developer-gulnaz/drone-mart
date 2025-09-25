const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, index: true }, // SEO-friendly URL
  category: { type: String, index: true },
  brand: { type: String }, // optional, for brand filter
  price: { type: Number, required: true },
  salePrice: { type: Number }, // optional for discounts
  badge: { type: String }, // e.g., "New", "Hot", "Sale"
  
  stock: { type: Number, default: 0 },
  inStock: { type: Boolean, default: true },

  image: { type: String, required: true }, // main image
  thumbnails: [{ type: String }], // array of extra images

  description: { type: String },
  shortDescription: { type: String }, // for category cards

  specs: { type: mongoose.Schema.Types.Mixed }, // product specs JSON (flexible)

  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },

  featured: { type: Boolean, default: false },

  metaTitle: { type: String },   // SEO fields
  metaDescription: { type: String },
  keywords: [{ type: String }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware to keep updatedAt fresh
productSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema, 'products');
