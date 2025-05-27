const API_BASE = 'http://localhost:3000';

const adminKeyInput = document.getElementById('adminKeyInput');
const submitAdminKeyBtn = document.getElementById('submitAdminKey');
const adminMessage = document.getElementById('adminMessage');
const pendingBusinessesList = document.getElementById('pending-businesses-list');

submitAdminKeyBtn.addEventListener('click', () => {
    const adminKey = adminKeyInput.value.trim();
    if (!adminKey) {
        adminMessage.textContent = 'Please enter the admin key.';
        return;
    }
    loadPending(adminKey);
});

async function loadPending(adminKey) {
    try {
        const response = await fetch(`${API_BASE}/admin/pending-businesses`, {
            headers: {
                'x-admin-key': adminKey
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Unknown error');
        }

        const pendingBusinesses = await response.json();
        displayPendingBusinesses(pendingBusinesses);
        adminMessage.textContent = '';
        pendingBusinessesList.classList.remove('hidden');
    } catch (err) {
        adminMessage.textContent = err.message;
        pendingBusinessesList.classList.add('hidden');
        pendingBusinessesList.innerHTML = '';
    }
}

function displayPendingBusinesses(businesses) {
    if (businesses.length === 0) {
        pendingBusinessesList.innerHTML = '<p>No pending businesses.</p>';
        return;
    }

    pendingBusinessesList.innerHTML = '';

    businesses.forEach((business) => {
        const div = document.createElement('div');
        div.className = 'border p-4 rounded shadow bg-gray-100';

        div.innerHTML = `
            <h3 class="text-lg font-semibold">${business.name}</h3>
            <p>${business.description}</p>
            <p><strong>Location:</strong> ${business.location}</p>
            <div class="mt-2 space-x-2">
                <button class="approve-btn bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700" data-id="${business.id}">Approve</button>
                <button class="delete-btn bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700" data-id="${business.id}">Delete</button>
            </div>
        `;

        pendingBusinessesList.appendChild(div);
    });

    // Add event listeners for approve/delete buttons
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            approveBusiness(id, adminKeyInput.value.trim());
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            deleteBusiness(id, adminKeyInput.value.trim());
        });
    });
}

async function approveBusiness(id, adminKey) {
    try {
        const response = await fetch(`${API_BASE}/admin/approve/${id}`, {
            method: 'POST',
            headers: {
                'x-admin-key': adminKey
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to approve');
        }

        adminMessage.textContent = `Business ${id} approved.`;
        loadPending(adminKey);
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}

async function deleteBusiness(id, adminKey) {
    try {
        const response = await fetch(`${API_BASE}/admin/delete/${id}`, {
            method: 'DELETE',
            headers: {
                'x-admin-key': adminKey
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete');
        }

        adminMessage.textContent = `Business ${id} deleted.`;
        loadPending(adminKey);
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}
