// User-specific functionality
let currentQuestions = [];
let currentQuestionIndex = 0;
let userVotes = {};

// Load questions for user voting
async function loadUserQuestions() {
    try {
        console.log('Starting to load user questions...');
        showLoading();
        
        // First check if voting is active
        const statusResponse = await fetch(`${MCA.baseURL}/vote/session/status`, {
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });
        
        const statusData = await statusResponse.json();
        console.log('Voting session status:', statusData);
        
        if (!statusData.data.isActive) {
            console.log('Voting is not active, displaying no questions state');
            displayNoQuestionsState();
            hideLoading();
            return;
        }
        
        // If voting is active, load questions
        console.log('Fetching questions from server...');
        const response = await fetch(`${MCA.baseURL}/vote/questions`, {
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Questions loaded from server:', data);
            
            // Handle both old and new response formats
            currentQuestions = data.questions || data || [];
            currentQuestionIndex = 0;
            
            console.log(`Loaded ${currentQuestions.length} questions`);
            console.log('First question details:', currentQuestions[0]);
            
            if (currentQuestions.length > 0) {
                displayCurrentUserQuestion();
            } else {
                console.log('No questions available, showing empty state');
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
    console.log('Displaying current question...');
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
        nominees: Array.isArray(question.nominees) ? question.nominees : [],
        userVote: question.userVote || null
    };
    
    console.log('Processing question:', {
        questionId: safeQuestion.id,
        title: safeQuestion.title,
        hasUserVoted: !!safeQuestion.userVote,
        votedFor: safeQuestion.userVote,
        numberOfNominees: safeQuestion.nominees.length
    });

    questionsContainer.innerHTML = `
        <div class="question-container">
            <!-- Question Header -->
            <div class="question-header">
                <div class="question-content">
                    <h1 class="question-title">${safeQuestion.title}</h1>
                    <p class="question-description">${safeQuestion.description}</p>
                </div>
            </div>
            
            <!-- Nominees Grid -->
            <div class="nominees-grid">
                ${safeQuestion.nominees.map(nominee => {
                    const nomineeId = nominee.id || nominee._id;
                    const nomineeName = nominee.name || 'Unknown';
                    const isVoted = safeQuestion.userVote === nomineeId;
                    
                    console.log(`Nominee ${nomineeName}:`, {
                        id: nomineeId,
                        isVoted: isVoted,
                        isClickable: !safeQuestion.userVote
                    });
                    
                    return `
                        <div class="nominee-card ${isVoted ? 'selected' : ''}" 
                             data-nominee-id="${nomineeId}"
                             onclick="${safeQuestion.userVote ? '' : `selectNominee('${safeQuestion.id}', '${nomineeId}')`}"
                             style="${safeQuestion.userVote ? 'cursor: default;' : ''}">
                            <div class="nominee-avatar">
                                <div class="nominee-initial-avatar">${(nominee.name || 'U').charAt(0).toUpperCase()}</div>
                            </div>
                            <div class="nominee-info">
                                <h3 class="nominee-name">${nomineeName}</h3>
                            </div>
                            ${isVoted ? '<div class="selected-indicator">✓ Your Vote</div>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            
            <!-- Submit Button -->
            <div class="vote-button-container">
                <button class="btn btn-primary ${safeQuestion.userVote ? 'btn-disabled' : ''}" 
                        id="submitVoteBtn"
                        onclick="submitCurrentVote()"
                        ${safeQuestion.userVote ? 'disabled' : ''}>
                    ${safeQuestion.userVote ? 'Vote Submitted' : 'Submit Vote'}
                </button>
            </div>

            <!-- Navigation Buttons -->
            <div class="navigation-buttons">
                <button class="nav-btn ${currentQuestionIndex === 0 ? 'disabled' : ''}" 
                        onclick="previousUserQuestion()" 
                        ${currentQuestionIndex === 0 ? 'disabled' : ''}>
                    ← Previous
                </button>
                
                <div class="page-info">
                    <span class="current-num">${currentQuestionIndex + 1}</span>
                    <span class="separator">of</span>
                    <span class="total-num">${currentQuestions.length}</span>
                </div>
                
                <button class="nav-btn ${currentQuestionIndex === currentQuestions.length - 1 ? 'disabled' : ''}" 
                        onclick="nextUserQuestion()" 
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
            .question-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                position: relative;
            }

            .question-header {
                text-align: center;
                margin-bottom: 40px;
                padding-top: 20px;
            }

            .question-content {
                max-width: 800px;
                margin: 0 auto;
            }

            .question-title {
                font-size: 42px;
                font-weight: 500;
                color: #fff;
                margin-bottom: 20px;
                line-height: 1.2;
            }

            .question-description {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.8);
                line-height: 1.5;
            }

            .nominees-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 30px;
                margin: 40px 0;
            }

            .nominee-card {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                border: 2px solid transparent;
            }

            .nominee-card:hover:not(.selected) {
                background: rgba(255, 255, 255, 0.1);
                transform: translateY(-2px);
            }

            .nominee-card.selected {
                border-color: #4CAF50;
                background: rgba(76, 175, 80, 0.15);
                pointer-events: none;
            }

            .nominee-avatar {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                overflow: hidden;
                margin-bottom: 15px;
                background: rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .nominee-initial-avatar {
                font-size: 48px;
                color: white;
                font-weight: 500;
            }

            .nominee-name {
                font-size: 24px;
                color: #fff;
                text-align: center;
                margin: 10px 0;
            }

            .selected-indicator {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #4CAF50;
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 14px;
                font-weight: 500;
            }

            .vote-button-container {
                text-align: center;
                margin: 30px 0;
                display: flex;
                justify-content: center;
            }

            .btn-primary {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 200px;
            }

            .btn-primary:hover:not(.btn-disabled) {
                background: #45a049;
                transform: translateY(-2px);
            }

            .btn-disabled {
                background: #666;
                cursor: not-allowed;
                opacity: 0.7;
            }

            .navigation-buttons {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 20px;
                margin-top: 40px;
                padding: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .nav-btn {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 8px 20px;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 100px;
                font-size: 14px;
            }

            .nav-btn:hover:not(.disabled) {
                border-color: white;
                background: rgba(255, 255, 255, 0.1);
            }

            .nav-btn.disabled {
                opacity: 0.5;
                cursor: not-allowed;
                pointer-events: none;
            }

            .page-info {
                display: flex;
                align-items: center;
                gap: 8px;
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                min-width: 80px;
                justify-content: center;
            }

            .current-num {
                color: white;
                font-weight: 500;
            }
        `;
        document.head.appendChild(styles);
    }
    
    console.log('Question display updated');
}

function selectNominee(questionId, nomineeId) {
    console.log('Selecting nominee:', { questionId, nomineeId });
    
    const question = currentQuestions[currentQuestionIndex];
    if (!question || (question.id || question._id) !== questionId || question.userVote) {
        console.log('Cannot select nominee:', {
            questionMissing: !question,
            wrongQuestion: question && (question.id || question._id) !== questionId,
            alreadyVoted: question?.userVote
        });
        return;
    }
    
    // Remove previous selection
    document.querySelectorAll('.nominee-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection to clicked nominee
    const selectedCard = document.querySelector(`[data-nominee-id="${nomineeId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        console.log('Selected nominee card updated');
    }
    
    // Store the vote
    userVotes[questionId] = nomineeId;
    
    // Enable submit button
    const submitBtn = document.getElementById('submitVoteBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-disabled');
        submitBtn.innerHTML = 'Submit Vote';
        console.log('Submit button enabled');
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
                submitBtn.innerHTML = 'Vote Submitted';
                submitBtn.classList.add('btn-disabled');
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