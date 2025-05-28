document.addEventListener('DOMContentLoaded', () => {
    // --- Dynamic API Base URL ---
    let API_BASE_URL;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        API_BASE_URL = 'http://localhost:3000/api/businesses'; 
    } else {
        // IMPORTANT: REPLACE 'https://your-actual-townlink-api.onrender.com' with your backend's URL from Render
        // The URL should point to the base of your business API endpoints
        API_BASE_URL = 'https://your-actual-townlink-api.onrender.com/api/businesses'; 
    }
    // --- End Dynamic API Base URL ---

    const businessesContainer = document.getElementById('business-listings');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const reviewForm = document.getElementById('review-form');
    const reviewBusinessSelect = document.getElementById('reviewBusinessSelect');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const navMenu = document.getElementById('nav-menu');

    let allBusinesses = []; // Stores all fetched businesses for client-side filtering

    // Helper to generate star ratings visually
    const generateStars = (rating) => {
        // Ensure rating is a number and handle potential NaN or out-of-range values
        const normalizedRating = Math.max(0, Math.min(5, parseFloat(rating) || 0));
        const fullStars = Math.floor(normalizedRating);
        const halfStar = normalizedRating % 1 >= 0.5 ? '★' : '';
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        return `<span class="text-yellow-500">${'★'.repeat(fullStars)}${halfStar}</span><span class="text-gray-300">${'☆'.repeat(emptyStars)}</span>`;
    };

    // Renders business cards to the DOM
    const renderBusinesses = (businesses) => {
        businessesContainer.innerHTML = ''; // Clear existing listings
        if (businesses.length === 0) {
            businessesContainer.innerHTML = '<p class="col-span-full text-center text-gray-600">No businesses found matching your criteria.</p>';
            return;
        }

        businesses.forEach(business => {
            // Note: `business.id` is used here, assuming PostgreSQL returns 'id'
            // `business.rating` is also assumed; we'll need to calculate this on the backend
            const businessCard = `
                <a href="business-detail.html?id=${business.id}" class="block bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-200">
                    <h2 class="text-xl font-semibold text-blue-700">${business.name}</h2>
                    <p class="text-sm text-gray-600">Category: ${business.category.charAt(0).toUpperCase() + business.category.slice(1)}</p>
                    <p class="mt-1 mb-2">${generateStars(business.average_rating || 0)}</p> <p class="text-sm text-gray-500">Location: ${business.location}</p>
                    <p class="mt-2 text-sm text-gray-700">${business.description ? business.description.substring(0, 100) + '...' : ''}</p>
                </a>
            `;
            businessesContainer.insertAdjacentHTML('beforeend', businessCard);
        });
    };

    // Fetches businesses from the API
    const fetchBusinesses = async () => {
        try {
            const response = await fetch(API_BASE_URL); // `API_BASE_URL` already points to `/api/businesses`
            if (!response.ok) {
                // Log the full response status and text for debugging
                const errorText = await response.text();
                console.error(`HTTP error! status: ${response.status}, text: ${errorText}`);
                throw new Error('Failed to fetch businesses');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching businesses:', error);
            businessesContainer.innerHTML = '<p class="col-span-full text-center text-red-500">Error loading businesses. Please try again later.</p>';
            return [];
        }
    };

    // Populates the business selection dropdown for reviews
    const populateBusinessSelect = async () => {
        reviewBusinessSelect.innerHTML = '<option value="">Select a Business to Review</option>';
        // Use `allBusinesses` if it's already fetched and up-to-date, otherwise re-fetch
        const businessesToPopulate = allBusinesses.length ? allBusinesses : await fetchBusinesses();
        
        // Sort businesses alphabetically by name
        const sorted = [...businessesToPopulate].sort((a, b) => a.name.localeCompare(b.name));
        
        sorted.forEach(business => {
            const option = document.createElement('option');
            option.value = business.id; // Use business.id for PostgreSQL
            option.textContent = business.name;
            reviewBusinessSelect.appendChild(option);
        });
    };

    // Filters and searches businesses based on input and category
    const filterAndSearchBusinesses = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categoryFilter.value;

        const filtered = allBusinesses.filter(business => {
            const matchesSearch = business.name.toLowerCase().includes(searchTerm) ||
                                  (business.description && business.description.toLowerCase().includes(searchTerm)) || // Check if description exists
                                  business.location.toLowerCase().includes(searchTerm);
            const matchesCategory = selectedCategory === 'all' || business.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
        renderBusinesses(filtered);
    };

    // --- Event Listeners ---
    searchInput.addEventListener('input', filterAndSearchBusinesses);
    categoryFilter.addEventListener('change', filterAndSearchBusinesses);

    reviewForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const businessId = reviewBusinessSelect.value;
        const reviewerName = document.getElementById('reviewerName').value.trim();
        const reviewText = document.getElementById('reviewText').value.trim();
        const reviewRating = parseFloat(document.getElementById('reviewRating').value); // Ensure it's a number

        if (!businessId || !reviewerName || !reviewText || isNaN(reviewRating)) { // Check for NaN
            alert('Please select a business, provide your name, review text, and a valid rating.');
            return;
        }

        try {
            // New endpoint for reviews on the backend
            const response = await fetch(`${API_BASE_URL.replace('/api/businesses', '/api/reviews')}`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    business_id: parseInt(businessId), // Ensure businessId is an integer for backend
                    reviewer_name: reviewerName, 
                    review_text: reviewText, 
                    rating: reviewRating 
                }),
            });

            const data = await response.json(); // Parse response JSON

            if (response.ok) {
                alert('Thank you for your review! Your review has been submitted.');
                reviewForm.reset(); // Reset form fields
                // Re-fetch businesses to update average ratings and re-render
                allBusinesses = await fetchBusinesses();
                filterAndSearchBusinesses();
            } else {
                alert(data.message || 'Failed to submit review. Please try again.');
                console.error('Failed to submit review:', data.details || data.message);
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('An error occurred while submitting your review. Please check your network connection.');
        }
    });

    mobileMenuButton.addEventListener('click', () => {
        navMenu.classList.toggle('hidden'); // Toggles Tailwind's hidden class
    });

    // --- Initialization on Page Load ---
    const initializePage = async () => {
        allBusinesses = await fetchBusinesses(); // Fetch all approved businesses
        renderBusinesses(allBusinesses); // Display them
        populateBusinessSelect(); // Populate the review dropdown
    };

    initializePage(); // Call the initialization function
});
