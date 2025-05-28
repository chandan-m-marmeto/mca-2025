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
                <div class="mca-memories">
                    <div class="memories-header">
                        <h2>🏆 MCA Memories</h2>
                        <p>While we prepare for MCA 2025, take a look at some highlights from previous years!</p>
                    </div>
                    <div class="memories-gallery">
                        <div class="memory-card">
                            <div class="memory-image">
                                <div class="placeholder-image">🎉</div>
                            </div>
                            <h3>MCA 2024 Winners</h3>
                            <p>Celebrating our amazing team achievements</p>
                        </div>
                        <div class="memory-card">
                            <div class="memory-image">
                                <div class="placeholder-image">🏅</div>
                            </div>
                            <h3>Best Innovation</h3>
                            <p>Recognizing groundbreaking solutions</p>
                        </div>
                        <div class="memory-card">
                            <div class="memory-image">
                                <div class="placeholder-image">👥</div>
                            </div>
                            <h3>Team Spirit</h3>
                            <p>Honoring collaboration and teamwork</p>
                        </div>
                    </div>
                </div>
                <div class="no-voting-message">
                    <div class="empty-state">
                        <div class="empty-icon">🗳️</div>
                        <h3>No Active Voting Questions</h3>
                        <p>There are no active voting questions at the moment. Please check back later when voting opens!</p>
                        <button class="btn btn-primary" onclick="loadUserQuestions()">
                            <i class="fas fa-refresh"></i> Refresh
                        </button>
                    </div>
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
        endTime: question.endTime || new Date().toISOString(),
        nominees: Array.isArray(question.nominees) ? question.nominees : []
    };
    
    const timeRemaining = getTimeRemaining(safeQuestion.endTime);
    const hasVoted = userVotes[safeQuestion.id];
    
    questionsContainer.innerHTML = `
        <div class="question-container">
            <!-- Question Header -->
            <div class="question-header">
                <div class="question-meta">
                    <span class="question-number">${currentQuestionIndex + 1} of ${currentQuestions.length}</span>
                    <span class="time-remaining">
                        <i class="fas fa-clock"></i> ${timeRemaining}
                    </span>
                </div>
                <h2 class="question-title">${safeQuestion.title}</h2>
                <p class="question-description">${safeQuestion.description}</p>
            </div>
            
            <!-- Nominees Grid -->
            <div class="nominees-grid">
                ${safeQuestion.nominees.map(nominee => {
                    const nomineeId = nominee.id || nominee._id;
                    const nomineeName = nominee.name || 'Unknown';
                    const nomineeVotes = nominee.votes || 0;
                    
                    // Fix image path - use proper base URL
                    const getImageUrl = (image) => {
                        if (!image || image === 'default-avatar.png') {
                            return `${MCA.staticURL}/uploads/nominees/default-avatar.png`;
                        }
                        if (image.startsWith('/uploads/')) {
                            return `${MCA.staticURL}${image}`;
                        }
                        return `${MCA.staticURL}/uploads/nominees/${image}`;
                    };
                    
                    return `
                        <div class="nominee-card ${hasVoted === nomineeId ? 'selected' : ''}" 
                             data-nominee-id="${nomineeId}"
                             onclick="selectNominee('${safeQuestion.id}', '${nomineeId}')">
                            <div class="nominee-avatar">
                                <img src="${getImageUrl(nominee.image)}" 
                                     alt="${nomineeName}" 
                                     onerror="this.src='http://localhost:3000/uploads/nominees/default-avatar.png'">
                            </div>
                            <div class="nominee-info">
                                <h3 class="nominee-name">${nomineeName}</h3>
                                <div class="nominee-votes">
                                    <i class="fas fa-vote-yea"></i>
                                    <span>${nomineeVotes} votes</span>
                                </div>
                            </div>
                            <div class="selection-indicator">
                                <i class="fas fa-check"></i>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <!-- Action Buttons -->
            <div class="question-actions">
                <div class="navigation-buttons">
                    <button class="btn btn-secondary" 
                            onclick="previousUserQuestion()" 
                            ${currentQuestionIndex === 0 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <button class="btn btn-secondary" 
                            onclick="nextUserQuestion()" 
                            ${currentQuestionIndex === currentQuestions.length - 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-right"></i> Next
                    </button>
                </div>
                
                <div class="vote-button">
                    <button class="btn btn-primary ${hasVoted ? 'btn-success' : ''}" 
                            id="submitVoteBtn"
                            onclick="submitCurrentVote()"
                            ${!userVotes[safeQuestion.id] ? 'disabled' : ''}>
                        <i class="fas fa-${hasVoted ? 'check' : 'vote-yea'}"></i>
                        ${hasVoted ? 'Vote Submitted' : 'Submit Vote'}
                    </button>
                </div>
            </div>
            
            <!-- Progress Bar -->
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%"></div>
                </div>
                <span class="progress-text">${currentQuestionIndex + 1} of ${currentQuestions.length} questions</span>
            </div>
        </div>
    `;
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
