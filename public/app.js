document.addEventListener('DOMContentLoaded', () => {
  const API_BASE_URL = 'https://townlink-backend.onrender.com/api'; // ✅ Updated for production

  const businessesContainer = document.getElementById('business-listings');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const reviewForm = document.getElementById('review-form');
  const reviewBusinessSelect = document.getElementById('reviewBusinessSelect');
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const navMenu = document.getElementById('nav-menu');

  let allBusinesses = [];

  const generateStars = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? '★' : '';
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return `<span class="text-yellow-500">${'★'.repeat(fullStars)}${halfStar}</span><span class="text-gray-300">${'☆'.repeat(emptyStars)}</span>`;
  };

  const renderBusinesses = (businesses) => {
    businessesContainer.innerHTML = '';
    if (businesses.length === 0) {
      businessesContainer.innerHTML = '<p class="col-span-full text-center text-gray-600">No businesses found matching your criteria.</p>';
      return;
    }

    businesses.forEach(business => {
      const businessCard = `
        <a href="business-detail.html?id=${business._id}" class="block bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-200">
          <h2 class="text-xl font-semibold text-blue-700">${business.name}</h2>
          <p class="text-sm text-gray-600">Category: ${business.category.charAt(0).toUpperCase() + business.category.slice(1)}</p>
          <p class="mt-1 mb-2">${generateStars(business.rating)}</p>
          <p class="text-sm text-gray-500">Location: ${business.location}</p>
          <p class="mt-2 text-sm text-gray-700">${business.description.substring(0, 100)}...</p>
        </a>
      `;
      businessesContainer.insertAdjacentHTML('beforeend', businessCard);
    });
  };

  const fetchBusinesses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/businesses`);
      if (!response.ok) throw new Error('Failed to fetch businesses');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching businesses:', error);
      businessesContainer.innerHTML = '<p class="col-span-full text-center text-red-500">Error loading businesses. Please try again later.</p>';
      return [];
    }
  };

  const populateBusinessSelect = async () => {
    reviewBusinessSelect.innerHTML = '<option value="">Select a Business to Review</option>';
    const businesses = await fetchBusinesses();
    const sorted = businesses.sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach(business => {
      const option = document.createElement('option');
      option.value = business._id;
      option.textContent = business.name;
      reviewBusinessSelect.appendChild(option);
    });
  };

  const filterAndSearchBusinesses = () => {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;

    const filtered = allBusinesses.filter(business => {
      const matchesSearch = business.name.toLowerCase().includes(searchTerm) ||
                            business.description.toLowerCase().includes(searchTerm) ||
                            business.location.toLowerCase().includes(searchTerm);
      const matchesCategory = selectedCategory === 'all' || business.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    renderBusinesses(filtered);
  };

  searchInput.addEventListener('input', filterAndSearchBusinesses);
  categoryFilter.addEventListener('change', filterAndSearchBusinesses);

  reviewForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const businessId = reviewBusinessSelect.value;
    const reviewerName = document.getElementById('reviewerName').value.trim();
    const reviewText = document.getElementById('reviewText').value.trim();
    const reviewRating = parseFloat(document.getElementById('reviewRating').value);

    if (!businessId || !reviewerName || !reviewText || !reviewRating) {
      alert('Please select a business and fill in all review fields.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, reviewerName, text: reviewText, rating: reviewRating }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Thank you for your review!');
        reviewForm.reset();
        allBusinesses = await fetchBusinesses();
        filterAndSearchBusinesses();
      } else {
        alert(data.message || 'Failed to submit review.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('An error occurred while submitting your review.');
    }
  });

  mobileMenuButton.addEventListener('click', () => {
    navMenu.classList.toggle('hidden');
  });

  const initializePage = async () => {
    allBusinesses = await fetchBusinesses();
    filterAndSearchBusinesses();
    populateBusinessSelect();
  };

  initializePage();
});
