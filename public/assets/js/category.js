document.addEventListener('DOMContentLoaded', async function () {
    const searchInput = document.getElementById('productSearch');
    const searchButton = document.getElementById('searchButton');
    const sortSelect = document.getElementById('sortBy');
    const productGrid = document.getElementById('productGrid');
    const categoryLinks = document.querySelectorAll('.category-link');
    const scrollTopButton = document.getElementById('scroll-top');

    let products = [];

    // === Fetch products from backend ===
    async function fetchProducts(query = "", category = "") {
        try {
            const params = new URLSearchParams();
            if (query) params.append("q", query);
            if (category && category.toLowerCase() !== "all") params.append("category", category);

            const res = await fetch(`/api/products?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch products");

            products = await res.json();
            renderProducts(products);
        } catch (err) {
            console.error("Error loading products:", err);
            productGrid.innerHTML = `<p class="text-danger">Failed to load products.</p>`;
        }
    }

    // === Render Products ===
    function renderProducts(list) {
        productGrid.innerHTML = '';
        list.forEach(p => {
            const col = document.createElement('div');
            col.className = 'col-12 col-md-6 col-lg-4';
            col.innerHTML = `
              <div class="product-card card shadow-sm border-0" data-id="${p._id}">
                <div class="product-image">
                  <img src="${p.image}" alt="${p.title}">
                  <div class="product-overlay">
                    <div class="product-actions">
                      <button type="button" class="action-btn view-btn" title="Quick View"><i class="bi bi-eye"></i></button>
                      <button type="button" class="action-btn cart-btn" title="Add to Cart"><i class="bi bi-cart-plus"></i></button>
                      <button type="button" class="action-btn wishlist-btn" title="Add to Wishlist"><i class="bi bi-heart"></i></button>
                    </div>
                  </div>
                  ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
                </div>
                <div class="product-details">
                  <div class="product-category">${p.category || ""}</div>
                  <h4 class="product-title"><a href="product-details.html?id=${p._id}">${p.title}</a></h4>
                  <div class="product-meta">
                    <div class="product-price">$${p.price}</div>
                    <div class="product-rating"><i class="bi bi-star-fill"></i> ${p.rating || 0}</div>
                  </div>
                </div>
              </div>
            `;
            productGrid.appendChild(col);
        });

        attachActionEvents();
    }

    // === Attach Quick View, Cart & Wishlist Events ===
    function attachActionEvents() {
        document.querySelectorAll(".view-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const id = this.closest(".product-card").dataset.id;
                window.location.href = `product-details.html?id=${id}`;
            });
        });

        // products: array of products on the current page
        document.querySelectorAll(".cart-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const card = this.closest(".product-card");
                const id = card.dataset.id;

                // Find the product in the array for this page (index or category)
                const product = products.find(p => p._id === id);
                if (!product) return alert("Product not found");

                // Call the global addToCart from category.js
                window.addToCart(product);
            });
        });


        document.querySelectorAll(".wishlist-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const card = this.closest(".product-card");
                if (!card) return;

                const id = card.dataset.id;
                const product = products.find(p => p._id === id);
                if (!product) return;

                window.addToWishlist(product);
            });
        });

    }

    // === Search ===
    function performSearch() {
        const term = (searchInput.value || '').toLowerCase();
        fetchProducts(term);
    }
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', e => {
        if (e.key === 'Enter') performSearch();
    });

    // === Sort ===
    sortSelect.addEventListener('change', function () {
        const val = this.value;
        let sorted = [...products];
        sorted.sort((a, b) => {
            const aPrice = parseFloat(a.price) || 0;
            const bPrice = parseFloat(b.price) || 0;
            const aRating = parseFloat(a.rating) || 0;
            const bRating = parseFloat(b.rating) || 0;

            switch (val) {
                case 'price-low': return aPrice - bPrice;
                case 'price-high': return bPrice - aPrice;
                case 'rating': return bRating - aRating;
                case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
                default: return 0;
            }
        });
        renderProducts(sorted);
    });

    // === Category Filter ===
    categoryLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const selected = this.textContent.trim();
            fetchProducts("", selected);
        });
    });

    // === Scroll-to-top ===
    window.addEventListener('scroll', function () {
        scrollTopButton.style.display = window.pageYOffset > 300 ? 'flex' : 'none';
    });
    scrollTopButton.addEventListener('click', e => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // === Initial Load ===
    fetchProducts();
});

