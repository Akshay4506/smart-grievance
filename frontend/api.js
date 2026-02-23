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

    // Theme Management
    initTheme() {
        const theme = localStorage.getItem('sg_theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        return theme;
    },
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('sg_theme', newTheme);
        return newTheme;
    },
    getInitials(name) {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
    },

    initNavBar() {
        const themeBtn = document.getElementById('themeToggleBtn');
        if (themeBtn) {
            const updateThemeIcon = () => {
                themeBtn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
            };
            updateThemeIcon();
            themeBtn.addEventListener('click', () => {
                this.toggleTheme();
                updateThemeIcon();
            });
        }

        const avatarBtn = document.getElementById('profileAvatarBtn');
        const dropdownMenu = document.getElementById('profileDropdownMenu');
        const user = this.getUser();

        if (avatarBtn && user) {
            if (user.profilePicture) {
                avatarBtn.innerHTML = `<img src="${user.profilePicture}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="Avatar">`;
            } else {
                avatarBtn.textContent = this.getInitials(user.name);
            }

            avatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (dropdownMenu) dropdownMenu.classList.toggle('active');
            });

            document.addEventListener('click', (e) => {
                if (dropdownMenu && !avatarBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.classList.remove('active');
                }
            });
        }
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
    }
};

api.initTheme();
document.addEventListener('DOMContentLoaded', () => {
    api.initNavBar();
});
