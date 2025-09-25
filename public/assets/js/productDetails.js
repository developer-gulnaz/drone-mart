// product-details.js
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get("slug");

  if (!slug) return;

  try {
    const res = await fetch(`/api/products/slug/${slug}`);
    if (!res.ok) throw new Error("Failed to fetch product data");

    const { product, related } = await res.json();
    populateProductDetails(product);
    //populateRelatedProducts(related);
  } catch (err) {
    console.error(err);
    alert("Unable to load product data");
  }
});


function populateProductDetails(product) {
  if (!product) return;

  const formatINR = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

  // Main Image
  const mainImg = document.getElementById("main-product-image");
  if (mainImg) mainImg.src = product.image;

  // Thumbnails
  const thumbnailGrid = document.querySelector(".thumbnail-grid");
  if (thumbnailGrid) {
    thumbnailGrid.innerHTML = "";
    if (product.thumbnails && product.thumbnails.length > 0) {
      product.thumbnails.forEach((img, index) => {
        const thumb = document.createElement("div");
        thumb.className = `thumbnail-wrapper thumbnail-item ${index === 0 ? 'active' : ''}`;
        thumb.dataset.image = img;
        thumb.innerHTML = `<img src="${img}" alt="View ${index + 1}" class="img-fluid">`;
        thumbnailGrid.appendChild(thumb);
      });
    }
  }

  // Product Name & Badge
  document.querySelector(".product-name").textContent = product.title || "";
  document.querySelector(".badge-category").textContent = product.badge || "";

  // Pricing
  const salePriceEl = document.querySelector(".sale-price");
  const regularPriceEl = document.querySelector(".regular-price");
  const saveAmountEl = document.querySelector(".save-amount");
  const discountPercentEl = document.querySelector(".discount-percent");

  if (salePriceEl) salePriceEl.textContent = formatINR(product.salePrice);
  if (product.price && product.salePrice < product.price) {
    const discount = product.price - product.salePrice;
    const percent = ((discount / product.price) * 100).toFixed(0);

    if (regularPriceEl) regularPriceEl.textContent = formatINR(product.price);
    if (saveAmountEl) saveAmountEl.textContent = `Save ${formatINR(discount)}`;
    if (discountPercentEl) discountPercentEl.textContent = `(${percent}% off)`;
  } else {
    if (regularPriceEl) regularPriceEl.style.display = "none";
    if (saveAmountEl) saveAmountEl.style.display = "none";
    if (discountPercentEl) discountPercentEl.style.display = "none";
  }

  // Description
  const descEl = document.querySelector(".product-description p");
  if (descEl) descEl.textContent = product.description || "";

  // Stock
  const stockText = document.querySelector(".stock-text");
  const quantityInput = document.querySelector(".quantity-input");
  const quantityLeft = document.querySelector(".quantity-left");

  if (product.stock > 0) {
    if (stockText) stockText.textContent = "Available";
    if (quantityInput) quantityInput.disabled = false;
    if (quantityInput) quantityInput.max = product.stock;
    if (quantityLeft) quantityLeft.textContent = `Only ${product.stock} items remaining`;
  } else {
    if (stockText) stockText.textContent = "Out of stock";
    if (quantityInput) quantityInput.disabled = true;
    if (quantityLeft) quantityLeft.textContent = "Currently unavailable";
  }

  // Action buttons
  const addToCartBtn = document.querySelector(".primary-action");
  const buyNowBtn = document.querySelector(".secondary-action");
  const wishlistBtn = document.querySelector(".icon-action.wishlist-btn");

  if (addToCartBtn) {
    addToCartBtn.onclick = () => window.addToCart(product);
  }

  if (buyNowBtn) {
    buyNowBtn.onclick = () => window.buyNow?.(product);
  }

  if (wishlistBtn) {
    wishlistBtn.onclick = () => window.addToWishlist(product);
  }
}


// Thumbnail click handler
document.addEventListener("click", function (e) {
  if (e.target.closest(".thumbnail-wrapper")) {
    const newImg = e.target.closest(".thumbnail-wrapper").dataset.image;
    const mainImg = document.getElementById("main-product-image");
    mainImg.src = newImg;

    // update active thumbnail
    document.querySelectorAll(".thumbnail-wrapper").forEach(el => el.classList.remove("active"));
    e.target.closest(".thumbnail-wrapper").classList.add("active");
  }
});

function populateRelatedProducts(products) {
  const relatedContainer = document.querySelector(".related-products");
  relatedContainer.innerHTML = "";
  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.slug = p.slug;
    card.innerHTML = `
      <img src="${p.image || (p.images && p.images[0]) || ''}" alt="${p.title}">
      <h5>${p.title}</h5>
      <p>$${p.price.toFixed(2)}</p>
      <a href="product-details.html?slug=${p.slug}" class="view-btn">View</a>
    `;
    relatedContainer.appendChild(card);
  });
}
