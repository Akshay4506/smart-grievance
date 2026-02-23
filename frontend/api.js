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

    // Change Application Language via Google Translate
    changeLanguage(langCode) {
        localStorage.setItem('sg_lang', langCode);
        if (langCode === 'en') {
            // Clear Google Translate cookies
            document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + location.hostname + '; path=/;';
        } else {
            // Set Google Translate cookie
            document.cookie = `googtrans=/en/${langCode}; path=/;`;
        }
        window.location.reload();
    }
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

    // 3. Language Selector & Google Translate Injection
    const langSelect = document.getElementById('appLanguageSelect');
    const savedLang = localStorage.getItem('sg_lang') || 'en';

    // Set UI dropdown to current language if it exists in DOM
    if (langSelect) {
        langSelect.value = savedLang;
    }

    // If language is not English, inject Google Translate
    if (savedLang !== 'en') {
        window.googleTranslateElementInit = function () {
            new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'as,bn,en,gu,hi,kn,ml,mr,or,ta,te',
                autoDisplay: false
            }, 'google_translate_element');
        };

        const gtScript = document.createElement('script');
        gtScript.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.body.appendChild(gtScript);

        // Hide Google Translate Top Banner & Tooltips
        const style = document.createElement('style');
        style.innerHTML = `
            .goog-te-banner-frame.skiptranslate { display: none !important; } 
            body { top: 0px !important; position: static !important; }
            #google_translate_element { display: none !important; }
            .goog-tooltip { display: none !important; }
            .goog-tooltip:hover { display: none !important; }
            .goog-text-highlight { background-color: transparent !important; border: none !important; box-shadow: none !important; }
            .skiptranslate { font-size: inherit !important; }
        `;
        document.head.appendChild(style);

        // Create invisible placeholder for the widget
        const gtDiv = document.createElement('div');
        gtDiv.id = 'google_translate_element';
        gtDiv.style.display = 'none';
        document.body.appendChild(gtDiv);
    }
});
