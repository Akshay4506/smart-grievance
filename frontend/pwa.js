let deferredPrompt;

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, (error) => {
            console.log('ServiceWorker registration failed: ', error);
        });
    });
}

// Handle the install prompt for custom Install buttons
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Update UI to notify the user they can install the PWA
    const installBtns = document.querySelectorAll('.install-pwa-btn');
    installBtns.forEach(btn => {
        btn.style.display = 'inline-flex'; // Show the install buttons
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const installBtns = document.querySelectorAll('.install-pwa-btn');

    installBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            // Hide the application-provided install promotion
            installBtns.forEach(b => b.style.display = 'none');
            // Show the install prompt
            if (deferredPrompt) {
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                // We've used the prompt, and can't use it again, throw it away
                deferredPrompt = null;
            }
        });
    });

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        installBtns.forEach(b => b.style.display = 'none');
    }
});

// Hide buttons after successful installation
window.addEventListener('appinstalled', (event) => {
    console.log('INSTALL: Success');
    const installBtns = document.querySelectorAll('.install-pwa-btn');
    installBtns.forEach(b => b.style.display = 'none');
});
