// User-specific functionality
let currentQuestions = [];
let currentQuestionIndex = 0;
let userVotes = {};

// Load questions for user voting
async function loadUserQuestions() {
    try {
        showLoading();
        const response = await fetch(`${MCA.baseURL}/vote/questions`, {
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Loaded questions:', data);
            
            // Handle both old and new response formats
            currentQuestions = data.questions || data || [];
            currentQuestionIndex = 0;
            
            if (currentQuestions.length > 0) {
                displayCurrentUserQuestion();
            } else {
                displayNoQuestionsState();
            }
        } else {
            throw new Error('Failed to load questions');
        }
    } catch (error) {
        console.error('Error loading user questions:', error);
        showToast('Error loading questions', 'error');
        displayErrorState();
    } finally {
        hideLoading();
    }
}

function displayNoQuestionsState() {
    const container = document.getElementById('votingQuestions');
    if (container) {
        container.innerHTML = `
            <div class="no-questions-state">
                <div class="empty-state">
                    <div class="empty-icon">🗳️</div>
                    <h3>No Questions Available</h3>
                    <p>There are no questions available for voting at the moment.</p>
                    <button class="btn btn-primary" onclick="loadUserQuestions()">
                        Refresh
                    </button>
                </div>
            </div>
        `;
    }
}

function displayErrorState() {
    const container = document.getElementById('votingQuestions');
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Error Loading Questions</h3>
                <p>Unable to load voting questions. Please try again.</p>
                <button class="btn btn-primary" onclick="loadUserQuestions()">
                    <i class="fas fa-retry"></i> Try Again
                </button>
            </div>
        `;
    }
}

function displayCurrentUserQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    const questionsContainer = document.getElementById('votingQuestions') || document.getElementById('userQuestions');
    
    if (!question || !questionsContainer) {
        console.error('No question or container found');
        return;
    }

    // Safe access to question properties
    const safeQuestion = {
        id: question.id || question._id,
        title: question.title || 'Untitled Question',
        description: question.description || '',
        nominees: Array.isArray(question.nominees) ? question.nominees : []
    };
    
    const hasVoted = userVotes[safeQuestion.id];

    questionsContainer.innerHTML = `
        <div class="voting-container">
            <div class="question-header">
                <h2 class="question-title">${safeQuestion.title}</h2>
                <p class="question-description">${safeQuestion.description}</p>
            </div>

            <div class="nominees-grid">
                ${safeQuestion.nominees.map(nominee => `
                    <div class="nominee-card">
                        <div class="nominee-image-container">
                            <img src="${nominee.image || '/assets/images/avatar.png'}" 
                                 alt="${nominee.name}" 
                                 class="nominee-image"
                                 onerror="this.src='/assets/images/avatar.png'">
                        </div>
                        <div class="nominee-details">
                            <h3 class="nominee-name">${nominee.name}</h3>
                            ${nominee.department ? `<p class="nominee-department">${nominee.department}</p>` : ''}
                        </div>
                        <div class="vote-action">
                            ${!hasVoted ? 
                                `<button onclick="castVote('${safeQuestion.id}', '${nominee._id}')" class="vote-button">
                                    Vote
                                </button>` : 
                                `<div class="voted-indicator">Voted ✓</div>`
                            }
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="pagination-controls">
                <button class="nav-button ${currentQuestionIndex === 0 ? 'disabled' : ''}"
                        onclick="previousQuestion()" 
                        ${currentQuestionIndex === 0 ? 'disabled' : ''}>
                    ← Previous
                </button>
                <span class="page-indicator">
                    ${currentQuestionIndex + 1} of ${currentQuestions.length}
                </span>
                <button class="nav-button ${currentQuestionIndex === currentQuestions.length - 1 ? 'disabled' : ''}"
                        onclick="nextQuestion()" 
                        ${currentQuestionIndex === currentQuestions.length - 1 ? 'disabled' : ''}>
                    Next →
                </button>
            </div>
        </div>
    `;

    // Add CSS if not already present
    if (!document.getElementById('voting-styles')) {
        const styles = document.createElement('style');
        styles.id = 'voting-styles';
        styles.textContent = `
            .voting-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }

            .question-header {
                text-align: center;
                margin-bottom: 30px;
            }

            .question-title {
                font-size: 24px;
                color: #333;
                margin-bottom: 10px;
            }

            .question-description {
                color: #666;
                font-size: 16px;
            }

            .nominees-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }

            .nominee-card {
                background: #fff;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                overflow: hidden;
                transition: transform 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 20px;
            }

            .nominee-card:hover {
                transform: translateY(-5px);
            }

            .nominee-image-container {
                width: 200px;
                height: 200px;
                margin-bottom: 15px;
                border-radius: 10px;
                overflow: hidden;
            }

            .nominee-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .nominee-details {
                text-align: center;
                margin-bottom: 15px;
            }

            .nominee-name {
                font-size: 18px;
                color: #333;
                margin-bottom: 5px;
            }

            .nominee-department {
                color: #666;
                font-size: 14px;
            }

            .vote-button {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                transition: background 0.2s;
            }

            .vote-button:hover {
                background: #45a049;
            }

            .voted-indicator {
                color: #4CAF50;
                font-weight: bold;
            }

            .pagination-controls {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 20px;
                margin-top: 30px;
            }

            .nav-button {
                background: #f0f0f0;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .nav-button:not(.disabled):hover {
                background: #e0e0e0;
            }

            .nav-button.disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .page-indicator {
                font-size: 16px;
                color: #666;
            }
        `;
        document.head.appendChild(styles);
    }
}

function selectNominee(questionId, nomineeId) {
    const question = currentQuestions[currentQuestionIndex];
    if (!question || (question.id || question._id) !== questionId) return;
    
    // Remove previous selection
    document.querySelectorAll('.nominee-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection to clicked nominee
    const selectedCard = document.querySelector(`[data-nominee-id="${nomineeId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Store the vote
    userVotes[questionId] = nomineeId;
    
    // Enable submit button
    const submitBtn = document.getElementById('submitVoteBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-vote-yea"></i> Submit Vote';
    }
}

async function submitCurrentVote() {
    const question = currentQuestions[currentQuestionIndex];
    const questionId = question.id || question._id;
    const selectedNomineeId = userVotes[questionId];
    
    if (!selectedNomineeId) {
        showToast('Please select a nominee first', 'error');
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`${MCA.baseURL}/vote/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MCA.token}`
            },
            body: JSON.stringify({
                questionId: questionId,
                nomineeId: selectedNomineeId
            })
        });
        
        if (response.ok) {
            // Trigger celebration background effect
            if (window.userBackground) {
                window.userBackground.celebrateVote();
            }
            
            showToast('Vote submitted successfully!', 'success');
            
            // Update the UI
            const submitBtn = document.getElementById('submitVoteBtn');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Vote Submitted';
                submitBtn.classList.add('btn-success');
                submitBtn.disabled = true;
            }
            
            // Update the question data
            const nominee = question.nominees.find(n => (n.id || n._id) === selectedNomineeId);
            if (nominee) nominee.votes++;
            
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to submit vote', 'error');
        }
    } catch (error) {
        console.error('Error submitting vote:', error);
        showToast('Error submitting vote', 'error');
    } finally {
        hideLoading();
    }
}

function previousUserQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayCurrentUserQuestion();
    }
}

function nextUserQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        displayCurrentUserQuestion();
    }
}

function getTimeRemaining(endTime) {
    try {
        if (!endTime) return 'No time limit';
        
        const now = new Date();
        const end = new Date(endTime);
        const timeLeft = end - now;
        
        if (timeLeft <= 0) return 'Voting ended';
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m remaining`;
        } else {
            return `${minutes}m remaining`;
        }
    } catch (error) {
        console.error('Error calculating time remaining:', error);
        return 'Time calculation error';
    }
}

function loadUserProfile() {
    // Implementation for user profile loading
    console.log('Loading user profile...');
}
