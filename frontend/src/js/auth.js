import { api } from './app.js';

const BACKEND_URL = 'http://localhost:3000';

export function initAuth() {
    const authSection = document.getElementById('auth-section');
    
    if (!authSection) return;

    // Check if already authenticated
    if (api.isAuthenticated()) {
        const user = api.getUser();
        if (user?.isAdmin) {
            document.getElementById('admin-section').classList.remove('hidden');
        } else {
            document.getElementById('voting-section').classList.remove('hidden');
        }
        authSection.classList.add('hidden');
        return;
    }

    // Show login form
    authSection.innerHTML = `
        <div class="auth-container">
            <h2>Login</h2>
            <form id="login-form" class="auth-form">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" required placeholder="Enter your email">
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required placeholder="Enter your password">
                </div>
                <button type="submit" class="btn-primary">Login</button>
            </form>
        </div>
    `;

    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const formData = {
                email: loginForm.email.value,
                password: loginForm.password.value
            };

            console.log('Attempting login...'); // Debug log
            const response = await api.fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('Login response:', response); // Debug log

            if (response.token && response.user) {
                api.setSession(response.token, response.user);
                
                // Redirect based on user role
                if (response.user.isAdmin) {
                    window.location.reload();
                } else {
                    window.location.reload();
                }
            } else {
                throw new Error('Invalid login response');
            }
        } catch (error) {
            console.error('Login failed:', error);
            showError(error.message || 'Login failed. Please try again.');
            submitBtn.disabled = false;
        }
    });
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const form = document.getElementById('login-form');
    const existingError = form.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    form.insertBefore(errorDiv, form.firstChild);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Helper functions
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
}

function hideSection(sectionId) {
    document.getElementById(sectionId).classList.add('hidden');
}

function updateNavMenu() {
    const nav = document.getElementById('nav-menu');
    const user = JSON.parse(localStorage.getItem('user'));

    nav.innerHTML = user.isAdmin 
        ? `
            <a href="#" class="nav-link active" data-section="admin">Admin</a>
            <a href="#" class="nav-link" id="logout">Logout</a>
        `
        : `
            <a href="#" class="nav-link" id="logout">Logout</a>
        `;

    // Add logout handler
    document.getElementById('logout').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        updateFormMode(true);
        showSection('auth-section');
        nav.innerHTML = '';
    });
}