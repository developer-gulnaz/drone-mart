const usersTable = document.getElementById('usersTable').getElementsByTagName('tbody')[0];
const searchKeyword = document.getElementById('searchKeyword');
const searchFromDate = document.getElementById('searchFromDate');
const searchToDate = document.getElementById('searchToDate');

let allUsers = [];
let currentUserId = null;

// -----------------------------
// Load Recent Users
// -----------------------------
async function loadUsers() {
  try {
    // Detect page: "users.html" = fetch all, else recent
    const isUsersPage = window.location.pathname.includes("users.html");
    const url = isUsersPage ? `/api/users/all` : `/api/users/recent`;

    const res = await fetch(url, { credentials: "include" });

    if (res.status === 401) return logout();
    if (!res.ok) throw new Error("Failed to fetch users");

    const users = await res.json();
    allUsers = users;
    renderUsersTable(users);

  } catch (err) {
    console.error("Error fetching users:", err);
    alert("Failed to fetch users. Check console.");
  }
}

// -----------------------------
// Render Users Table
// -----------------------------
function renderUsersTable(users) {
  usersTable.innerHTML = "";

  if (!users.length) {
    usersTable.innerHTML = `<tr><td colspan="6" class="text-center">No users found</td></tr>`;
    return;
  }

  users.forEach((user, idx) => {
    const createdAt = new Date(user.createdAt);
    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(createdAt).replace(",", "");

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${idx + 1}</td>
            <td>${formattedDate}</td>
            <td>${user.firstName + " " + user.lastName || "-"}</td>
            <td>${user.email || "-"}</td>
            <td>${user.mobile || "-"}</td>
            <td>
                <span class="badge ${getUserStatusBadgeClass(user.statusTag)} me-2">
                    ${user.statusTag || "New"}
                </span>
                <button class="btn btn-sm btn-outline-warning update-user-status-btn" data-id="${user._id}">
                    <i class="bi bi-pencil-square"></i>
                </button>
                ${userType === "superadmin" ? `<button class="btn btn-sm btn-outline-danger delete-btn" data-id="${user._id}">
                    <i class="bi bi-trash"></i>
                </button>` : ""}
            </td>
        `;
    usersTable.appendChild(row);
  });

  attachUserActions();
}

// -----------------------------
// Badge Color Helper
// -----------------------------
function getUserStatusBadgeClass(statusTag) {
  switch ((statusTag || "new").toLowerCase()) {
    case "high priority": return "bg-danger text-white";
    case "follow-up": return "bg-warning text-dark";
    case "active": return "bg-success text-white";
    case "new": return "bg-secondary text-white";
    default: return "bg-secondary text-white";
  }
}

// -----------------------------
// Attach Actions
// -----------------------------
function attachUserActions() {
  // Delete button
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete this user?")) return;

      try {
        const res = await fetch(`/api/users/${btn.dataset.id}`, {
          method: "DELETE",
          credentials: "include"
        });
        if (res.status === 401) return logout();
        if (!res.ok) throw new Error("Failed to delete user");

        await loadUsers();
      } catch (err) {
        console.error(err);
        alert("Failed to delete user. Check console.");
      }
    });
  });

  // Update status button
  document.querySelectorAll(".update-user-status-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentUserId = btn.dataset.id;
      const modalEl = document.getElementById('updateUserStatusModal');
      const userStatusModal = new bootstrap.Modal(modalEl);
      const statusSelect = document.getElementById("userStatusSelect");
      const badge = document.getElementById("modalCurrentUserStatusBadge");

      const user = allUsers.find(u => u._id === currentUserId);
      if (!user) return;

      // Set modal values
      statusSelect.value = user.statusTag || "new";
      badge.textContent = user.statusTag || "New";
      badge.className = "badge " + getUserStatusBadgeClass(user.statusTag);

      userStatusModal.show();
    });
  });
}

// -----------------------------
// Save User Status Modal
// -----------------------------
document.getElementById("saveUserStatusBtn").addEventListener("click", async () => {
  if (!currentUserId) return;

  const statusSelect = document.getElementById("userStatusSelect");
  const newStatus = statusSelect.value;

  try {
    const res = await fetch(`/api/users/${currentUserId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusTag: newStatus }),
      credentials: "include"
    });

    if (!res.ok) throw new Error("Failed to update user status");
    const updatedUser = await res.json();

    // Update local array
    const userIdx = allUsers.findIndex(u => u._id === currentUserId);
    if (userIdx !== -1) allUsers[userIdx].statusTag = newStatus;

    renderUsersTable(allUsers);

    const modalEl = document.getElementById('updateUserStatusModal');
    const userStatusModal = bootstrap.Modal.getInstance(modalEl);
    userStatusModal.hide();
  } catch (err) {
    console.error(err);
    alert("Failed to update user status. Check console.");
  }
});

// -----------------------------
// Filters
// -----------------------------
function setupFilters() {
  function filterUsers() {
    const keyword = searchKeyword.value.toLowerCase();
    const from = searchFromDate.value;
    const to = searchToDate.value;

    const filtered = allUsers.filter(user => {
      const name = (user.firstName + " " + user.lastName).toLowerCase();
      const mobile = (user.mobile || "").toLowerCase();
      const date = new Date(user.createdAt).toISOString().split("T")[0];

      const matchesKeyword = name.includes(keyword) || mobile.includes(keyword);

      let matchesDate = true;
      if (from && to) matchesDate = date >= from && date <= to;
      else if (from) matchesDate = date >= from;
      else if (to) matchesDate = date <= to;

      return matchesKeyword && matchesDate;
    });

    renderUsersTable(filtered);
  }

  searchKeyword.addEventListener("input", filterUsers);
  searchFromDate.addEventListener("change", filterUsers);
  searchToDate.addEventListener("change", filterUsers);
}

// -----------------------------
// Initialize
// -----------------------------
document.addEventListener("DOMContentLoaded", async () => {
  if (!sessionStorage.getItem("userType")) return logout();
  await loadUsers();
  setupFilters();
});
