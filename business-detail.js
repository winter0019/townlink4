// business-detail.js
document.addEventListener('DOMContentLoaded', () => {
    // API Base URL (ensure this matches your backend server's URL and port)
    const API_BASE_URL = 'https://your-townlink-api.onrender.com/api/businesses'; // Use the URL you got from Render for your backend

    // --- DOM Elements ---
    const detailBusinessName = document.getElementById('detail-business-name');
    const detailBusinessCategory = document.getElementById('detail-business-category');
    const detailBusinessRating = document.getElementById('detail-business-rating');
    const detailBusinessLocation = document.getElementById('detail-business-location');
    const detailBusinessDescription = document.getElementById('detail-business-description');
    const detailBusinessReviews = document.getElementById('detail-business-reviews');
    const detailBusinessImage = document.getElementById('detail-business-image');
    const detailBusinessPhone = document.getElementById('detail-business-phone');
    const detailBusinessEmail = document.getElementById('detail-business-email');
    const detailBusinessWebsite = document.getElementById('detail-business-website');
    const detailBusinessHours = document.getElementById('detail-business-hours');
    const mapContainer = document.getElementById('map');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const navMenu = document.getElementById('nav-menu');

    // --- Utility Functions ---
    /**
     * Generate star rating HTML from a numeric rating.
     * Supports half-star ratings (0.5).
     * @param {number} rating
     * @returns {string} HTML string with stars
     */
    const generateStars = (rating) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = (rating % 1) >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return `
            <span class="text-yellow-500">
                ${'★'.repeat(fullStars)}
                ${hasHalfStar ? '★' : ''}
            </span>
            <span class="text-gray-300">${'☆'.repeat(emptyStars)}</span>
        `;
    };

    // --- Core Logic ---
    const displayBusinessDetails = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const businessId = parseInt(urlParams.get('id'));

        if (isNaN(businessId)) {
            // Handle invalid or missing business ID in URL
            detailBusinessName.textContent = 'Business Not Found';
            detailBusinessCategory.textContent = '';
            detailBusinessRating.innerHTML = '';
            detailBusinessLocation.textContent = 'Please return to the directory.';
            detailBusinessDescription.textContent = '';
            detailBusinessReviews.innerHTML = '<p class="text-red-500">Error: No business ID provided in the URL.</p>';

            if (mapContainer) {
                mapContainer.innerHTML = '<p class="text-gray-600">Map location not available.</p>';
                mapContainer.style.height = 'auto';
            }
            return;
        }

        try {
            // Fetch business details from API
            const businessResponse = await fetch(`${API_BASE_URL}/businesses/${businessId}`);
            if (!businessResponse.ok) throw new Error('Failed to fetch business details.');
            const business = await businessResponse.json();

            // Fetch reviews for the business
            const reviewsResponse = await fetch(`${API_BASE_URL}/reviews/${businessId}`);
            if (!reviewsResponse.ok) throw new Error('Failed to fetch reviews.');
            const reviewsForBusiness = await reviewsResponse.json();

            // Populate business details in the DOM
            detailBusinessName.textContent = business.name;
            detailBusinessCategory.textContent = `Category: ${business.category.charAt(0).toUpperCase() + business.category.slice(1)}`;
            detailBusinessRating.innerHTML = generateStars(business.rating);
            detailBusinessLocation.textContent = `Location: ${business.location}`;
            detailBusinessDescription.textContent = business.description;

            detailBusinessImage.src = business.image || 'https://via.placeholder.com/400x250?text=No+Image+Available';
            detailBusinessImage.alt = `${business.name} image`;

            detailBusinessPhone.textContent = business.phone ? `Phone: ${business.phone}` : 'Phone: Not available';
            detailBusinessEmail.textContent = business.email ? `Email: ${business.email}` : 'Email: Not available';
            detailBusinessWebsite.innerHTML = business.website
                ? `Website: <a href="${business.website}" target="_blank" class="text-blue-600 hover:underline">${business.website}</a>`
                : 'Website: Not available';
            detailBusinessHours.textContent = business.hours ? `Hours: ${business.hours}` : 'Hours: Not available';

            // Initialize and display map with Leaflet
            if (business.latitude && business.longitude && mapContainer) {
                mapContainer.style.display = 'block';

                // Remove existing map instance if any
                if (window.myMapInstance) {
                    window.myMapInstance.remove();
                }

                const map = L.map('map').setView([business.latitude, business.longitude], 15);
                window.myMapInstance = map;

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);

                L.marker([business.latitude, business.longitude])
                    .addTo(map)
                    .bindPopup(`<b>${business.name}</b><br>${business.location}`)
                    .openPopup();
            } else if (mapContainer) {
                mapContainer.innerHTML = '<p class="text-gray-600">Map location not available for this business.</p>';
                mapContainer.style.height = 'auto';
            }

            // Populate reviews section
            if (reviewsForBusiness.length > 0) {
                detailBusinessReviews.innerHTML = '';
                // Sort reviews by newest date first
                reviewsForBusiness.sort((a, b) => new Date(b.review_date) - new Date(a.review_date));

                reviewsForBusiness.forEach(review => {
                    const reviewCard = `
                        <div class="bg-gray-100 p-4 rounded-lg shadow-sm mb-4">
                            <p class="font-semibold">${review.reviewer_name} - ${generateStars(review.rating)}</p>
                            <p class="text-sm text-gray-500 mb-2">${new Date(review.review_date).toLocaleDateString()}</p>
                            <p class="text-gray-700">${review.text}</p>
                        </div>
                    `;
                    detailBusinessReviews.insertAdjacentHTML('beforeend', reviewCard);
                });
            } else {
                detailBusinessReviews.innerHTML = '<p class="text-gray-600">No reviews yet. Be the first!</p>';
            }
        } catch (error) {
            console.error('Error displaying business details:', error);
            detailBusinessName.textContent = 'Error Loading Business';
            detailBusinessCategory.textContent = '';
            detailBusinessRating.innerHTML = '';
            detailBusinessLocation.textContent = 'There was an error loading the business details. Please try again.';
            detailBusinessDescription.textContent = '';
            if (mapContainer) {
                mapContainer.innerHTML = '<p class="text-red-500">Map not available due to loading error.</p>';
                mapContainer.style.height = 'auto';
            }
            detailBusinessReviews.innerHTML = '<p class="text-red-500">Could not load reviews.</p>';
        }
    };

    // Mobile Menu Toggle (common for all pages)
    mobileMenuButton.addEventListener('click', () => {
        navMenu.classList.toggle('hidden');
    });

    // --- Initial Load ---
    displayBusinessDetails();
});
