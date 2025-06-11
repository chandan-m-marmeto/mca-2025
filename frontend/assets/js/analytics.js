// Analytics Dashboard Functionality

let analyticsCharts = {};
let realTimeInterval;

async function loadAnalytics() {
    try {
        showLoading();
        
        // Get questions with results
        const response = await fetch(`${MCA.baseURL}/questions/results`, {
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });
        const data = await response.json();

        if (data.success) {
            renderSimpleAnalytics(data.questions);
        } else {
            throw new Error(data.error || 'Failed to load results');
        }
    } catch (error) {
        console.error('Analytics loading error:', error);
        showToast('Failed to load results', 'error');
    } finally {
        hideLoading();
    }
}

function renderSimpleAnalytics(questions) {
    const container = document.getElementById('analyticsContent');
    
    container.innerHTML = `
        <div class="analytics-dashboard">
            <div class="results-header">
                <h2>Questions Results</h2>
                <button onclick="exportResults()" class="btn btn-primary">
                    <span>📊</span> Export Results
                </button>
            </div>
            
            <div class="questions-results">
                ${questions.map(question => {
                    // Calculate total votes
                    const totalVotes = question.nominees.reduce((sum, n) => sum + (n.votes || 0), 0);
                    
                    // Sort nominees by votes and get winner
                    const sortedNominees = [...question.nominees].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                    const winner = sortedNominees[0];
                    
                    return `
                        <div class="question-result-card">
                            <div class="question-header">
                                <h3>${question.title}</h3>
                                <span class="total-votes">Total Votes: ${totalVotes}</span>
                            </div>
                            
                            <div class="winner-section">
                                <div class="winner-badge">🏆 Winner</div>
                                <div class="winner-details">
                                    <div class="winner-avatar">
                                        ${winner.image ? 
                                            `<img src="${winner.image}" alt="${winner.name}" 
                                                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                             <div class="winner-initial" style="display:none;">
                                                 ${winner.name.charAt(0).toUpperCase()}
                                             </div>` :
                                            `<div class="winner-initial">
                                                ${winner.name.charAt(0).toUpperCase()}
                                             </div>`
                                        }
                                    </div>
                                    <div class="winner-name">${winner.name}</div>
                                    <div class="winner-votes">
                                        ${winner.votes} votes 
                                        (${totalVotes > 0 ? ((winner.votes / totalVotes) * 100).toFixed(1) : 0}%)
                                    </div>
                                </div>
                            </div>

                            <div class="nominees-list">
                                ${sortedNominees.map((nominee, index) => `
                                    <div class="nominee-result">
                                        <span class="nominee-rank">#${index + 1}</span>
                                        <span class="nominee-name">${nominee.name}</span>
                                        <div class="vote-bar">
                                            <div class="vote-fill" style="width: ${
                                                totalVotes > 0 ? ((nominee.votes / totalVotes) * 100) : 0
                                            }%"></div>
                                        </div>
                                        <span class="vote-percentage">
                                            ${totalVotes > 0 ? ((nominee.votes / totalVotes) * 100).toFixed(1) : 0}%
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

async function exportResults() {
    try {
        showLoading();
        
        const response = await fetch(`${MCA.baseURL}/questions/export`, {
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });
        
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mca2025-results-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Results exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export results', 'error');
    } finally {
        hideLoading();
    }
}

function renderAnalyticsDashboard(data, realTimeData) {
    const container = document.getElementById('analyticsContent') || createAnalyticsContainer();
    
    container.innerHTML = `
        <div class="analytics-dashboard">
            <!-- Overview Stats -->
            <div class="analytics-overview">
                <div class="stat-cards-grid">
                    <div class="stat-card primary">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <h3>${data.overview.totalUsers}</h3>
                            <p>Total Users</p>
                            <span class="stat-change">+${realTimeData.activeUsers} active</span>
                        </div>
                    </div>
                    <div class="stat-card success">
                        <div class="stat-icon">❓</div>
                        <div class="stat-content">
                            <h3>${data.overview.totalQuestions}</h3>
                            <p>Total Questions</p>
                            <span class="stat-change">Questions Created</span>
                        </div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-icon">🗳️</div>
                        <div class="stat-content">
                            <h3>${data.overview.totalVotes}</h3>
                            <p>Total Votes</p>
                            <span class="stat-change">Votes Cast</span>
                        </div>
                    </div>
                    <div class="stat-card info">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <h3>${data.overview.totalSessions}</h3>
                            <p>Sessions</p>
                            <span class="stat-change">${realTimeData.activeSessions} active</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="analytics-charts">
                <div class="charts-grid">
                    <!-- Traffic Trends -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>📈 Traffic Trends (Last 7 Days)</h3>
                            <div class="chart-controls">
                                <select id="trafficRange" onchange="updateTrafficChart(this.value)">
                                    <option value="7d">Last 7 Days</option>
                                    <option value="30d">Last 30 Days</option>
                                    <option value="90d">Last 90 Days</option>
                                </select>
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="trafficChart"></canvas>
                        </div>
                    </div>

                    <!-- User Actions -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>🎯 User Actions</h3>
                        </div>
                        <div class="chart-container">
                            <canvas id="actionsChart"></canvas>
                        </div>
                    </div>

                    <!-- Question Performance -->
                    <div class="chart-card span-2">
                        <div class="chart-header">
                            <h3>🏆 Top Performing Questions</h3>
                        </div>
                        <div class="question-performance-list">
                            ${data.questions.topPerforming.map((q, index) => `
                                <div class="performance-item">
                                    <div class="performance-rank">#${index + 1}</div>
                                    <div class="performance-details">
                                        <h4>${q.title}</h4>
                                        <div class="performance-stats">
                                            <span>👁️ ${q.views} views</span>
                                            <span>🗳️ ${q.votes} votes</span>
                                            <span>📊 ${q.conversionRate.toFixed(1)}% conversion</span>
                                        </div>
                                    </div>
                                    <div class="performance-chart">
                                        <div class="mini-chart" data-question-id="${q.id}"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Real-time Activity -->
            <div class="analytics-realtime">
                <div class="realtime-grid">
                    <div class="realtime-card">
                        <div class="realtime-header">
                            <h3>🔴 Live Activity</h3>
                            <span class="live-indicator">LIVE</span>
                        </div>
                        <div class="activity-feed" id="activityFeed">
                            ${realTimeData.recentActions.map(action => `
                                <div class="activity-item">
                                    <div class="activity-icon">${getActionIcon(action.action)}</div>
                                    <div class="activity-details">
                                        <span class="activity-user">${action.userEmail}</span>
                                        <span class="activity-action">${formatAction(action.action)}</span>
                                        <span class="activity-time">${formatTimeAgo(action.timestamp)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="realtime-card">
                        <div class="realtime-header">
                            <h3>⚡ Live Votes</h3>
                        </div>
                        <div class="votes-feed">
                            ${realTimeData.liveVotes.map(vote => `
                                <div class="vote-item">
                                    <div class="vote-icon">🗳️</div>
                                    <div class="vote-details">
                                        <span class="vote-user">${vote.userEmail}</span>
                                        <span class="vote-time">${formatTimeAgo(vote.timestamp)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detailed Analytics -->
            <div class="analytics-detailed">
                <div class="detailed-grid">
                    <div class="engagement-card">
                        <h3>📊 Engagement Metrics</h3>
                        <div class="engagement-stats">
                            <div class="engagement-stat">
                                <label>Bounce Rate</label>
                                <div class="stat-value">${data.engagement.bounceRate.toFixed(1)}%</div>
                                <div class="stat-bar">
                                    <div class="stat-fill" style="width: ${data.engagement.bounceRate}%"></div>
                                </div>
                            </div>
                            <div class="engagement-stat">
                                <label>Avg. Session Duration</label>
                                <div class="stat-value">${Math.round(data.engagement.averageSessionDuration / 60)}m</div>
                            </div>
                            <div class="engagement-stat">
                                <label>Pages per Session</label>
                                <div class="stat-value">${data.engagement.pagesPerSession.toFixed(1)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="conversion-card">
                        <h3>🎯 Conversion Funnel</h3>
                        <div class="conversion-funnel">
                            <div class="funnel-step">
                                <div class="step-label">Page Views</div>
                                <div class="step-value">${data.traffic.daily.reduce((sum, d) => sum + d.views, 0)}</div>
                                <div class="step-bar" style="width: 100%"></div>
                            </div>
                            <div class="funnel-step">
                                <div class="step-label">Question Views</div>
                                <div class="step-value">${data.questions.performance.reduce((sum, q) => sum + q.views, 0)}</div>
                                <div class="step-bar" style="width: 75%"></div>
                            </div>
                            <div class="funnel-step">
                                <div class="step-label">Votes Cast</div>
                                <div class="step-value">${data.overview.totalVotes}</div>
                                <div class="step-bar" style="width: 45%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize charts
    initializeAnalyticsCharts(data);
    
    // Start real-time updates
    startRealTimeUpdates();
}

function initializeAnalyticsCharts(data) {
    // Traffic chart
    const trafficCtx = document.getElementById('trafficChart');
    if (trafficCtx && typeof Chart !== 'undefined') {
        analyticsCharts.traffic = new Chart(trafficCtx, {
            type: 'line',
            data: {
                labels: data.traffic.daily.map(d => new Date(d.date).toLocaleDateString()),
                datasets: [
                    {
                        label: 'Views',
                        data: data.traffic.daily.map(d => d.views),
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Votes',
                        data: data.traffic.daily.map(d => d.votes),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    // Actions chart
    const actionsCtx = document.getElementById('actionsChart');
    if (actionsCtx && typeof Chart !== 'undefined') {
        analyticsCharts.actions = new Chart(actionsCtx, {
            type: 'doughnut',
            data: {
                labels: data.traffic.actions.map(a => formatAction(a.action)),
                datasets: [{
                    data: data.traffic.actions.map(a => a.count),
                    backgroundColor: [
                        '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

function createAnalyticsContainer() {
    const container = document.createElement('div');
    container.id = 'analyticsContent';
    container.className = 'analytics-content';
    
    const mainContent = document.querySelector('.main-content .content-body');
    if (mainContent) {
        mainContent.appendChild(container);
    }
    
    return container;
}

function startRealTimeUpdates() {
    // Update real-time data every 30 seconds
    realTimeInterval = setInterval(async () => {
        try {
            const response = await fetch(`${MCA.baseURL}/analytics/realtime`, {
                headers: { 'Authorization': `Bearer ${MCA.token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                updateRealTimeData(data.data);
            }
        } catch (error) {
            console.error('Real-time update error:', error);
        }
    }, 30000);
}

function updateRealTimeData(data) {
    const activityFeed = document.getElementById('activityFeed');
    if (activityFeed && data.recentActions) {
        activityFeed.innerHTML = data.recentActions.map(action => `
            <div class="activity-item">
                <div class="activity-icon">${getActionIcon(action.action)}</div>
                <div class="activity-details">
                    <span class="activity-user">${action.userEmail}</span>
                    <span class="activity-action">${formatAction(action.action)}</span>
                    <span class="activity-time">${formatTimeAgo(action.timestamp)}</span>
                </div>
            </div>
        `).join('');
    }
}

// Helper functions
function getActionIcon(action) {
    const icons = {
        'page_view': '👁️',
        'login': '🔐',
        'logout': '🚪',
        'vote_cast': '🗳️',
        'question_view': '❓',
        'question_click': '👆'
    };
    return icons[action] || '📋';
}

function formatAction(action) {
    const actions = {
        'page_view': 'viewed page',
        'login': 'logged in',
        'logout': 'logged out',
        'vote_cast': 'cast a vote',
        'question_view': 'viewed question',
        'question_click': 'clicked question'
    };
    return actions[action] || action;
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function renderErrorState() {
    const container = document.getElementById('analyticsContent') || createAnalyticsContainer();
    container.innerHTML = `
        <div class="analytics-error">
            <div class="error-icon">📊</div>
            <h2>Analytics Unavailable</h2>
            <p>Unable to load analytics data. Please try again later.</p>
            <button class="btn btn-primary" onclick="loadAnalytics()">Retry</button>
        </div>
    `;
}

// Cleanup function
function stopRealTimeUpdates() {
    if (realTimeInterval) {
        clearInterval(realTimeInterval);
        realTimeInterval = null;
    }
}

// Export functions for global access
window.loadAnalytics = loadAnalytics;
window.stopRealTimeUpdates = stopRealTimeUpdates; 