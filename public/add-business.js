// add-business.js
document.addEventListener('DOMContentLoaded', () => {
    // API Base URL (Important: make sure this matches your backend server's port)
    const API_BASE_URL = 'http://localhost:3000/api'; // Keep for local testing

    // --- DOM Elements ---
    const addBusinessForm = document.getElementById('add-business-form');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const navMenu = document.getElementById('nav-menu');

    // --- Event Listeners ---
    addBusinessForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = document.getElementById('addBusinessName').value.trim();
        const category = document.getElementById('addBusinessCategory').value;
        const location = document.getElementById('addBusinessLocation').value.trim();
        const description = document.getElementById('addBusinessDescription').value.trim();
        const phone = document.getElementById('addBusinessPhone').value.trim();
        const email = document.getElementById('addBusinessEmail').value.trim();
        const website = document.getElementById('addBusinessWebsite').value.trim();
        const hours = document.getElementById('addBusinessHours').value.trim();
        const image = document.getElementById('addBusinessImage').value.trim();
        const latitude = parseFloat(document.getElementById('addBusinessLatitude').value);
        const longitude = parseFloat(document.getElementById('addBusinessLongitude').value);

        if (!name || !category || !location || !description) {
            alert('Please fill in all required business details (Name, Category, Location, Description).');
            return;
        }

        const newBusiness = {
            name,
            category,
            location,
            description,
            phone: phone || '',
            email: email || '',
            website: website || '',
            hours: hours || '',
            image: image || 'https://via.placeholder.com/400x250?text=No+Image+Available',
            latitude: isNaN(latitude) ? null : latitude,
            longitude: isNaN(longitude) ? null : longitude
        };

        try {
            const response = await fetch(`${API_BASE_URL}/businesses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, // No auth token needed
                body: JSON.stringify(newBusiness),
            });

            const data = await response.json();

            if (response.ok) {
                // <-- CHANGE: Updated success message for auto-approval
                alert(data.message || `"${name}" has been added to the directory and is now live!`);
                addBusinessForm.reset();
                window.location.href = 'index.html'; // Redirect back to home
            } else {
                alert(data.message || 'Failed to add business.');
            }
        } catch (error) {
            console.error('Error adding business:', error);
            alert('An error occurred while adding the business.');
        }
    });

    // Mobile Menu Toggle (common for all pages)
    mobileMenuButton.addEventListener('click', () => {
        navMenu.classList.toggle('hidden');
    });
});