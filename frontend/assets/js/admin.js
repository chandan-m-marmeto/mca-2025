// Admin-specific functionality

// Navigation
function showDashboard() {
    showContentSection('dashboard-overview');
    updateActiveNav('dashboard');
}

function showQuestions() {
    showContentSection('questions-management');
    updateActiveNav('questions');
    loadQuestions();
}

function showAnalytics() {
    showContentSection('analytics-section');
    updateActiveNav('analytics');
    loadAnalytics();
}

function showSettings() {
    showToast('Settings section coming soon!', 'info');
}

function showContentSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

function updateActiveNav(activeItem) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const navMap = { 'dashboard': 0, 'questions': 1, 'analytics': 2, 'settings': 3 };
    const navLinks = document.querySelectorAll('.nav-link:not(.logout)');
    if (navLinks[navMap[activeItem]]) {
        navLinks[navMap[activeItem]].classList.add('active');
    }
}

// Global variables for admin pagination
let adminQuestions = [];
let currentAdminQuestionIndex = 0;

// Question Management - Load from API
async function loadQuestions() {
    try {
        showLoading();
        const response = await fetch(`${MCA.baseURL}/admin/results`, {
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            adminQuestions = data.data || [];
            currentAdminQuestionIndex = 0;
            
            if (adminQuestions.length > 0) {
                displayCurrentAdminQuestion();
            } else {
                document.getElementById('questionsGrid').innerHTML = `
                    <div class="no-questions-admin">
                        <div class="empty-state-admin">
                            <i class="fas fa-question-circle"></i>
                            <h3>No Questions Found</h3>
                            <p>Create your first voting question to get started.</p>
                            <button class="btn btn-primary" onclick="showCreateQuestion()">
                                <i class="fas fa-plus"></i> Create Question
                            </button>
                        </div>
                    </div>
                `;
            }
        } else {
            throw new Error('Failed to load questions');
        }
    } catch (error) {
        console.error('Error loading questions:', error);
        showToast('Error loading questions', 'error');
        document.getElementById('questionsGrid').innerHTML = `
            <div class="error-state-admin">
                <h3>Error Loading Questions</h3>
                <p>Please try again later.</p>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

function displayCurrentAdminQuestion() {
    const question = adminQuestions[currentAdminQuestionIndex];
    const questionsGrid = document.getElementById('questionsGrid');
    
    const now = new Date();
    const isActive = question.isActive && 
        new Date(question.startTime) <= now && 
        new Date(question.endTime) >= now;
    const totalVotes = question.nominees.reduce((sum, n) => sum + n.votes, 0);
    const timeLeft = isActive ? getTimeRemaining(question.endTime) : 'Expired';
    
    questionsGrid.innerHTML = `
        <div class="centered-admin-container">
            <!-- Centered Question Card -->
            <div class="centered-question-card">
                <!-- Question Header - Centered -->
                <div class="centered-header">
                    <h1 class="centered-title">${question.title}</h1>
                    <span class="centered-status ${question.isActive ? 'active' : 'inactive'}">
                        ${question.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                </div>

                <!-- Meta Information - Centered -->
                <div class="centered-meta">
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>${new Date(question.startTime).toLocaleDateString()}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${timeLeft}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-vote-yea"></i>
                        <span>${totalVotes} votes</span>
                    </div>
                </div>

                <!-- Description - Centered -->
                <div class="centered-description">
                    <h3>📝 Description</h3>
                    <div class="description-content">${question.description}</div>
                </div>

                <!-- All Nominees - Centered Grid -->
                <div class="centered-nominees">
                    <h3>👥 Nominees (${question.nominees.length})</h3>
                    <div class="nominees-full-grid">
                        ${question.nominees.map((nominee, index) => {
                            const percentage = totalVotes > 0 ? ((nominee.votes / totalVotes) * 100).toFixed(1) : 0;
                            return `
                                <div class="full-nominee-card">
                                    <div class="nominee-header">
                                        <div class="nominee-avatar-full">
                                            <img src="/assets/images/${nominee.image || 'default-avatar.png'}" 
                                                 alt="${nominee.name}"
                                                 onerror="this.src='/assets/images/default-avatar.png'">
                                        </div>
                                        <div class="nominee-title">
                                            <h4>${nominee.name}</h4>
                                            <span class="rank">#${index + 1}</span>
                                        </div>
                                    </div>
                                    <div class="nominee-stats-full">
                                        <div class="votes-display">${nominee.votes} votes</div>
                                        <div class="progress-bar-full">
                                            <div class="progress-fill-full" style="width: ${percentage}%"></div>
                                        </div>
                                        <div class="percentage-display">${percentage}%</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- CRUD Action Buttons - Centered -->
                <div class="centered-crud-actions">
                    <button class="crud-btn edit-btn" onclick="editQuestion('${question.id}')">
                        <i class="fas fa-edit"></i>
                        <span>Edit Question</span>
                    </button>
                    <button class="crud-btn results-btn" onclick="viewResults('${question.id}')">
                        <i class="fas fa-chart-line"></i>
                        <span>View Results</span>
                    </button>
                    <button class="crud-btn ${question.isActive ? 'deactivate-btn' : 'activate-btn'}" 
                            onclick="toggleQuestionStatus('${question.id}', ${question.isActive ? 'false' : 'true'})">
                        <i class="fas fa-${question.isActive ? 'pause' : 'play'}"></i>
                        <span>${question.isActive ? 'Deactivate' : 'Activate'}</span>
                    </button>
                    <button class="crud-btn delete-btn" onclick="deleteQuestion('${question.id}')">
                        <i class="fas fa-trash"></i>
                        <span>Delete Question</span>
                    </button>
                </div>
            </div>

            <!-- Bottom Pagination - Centered -->
            <div class="centered-pagination">
                <button class="page-btn" 
                        onclick="previousAdminQuestion()" 
                        ${currentAdminQuestionIndex === 0 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                
                <div class="page-info">
                    <span class="current-num">${currentAdminQuestionIndex + 1}</span>
                    <span class="separator">of</span>
                    <span class="total-num">${adminQuestions.length}</span>
                </div>
                
                <button class="page-btn" 
                        onclick="nextAdminQuestion()" 
                        ${currentAdminQuestionIndex === adminQuestions.length - 1 ? 'disabled' : ''}>
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
}

function previousAdminQuestion() {
    if (currentAdminQuestionIndex > 0) {
        currentAdminQuestionIndex--;
        displayCurrentAdminQuestion();
    }
}

function nextAdminQuestion() {
    if (currentAdminQuestionIndex < adminQuestions.length - 1) {
        currentAdminQuestionIndex++;
        displayCurrentAdminQuestion();
    }
}

function getTimeRemaining(endTime) {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return 'Less than 1h left';
}

// Question CRUD operations
function showCreateQuestion() {
    document.getElementById('modalTitle').textContent = 'Create New Question';
    const form = document.getElementById('questionForm');
    form.reset();
    form.dataset.mode = 'create';
    delete form.dataset.questionId;
    
    clearNominees();
    addNominee('');
    addNominee('');
    
    document.getElementById('questionModal').classList.remove('hidden');
}

async function editQuestion(questionId) {
    try {
        showLoading();
        const response = await fetch(`${MCA.baseURL}/admin/results`, {
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const question = data.data.find(q => q.id === questionId);
            
            if (question) {
                document.getElementById('modalTitle').textContent = 'Edit Question';
                const form = document.getElementById('questionForm');
                form.dataset.mode = 'edit';
                form.dataset.questionId = questionId;
                
                document.getElementById('questionTitle').value = question.title;
                document.getElementById('questionDescription').value = question.description;
                
                // Calculate duration in hours
                const start = new Date(question.startTime);
                const end = new Date(question.endTime);
                const duration = Math.round((end - start) / (1000 * 60 * 60));
                document.getElementById('votingDuration').value = duration;
                
                // Clear and populate nominees (no department)
                clearNominees();
                question.nominees.forEach(nominee => {
                    addNominee(nominee.name); // Only pass name, no department
                });
                
                document.getElementById('questionModal').classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading question:', error);
        showToast('Error loading question', 'error');
    } finally {
        hideLoading();
    }
}

async function handleQuestionSubmit(e) {
    e.preventDefault();
    showLoading();

    const form = e.target;
    const mode = form.dataset.mode || 'create';
    const questionId = form.dataset.questionId;

    const formData = {
        title: document.getElementById('questionTitle').value,
        description: document.getElementById('questionDescription').value,
        duration: parseInt(document.getElementById('votingDuration').value),
        nominees: Array.from(document.querySelectorAll('.nominee-name'))
            .map(input => input.value.trim())
            .filter(name => name) // Remove empty nominees
    };

    // Validate nominees
    if (formData.nominees.length < 2) {
        showToast('At least 2 nominees are required', 'error');
        hideLoading();
        return;
    }

    try {
        let url, method;
        if (mode === 'create') {
            url = `${MCA.baseURL}/admin/questions`;
            method = 'POST';
        } else {
            url = `${MCA.baseURL}/admin/questions/${questionId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MCA.token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`Question ${mode === 'create' ? 'created' : 'updated'} successfully!`, 'success');
            closeQuestionModal();
            loadQuestions(); // Reload questions list
        } else {
            showToast(data.error || `Failed to ${mode} question`, 'error');
        }
    } catch (error) {
        console.error(`Error ${mode}ing question:`, error);
        showToast(`Error ${mode}ing question`, 'error');
    } finally {
        hideLoading();
    }
}

async function toggleQuestionStatus(questionId, newStatus) {
    try {
        showLoading();
        const isActive = newStatus === 'true' || newStatus === true;
        
        const response = await fetch(`${MCA.baseURL}/admin/questions/${questionId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MCA.token}`
            },
            body: JSON.stringify({ isActive })
        });

        if (response.ok) {
            showToast(`Question ${isActive ? 'activated' : 'deactivated'} successfully`, 'success');
            loadQuestions();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to update question status', 'error');
        }
    } catch (error) {
        console.error('Error updating question status:', error);
        showToast('Error updating question status', 'error');
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
        const response = await fetch(`${MCA.baseURL}/admin/questions/${questionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });

        if (response.ok) {
            showToast('Question deleted successfully', 'success');
            loadQuestions();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to delete question', 'error');
        }
    } catch (error) {
        console.error('Error deleting question:', error);
        showToast('Error deleting question', 'error');
    } finally {
        hideLoading();
    }
}

// View Results with real data
async function viewResults(questionId) {
    try {
        showLoading();
        const response = await fetch(`${MCA.baseURL}/admin/results`, {
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const question = data.data.find(q => q.id === questionId);
            
            if (question) {
                const totalVotes = question.nominees.reduce((sum, n) => sum + n.votes, 0);
                
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Question Results</h3>
                            <button class="close-btn" onclick="this.closest('.modal').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div style="padding: 2rem;">
                            <h4 style="margin-bottom: 1rem;">${question.title}</h4>
                            <p style="margin-bottom: 2rem; color: #6b7280;">Total Votes: ${totalVotes}</p>
                            ${question.nominees.map(nominee => {
                                const percentage = totalVotes > 0 ? ((nominee.votes / totalVotes) * 100).toFixed(1) : 0;
                                return `
                                    <div style="margin-bottom: 2rem;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                            <span>${nominee.name}${nominee.department ? ` (${nominee.department})` : ''}</span>
                                            <span>${nominee.votes} votes (${percentage}%)</span>
                                        </div>
                                        <div style="background: #e5e7eb; height: 8px; border-radius: 4px;">
                                            <div style="background: #4f46e5; height: 8px; width: ${percentage}%; border-radius: 4px;"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                            <div class="modal-actions">
                                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Close</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }
        }
    } catch (error) {
        console.error('Error loading question results:', error);
        showToast('Error loading results', 'error');
    } finally {
        hideLoading();
    }
}

// Modal functions
function closeQuestionModal() {
    document.getElementById('questionModal').classList.add('hidden');
}

function clearNominees() {
    const container = document.getElementById('nomineesList') || document.getElementById('nomineesContainer');
    if (container) {
        container.innerHTML = '';
    }
}

function addNominee(name = '') {
    const container = document.getElementById('nomineesList') || document.getElementById('nomineesContainer');
    if (!container) {
        console.error('Nominees container not found');
        return;
    }
    
    const nomineeDiv = document.createElement('div');
    nomineeDiv.className = 'nominee-item';
    nomineeDiv.innerHTML = `
        <div class="nominee-input-group">
            <input type="text" class="nominee-name" placeholder="Nominee name" value="${name}" required>
            <button type="button" class="remove-nominee-btn" onclick="removeNominee(this)">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(nomineeDiv);
}

function removeNominee(button) {
    const container = document.getElementById('nomineesList') || document.getElementById('nomineesContainer');
    if (container && container.children.length > 2) {
        button.closest('.nominee-item').remove();
    } else {
        showToast('At least 2 nominees are required', 'error');
    }
}

// Analytics with real data
async function loadAnalytics() {
    try {
        // Load traffic data
        const trafficResponse = await fetch(`${MCA.baseURL}/admin/traffic?range=7d`, {
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });
        
        if (trafficResponse.ok && typeof Chart !== 'undefined') {
            const trafficData = await trafficResponse.json();
            
            // Voting Trends Chart
            const ctx1 = document.getElementById('votingTrendsChart');
            if (ctx1) {
                new Chart(ctx1, {
                    type: 'line',
                    data: {
                        labels: trafficData.data.map(d => d.timestamp.split('-').slice(-1)[0] + ':00'),
                        datasets: [{
                            label: 'Hourly Votes',
                            data: trafficData.data.map(d => d.count),
                            borderColor: '#4f46e5',
                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            }
        }

        // Load question performance
        const resultsResponse = await fetch(`${MCA.baseURL}/admin/results`, {
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });
        
        if (resultsResponse.ok && typeof Chart !== 'undefined') {
            const data = await resultsResponse.json();
            const questionData = data.data.map(q => ({
                title: q.title.length > 15 ? q.title.substring(0, 15) + '...' : q.title,
                votes: q.nominees.reduce((sum, n) => sum + n.votes, 0)
            }));

            const ctx2 = document.getElementById('questionPerformanceChart');
            if (ctx2) {
                new Chart(ctx2, {
                    type: 'doughnut',
                    data: {
                        labels: questionData.map(q => q.title),
                        datasets: [{
                            data: questionData.map(q => q.votes),
                            backgroundColor: ['#4f46e5', '#9333ea', '#10b981', '#f59e0b', '#ef4444']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { position: 'bottom' } }
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Fix the event listener binding - add this to the app.js setupEventListeners function
function setupEventListeners() {
    // Auth form submissions
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    
    // Question form submission - FIX THIS
    const questionForm = document.getElementById('questionForm');
    if (questionForm) {
        questionForm.addEventListener('submit', handleQuestionSubmit);
    }
}

// Add this to make sure the form submission is properly handled
document.addEventListener('DOMContentLoaded', function() {
    const questionForm = document.getElementById('questionForm');
    if (questionForm) {
        questionForm.addEventListener('submit', handleQuestionSubmit);
    }
});