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
            
            // Pre-populate userVotes object with existing votes
            userVotes = {};
            
            // Map existing votes from the questions response
            currentQuestions.forEach(question => {
                const questionId = question.id || question._id;
                if (question.userVote) {
                    console.log(`Found vote for question ${questionId}:`, question.userVote);
                    userVotes[questionId] = question.userVote;
                }
            });
            
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
    console.log('\n=== Displaying Question ===');
    const question = currentQuestions[currentQuestionIndex];
    const questionsContainer = document.getElementById('votingQuestions') || document.getElementById('userQuestions');
    
    if (!question || !questionsContainer) {
        console.error('No question or container found');
        return;
    }

    const questionId = question.id || question._id;
    const currentVote = question.userVote || userVotes[questionId];

    console.log('Question Vote Details:', {
        questionId: questionId,
        title: question.title,
        userVoteFromQuestion: question.userVote,
        userVoteFromStore: userVotes[questionId],
        finalVoteUsed: currentVote,
        nominees: question.nominees.map(n => ({
            id: n._id || n.id,
            name: n.name
        }))
    });

    // Safe access to question properties
    const safeQuestion = {
        id: questionId,
        title: question.title || 'Untitled Question',
        description: question.description || '',
        nominees: Array.isArray(question.nominees) ? question.nominees : [],
        userVote: currentVote
    };
    
    console.log('Question Processing:', JSON.stringify({
        questionId: safeQuestion.id,
        title: safeQuestion.title,
        hasUserVoted: !!safeQuestion.userVote,
        votedFor: safeQuestion.userVote,
        numberOfNominees: safeQuestion.nominees.length
    }, null, 2));

    questionsContainer.innerHTML = `
        <div class="question-container">
            <div class="question-header">
                <div class="question-content">
                    <h1 class="question-title">${safeQuestion.title}</h1>
                    <p class="question-description">${safeQuestion.description}</p>
                </div>
            </div>
            
            <div class="nominees-grid">
                ${safeQuestion.nominees.map(nominee => {
                    const nomineeId = nominee._id || nominee.id;
                    const nomineeName = nominee.name || 'Unknown';
                    
                    // Check if this nominee was voted for
                    const isVoted = safeQuestion.userVote && 
                        (nomineeId === safeQuestion.userVote || 
                         nomineeId.toString() === safeQuestion.userVote.toString());
                    
                    console.log(`Nominee "${nomineeName}" Details:`, {
                        nomineeId,
                        isVoted,
                        userVote: safeQuestion.userVote,
                        comparison: {
                            nomineeId,
                            userVote: safeQuestion.userVote,
                            matches: isVoted,
                            stringComparison: `${nomineeId.toString()} === ${safeQuestion.userVote?.toString()}`
                        }
                    });
                    
                    const cardClasses = [
                        'nominee-card',
                        isVoted ? 'selected' : '',
                        safeQuestion.userVote ? 'voted' : ''
                    ].filter(Boolean).join(' ');
                    
                    return `
                        <div class="${cardClasses}" 
                             data-nominee-id="${nomineeId}"
                             data-voted="${isVoted}"
                             onclick="${safeQuestion.userVote ? '' : `selectNominee('${safeQuestion.id}', '${nomineeId}')`}">
                            <div class="nominee-avatar">
                                <div class="nominee-initial-avatar">${(nomineeName || 'U').charAt(0).toUpperCase()}</div>
                            </div>
                            <div class="nominee-info">
                                <h3 class="nominee-name">${nomineeName}</h3>
                            </div>
                            ${isVoted ? '<div class="selected-indicator">✓ Your Vote</div>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="vote-button-container">
                <button class="btn btn-primary btn-submit-vote ${safeQuestion.userVote ? 'disabled' : ''}" 
                        id="submitVoteBtn"
                        onclick="submitCurrentVote()"
                        ${safeQuestion.userVote ? 'disabled' : ''}>
                    ${safeQuestion.userVote ? 'Vote Submitted' : 'Submit Vote'}
                </button>
            </div>

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
    
    // Double check the selected state after rendering
    const selectedNominee = document.querySelector('.nominee-card.selected');
    console.log('Selected nominee after render:', selectedNominee ? {
        id: selectedNominee.dataset.nomineeId,
        voted: selectedNominee.dataset.voted,
        classes: selectedNominee.className
    } : 'None');
    
    console.log('=== Question Display Updated ===\n');
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
    
    // Enable submit button if not already voted
    const submitBtn = document.getElementById('submitVoteBtn');
    if (submitBtn && !question.userVote) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('disabled');
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
            // Update the current question's userVote
            question.userVote = selectedNomineeId;
            
            // Trigger celebration background effect
            if (window.userBackground) {
                window.userBackground.celebrateVote();
            }
            
            showToast('Vote submitted successfully!', 'success');
            
            // Update the UI
            const submitBtn = document.getElementById('submitVoteBtn');
            if (submitBtn) {
                submitBtn.innerHTML = 'Vote Submitted';
                submitBtn.classList.add('disabled');
                submitBtn.disabled = true;
            }
            
            // Add voted class to all nominee cards
            document.querySelectorAll('.nominee-card').forEach(card => {
                card.classList.add('voted');
            });
            
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