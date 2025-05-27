// register.js
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const registerUsernameInput = document.getElementById('registerUsername');
    const registerPasswordInput = document.getElementById('registerPassword');
    const registerMessage = document.getElementById('registerMessage');

    // API Base URL (Important: make sure this matches your backend server's port)
    const API_BASE_URL = 'http://localhost:3000/api';

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = registerUsernameInput.value.trim();
        const password = registerPasswordInput.value.trim();

        if (!username || !password) {
            registerMessage.textContent = 'Please enter both username and password.';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                registerMessage.textContent = 'Registration successful! You can now log in.';
                registerMessage.classList.remove('text-red-500');
                registerMessage.classList.add('text-green-500');

                // Optionally, redirect to login page after successful registration
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                registerMessage.textContent = data.message || 'Registration failed. Please try again.';
                registerMessage.classList.remove('text-green-500');
                registerMessage.classList.add('text-red-500');
            }
        } catch (error) {
            console.error('Error during registration:', error);
            registerMessage.textContent = 'An error occurred. Please try again later.';
            registerMessage.classList.remove('text-green-500');
            registerMessage.classList.add('text-red-500');
        }
    });

    // Mobile Menu Toggle (common for all pages)
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const navMenu = document.getElementById('nav-menu');
    mobileMenuButton.addEventListener('click', () => {
        navMenu.classList.toggle('hidden');
    });
});