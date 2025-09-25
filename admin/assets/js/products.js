document.addEventListener("DOMContentLoaded", async () => {
    const tbody = document.querySelector("#ProductsTable tbody");

    // =============================
    // ✅ Load Products
    // =============================
    async function loadProducts() {
        try {
            const res = await fetch(`/api/products`, { credentials: "include" });
            if (res.status === 401) {
                logout();
                return;
            }
            if (!res.ok) throw new Error("Failed to fetch products");
            const products = await res.json();

            tbody.innerHTML = "";

            if (products.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center">No products found</td></tr>`;
                return;
            }

            products.forEach((product, index) => {
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${product.title}</td>
                    <td>${product.category || "-"}</td>
                    <td>$${product.price}</td>
                    <td>${product.stock}</td>
                    <td>${product.featured ? "Yes" : "No"}</td>
                    <td>
                        <button class="btn btn-sm btn-primary me-2 edit-btn" data-id="${product._id}">
                            <i class="bi bi-pencil-square"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger me-2 delete-btn" data-id="${product._id}">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                        <button class="btn btn-sm btn-warning stock-btn" data-id="${product._id}" data-stock="${product.stock}">
                            <i class="bi bi-box-seam"></i> Update Stock
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            attachProductActions(); // Attach events after rows are created
        } catch (err) {
            console.error(err);
            alert("Error fetching products. Check console.");
        }
    }

    // =============================
    // ✅ Attach Actions
    // =============================
    function attachProductActions() {
        setupEditButtons();
        setupDeleteButtons();
        setupStockButtons();
        // Future features can be added here as separate functions
    }

    // =============================
    // ✅ Edit Product
    // =============================
    function setupEditButtons() {
        document.querySelectorAll(".edit-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                window.location.href = `updateProduct.html?id=${btn.dataset.id}`;
            });
        });
    }

    // =============================
    // ✅ Delete Product
    // =============================
    function setupDeleteButtons() {
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm("Are you sure you want to delete this product?")) return;
                try {
                    const res = await fetch(`/api/products/${btn.dataset.id}`, {
                        method: "DELETE",
                        credentials: "include"
                    });
                    if (!res.ok) throw new Error("Failed to delete product");
                    await loadProducts(); // Reload after deletion
                } catch (err) {
                    console.error(err);
                    alert("Failed to delete product. Check console.");
                }
            });
        });
    }

    // =============================
    // ✅ Update Stock
    // =============================
    function setupStockButtons() {
        document.querySelectorAll(".stock-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const productId = btn.dataset.id;
                const currentStock = btn.dataset.stock;
                // Redirect to update-product page with stock query
                window.location.href = `updateProduct.html?id=${productId}&stock=${currentStock}`;
            });
        });
    }

    // =============================
    // ✅ Initial Load
    // =============================
    await loadProducts();

    // =============================
    // Future features can be initialized here
    // =============================
});
