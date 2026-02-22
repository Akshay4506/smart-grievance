const API_URL = 'http://localhost:5000/api';

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
    }
};
