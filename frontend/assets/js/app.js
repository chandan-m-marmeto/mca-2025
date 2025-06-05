// Global app state
window.MCA = {
    currentUser: null,
    isAdmin: false,
    token: localStorage.getItem('token'),
    baseURL: '',  // Will be set dynamically
    staticURL: '',  // Will be set dynamically
    socket: null,
    // Admin state
    allQuestions: [],
    currentQuestionIndex: 0
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

function initializeApp() {
    console.log('Initializing MCA App...');
    
    // Set base URL dynamically based on environment
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.port === '5173';
    
    if (isDevelopment) {
        MCA.baseURL = 'http://localhost:3000/api';
        MCA.staticURL = 'http://localhost:3000';
    } else {
        // Production - use same domain
        MCA.baseURL = `${window.location.protocol}//${window.location.host}/api`;
        MCA.staticURL = `${window.location.protocol}//${window.location.host}`;
    }
    
    console.log('Environment:', isDevelopment ? 'Development' : 'Production');
    console.log('Base URL set to:', MCA.baseURL);
    console.log('Static URL set to:', MCA.staticURL);
    
    // Get token from localStorage
    MCA.token = localStorage.getItem('token');
    
    // Setup event listeners
    setupEventListeners();
    
    // Verify token and show appropriate dashboard
    if (MCA.token) {
        verifyToken();
    } else {
        showAuthSection();
    }
    
    console.log('App initialized');
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Auth forms
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    // Auth switchers
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    
    if (showRegister) {
        showRegister.addEventListener('click', function(e) {
            e.preventDefault();
            switchToRegister();
        });
    }
    
    if (showLogin) {
        showLogin.addEventListener('click', function(e) {
            e.preventDefault();
            switchToLogin();
        });
    }

    // Logout buttons
    const adminLogout = document.getElementById('adminLogout');
    const userLogout = document.getElementById('userLogout');
    
    if (adminLogout) {
        adminLogout.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    if (userLogout) {
        userLogout.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    // Setup admin navigation
    setupAdminNavigation();
}

function setupAdminNavigation() {
    console.log('Setting up admin navigation...');
    
    // Navigation buttons
    const navButtons = document.querySelectorAll('.nav-link[data-section]');
    navButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            console.log('Navigation clicked:', section);
            handleNavigation(section);
        });
    });

    // New Question button - with better error handling
    const newQuestionBtn = document.getElementById('newQuestionBtn');
    console.log('New question button found:', !!newQuestionBtn);
    
    if (newQuestionBtn) {
        // Remove existing listeners
        newQuestionBtn.removeEventListener('click', handleNewQuestionClick);
        // Add new listener
        newQuestionBtn.addEventListener('click', handleNewQuestionClick);
        console.log('New question button listener added');
    } else {
        console.error('New question button not found!');
    }
}

function handleNavigation(section) {
    console.log('Handling navigation to:', section);
    
    // Update active states
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Update page title and button visibility
    const pageTitle = document.getElementById('pageTitle');
    const newQuestionBtn = document.getElementById('newQuestionBtn');
    
    // Hide all content sections first
    const questionsContent = document.getElementById('questionsContent');
    const analyticsContent = document.getElementById('analyticsContent');
    const settingsContent = document.getElementById('settingsContent');
    
    if (questionsContent) questionsContent.classList.add('hidden');
    if (analyticsContent) analyticsContent.classList.add('hidden');
    if (settingsContent) settingsContent.classList.add('hidden');

    // Handle section content
    switch(section) {
        case 'questions':
            pageTitle.textContent = 'Questions Management';
            newQuestionBtn.style.display = 'flex';
            if (questionsContent) {
                questionsContent.classList.remove('hidden');
            }
            loadAdminQuestions();
            break;
        case 'analytics':
            pageTitle.textContent = 'Analytics Dashboard';
            newQuestionBtn.style.display = 'none';
            if (analyticsContent) {
                analyticsContent.classList.remove('hidden');
            }
            if (typeof loadAnalytics === 'function') {
                loadAnalytics();
            } else {
                console.error('loadAnalytics function not found');
                showToast('Analytics loading failed. Please refresh the page.', 'error');
            }
            break;
        case 'settings':
            pageTitle.textContent = 'Voting Control';
            newQuestionBtn.style.display = 'none';
            showSettings();
            break;
    }
}

function showSettings() {
    let container = document.getElementById('settingsContent');
    if (!container) {
        container = document.createElement('div');
        container.id = 'settingsContent';
        document.querySelector('.content-body').appendChild(container);
    }
    
    container.className = 'content-section';
    container.innerHTML = `
        <div class="settings-container">
            <div class="settings-card">
                <div class="settings-header">
                    <h2>Voting Control Panel</h2>
                    <p class="settings-description">Control voting access for all users</p>
                </div>
                
                <div class="voting-status-display" id="votingStatus">
                    <div class="status-indicator">
                        <div class="status-badge">
                            <span class="status-dot"></span>
                            <span class="status-text">Checking status...</span>
                        </div>
                        <div class="time-remaining" id="timeRemaining"></div>
                    </div>
                </div>

                <div class="settings-actions">
                    <div class="duration-wrapper" id="durationWrapper">
                        <div class="duration-input" id="durationInput">
                            <label for="votingDuration">Duration (hours)</label>
                            <input type="number" 
                                   id="votingDuration" 
                                   min="1" 
                                   max="72" 
                                   value="24" 
                                   placeholder="Enter duration in hours">
                            <span class="duration-hint">Maximum 72 hours</span>
                        </div>
                    </div>
                    <button id="toggleVotingBtn" class="btn btn-large">
                        <span class="btn-icon">🔓</span>
                        <span class="btn-text">Activate Voting</span>
                    </button>
                </div>

                <div class="settings-info">
                    <div class="info-card">
                        <div class="info-icon">ℹ️</div>
                        <div class="info-content">
                            <h3>How it works</h3>
                            <ul>
                                <li>When active, all users can see and vote on questions</li>
                                <li>When inactive, users cannot access any questions</li>
                                <li>Set duration between 1-72 hours for voting period</li>
                                <li>You can stop voting at any time</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add styles for improved status display
    const styles = document.createElement('style');
    styles.textContent = `
        .voting-status-display {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 15px;
            padding: 25px;
            margin: 20px 0;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 20px;
            border-radius: 30px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ff4444;
            transition: all 0.3s ease;
        }

        .status-dot.active {
            background: #00C853;
            box-shadow: 0 0 10px rgba(0, 200, 83, 0.5);
        }

        .status-text {
            font-size: 16px;
            color: #fff;
            font-weight: 500;
            letter-spacing: 0.5px;
        }

        .time-remaining {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: 500;
        }

        .duration-wrapper {
            margin-right: 20px;
            transition: all 0.3s ease;
        }

        .duration-wrapper.hidden {
            opacity: 0;
            transform: translateY(10px);
            pointer-events: none;
        }

        .duration-input {
            background: rgba(255, 255, 255, 0.05);
            padding: 15px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .duration-input label {
            display: block;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .duration-input input {
            width: 120px;
            padding: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            background: rgba(0, 0, 0, 0.3);
            color: white;
            font-size: 16px;
        }
        
        .duration-input input:focus {
            outline: none;
            border-color: #2196F3;
            box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
        }
        
        .duration-input input:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .duration-hint {
            display: block;
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
            margin-top: 4px;
        }
        
        .settings-actions {
            display: flex;
            align-items: flex-end;
            justify-content: center;
            margin: 30px 0;
        }

        .btn-large {
            min-width: 200px;
            transition: all 0.3s ease;
        }

        .btn-large.active {
            background: #ff4444;
            box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3);
        }
    `;
    document.head.appendChild(styles);

    container.classList.remove('hidden');
    
    // Add event listeners
    const toggleBtn = document.getElementById('toggleVotingBtn');
    toggleBtn.addEventListener('click', toggleVoting);
    
    const durationInput = document.getElementById('votingDuration');
    durationInput.addEventListener('input', function() {
        const value = parseInt(this.value);
        if (value < 1) this.value = 1;
        if (value > 72) this.value = 72;
    });
    
    // Check current status
    checkVotingStatus();
}

async function toggleVoting() {
    const toggleBtn = document.getElementById('toggleVotingBtn');
    const isCurrentlyActive = toggleBtn.classList.contains('active');
    const durationInput = document.getElementById('votingDuration');
    const durationWrapper = document.getElementById('durationWrapper');
    
    try {
        if (!isCurrentlyActive && (!durationInput.value || durationInput.value < 1)) {
            showToast('Please enter a valid duration between 1-72 hours', 'error');
            return;
        }

        // Update UI immediately to show action is in progress
        toggleBtn.disabled = true;
        toggleBtn.innerHTML = `
            <span class="btn-icon">⚡</span>
            <span class="btn-text">${isCurrentlyActive ? 'Deactivating...' : 'Activating...'}</span>
        `;

        const endpoint = isCurrentlyActive ? 'end' : 'start';
        const body = isCurrentlyActive ? {} : { duration: parseInt(durationInput.value) };

        const response = await fetch(`${MCA.baseURL}/admin/voting-session/${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MCA.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            // Update UI immediately after successful response
            updateVotingStatus(!isCurrentlyActive, durationInput.value);
            showToast(`Voting ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully!`, 'success');
        } else {
            const data = await response.json();
            throw new Error(data.error || `Failed to ${isCurrentlyActive ? 'deactivate' : 'activate'} voting`);
        }
    } catch (error) {
        showToast(error.message, 'error');
        // Reset button state on error
        toggleBtn.disabled = false;
        toggleBtn.innerHTML = `
            <span class="btn-icon">${isCurrentlyActive ? '🔒' : '🔓'}</span>
            <span class="btn-text">${isCurrentlyActive ? 'Deactivate Voting' : 'Activate Voting'}</span>
        `;
    }
}

function updateVotingStatus(isActive, duration = null) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const toggleBtn = document.getElementById('toggleVotingBtn');
    const durationInput = document.getElementById('votingDuration');
    const durationWrapper = document.getElementById('durationWrapper');
    const timeRemaining = document.getElementById('timeRemaining');

    if (statusDot && statusText && toggleBtn && durationInput && durationWrapper) {
        if (isActive) {
            statusDot.classList.add('active');
            statusText.textContent = 'Voting is ACTIVE';
            toggleBtn.classList.add('active');
            toggleBtn.disabled = false;
            toggleBtn.innerHTML = `
                <span class="btn-icon">🔒</span>
                <span class="btn-text">Deactivate Voting</span>
            `;
            durationWrapper.classList.add('hidden');
            durationInput.disabled = true;

            if (duration) {
                const endTime = new Date(Date.now() + duration * 60 * 60 * 1000);
                updateTimeRemaining(endTime);
            }
        } else {
            statusDot.classList.remove('active');
            statusText.textContent = 'Voting is INACTIVE';
            toggleBtn.classList.remove('active');
            toggleBtn.disabled = false;
            toggleBtn.innerHTML = `
                <span class="btn-icon">🔓</span>
                <span class="btn-text">Activate Voting</span>
            `;
            durationWrapper.classList.remove('hidden');
            durationInput.disabled = false;
            timeRemaining.textContent = '';
        }
    }
}

function updateTimeRemaining(endTime) {
    const timeRemainingElement = document.getElementById('timeRemaining');
    
    function updateDisplay() {
        const now = new Date();
        const timeLeft = endTime - now;
        
        if (timeLeft <= 0) {
            timeRemainingElement.textContent = 'Voting period has ended';
            checkVotingStatus(); // Refresh the status
            return;
        }
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        timeRemainingElement.textContent = `Time remaining: ${hours}h ${minutes}m`;
    }
    
    updateDisplay();
    const intervalId = setInterval(updateDisplay, 60000); // Update every minute
    
    // Store the interval ID to clear it later if needed
    timeRemainingElement.dataset.intervalId = intervalId;
}

async function checkVotingStatus() {
    try {
        const response = await fetch(`${MCA.baseURL}/admin/voting-session/status`, {
            headers: {
                'Authorization': `Bearer ${MCA.token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateVotingStatus(data.isActive, data.duration);
        } else {
            throw new Error('Failed to check voting status');
        }
    } catch (error) {
        showToast('Failed to check voting status: ' + error.message, 'error');
    }
}

async function verifyToken() {
    showLoading();
    try {
        const response = await fetch(`${MCA.baseURL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });

        if (response.ok) {
            const data = await response.json();
            MCA.currentUser = data.user;
            MCA.isAdmin = data.user.isAdmin;
            
            if (MCA.isAdmin) {
                showAdminDashboard();
            } else {
                showUserDashboard();
            }
        } else {
            localStorage.removeItem('token');
            MCA.token = null;
            showAuthSection();
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('token');
        MCA.token = null;
        showAuthSection();
    } finally {
        hideLoading();
    }
}

function showAuthSection() {
    hideAllSections();
    document.body.classList.remove('user-active');
    document.getElementById('auth-section').classList.remove('hidden');
}

function showAdminDashboard() {
    hideAllSections();
    document.body.classList.remove('user-active');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    const adminName = document.getElementById('adminName');
    if (adminName) {
        adminName.textContent = MCA.currentUser?.email || 'Admin';
    }
    // Load questions immediately
    loadAdminQuestions();
}

function showUserDashboard() {
    hideAllSections();
    document.body.classList.add('user-active');
    document.getElementById('user-dashboard').classList.remove('hidden');
    loadUserQuestions();
}

function hideAllSections() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('user-dashboard').classList.add('hidden');
}

function switchToRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

function switchToLogin() {
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    showLoading();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email.endsWith('@marmeto.com')) {
        showToast('Please use your @marmeto.com email address', 'error');
        hideLoading();
        return;
    }

    try {
        const response = await fetch(`${MCA.baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            MCA.token = data.token;
            MCA.currentUser = data.user;
            MCA.isAdmin = data.user.isAdmin;
            localStorage.setItem('token', data.token);
            
            if (MCA.isAdmin) {
                showAdminDashboard();
            } else {
                showUserDashboard();
            }
            
            showToast('Login successful!', 'success');
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    showLoading();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    if (!email.endsWith('@marmeto.com')) {
        showToast('Please use your @marmeto.com email address', 'error');
        hideLoading();
        return;
    }

    try {
        const response = await fetch(`${MCA.baseURL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            switchToLogin();
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function logout() {
    localStorage.removeItem('token');
    MCA.token = null;
    MCA.currentUser = null;
    MCA.isAdmin = false;
    showAuthSection();
    showToast('Logged out successfully', 'info');
}

async function loadAdminQuestions() {
    // Declare isInitialLoad outside try block to fix scope issue
    const isInitialLoad = !MCA.allQuestions || MCA.allQuestions.length === 0;
    
    try {
        console.log('Loading admin questions...');
        // Only show loading on initial load, not on refreshes
        if (isInitialLoad) {
            showLoading();
        }
        
        // Fix: Use full URL
        const response = await fetch(`${MCA.baseURL}/admin/results`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Questions loaded:', data);

        if (data.success && data.data) {
            MCA.allQuestions = data.data;
            MCA.currentQuestionIndex = 0;
            displayCurrentQuestion();
        } else {
            console.error('Invalid response format:', data);
            displayEmptyState();
        }

    } catch (error) {
        console.error('Failed to load questions:', error);
        if (isInitialLoad) {
            showToast('Failed to load questions', 'error');
        }
        displayEmptyState();
    } finally {
        if (isInitialLoad) {
            hideLoading();
        }
    }
}

function displayCurrentQuestion() {
    const container = document.getElementById('questionsList');
    if (!container) {
        console.error('Questions container not found');
        return;
    }

    if (!MCA.allQuestions || MCA.allQuestions.length === 0) {
        console.error('No questions available');
        displayEmptyState();
        return;
    }

    const question = MCA.allQuestions[MCA.currentQuestionIndex];
    console.log('Current question:', question);
    
    if (!question) {
        console.error('Current question is undefined');
        displayEmptyState();
        return;
    }

    // Create a safe question object with correct API property names
    const safeQuestion = {
        id: question.id || question._id || 'unknown',
        title: question.title || 'Untitled Question',
        description: question.description || '',
        isActive: Boolean(question.isActive),
        nominees: Array.isArray(question.nominees) ? question.nominees : []
    };

    try {
        container.innerHTML = `
            <div class="question-display">
                <div class="question-header">
                    <h2 class="question-title">${safeQuestion.title}</h2>
                    <span class="question-status ${safeQuestion.isActive ? 'active' : 'inactive'}">
                        ${safeQuestion.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}
                    </span>
                </div>

                <div class="question-description">
                    <p>${safeQuestion.description}</p>
                </div>

                <div class="nominees-container">
                    <h3>Nominees (${safeQuestion.nominees.length})</h3>
                    <div class="nominees-grid-clean">
                        ${safeQuestion.nominees.map((nominee, index) => {
                            const name = nominee.name || 'Unknown';
                            const hasActualImage = nominee.image && nominee.image !== null;
                            
                            return `
                                <div class="nominee-card-clean">
                                    <div class="nominee-info">
                                        ${hasActualImage ? 
                                            `<img src="${MCA.staticURL}${nominee.image}" 
                                                  alt="${name}" 
                                                  class="nominee-avatar-img" 
                                                  onclick="showNomineeImagePreview('${MCA.staticURL}${nominee.image}', '${name}')"
                                                  style="cursor: pointer;"
                                                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                             <div class="nominee-avatar" style="display:none;">${name.charAt(0).toUpperCase()}</div>` :
                                            `<div class="nominee-avatar">${name.charAt(0).toUpperCase()}</div>`
                                        }
                                        <div class="nominee-details">
                                            <h4>${name}</h4>
                                            <span class="nominee-votes">${nominee.votes || 0} votes</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="question-actions">
                    <button class="btn btn-secondary" onclick="editQuestion('${safeQuestion.id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-info" onclick="viewResults('${safeQuestion.id}')">
                        📊 View Results
                    </button>
                    <button class="btn btn-danger" onclick="deleteQuestion('${safeQuestion.id}')">
                        🗑️ Delete
                    </button>
                </div>

                <div class="pagination-controls">
                    <button class="btn btn-outline" onclick="previousQuestion()" ${MCA.currentQuestionIndex === 0 ? 'disabled' : ''}>
                        ← Previous
                    </button>
                    <span class="pagination-info">
                        ${MCA.currentQuestionIndex + 1} of ${MCA.allQuestions.length}
                    </span>
                    <button class="btn btn-outline" onclick="nextQuestion()" ${MCA.currentQuestionIndex === MCA.allQuestions.length - 1 ? 'disabled' : ''}>
                        Next →
                    </button>
                </div>
            </div>
        `;
        
        console.log('Question displayed successfully');
        
    } catch (error) {
        console.error('Error displaying question:', error);
        displayEmptyState();
    }
}

function displayEmptyState() {
    const container = document.getElementById('questionsList');
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">❓</div>
            <h2>No Questions Found</h2>
            <p>Create your first voting question to get started.</p>
            <button class="btn btn-primary" onclick="showQuestionModal()">
                ➕ Create Question
            </button>
        </div>
    `;
}

// Navigation functions
function previousQuestion() {
    if (MCA.currentQuestionIndex > 0) {
        MCA.currentQuestionIndex--;
        displayCurrentQuestion();
    }
}

function nextQuestion() {
    if (MCA.currentQuestionIndex < MCA.allQuestions.length - 1) {
        MCA.currentQuestionIndex++;
        displayCurrentQuestion();
    }
}

// Question Modal functions
function showQuestionModal(questionData = null) {
    const isEdit = questionData !== null;
    
    let modal = document.getElementById('questionModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'questionModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${isEdit ? 'Edit Question' : 'Create New Question'}</h2>
                <button class="modal-close" onclick="closeQuestionModal()">×</button>
            </div>
            <form id="questionForm" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="questionTitle">Question Title</label>
                    <input type="text" id="questionTitle" placeholder="Enter question title" 
                           value="${questionData?.title || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="questionDescription">Description</label>
                    <textarea id="questionDescription" placeholder="Enter question description" 
                              rows="3" required>${questionData?.description || ''}</textarea>
                </div>
                
                <div class="nominees-container">
                    <label>Nominees</label>
                    <div id="nomineesContainer">
                        ${questionData?.nominees?.map((n, index) => `
                            <div class="nominee-input" data-index="${index}">
                                <div class="nominee-basic-info">
                                    <input type="text" placeholder="Nominee name" value="${n.name || ''}" required>
                                    <button type="button" onclick="removeNomineeInput(this)" class="btn-remove">Remove</button>
                                </div>
                                <div class="nominee-image-section">
                                    <label class="image-upload-label">
                                        <span>Upload Image (Optional)</span>
                                        <input type="file" name="nominee_${index}_image" accept="image/*" onchange="previewImage(this)">
                                    </label>
                                    <div class="image-preview" onclick="showImagePreview(this)">
                                        ${n.image ? 
                                            `<img src="${MCA.staticURL}${n.image}" alt="Preview" class="preview-img">
                                             <button type="button" onclick="removeImage(this)" class="btn-remove-img">×</button>` : 
                                            '<span class="no-image">No image selected</span>'
                                        }
                                    </div>
                                </div>
                            </div>
                        `).join('') || `
                            <div class="nominee-input" data-index="0">
                                <div class="nominee-basic-info">
                                    <input type="text" placeholder="Nominee name" required>
                                    <button type="button" onclick="removeNomineeInput(this)" class="btn-remove">Remove</button>
                                </div>
                                <div class="nominee-image-section">
                                    <label class="image-upload-label">
                                        <span>Upload Image (Optional)</span>
                                        <input type="file" name="nominee_0_image" accept="image/*" onchange="previewImage(this)">
                                    </label>
                                    <div class="image-preview">
                                        <span class="no-image">No image selected</span>
                                    </div>
                                </div>
                            </div>
                        `}
                    </div>
                    <button type="button" onclick="addNomineeInput()" class="btn btn-outline">
                        Add Nominee
                    </button>
                </div>
                
                <div class="modal-actions">
                    <button type="button" onclick="closeQuestionModal()" class="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        ${isEdit ? 'Update Question' : 'Create Question'}
                    </button>
                </div>
            </form>
        </div>
    `;

    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });

    const form = document.getElementById('questionForm');
    form.addEventListener('submit', (e) => {
        handleQuestionSubmit(e, isEdit, questionData?.id || questionData?._id);
    });
}

function closeQuestionModal() {
    console.log('closeQuestionModal called');
    const modal = document.getElementById('questionModal');
    if (modal) {
        modal.classList.remove('show');
        // Wait for animation to complete before removing
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }
}

function addNomineeInput() {
    const container = document.getElementById('nomineesContainer');
    const nextIndex = container.querySelectorAll('.nominee-input').length;
    
    const nomineeDiv = document.createElement('div');
    nomineeDiv.className = 'nominee-input';
    nomineeDiv.setAttribute('data-index', nextIndex);
    
    nomineeDiv.innerHTML = `
        <div class="nominee-basic-info">
            <input type="text" placeholder="Nominee name" required>
            <button type="button" onclick="removeNomineeInput(this)" class="btn-remove">Remove</button>
        </div>
        <div class="nominee-image-section">
            <label class="image-upload-label">
                <span>Upload Image (Optional)</span>
                <input type="file" name="nominee_${nextIndex}_image" accept="image/*" onchange="previewImage(this)">
            </label>
            <div class="image-preview">
                <span class="no-image">No image selected</span>
            </div>
        </div>
    `;
    
    container.appendChild(nomineeDiv);
}

function removeNomineeInput(button) {
    const container = document.getElementById('nomineesContainer');
    const nomineeInput = button.closest('.nominee-input');
    
    if (container.children.length > 2) {
        nomineeInput.remove();
        // Re-index remaining nominee inputs
        const remainingInputs = container.querySelectorAll('.nominee-input');
        remainingInputs.forEach((input, index) => {
            input.setAttribute('data-index', index);
        });
    } else {
        showToast('At least 2 nominees are required', 'warning');
    }
}

async function handleQuestionSubmit(e, isEdit = false, questionId = null) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '⚡ Creating...';
    submitButton.disabled = true;

    try {
        const title = document.getElementById('questionTitle').value.trim();
        const description = document.getElementById('questionDescription').value.trim();

        if (!title || !description) {
            throw new Error('Please fill in all required fields');
        }

        const nomineeInputs = document.querySelectorAll('#nomineesContainer .nominee-input');
        const nominees = [];
        const imageFiles = [];
        
        for (let i = 0; i < nomineeInputs.length; i++) {
            const input = nomineeInputs[i];
            const nameInput = input.querySelector('input[type="text"]');
            
            if (nameInput && nameInput.value.trim()) {
                const nomineeData = {
                    name: nameInput.value.trim(),
                    index: i
                };
                nominees.push(nomineeData);

                // Collect image files
                const fileInput = input.querySelector('input[type="file"]');
                if (fileInput && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    if (file.size > 10 * 1024 * 1024) {
                        throw new Error(`Image ${file.name} is too large. Maximum size is 10MB.`);
                    }
                    imageFiles.push({
                        file: file,
                        nomineeIndex: i,
                        nomineeName: nameInput.value.trim()
                    });
                }
            }
        }

        if (nominees.length < 2) {
            throw new Error('At least 2 nominees are required');
        }

        submitButton.innerHTML = '✅ Creating question...';
        
        const questionData = {
            title,
            description,
            nominees: nominees.map(n => ({ name: n.name }))
        };

        const url = isEdit ? 
            `${MCA.baseURL}/admin/questions/${questionId}` : 
            `${MCA.baseURL}/admin/questions`;
        const method = isEdit ? 'PUT' : 'POST';

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found. Please login again.');
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(questionData)
        });

        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || `Server error: ${response.status}`;
            } catch (parseError) {
                errorMessage = await response.text() || `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data.success) {
            submitButton.innerHTML = '🎉 Success!';
            
            const hasImages = imageFiles.length > 0;
            const message = hasImages ? 
                `${isEdit ? 'Question updated!' : 'Question created!'} ${imageFiles.length} image(s) will upload in background.` :
                `${isEdit ? 'Question updated!' : 'Question created!'} successfully!`;
            
            showToast(message, 'success');
            closeQuestionModal();
            loadAdminQuestions();

            // Upload images in background if any
            if (hasImages && data.data && data.data.nominees) {
                uploadImagesInBackground(data.data, imageFiles);
            }
        } else {
            throw new Error(data.error || 'Operation failed');
        }

    } catch (error) {
        showToast(error.message, 'error');
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

async function uploadImagesInBackground(questionData, imageFiles) {
    try {
        for (const imageData of imageFiles) {
            const { file, nomineeIndex, nomineeName } = imageData;
            
            const nominee = questionData.nominees.find(n => 
                n.name.toLowerCase().trim() === nomineeName.toLowerCase().trim()
            );
            
            if (!nominee) {
                console.error(`Nominee not found for image: ${nomineeName}`);
                continue;
            }
            
            const formData = new FormData();
            formData.append('nomineeId', nominee._id);
            formData.append('questionId', questionData._id);
            formData.append('image', file);
            
            fetch(`${MCA.baseURL}/admin/nominees/${nominee._id}/image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            }).then(response => {
                if (response.ok) {
                    loadAdminQuestions();
                }
            }).catch(error => {
                console.error(`Image upload error for ${nomineeName}:`, error);
            });
        }
    } catch (error) {
        console.error('Background image upload error:', error);
        showToast('Some images may not upload properly', 'warning');
    }
}

// CRUD functions
function editQuestion(questionId) {
    console.log('Edit question:', questionId);
    const question = MCA.allQuestions.find(q => (q.id || q._id) === questionId);
    if (question) {
        showQuestionModal(question);
    } else {
        showToast('Question not found', 'error');
    }
}

function viewResults(questionId) {
    console.log('View results:', questionId);
    const question = MCA.allQuestions.find(q => (q.id || q._id) === questionId);
    if (question) {
        showResultsModal(question);
    } else {
        showToast('Question not found', 'error');
    }
}

function showResultsModal(question) {
    // Calculate detailed statistics
    const safeQuestion = {
        id: question.id || question._id,
        title: question.title || 'Untitled Question',
        description: question.description || '',
        isActive: Boolean(question.isActive),
        status: question.status || 'unknown',
        nominees: Array.isArray(question.nominees) ? question.nominees : []
    };

    // Calculate vote statistics
    const totalVotes = safeQuestion.nominees.reduce((sum, n) => sum + (parseInt(n.votes) || 0), 0);
    const sortedNominees = [...safeQuestion.nominees].sort((a, b) => (parseInt(b.votes) || 0) - (parseInt(a.votes) || 0));
    const winner = sortedNominees[0];
    const avgVotesPerNominee = totalVotes > 0 ? (totalVotes / safeQuestion.nominees.length).toFixed(1) : 0;

    // Helper function to get image URL with fallback
    const getImageUrl = (imagePath) => {
        if (!imagePath || imagePath === null) {
            return null; // Return null for initial avatar
        }
        return `${MCA.staticURL}${imagePath}`;
    };

    // Get status info
    const getStatusInfo = (status, isActive) => {
        if (!isActive) return { text: 'INACTIVE', class: 'inactive', icon: '🔴' };
        switch(status) {
            case 'active': return { text: 'ACTIVE', class: 'active', icon: '🟢' };
            case 'scheduled': return { text: 'SCHEDULED', class: 'scheduled', icon: '⏳' };
            case 'expired': return { text: 'EXPIRED', class: 'expired', icon: '⏰' };
            default: return { text: 'UNKNOWN', class: 'inactive', icon: '❓' };
        }
    };

    const statusInfo = getStatusInfo(safeQuestion.status, safeQuestion.isActive);

    // Format dates
    const formatDate = (dateStr) => {
        try {
            if (!dateStr) return 'N/A';
            return new Date(dateStr).toLocaleString();
        } catch (e) {
            return 'N/A';
        }
    };

    // Create modal
    let modal = document.getElementById('resultsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'resultsModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content results-modal">
            <div class="modal-header">
                <h2>📊 Voting Results</h2>
                <button class="modal-close" onclick="closeResultsModal()">×</button>
            </div>
            
            <div class="results-content">
                <!-- Question Info Header -->
                <div class="results-header">
                    <div class="question-info">
                        <h3 class="question-title">${safeQuestion.title}</h3>
                        <p class="question-description">${safeQuestion.description}</p>
                        <div class="question-meta">
                            <span class="meta-badge status-${statusInfo.class}">
                                ${statusInfo.icon} ${statusInfo.text}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Nominees Overview Cards -->
                <div class="nominees-overview">
                    <h3>👥 Nominees (${safeQuestion.nominees.length})</h3>
                    <div class="nominees-grid">
                        ${sortedNominees.map((nominee, index) => {
                            const votes = parseInt(nominee.votes) || 0;
                            const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
                            const isWinner = index === 0 && votes > 0;
                            
                            return `
                                <div class="nominee-card ${isWinner ? 'winner-card' : ''}">
                                    <div class="nominee-avatar">
                                        ${getImageUrl(nominee.image) ? 
                                            `<img src="${getImageUrl(nominee.image)}" 
                                                  alt="${nominee.name || 'Unknown'}"
                                                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                             <div class="nominee-initial-avatar" style="display:none;">${(nominee.name || 'U').charAt(0).toUpperCase()}</div>` :
                                            `<div class="nominee-initial-avatar">${(nominee.name || 'U').charAt(0).toUpperCase()}</div>`
                                        }
                                        ${isWinner ? '<div class="winner-crown">👑</div>' : ''}
                                    </div>
                                    <div class="nominee-info">
                                        <h4>${nominee.name || 'Unknown'}</h4>
                                        <div class="nominee-rank">#${index + 1}</div>
                                    </div>
                                    <div class="nominee-stats">
                                        <div class="vote-count">${votes}</div>
                                        <div class="vote-label">votes</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Statistics Summary -->
                <div class="results-stats">
                    <div class="stat-card">
                        <div class="stat-number">${totalVotes}</div>
                        <div class="stat-label">Total Votes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${safeQuestion.nominees.length}</div>
                        <div class="stat-label">Nominees</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${avgVotesPerNominee}</div>
                        <div class="stat-label">Average</div>
                    </div>
                    <div class="stat-card highlight">
                        <div class="stat-number">🏆</div>
                        <div class="stat-label">Leader:<br>${winner?.name || 'No votes yet'}</div>
                    </div>
                </div>

                <!-- Detailed Results -->
                <div class="results-details">
                    <h3>📈 Detailed Results</h3>
                    <div class="nominees-results">
                        ${sortedNominees.map((nominee, index) => {
                            const votes = parseInt(nominee.votes) || 0;
                            const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
                            const name = nominee.name || 'Unknown';
                            const isWinner = index === 0 && votes > 0;
                            
                            return `
                                <div class="nominee-result ${isWinner ? 'winner' : ''}">
                                    <div class="nominee-rank">
                                        ${isWinner ? '🏆' : `#${index + 1}`}
                                    </div>
                                    <div class="nominee-avatar-small">
                                        ${getImageUrl(nominee.image) ? 
                                            `<img src="${getImageUrl(nominee.image)}" 
                                                  alt="${name}"
                                                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                             <div class="nominee-initial-small" style="display:none;">${name.charAt(0).toUpperCase()}</div>` :
                                            `<div class="nominee-initial-small">${name.charAt(0).toUpperCase()}</div>`
                                        }
                                    </div>
                                    <div class="nominee-details">
                                        <h4 class="nominee-name">
                                            ${name}
                                            ${isWinner ? '<span class="winner-badge">LEADING</span>' : ''}
                                        </h4>
                                        <div class="vote-stats">
                                            <span class="vote-count">${votes} votes</span>
                                            <span class="vote-percentage">${percentage}%</span>
                                        </div>
                                    </div>
                                    <div class="result-bar">
                                        <div class="result-progress" style="width: ${percentage}%"></div>
                                        <div class="result-percentage">${percentage}%</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Vote Distribution Chart -->
                <div class="results-chart">
                    <h3>📊 Vote Distribution</h3>
                    <div class="chart-container">
                        <div class="pie-chart">
                            ${totalVotes > 0 ? createPieChart(sortedNominees, totalVotes) : '<div class="no-data">No votes to display</div>'}
                        </div>
                        <div class="chart-legend">
                            ${sortedNominees.map((nominee, index) => {
                                const votes = parseInt(nominee.votes) || 0;
                                const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
                                const color = getChartColor(index);
                                
                                return `
                                    <div class="legend-item">
                                        <div class="legend-color" style="background-color: ${color}"></div>
                                        <div class="legend-avatar">
                                            ${getImageUrl(nominee.image) ? 
                                                `<img src="${getImageUrl(nominee.image)}" 
                                                      alt="${nominee.name}"
                                                      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                                 <div class="legend-initial" style="display:none;">${nominee.name.charAt(0).toUpperCase()}</div>` :
                                                `<div class="legend-initial">${nominee.name.charAt(0).toUpperCase()}</div>`
                                            }
                                        </div>
                                        <span class="legend-text">${nominee.name}: ${votes} (${percentage}%)</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="results-actions">
                    <button class="btn btn-secondary" onclick="exportResults('${safeQuestion.id}')">
                        📥 Export Results
                    </button>
                    <button class="btn btn-primary" onclick="closeResultsModal()">
                        ✅ Close
                    </button>
                </div>
            </div>
        </div>
    `;

    // Show modal
    modal.classList.add('show');
}

function createPieChart(nominees, totalVotes) {
    let cumulativePercentage = 0;
    
    return `
        <svg viewBox="0 0 200 200" class="pie-svg">
            ${nominees.map((nominee, index) => {
                const votes = parseInt(nominee.votes) || 0;
                const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                
                if (percentage === 0) return '';
                
                const startAngle = (cumulativePercentage / 100) * 360;
                const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
                
                cumulativePercentage += percentage;
                
                const startAngleRad = (startAngle - 90) * (Math.PI / 180);
                const endAngleRad = (endAngle - 90) * (Math.PI / 180);
                
                const largeArcFlag = percentage > 50 ? 1 : 0;
                
                const x1 = 100 + 80 * Math.cos(startAngleRad);
                const y1 = 100 + 80 * Math.sin(startAngleRad);
                const x2 = 100 + 80 * Math.cos(endAngleRad);
                const y2 = 100 + 80 * Math.sin(endAngleRad);
                
                const pathData = [
                    `M 100 100`,
                    `L ${x1} ${y1}`,
                    `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    'Z'
                ].join(' ');
                
                return `<path d="${pathData}" fill="${getChartColor(index)}" stroke="#fff" stroke-width="2"/>`;
            }).join('')}
            <circle cx="100" cy="100" r="30" fill="#1a1a2e"/>
            <text x="100" y="105" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">
                ${totalVotes}
            </text>
            <text x="100" y="120" text-anchor="middle" fill="#ccc" font-size="8">
                Total Votes
            </text>
        </svg>
    `;
}

function getChartColor(index) {
    const colors = [
        '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
        '#10b981', '#06b6d4', '#84cc16', '#f97316', '#8b5cf6'
    ];
    return colors[index % colors.length];
}

function closeResultsModal() {
    const modal = document.getElementById('resultsModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function exportResults(questionId) {
    const question = MCA.allQuestions.find(q => (q.id || q._id) === questionId);
    if (!question) {
        showToast('Question not found', 'error');
        return;
    }

    // Create CSV data
    const csvData = [
        ['Nominee', 'Votes', 'Percentage'],
        ...question.nominees.map(nominee => {
            const votes = parseInt(nominee.votes) || 0;
            const totalVotes = question.nominees.reduce((sum, n) => sum + (parseInt(n.votes) || 0), 0);
            const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
            return [nominee.name, votes, `${percentage}%`];
        })
    ];

    // Convert to CSV string
    const csvString = csvData.map(row => row.join(',')).join('\n');

    // Create download
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${question.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_results.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('Results exported successfully!', 'success');
}

async function toggleQuestionStatus(questionId, newStatus) {
    try {
        showLoading();
        
        // Fix: Use full URL
        const response = await fetch(`${MCA.baseURL}/admin/questions/${questionId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ isActive: newStatus })
        });

        const data = await response.json();

        if (data.success) {
            showToast(newStatus ? 'Question activated!' : 'Question deactivated!', 'success');
            await loadAdminQuestions();
        } else {
            showToast(data.error || 'Operation failed', 'error');
        }

    } catch (error) {
        console.error('Toggle status error:', error);
        showToast('Network error occurred', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteQuestion(questionId) {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        
        // Fix: Use full URL
        const response = await fetch(`${MCA.baseURL}/admin/questions/${questionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Question deleted successfully!', 'success');
            await loadAdminQuestions();
        } else {
            showToast(data.error || 'Operation failed', 'error');
        }

    } catch (error) {
        console.error('Delete question error:', error);
        showToast('Network error occurred', 'error');
    } finally {
        hideLoading();
    }
}

async function loadUserQuestions() {
    console.log('Loading user questions for voting...');
    // This function is now properly defined in user.js
    // Just show a placeholder for now
    const container = document.getElementById('votingQuestions');
    if (container) {
        container.innerHTML = `
            <div class="loading-message">
                <h3>Loading voting questions...</h3>
                <p>Please wait while we fetch the available questions.</p>
            </div>
        `;
    }
    
    // The actual implementation will be in user.js
    if (typeof loadUserQuestions !== 'undefined') {
        // Call the user.js version if it exists
        return;
    }
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
}

// Image preview function
function previewImage(input) {
    const preview = input.parentElement.nextElementSibling;
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview" class="preview-img">
                <button type="button" onclick="removeImage(this)" class="btn-remove-img">×</button>
            `;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removeImage(button) {
    const preview = button.parentElement;
    const uploadLabel = preview.previousElementSibling;
    const fileInput = uploadLabel.querySelector('input[type="file"]');
    fileInput.value = '';
    preview.innerHTML = '<span class="no-image">No image selected</span>';
}

// New function to show image preview modal
function showImagePreview(previewElement) {
    const img = previewElement.querySelector('.preview-img');
    if (!img) return; // No image to preview
    
    // Get nominee name for the preview
    const nomineeInput = previewElement.closest('.nominee-input');
    const nameInput = nomineeInput.querySelector('input[type="text"]');
    const nomineeName = nameInput.value.trim() || 'Nominee';
    
    // Create or get existing modal
    let modal = document.getElementById('imagePreviewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'imagePreviewModal';
        modal.className = 'image-preview-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="image-preview-content">
            <img src="${img.src}" alt="${nomineeName}" class="image-preview-large">
            <button class="image-preview-close" onclick="closeImagePreview()">×</button>
            <div class="image-preview-info">
                <h3>${nomineeName}</h3>
                <p>Click outside to close</p>
            </div>
        </div>
    `;
    
    // Show modal
    modal.classList.add('show');
    
    // Close on click outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeImagePreview();
        }
    });
}

// Function to close image preview modal
function closeImagePreview() {
    const modal = document.getElementById('imagePreviewModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }
}

// Function to show nominee image preview from main display
function showNomineeImagePreview(imageSrc, nomineeName) {
    // Create or get existing modal
    let modal = document.getElementById('imagePreviewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'imagePreviewModal';
        modal.className = 'image-preview-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="image-preview-content">
            <img src="${imageSrc}" alt="${nomineeName}" class="image-preview-large">
            <button class="image-preview-close" onclick="closeImagePreview()">×</button>
            <div class="image-preview-info">
                <h3>${nomineeName}</h3>
                <p>Click outside to close</p>
            </div>
        </div>
    `;
    
    // Show modal
    modal.classList.add('show');
    
    // Close on click outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeImagePreview();
        }
    });
}

// Separate function for handling new question click
function handleNewQuestionClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('New question button clicked');
    
    try {
        showQuestionModal();
    } catch (error) {
        console.error('Error showing question modal:', error);
        showToast('Error opening question form', 'error');
    }
}