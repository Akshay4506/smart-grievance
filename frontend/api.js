const API_URL = 'https://sg-track-api.onrender.com/api';

const api = {
    // Get token from localStorage
    getToken() {
        return localStorage.getItem('sg_token');
    },

    // Set token and user in localStorage
    setAuth(data) {
        localStorage.setItem('sg_token', data.token);
        localStorage.setItem('sg_user', JSON.stringify(data));
    },

    // Clear auth (Logout)
    clearAuth() {
        localStorage.removeItem('sg_token');
        localStorage.removeItem('sg_user');
        window.location.href = 'index.html';
    },

    // Get current user object
    getUser() {
        const user = localStorage.getItem('sg_user');
        return user ? JSON.parse(user) : null;
    },

    // Generic fetch wrapper with Auth
    async fetchWithAuth(endpoint, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            // Only force logout for protected routes, not the login route itself
            if (response.status === 401 && !endpoint.includes('/auth/login')) {
                this.clearAuth();
            }
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    },


};

// --- Global Theme & UI Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Toggle Logic
    const themeToggle = document.getElementById('themeToggle');
    const themeIconSun = document.getElementById('themeIconSun');
    const themeIconMoon = document.getElementById('themeIconMoon');

    const savedTheme = localStorage.getItem('sg_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeIconSun) themeIconSun.style.display = 'block';
        if (themeIconMoon) themeIconMoon.style.display = 'none';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeIconSun) themeIconSun.style.display = 'none';
        if (themeIconMoon) themeIconMoon.style.display = 'block';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('sg_theme', newTheme);

            if (newTheme === 'dark') {
                if (themeIconSun) themeIconSun.style.display = 'block';
                if (themeIconMoon) themeIconMoon.style.display = 'none';
            } else {
                if (themeIconSun) themeIconSun.style.display = 'none';
                if (themeIconMoon) themeIconMoon.style.display = 'block';
            }
        });
    }

    // 2. Profile Dropdown Logic
    const profileBtn = document.getElementById('profileDropdownBtn');
    const profileMenu = document.getElementById('profileDropdownMenu');

    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                profileMenu.classList.remove('active');
            }
        });
    }


});
