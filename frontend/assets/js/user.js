// User-specific functionality
let currentQuestions = [];
let currentQuestionIndex = 0;
let userSelections = {}; // For storing selections before submission
let userVotes = {}; // For storing submitted votes
let allSelectionsComplete = false;
let finalVoteSubmitted = false;

// Add these functions at the top of the file
function setFinalVoteSubmitted() {
    localStorage.setItem('finalVoteSubmitted', 'true');
}

function isFinalVoteSubmitted() {
    return localStorage.getItem('finalVoteSubmitted') === 'true';
}

// Load questions for user voting
async function loadUserQuestions() {
    try {
        // Check if voting was already completed
        if (localStorage.getItem('votingCompleted') === 'true') {
            showCongratulationsScreen();
            return;
        }

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

        // First fetch existing votes
        console.log('Fetching existing votes...');
        const votesResponse = await fetch(`${MCA.baseURL}/vote/user-votes`, {
            headers: { 'Authorization': `Bearer ${MCA.token}` }
        });
        
        if (votesResponse.ok) {
            const votesData = await votesResponse.json();
            console.log('Existing votes:', votesData);
            
            // Initialize userVotes from the dedicated votes endpoint
            userVotes = {};
            if (votesData.votes) {
                votesData.votes.forEach(vote => {
                    userVotes[vote.questionId] = vote.nomineeId.toString();
                });
            }
            console.log('Initialized user votes:', userVotes);
        }
        
        // Then fetch questions
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
            
            // Update userVotes with any additional votes from questions response
            currentQuestions.forEach(question => {
                const questionId = question.id || question._id;
                if (question.userVote) {
                    console.log(`Found vote in question ${questionId}:`, question.userVote);
                    userVotes[questionId] = question.userVote.toString();
                }
            });
            
            console.log('Final user votes after merging:', userVotes);
            
            if (currentQuestions.length > 0) {
                // If all questions are already voted, show review screen
                if (areAllVotesComplete()) {
                    showVoteReviewScreen();
                } else {
                    displayCurrentUserQuestion();
                }
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
    const questionsContainer = document.getElementById('votingQuestions');
    
    if (!question || !questionsContainer) {
        console.error('No question or container found');
        return;
    }

    const questionId = question.id || question._id;
    const currentSelection = userSelections[questionId];
    const currentVote = userVotes[questionId];

    const safeQuestion = {
        id: questionId,
        title: question.title || 'Untitled Question',
        description: question.description || '',
        nominees: Array.isArray(question.nominees) ? question.nominees : [],
        userSelection: currentSelection,
        userVote: currentVote
    };

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
                    const nomineeId = (nominee._id || nominee.id).toString();
                    const nomineeName = nominee.name || 'Unknown';
                    
                    const isSelected = safeQuestion.userSelection === nomineeId;
                    const isVoted = safeQuestion.userVote === nomineeId;
                    
                    const cardClasses = [
                        'nominee-card',
                        isSelected ? 'selected' : '',
                        isVoted ? 'voted' : ''
                    ].filter(Boolean).join(' ');
                    
                    return `
                        <div class="${cardClasses}" 
                             data-nominee-id="${nomineeId}"
                             onclick="${isVoted ? '' : `selectNominee('${safeQuestion.id}', '${nomineeId}')`}">
                            <div class="nominee-avatar">
                                ${nominee.image 
                                    ? `<img src="${nominee.image}" alt="${nomineeName}" class="nominee-avatar-img" 
                                       onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                       <div class="nominee-initial-avatar" style="display:none;">
                                           ${(nomineeName || 'U').charAt(0).toUpperCase()}
                                       </div>`
                                    : `<div class="nominee-initial-avatar">
                                           ${(nomineeName || 'U').charAt(0).toUpperCase()}
                                       </div>`
                                }
                            </div>
                            <div class="nominee-info">
                                <h3 class="nominee-name">${nomineeName}</h3>
                            </div>
                            ${isVoted ? '<div class="voted-indicator">✓ Voted</div>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="vote-button-container">
                ${!safeQuestion.userVote ? `
                    <button class="btn btn-submit-vote ${!safeQuestion.userSelection ? 'disabled' : ''}" 
                            id="submitVoteBtn"
                            onclick="submitCurrentVote()"
                            ${!safeQuestion.userSelection ? 'disabled' : ''}>
                        Submit Vote
                    </button>
                ` : ''}
                ${areAllVotesComplete() ? `
                    <button class="btn btn-review" onclick="showVoteReviewScreen()">
                        Review All Votes
                    </button>
                ` : ''}
            </div>

            <div class="navigation-buttons">
                <button class="nav-btn ${currentQuestionIndex === 0 ? 'disabled' : ''}" 
                        onclick="previousUserQuestion()">
                    ← Previous
                </button>
                
                <div class="page-info">
                    <span class="current-num">${currentQuestionIndex + 1}</span>
                    <span class="separator">of</span>
                    <span class="total-num">${currentQuestions.length}</span>
                </div>
                
                <button class="nav-btn ${currentQuestionIndex === currentQuestions.length - 1 ? 'disabled' : ''}" 
                        onclick="nextUserQuestion()">
                    Next →
                </button>
            </div>
        </div>
    `;
}

function selectNominee(questionId, nomineeId) {
    if (userVotes[questionId]) return;
    userSelections[questionId] = nomineeId;
    displayCurrentUserQuestion();
}

async function submitCurrentVote() {
    const question = currentQuestions[currentQuestionIndex];
    const questionId = question.id || question._id;
    const selectedNomineeId = userSelections[questionId];
    
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
            userVotes[questionId] = selectedNomineeId;
            delete userSelections[questionId];
            showToast('Vote submitted successfully!', 'success');
            
            // If this is the last question and all votes are complete, show review
            if (currentQuestionIndex === currentQuestions.length - 1 && areAllVotesComplete()) {
                showVoteReviewScreen();
            } else {
                // Automatically move to next question
                nextUserQuestion();
            }
        } else {
            throw new Error('Failed to submit vote');
        }
    } catch (error) {
        console.error('Error submitting vote:', error);
        showToast('Error submitting vote', 'error');
    } finally {
        hideLoading();
    }
}

function showVoteReviewScreen() {
    const questionsContainer = document.getElementById('votingQuestions');
    
    questionsContainer.innerHTML = `
        <div class="review-screen">
            <h2>Review Your Votes</h2>
            <p>Here are all your submitted votes</p>
            
            <div class="review-list">
                ${currentQuestions.map((question, index) => {
                    const questionId = question.id || question._id;
                    const votedNomineeId = userVotes[questionId];
                    const votedNominee = question.nominees.find(n => 
                        (n._id || n.id).toString() === votedNomineeId
                    );
                    
                    return `
                        <div class="review-item">
                            <div class="review-question">
                                <span class="question-number">${index + 1}</span>
                                <h3>${question.title}</h3>
                            </div>
                            <div class="selected-nominee">
                                ${votedNominee ? `
                                    <div class="nominee-preview">
                                        ${votedNominee.image 
                                            ? `<img src="${votedNominee.image}" alt="${votedNominee.name}" class="nominee-small-img">` 
                                            : `<div class="nominee-small-initial">${votedNominee.name.charAt(0)}</div>`
                                        }
                                        <span>${votedNominee.name}</span>
                                    </div>
                                ` : '<span class="no-selection">No selection</span>'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="final-submit">
                <button class="btn btn-submit-final" onclick="completeVoting()">
                    Complete Voting Process
                </button>
            </div>
        </div>
    `;
}

// Add new function to handle voting completion
async function completeVoting() {
    try {
        showLoading();
        
        // Store completion status in localStorage
        localStorage.setItem('votingCompleted', 'true');
        
        // Show congratulations screen
        showCongratulationsScreen();
    } catch (error) {
        console.error('Error completing voting process:', error);
        showToast('Error completing voting process', 'error');
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

// Add helper function to check if all votes are complete
function areAllVotesComplete() {
    return currentQuestions.every(question => {
        const questionId = question.id || question._id;
        return userVotes[questionId];
    });
}

// Add logout handler to clear voting status on logout
function handleLogout() {
    // Don't clear votingCompleted status as we want to persist it
    // Clear other voting related data
    userSelections = {};
    userVotes = {};
    currentQuestions = [];
    currentQuestionIndex = 0;
    
    // Your existing logout code...
}

function showCongratulationsScreen() {
    const questionsContainer = document.getElementById('votingQuestions');
    
    questionsContainer.innerHTML = `
        <div class="congratulations-screen">
            <div class="celebration-container">
                <div class="confetti-left"></div>
                <div class="confetti-right"></div>
                <div class="success-content">
                    <div class="success-icon">🎉</div>
                    <h2>Congratulations!</h2>
                    <p>Your votes have been successfully submitted for</p>
                    <p class="award-title">Marmetian's Choice Awards 2025</p>
                    <p class="thank-you">Thank you for participating</p>
                </div>
            </div>
        </div>
    `;
}