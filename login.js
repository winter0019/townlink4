// login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginMessage = document.getElementById('loginMessage');

    // API Base URL (Important: make sure this matches your backend server's port)
    const API_BASE_URL = 'http://localhost:3000/api';

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value.trim();

        if (!username || !password) {
            loginMessage.textContent = 'Please enter both username and password.';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store the JWT and user info in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('username', data.username);
                loginMessage.textContent = 'Login successful! Redirecting...';
                loginMessage.classList.remove('text-red-500');
                loginMessage.classList.add('text-green-500');

                // Redirect to the home page or a dashboard
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                loginMessage.textContent = data.message || 'Login failed. Please try again.';
                loginMessage.classList.remove('text-green-500');
                loginMessage.classList.add('text-red-500');
            }
        } catch (error) {
            console.error('Error during login:', error);
            loginMessage.textContent = 'An error occurred. Please try again later.';
            loginMessage.classList.remove('text-green-500');
            loginMessage.classList.add('text-red-500');
        }
    });

    // Mobile Menu Toggle (common for all pages)
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const navMenu = document.getElementById('nav-menu');
    mobileMenuButton.addEventListener('click', () => {
        navMenu.classList.toggle('hidden');
    });
});