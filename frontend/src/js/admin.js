import { api } from './app.js';
import Chart from 'chart.js/auto';
import { QuestionModal } from './components/QuestionModal.js';

export function initAdmin() {
    const adminContainer = document.querySelector('.admin-container');
    let resultsChart = null;
    let trafficChart = null;
    let questionModal = null;
    let currentSection = 'questions';
    let currentQuestionIndex = 0;
    let questions = [];

    // Initialize admin dashboard
    adminContainer.innerHTML = `
        <div class="dashboard-content">            
            <div class="section-tabs">
                <button class="tab-btn active" data-section="questions">
                    <i class="fas fa-question-circle"></i>
                    Questions
                </button>
                <button class="tab-btn" data-section="voting">
                    <i class="fas fa-chart-pie"></i>
                    Results
                </button>
                <button class="tab-btn" data-section="traffic">
                    <i class="fas fa-chart-line"></i>
                    Analytics
                </button>
            </div>

            <!-- Questions Section -->
            <div class="dashboard-section active" id="questions-section">
                <div class="section-header">
                    <h2>Questions Management</h2>
                    <button id="create-question" class="btn-primary">
                        <i class="fas fa-plus"></i> Create New Question
                    </button>
                </div>
                <div class="stats-cards">
                    <div class="stat-card">
                        <i class="fas fa-list"></i>
                        <div class="stat-info">
                            <h3>Total Questions</h3>
                            <p id="total-questions-count">0</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-play-circle"></i>
                        <div class="stat-info">
                            <h3>Active Questions</h3>
                            <p id="active-questions-count">0</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-check-circle"></i>
                        <div class="stat-info">
                            <h3>Completed Questions</h3>
                            <p id="completed-questions-count">0</p>
                        </div>
                    </div>
                </div>
                <div class="questions-container">
                    <div class="questions-list"></div>
                    <div class="pagination-controls">
                        <button class="pagination-btn prev" title="Previous Question">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <span class="pagination-info">Question <span id="current-question">1</span> of <span id="total-questions">1</span></span>
                        <button class="pagination-btn next" title="Next Question">
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Voting Results Section -->
            <div class="dashboard-section" id="voting-section">
                <div class="section-header">
                    <h2>Voting Results</h2>
                    <div class="section-actions">
                        <select id="question-selector" class="form-select">
                            <option value="">Select a question</option>
                        </select>
                        <button id="refresh-results" class="btn-secondary">
                            <i class="fas fa-sync"></i> Refresh Data
                        </button>
                    </div>
                </div>
                <div class="results-container">
                    <div class="results-summary">
                        <div class="stat-card">
                            <i class="fas fa-poll"></i>
                            <div class="stat-info">
                                <h3>Total Votes</h3>
                                <p id="total-votes-count">0</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-users"></i>
                            <div class="stat-info">
                                <h3>Unique Voters</h3>
                                <p id="unique-voters-count">0</p>
                            </div>
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas id="results-chart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Traffic Analytics Section -->
            <div class="dashboard-section" id="traffic-section">
                <div class="section-header">
                    <h2>Traffic Analytics</h2>
                    <div class="section-actions">
                        <select id="time-range" class="form-select">
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>
                    </div>
                </div>
                <div class="traffic-stats">
                    <div class="stat-card">
                        <i class="fas fa-chart-bar"></i>
                        <div class="stat-info">
                            <h3>Total Traffic</h3>
                            <p id="total-traffic">0</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-clock"></i>
                        <div class="stat-info">
                            <h3>Peak Hour</h3>
                            <p id="peak-hour">--:--</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-arrow-trend-up"></i>
                        <div class="stat-info">
                            <h3>Growth</h3>
                            <p id="traffic-growth">0%</p>
                        </div>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="traffic-chart"></canvas>
                </div>
            </div>
        </div>
    `;

    // Initialize QuestionModal
    questionModal = new QuestionModal();
    questionModal.setOnSave(() => {
        refreshDashboard();
        showSuccess('Question saved successfully');
    });

    // Add event listeners for navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });

    // Event listeners for actions
    document.getElementById('create-question').addEventListener('click', () => questionModal.show());
    document.getElementById('refresh-results').addEventListener('click', () => refreshDashboard());
    document.getElementById('question-selector').addEventListener('change', () => loadQuestionResults());
    document.getElementById('time-range').addEventListener('change', () => loadTrafficData());

    // Add pagination event listeners
    const prevBtn = document.querySelector('.pagination-btn.prev');
    const nextBtn = document.querySelector('.pagination-btn.next');

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderCurrentQuestion();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            renderCurrentQuestion();
        }
    });

    // Initialize dashboard data on load
    refreshDashboard();

    // Function to switch between dashboard sections
    function switchSection(section) {
        // Update current section
        currentSection = section;
        
        // Update active states of nav buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        // Show selected section, hide others
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        // Load section-specific data
        if (section === 'voting') {
            loadVotingResults();
        } else if (section === 'traffic') {
            loadTrafficData();
        }
    }

    function updatePaginationControls() {
        const prevBtn = document.querySelector('.pagination-btn.prev');
        const nextBtn = document.querySelector('.pagination-btn.next');
        const currentSpan = document.getElementById('current-question');
        const totalSpan = document.getElementById('total-questions');

        if (prevBtn && nextBtn && currentSpan && totalSpan) {
            prevBtn.disabled = currentQuestionIndex === 0;
            nextBtn.disabled = currentQuestionIndex >= questions.length - 1;
            currentSpan.textContent = currentQuestionIndex + 1;
            totalSpan.textContent = questions.length;
        }
    }

    async function refreshDashboard() {
        try {
            await loadQuestions();
            if (currentSection === 'voting') {
                await loadVotingResults();
            } else if (currentSection === 'traffic') {
                await loadTrafficData();
            }
        } catch (error) {
            console.error('Failed to refresh dashboard:', error);
            showError('Failed to refresh dashboard data');
        }
    }

    // Load questions
    async function loadQuestions() {
        console.group('Loading Admin Questions');
        try {
            console.log('🔄 Fetching questions from admin API...');
            const response = await api.fetch('/api/admin/results');
            console.log('📦 API Response:', response);

            if (!response) {
                throw new Error('No response from server');
            }

            // Handle both response formats (direct array or wrapped in data property)
            questions = Array.isArray(response) ? response : (response.data || []);
            console.log('📝 Processed questions:', questions);

            // Update stats
            document.getElementById('total-questions-count').textContent = questions.length;
            document.getElementById('active-questions-count').textContent = 
                questions.filter(q => q.isActive).length;
            document.getElementById('completed-questions-count').textContent = 
                questions.filter(q => !q.isActive && new Date(q.endTime) < new Date()).length;

            console.log('Number of questions loaded:', questions.length);
            if (questions.length > 0) {
                console.log('🎯 Questions available, rendering first question...');
                currentQuestionIndex = 0;
                await renderCurrentQuestion();
            } else {
                console.log('📭 No questions found, showing empty state...');
                showEmptyState();
            }
        } catch (error) {
            console.error('❌ Failed to load questions:', error);
            showError('Failed to load questions');
            showEmptyState();
        }
        console.groupEnd();
    }

    function showEmptyState() {
        const questionsList = document.querySelector('.questions-list');
        if (questionsList) {
            questionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-question-circle"></i>
                    <p>No questions available</p>
                    <p class="sub-text">Create your first question to get started</p>
                </div>
            `;
        }
    }

    async function renderCurrentQuestion() {
        console.group('Rendering Current Question');
        
        const questionsList = document.querySelector('.questions-list');
        console.log('📍 Questions list element:', questionsList);
        console.log('📝 Current question index:', currentQuestionIndex);
        console.log('📝 Total questions:', questions.length);

        if (!questionsList) {
            console.error('❌ Questions list container not found');
            console.groupEnd();
            return;
        }

        if (!questions.length) {
            console.log('❌ No questions available');
            showEmptyState();
            console.groupEnd();
            return;
        }

        // Clear existing content
        questionsList.innerHTML = '';
        
        const currentQuestion = questions[currentQuestionIndex];
        console.log('Current question object:', currentQuestion);
        console.log('Nominees:', currentQuestion.nominees);
        
        const questionId = currentQuestion.id || currentQuestion._id;
        const nominees = currentQuestion.nominees || [];
        const totalVotes = nominees.reduce((sum, nominee) => sum + (nominee.votes || 0), 0);
        console.log('👥 Nominees:', nominees);
        console.log('🗳️ Total votes:', totalVotes);

        // Create question card
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        
        questionCard.innerHTML = `
            <div class="question-header">
                <h3>${currentQuestion.title || 'Untitled Question'}</h3>
                <span class="status-badge ${getQuestionStatus(currentQuestion)}">
                    ${currentQuestion.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="question-description">
                ${currentQuestion.description || 'No description provided'}
            </div>
            <div class="question-meta">
                <div class="time-info">
                    <span>
                        <i class="fas fa-play-circle"></i>
                        Start: ${formatDate(currentQuestion.startTime)}
                    </span>
                    <span>
                        <i class="fas fa-flag-checkered"></i>
                        End: ${formatDate(currentQuestion.endTime)}
                    </span>
                </div>
                <div class="vote-count">
                    <i class="fas fa-poll"></i>
                    ${totalVotes} votes
                </div>
            </div>
            <div class="nominees-list">
                ${nominees.length > 0 ? nominees.map(nominee => {
                    const nomineeId = nominee.id || nominee._id;
                    return `
                        <div class="nominee-item">
                            <div class="nominee-info">
                                <span class="nominee-name">${nominee.name || 'Unnamed'}</span>
                                <span class="nominee-department">${nominee.department || 'No Department'}</span>
                            </div>
                            <div class="vote-bar">
                                <div class="vote-progress" style="width: ${totalVotes ? (nominee.votes / totalVotes * 100) : 0}%"></div>
                                <span class="vote-percentage">${totalVotes ? ((nominee.votes / totalVotes * 100).toFixed(1)) : 0}%</span>
                            </div>
                        </div>
                    `;
                }).join('') : '<p class="no-nominees">No nominees added yet</p>'}
            </div>
            <div class="question-actions">
                <button class="btn-secondary edit-btn" data-id="${questionId}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-danger delete-btn" data-id="${questionId}">
                    <i class="fas fa-trash"></i> Delete
                </button>
                <button class="btn-${currentQuestion.isActive ? 'warning' : 'success'} toggle-btn" 
                        data-id="${questionId}" 
                        data-active="${!currentQuestion.isActive}">
                    <i class="fas fa-${currentQuestion.isActive ? 'pause' : 'play'}"></i>
                    ${currentQuestion.isActive ? 'Deactivate' : 'Activate'}
                </button>
            </div>
        `;

        // Add question card to list
        questionsList.appendChild(questionCard);
        console.log('✅ Question card added to DOM');

        // FORCE VISIBILITY FOR DEBUGGING
        questionCard.style.display = 'block';
        questionCard.style.opacity = '1';
        questionCard.style.visibility = 'visible';
        questionCard.style.border = '2px solid red'; // Make it very obvious
        console.log('🎨 Applied direct styles to questionCard for debugging:', questionCard);

        // Add event listeners for actions
        const editBtn = questionCard.querySelector('.edit-btn');
        const deleteBtn = questionCard.querySelector('.delete-btn');
        const toggleBtn = questionCard.querySelector('.toggle-btn');

        editBtn?.addEventListener('click', () => {
            const question = questions.find(q => q.id === editBtn.dataset.id);
            if (question) questionModal.show(question);
        });

        deleteBtn?.addEventListener('click', () => deleteQuestion(deleteBtn.dataset.id));
        toggleBtn?.addEventListener('click', () => toggleQuestion(toggleBtn.dataset.id, toggleBtn.dataset.active === 'true'));

        // Show the question card with animation
        requestAnimationFrame(() => {
            questionCard.classList.add('active');
            console.log('✅ Question card animation applied');
        });

        // Update pagination controls
        updatePaginationControls();
        console.log('✅ Pagination controls updated');
        console.log('Questions list innerHTML after render:', questionsList.innerHTML);
        console.log('Final questionsList innerHTML:', questionsList.innerHTML);
        console.groupEnd();
    }

    async function loadVotingResults() {
        try {
            const response = await api.fetch('/api/admin/results');
            console.log('📦 Voting Results Response:', response);
            
            let questionsData = [];
            if (response.success && response.data) {
                questionsData = response.data;
            } else if (Array.isArray(response)) {
                questionsData = response;
            }
            
            if (questionsData.length > 0) {
                const selector = document.getElementById('question-selector');
                selector.innerHTML = '<option value="">Select a question</option>' +
                    questionsData.map(q => `<option value="${q.id}">${q.title}</option>`).join('');
                
                selector.value = questionsData[0].id;
                await loadQuestionResults();
            }
        } catch (error) {
            console.error('Failed to load voting results:', error);
            showError('Failed to load voting results');
        }
    }

    async function loadQuestionResults() {
        const questionId = document.getElementById('question-selector').value;
        if (!questionId) return;

        try {
            const response = await api.fetch('/api/admin/results');
            let questionsData = [];
            if (response.success && response.data) {
                questionsData = response.data;
            } else if (Array.isArray(response)) {
                questionsData = response;
            }
            
            const question = questionsData.find(q => q.id === questionId);
            
            if (question) {
                const totalVotes = question.nominees.reduce((sum, n) => sum + n.votes, 0);
                document.getElementById('total-votes-count').textContent = totalVotes;
                document.getElementById('unique-voters-count').textContent = totalVotes;

                updateResultsChart(question);
            }
        } catch (error) {
            console.error('Failed to load question results:', error);
            showError('Failed to load question results');
        }
    }

    async function loadTrafficData() {
        const timeRange = document.getElementById('time-range').value;
        try {
            const response = await api.fetch(`/api/admin/traffic?range=${timeRange}`);
            if (response) {
                document.getElementById('total-traffic').textContent = response.totalTraffic || 0;
                document.getElementById('peak-hour').textContent = response.peakHour || '--:--';
                document.getElementById('traffic-growth').textContent = `${response.growth || 0}%`;
                updateTrafficChart(response.data || []);
            }
        } catch (error) {
            console.error('Failed to load traffic data:', error);
            showError('Failed to load traffic analytics');
        }
    }

    function updateResultsChart(question) {
        const ctx = document.getElementById('results-chart').getContext('2d');
        
        if (resultsChart) {
            resultsChart.destroy();
        }

        const data = {
            labels: question.nominees.map(n => n.name),
            datasets: [{
                label: 'Votes',
                data: question.nominees.map(n => n.votes),
                backgroundColor: question.nominees.map((_, i) => getChartColor(i)),
                borderColor: question.nominees.map((_, i) => getChartColor(i, 0.8)),
                borderWidth: 1
            }]
        };

        resultsChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: question.title,
                        color: '#fff',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#fff'
                        }
                    }
                }
            }
        });
    }

    function updateTrafficChart(trafficData) {
        const ctx = document.getElementById('traffic-chart').getContext('2d');
        
        if (trafficChart) {
            trafficChart.destroy();
        }

        const data = {
            labels: trafficData.map(d => d.hour || d.date),
            datasets: [{
                label: 'Traffic',
                data: trafficData.map(d => d.count),
                borderColor: '#6c63ff',
                backgroundColor: 'rgba(108, 99, 255, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        };

        trafficChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Traffic Analytics',
                        color: '#fff',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#fff'
                        }
                    }
                }
            }
        });
    }

    function getQuestionStatus(question) {
        const now = new Date();
        const startTime = new Date(question.startTime);
        const endTime = new Date(question.endTime);

        if (now < startTime) return 'upcoming';
        if (now > endTime) return 'ended';
        return question.isActive ? 'active' : 'inactive';
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getChartColor(index, alpha = 0.6) {
        const colors = [
            `rgba(108, 99, 255, ${alpha})`,
            `rgba(255, 99, 132, ${alpha})`,
            `rgba(54, 162, 235, ${alpha})`,
            `rgba(255, 205, 86, ${alpha})`,
            `rgba(75, 192, 192, ${alpha})`,
            `rgba(153, 102, 255, ${alpha})`
        ];
        return colors[index % colors.length];
    }

    function showLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    }

    function showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    function showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async function deleteQuestion(questionId) {
        if (!confirm('Are you sure you want to delete this question?')) return;
        
        try {
            await api.fetch(`/api/admin/questions/${questionId}`, {
                method: 'DELETE'
            });
            showSuccess('Question deleted successfully');
            await refreshDashboard();
        } catch (error) {
            console.error('Failed to delete question:', error);
            showError('Failed to delete question');
        }
    }

    async function toggleQuestion(questionId, newActiveState) {
        try {
            await api.fetch(`/api/admin/questions/${questionId}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: newActiveState })
            });
            showSuccess(`Question ${newActiveState ? 'activated' : 'deactivated'} successfully`);
            await refreshDashboard();
        } catch (error) {
            console.error('Failed to toggle question:', error);
            showError('Failed to update question status');
        }
    }
}