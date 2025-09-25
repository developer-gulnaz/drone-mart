
const API_BASE_URL = window.location.hostname === "localhost" ? "http://localhost:5000/api" : "/api";

let allOrders = [];
let currentOrderId = null;

// -----------------------------
// Load Orders
// -----------------------------
async function loadOrders() {
    try {
        const res = await fetch(`${API_BASE_URL}/orders`, { credentials: "include" });
        if (res.status === 401) return logout();
        allOrders = await res.json();
        renderOrdersTable(allOrders);
    } catch (err) {
        console.error("Error loading orders:", err);
        alert("Failed to load orders. Check console.");
    }
}

// -----------------------------
// Render Orders Table
// -----------------------------
function renderOrdersTable(orders) {
    const tbody = document.querySelector("#ordersTable tbody");
    tbody.innerHTML = "";

    if (!orders.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">No orders found</td></tr>`;
        return;
    }

    const userType = sessionStorage.getItem("userType");

    orders.forEach((order, idx) => {
        const createdAt = new Date(order.createdAt);
        const formattedDate = new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }).format(createdAt).replace(",", "");

        const rowContent = `
            <td>${idx + 1}</td>
            <td>${formattedDate.toUpperCase()}</td>
            <td>${order.user ? order.user.firstName + " " + order.user.lastName : "-"}</td>
            <td>${order.user ? order.user.mobile : "-"}</td>
            <td>${order.items.map(item => item.title).join(", ") || "-"}</td>
            <td>${order.total || "0"}</td>
            <td>${order.paymentMethod || "-"}</td>
            <td>
                <span class=" update-order-status badge ${getOrderStatusBadgeClass(order.status)} me-2">
                    ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                <button class="btn px-2 py-1 update-order-status-btn ${updateStatusButton(order.status)}" 
                        data-id="${order._id}" 
                        title="Update Order Status">
                    <i class="bi bi-pencil-square"></i>
                </button>
            </td>
        `;

        const row = document.createElement("tr");
        row.innerHTML = rowContent;
        tbody.appendChild(row);
    });

    attachUserActions();
    setupOrderStatusUpdate();
}

// -----------------------------
// Badge Class Based on Status
// -----------------------------
function getOrderStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case "pending": return "bg-warning text-dark";
        case "processing": return "bg-primary text-white";
        case "shipped": return "bg-info text-white";
        case "delivered": return "bg-success text-white";
        case "cancelled": return "bg-danger text-white";
        default: return "bg-secondary text-white";
    }
}

function updateStatusButton(status) {
    switch (status.toLowerCase()) {
        case "pending": return "bg-warning text-dark fs-8";
        case "processing": return "bg-primary text-white fs-8";
        case "shipped": return "bg-info text-white fs-8";
        case "delivered": return "bg-success text-white fs-8";
        case "cancelled": return "bg-danger text-white fs-8";
        default: return "bg-secondary text-white fs-8";
    }
}

function getPaymentStatusBadgeClass(paymentStatus) {
    if (!paymentStatus) return "bg-secondary text-white";

    switch (paymentStatus.toLowerCase()) {
        case "pending": return "bg-warning text-dark";
        case "completed": return "bg-success text-white";
        case "paid": return "bg-success text-white";
        case "not paid(cancelled)": return "bg-danger text-white";
        default: return "bg-secondary text-white";
    }
}


// -----------------------------
// Edit/Delete Actions
// -----------------------------
function attachUserActions() {
    // Edit
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            window.location.href = `edit-order.html?id=${btn.dataset.id}`;
        });
    });

    // Delete
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to delete this order?")) return;
            try {
                const res = await fetch(`${API_BASE_URL}/orders/${btn.dataset.id}`, {
                    method: "DELETE",
                    credentials: "include"
                });
                if (res.status === 401) return logout();
                if (!res.ok) throw new Error("Failed to delete order");
                loadOrders();
            } catch (err) {
                console.error(err);
                alert("Failed to delete order. Check console.");
            }
        });
    });
}

// -----------------------------
// Order Status Modal
// -----------------------------
function setupOrderStatusUpdate() {
    const modalEl = document.getElementById('updateOrderStatusModal');
    const orderStatusModal = new bootstrap.Modal(modalEl);

    const orderSelect = document.getElementById("orderStatusSelect");
    const codPaymentSection = document.getElementById("codPaymentSection");
    const paymentSelect = document.getElementById("paymentStatusSelect");
    const onlinePaymentSection = document.getElementById("onlinePaymentStatusSection");
    const modalPaymentBadge = document.getElementById("modalPaymentStatusBadge");

    document.querySelectorAll(".update-order-status-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const orderId = btn.dataset.id;
            currentOrderId = orderId;

            const order = allOrders.find(o => o._id === orderId);
            if (!order) return;

            // Fill current order status
            orderSelect.value = order.status;
            const badge = document.getElementById("modalCurrentStatusBadge");
            badge.textContent = order.status.charAt(0).toUpperCase() + order.status.slice(1);
            badge.className = "badge " + getOrderStatusBadgeClass(order.status);

            // Payment handling
            if (order.paymentMethod.toLowerCase() === "cod") {
                codPaymentSection.classList.remove("d-none");
                onlinePaymentSection.classList.add("d-none");
                paymentSelect.value = order.paymentStatus || "pending";
            } else {
                codPaymentSection.classList.add("d-none");
                onlinePaymentSection.classList.remove("d-none");
                modalPaymentBadge.textContent = order.paymentStatus || "-";
                modalPaymentBadge.className = "badge " + getPaymentStatusBadgeClass(order.paymentStatus);
            }

            orderStatusModal.show();
        });
    });

    // Save changes
    document.getElementById("saveOrderStatusBtn").addEventListener("click", async () => {
        if (!currentOrderId) return;
        const newStatus = orderSelect.value;
        const newPaymentStatus = !codPaymentSection.classList.contains("d-none")
            ? paymentSelect.value
            : null;

        try {
            const payload = { status: newStatus };
            if (newPaymentStatus) payload.paymentStatus = newPaymentStatus;

            const res = await fetch(`${API_BASE_URL}/orders/${currentOrderId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "include",
            });

            if (!res.ok) throw new Error("Failed to update order");
            const updatedOrder = await res.json();

            // Replace in local state
            const idx = allOrders.findIndex(o => o._id === currentOrderId);
            if (idx !== -1) allOrders[idx] = updatedOrder;

            renderOrdersTable(allOrders);
            orderStatusModal.hide();
        } catch (err) {
            console.error(err);
            alert("Failed to update order. Check console.");
        }
    });
}

// -----------------------------
// Filters
// -----------------------------
function setupFilters() {
    const keywordInput = document.getElementById("searchKeyword");
    const fromDate = document.getElementById("searchFromDate");
    const toDate = document.getElementById("searchToDate");
    const paymentFilter = document.getElementById("paymentFilter");
    const statusFilter = document.getElementById("statusFilter");
    const searchBtn = document.getElementById("searchBtn");

    function filterOrders() {
        const keyword = keywordInput.value.toLowerCase();
        const from = fromDate.value;
        const to = toDate.value;
        const payment = paymentFilter ? paymentFilter.value.toLowerCase() : "all";
        const status = statusFilter ? statusFilter.value.toLowerCase() : "all";

        const filtered = allOrders.filter(order => {
            const name = order.user ? (order.user.firstName + " " + order.user.lastName).toLowerCase() : "";
            const products = order.items.map(i => i.title).join(", ").toLowerCase();
            const payMethod = (order.paymentMethod || "").toLowerCase();
            const orderStatus = (order.status || "").toLowerCase();
            const date = new Date(order.createdAt).toISOString().split("T")[0];

            const matchesKeyword = name.includes(keyword) || products.includes(keyword);
            const matchesPayment = payment === "all" || payMethod === payment;
            const matchesStatus = status === "all" || orderStatus === status;

            let matchesDate = true;
            if (from && to) matchesDate = date >= from && date <= to;
            else if (from) matchesDate = date >= from;
            else if (to) matchesDate = date <= to;

            return matchesKeyword && matchesPayment && matchesStatus && matchesDate;
        });

        renderOrdersTable(filtered);
    }

    keywordInput.addEventListener("input", filterOrders);
    if (searchBtn) searchBtn.addEventListener("click", filterOrders);
    if (paymentFilter) paymentFilter.addEventListener("change", filterOrders);
    if (statusFilter) statusFilter.addEventListener("change", filterOrders);
}

// -----------------------------
// Initialize Page
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
    if (!sessionStorage.getItem("userType")) return logout();
    loadOrders();
    setupFilters();
});
