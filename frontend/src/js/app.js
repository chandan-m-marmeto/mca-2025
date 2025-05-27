import { io } from 'socket.io-client';
import { initAuth } from './auth.js';
import { initVoting } from './vote.js';
import { initAdmin } from './admin.js';

const BACKEND_URL = 'http://localhost:3000';
// Remove API_URL since we'll handle /api in the fetch function
// const API_URL = `${BACKEND_URL}/api`;

// Export for use in other modules
export const api = {
    baseUrl: BACKEND_URL, // Changed back to BACKEND_URL
    socket: null,
    token: localStorage.getItem('token'),
    user: null,

    async fetch(endpoint, options = {}) {
        // Ensure endpoint starts with /api
        if (!endpoint.startsWith('/api/')) {
            endpoint = '/api' + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
        }
        
        // Remove any double slashes in the endpoint except after http:// or https://
        endpoint = endpoint.replace(/([^:])\/+/g, '$1/');

        const url = this.baseUrl + endpoint;
        console.log('Making API request to:', url); // Debug log
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Get the latest token
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            console.log('Sending request with options:', { url, method: options.method, headers }); // Debug log
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API error:', { status: response.status, data: errorData }); // Debug log
                throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API response data:', data); // Debug log
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    initSocket() {
        if (!this.socket) {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No token available for socket connection');
                return null;
            }

            this.socket = io(BACKEND_URL, {
                auth: {
                    token
                },
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5,
                autoConnect: false  // Don't connect automatically
            });

            this.socket.on('connect', () => {
                console.log('Connected to server');
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                if (error.message === 'Invalid token' || error.message === 'jwt expired') {
                    this.clearSession();
                    window.location.href = '/';
                }
            });

            this.socket.on('disconnect', (reason) => {
                console.log('Disconnected from server:', reason);
                if (reason === 'io server disconnect' || reason === 'transport close') {
                    setTimeout(() => this.socket.connect(), 1000);
                }
            });

            // Only connect if we have a valid session
            if (this.isAuthenticated()) {
                this.socket.connect();
            }
        }
        return this.socket;
    },

    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    setSession(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        this.token = token;
        this.user = user;
    },

    clearSession() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
};

class App {
    constructor() {
        this.initializeModules();
    }

    initializeModules() {
        console.log('Initializing app modules...'); // Debug log
        
        // Hide all sections first
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });

        // Show auth section by default
        document.getElementById('auth-section').classList.remove('hidden');
        
        // Initialize authentication
        initAuth();

        // Only initialize other modules if authenticated
        if (api.isAuthenticated()) {
            const user = api.getUser();
            console.log('Current user:', user); // Debug log
            
            // Initialize modules based on user role
            if (user?.isAdmin) {
                console.log('Initializing admin dashboard...'); // Debug log
                document.getElementById('auth-section').classList.add('hidden');
                document.getElementById('admin-section').classList.remove('hidden');
                initAdmin();
            } else {
                console.log('Initializing voting interface...'); // Debug log
                document.getElementById('auth-section').classList.add('hidden');
                document.getElementById('voting-section').classList.remove('hidden');
                initVoting();
            }
        }

        // Setup navigation
        this.setupNavigation();
    }

    showInitialSection(user) {
        console.log('Showing initial section for user:', user); // Debug log
        
        // Hide all sections first
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });

        // Show appropriate section
        if (!api.isAuthenticated()) {
            document.getElementById('auth-section').classList.remove('hidden');
        } else if (user?.isAdmin) {
            document.getElementById('admin-section').classList.remove('hidden');
        } else {
            document.getElementById('voting-section').classList.remove('hidden');
        }
    }

    setupNavigation() {
        const nav = document.getElementById('nav-menu');
        const user = api.getUser();
        
        if (user) {
            nav.innerHTML = user.isAdmin 
                ? `
                    <a href="#" class="nav-link active" data-section="admin">Admin</a>
                    <a href="#" class="nav-link logout-btn">Logout</a>
                `
                : `
                    <a href="#" class="nav-link active" data-section="voting">Vote</a>
                    <a href="#" class="nav-link logout-btn">Logout</a>
                `;

            // Add click handlers
            nav.addEventListener('click', (e) => {
                if (e.target.classList.contains('nav-link')) {
                    e.preventDefault();
                    if (e.target.classList.contains('logout-btn')) {
                        api.clearSession();
                        window.location.href = '/';
                    } else {
                        const section = e.target.dataset.section;
                        if (section) {
                            this.switchSection(section);
                        }
                    }
                }
            });
        } else {
            nav.innerHTML = '';
        }
    }

    switchSection(section) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });

        // Show selected section
        document.getElementById(`${section}-section`).classList.remove('hidden');

        // Update navigation active state
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...'); // Debug log
    new App();
}); 