// User-specific functionality
let currentQuestions = [];
let currentQuestionIndex = 0;
let userVotes = {};
let allSelectionsComplete = false;
let finalVoteSubmitted = false;

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
                displayCurrentUserQuestion();
            } else {
                console.log('No questions available, showing empty state');
                displayNoQuestionsState();
            }
        } else {
            throw new Error('Failed to load questions');
        }

        if (finalVoteSubmitted) {
            showCongratulationsScreen();
            return;
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
        userVote: currentVote ? currentVote.toString() : null
    };
    
    console.log('Question Processing:', JSON.stringify({
        questionId: safeQuestion.id,
        title: safeQuestion.title,
        hasUserVoted: !!safeQuestion.userVote,
        votedFor: safeQuestion.userVote,
        numberOfNominees: safeQuestion.nominees.length
    }, null, 2));

    // Add voting progress indicator
    const votedCount = Object.keys(userVotes).length;
    const totalQuestions = currentQuestions.length;
    
    questionsContainer.innerHTML = `
        <div class="question-container">
            <div class="voting-progress">
                <span class="progress-text">
                    ${votedCount} of ${totalQuestions} questions voted
                </span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(votedCount/totalQuestions) * 100}%"></div>
                </div>
            </div>
            
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
                    
                    // Check if this nominee was voted for
                    const isVoted = safeQuestion.userVote && nomineeId === safeQuestion.userVote;
                    
                    console.log(`Nominee "${nomineeName}" Details:`, {
                        nomineeId,
                        isVoted,
                        userVote: safeQuestion.userVote,
                        comparison: `${nomineeId} === ${safeQuestion.userVote}`
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
                                ${
        nominee.image
        ? `<img src="${nominee.image}" alt="${nomineeName}" class="nominee-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
        : `<div class="nominee-initial-avatar">${(nomineeName || 'U').charAt(0).toUpperCase()}</div>`
    }
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
                <button class="btn btn-submit-vote ${safeQuestion.userVote ? 'disabled' : ''}" 
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
                
                <button class="nav-btn ${currentQuestionIndex === currentQuestions.length - 1 ? 
                    (areAllVotesComplete() ? '' : 'disabled') : ''}" 
                        onclick="${currentQuestionIndex === currentQuestions.length - 1 ? 
                            'submitCurrentVote()' : 'nextUserQuestion()'}" 
                        ${currentQuestionIndex === currentQuestions.length - 1 && !areAllVotesComplete() ? 'disabled' : ''}>
                    ${currentQuestionIndex === currentQuestions.length - 1 ? 'Review Votes' : 'Next →'}
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

    // If this is the last question, check if all questions have votes
    if (currentQuestionIndex === currentQuestions.length - 1) {
        // Check for any unvoted questions
        const unvotedQuestions = currentQuestions.filter(q => {
            const qId = q.id || q._id;
            return !userVotes[qId];
        });
        
        if (unvotedQuestions.length > 0) {
            // Calculate first unvoted question index
            const firstUnvotedIndex = currentQuestions.findIndex(q => {
                const qId = q.id || q._id;
                return !userVotes[qId];
            });
            
            showToast('Please vote on all questions before proceeding to review', 'warning');
            
            // Navigate to the first unvoted question
            if (firstUnvotedIndex !== -1) {
                currentQuestionIndex = firstUnvotedIndex;
                displayCurrentUserQuestion();
            }
            return;
        }
        
        // If all questions have votes, show review screen
        showVoteReviewScreen();
        return;
    }

    // Move to next question automatically
    nextUserQuestion();
}

// Add helper function to check if all votes are complete
function areAllVotesComplete() {
    return currentQuestions.every(question => {
        const questionId = question.id || question._id;
        return userVotes[questionId];
    });
}

function showVoteReviewScreen() {
    const questionsContainer = document.getElementById('votingQuestions');
    
    let reviewHTML = `
        <div class="review-screen">
            <h2>Review Your Votes</h2>
            <p>Please review your selections before final submission</p>
            
            <div class="review-list">
                ${currentQuestions.map((question, index) => {
                    const questionId = question.id || question._id;
                    const selectedNomineeId = userVotes[questionId];
                    const selectedNominee = question.nominees.find(n => 
                        (n._id || n.id).toString() === selectedNomineeId
                    );
                    
                    return `
                        <div class="review-item">
                            <div class="review-question">
                                <span class="question-number">${index + 1}</span>
                                <h3>${question.title}</h3>
                            </div>
                            <div class="selected-nominee">
                                ${selectedNominee ? `
                                    <div class="nominee-preview">
                                        ${selectedNominee.image 
                                            ? `<img src="${selectedNominee.image}" alt="${selectedNominee.name}" class="nominee-small-img">` 
                                            : `<div class="nominee-small-initial">${selectedNominee.name.charAt(0)}</div>`
                                        }
                                        <span>${selectedNominee.name}</span>
                                    </div>
                                ` : '<span class="no-selection">No selection</span>'}
                            </div>
                            <button class="btn-edit" onclick="editVote(${index})">Edit</button>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="final-submit">
                <button class="btn btn-submit-vote" onclick="submitFinalVotes()">
                    Submit All Votes
                </button>
            </div>
        </div>
    `;
    
    questionsContainer.innerHTML = reviewHTML;
}

function editVote(questionIndex) {
    currentQuestionIndex = questionIndex;
    displayCurrentUserQuestion();
}

async function submitFinalVotes() {
    try {
        showLoading();
        
        // Check if all questions have votes
        const unvotedQuestions = currentQuestions.filter(q => {
            const questionId = q.id || q._id;
            return !userVotes[questionId];
        });
        
        if (unvotedQuestions.length > 0) {
            showToast('Please vote on all questions before final submission', 'error');
            return;
        }
        
        // Submit all votes
        const votePromises = currentQuestions.map(question => {
            const questionId = question.id || question._id;
            const nomineeId = userVotes[questionId];
            
            return fetch(`${MCA.baseURL}/vote/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MCA.token}`
                },
                body: JSON.stringify({
                    questionId: questionId,
                    nomineeId: nomineeId
                })
            });
        });
        
        await Promise.all(votePromises);
        
        // Show success message
        showCongratulationsScreen();
        finalVoteSubmitted = true;
        
    } catch (error) {
        console.error('Error submitting votes:', error);
        showToast('Error submitting votes', 'error');
    } finally {
        hideLoading();
    }
}

function showCongratulationsScreen() {
    const questionsContainer = document.getElementById('votingQuestions');
    
    questionsContainer.innerHTML = `
        <div class="congratulations-screen">
            <div class="success-icon">🎉</div>
            <h2>Congratulations!</h2>
            <p>Your votes have been successfully submitted for MCA 2025.</p>
            <p>Thank you for participating!</p>
        </div>
    `;
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
    } else if (areAllVotesComplete()) {
        showVoteReviewScreen();
    } else {
        showToast('Please vote on all questions before proceeding to review', 'warning');
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