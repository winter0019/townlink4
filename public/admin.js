// Ensure this script is linked in your admin.html like: <script src="js/admin.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    // --- Dynamic API Base URL ---
    let API_BASE_URL; // Use API_BASE_URL consistently
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        API_BASE_URL = 'http://localhost:3000/api'; // Your local backend API base
    } else {
        // IMPORTANT: REPLACE 'https://your-actual-townlink-api.onrender.com' with your backend's URL from Render
        API_BASE_URL = 'https://your-actual-townlink-api.onrender.com/api'; // Your deployed backend API base
    }
    // --- End Dynamic API Base URL ---

    const adminKeyInput = document.getElementById('adminKeyInput');
    const submitAdminKeyBtn = document.getElementById('submitAdminKey');
    const adminMessage = document.getElementById('adminMessage');
    const pendingBusinessesList = document.getElementById('pending-businesses-list');
    const adminPanelContent = document.getElementById('adminPanelContent'); // Assuming you have this div to show/hide

    // Event listener for admin key submission
    submitAdminKeyBtn.addEventListener('click', () => {
        const adminKey = adminKeyInput.value.trim();
        if (!adminKey) {
            adminMessage.textContent = 'Please enter the admin key.';
            adminPanelContent.classList.add('hidden'); // Keep panel hidden if key is empty
            return;
        }
        loadPending(adminKey);
    });

    // Function to load and display pending businesses
    async function loadPending(adminKey) {
        try {
            // Backend endpoint for fetching ALL businesses (admin view returns all statuses)
            // You'll then filter for 'pending' on the client-side.
            const response = await fetch(`${API_BASE_URL}/businesses`, { // Corrected: use API_BASE_URL
                headers: {
                    'x-admin-key': adminKey
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                adminMessage.textContent = errorData.message || `Error: ${response.status} ${response.statusText}`;
                adminPanelContent.classList.add('hidden'); // Hide panel on authentication failure
                throw new Error(errorData.message || 'Authentication failed or unknown error.');
            }

            const allBusinesses = await response.json();
            // Filter for pending businesses after fetching all
            const pendingBusinesses = allBusinesses.filter(b => b.status === 'pending');

            displayPendingBusinesses(pendingBusinesses);
            adminMessage.textContent = ''; // Clear any previous messages
            adminPanelContent.classList.remove('hidden'); // Show the admin panel content
        } catch (err) {
            console.error('Error loading pending businesses:', err);
            adminMessage.textContent = err.message;
            pendingBusinessesList.classList.add('hidden');
            pendingBusinessesList.innerHTML = '';
        }
    }

    // Function to display businesses in the list
    function displayPendingBusinesses(businesses) {
        if (businesses.length === 0) {
            pendingBusinessesList.innerHTML = '<p class="text-gray-600">No pending businesses.</p>';
            return;
        }

        pendingBusinessesList.innerHTML = ''; // Clear previous listings

        businesses.forEach((business) => {
            const div = document.createElement('div');
            div.className = 'border p-4 rounded shadow bg-gray-100 mb-4'; // Added mb-4 for spacing

            div.innerHTML = `
                <h3 class="text-lg font-semibold">${business.name}</h3>
                <p class="text-gray-700">${business.description || 'No description provided.'}</p>
                <p class="text-gray-600"><strong>Location:</strong> ${business.location}</p>
                <div class="mt-3 space-x-2">
                    <button class="approve-btn bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors duration-200" data-id="${business.id}">Approve</button>
                    <button class="delete-btn bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors duration-200" data-id="${business.id}">Delete</button>
                </div>
            `;

            pendingBusinessesList.appendChild(div);
        });

        // Add event listeners for approve/delete buttons after they are rendered
        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm(`Are you sure you want to approve business ID ${id}?`)) {
                    approveBusiness(id, adminKeyInput.value.trim());
                }
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm(`Are you sure you want to delete business ID ${id}? This action cannot be undone.`)) {
                    deleteBusiness(id, adminKeyInput.value.trim());
                }
            });
        });
    }

    // Function to approve a business
    async function approveBusiness(id, adminKey) {
        try {
            // Corrected: use PUT method for approve endpoint
            const response = await fetch(`${API_BASE_URL}/businesses/${id}/approve`, {
                method: 'PUT', // Use PUT for approval
                headers: {
                    'x-admin-key': adminKey,
                    'Content-Type': 'application/json' // Important for PUT requests
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to approve business.');
            }

            adminMessage.textContent = `Business ${id} approved successfully.`;
            // Reload the pending businesses list to reflect changes
            loadPending(adminKey);
        } catch (err) {
            console.error('Error approving business:', err);
            adminMessage.textContent = err.message;
        }
    }

    // Function to delete a business
    async function deleteBusiness(id, adminKey) {
        try {
            // Corrected: use DELETE method for delete endpoint
            const response = await fetch(`${API_BASE_URL}/businesses/${id}`, { // Server.js has DELETE /api/businesses/:id
                method: 'DELETE', // Use DELETE method
                headers: {
                    'x-admin-key': adminKey
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete business.');
            }

            adminMessage.textContent = `Business ${id} deleted successfully.`;
            // Reload the pending businesses list to reflect changes
            loadPending(adminKey);
        } catch (err) {
            console.error('Error deleting business:', err);
            adminMessage.textContent = err.message;
        }
    }

    // Optional: Mobile menu toggle if you embed this script or have a common nav
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const navMenu = document.getElementById('nav-menu');
    if (mobileMenuButton && navMenu) {
        mobileMenuButton.addEventListener('click', () => {
            navMenu.classList.toggle('hidden');
        });
    }
});
