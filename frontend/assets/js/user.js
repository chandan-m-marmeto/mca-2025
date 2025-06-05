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
            console.log('API Response:', data);
            console.log('MCA Config:', MCA);
            
            // Handle both old and new response formats
            currentQuestions = data.questions || data || [];
            currentQuestionIndex = 0;
            
            if (currentQuestions.length > 0) {
                console.log('First Question:', currentQuestions[0]);
                console.log('First Nominee:', currentQuestions[0].nominees[0]);
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
        nominees: Array.isArray(question.nominees) ? question.nominees : []
    };
    
    const hasVoted = userVotes[safeQuestion.id];
    
    // Debug nominee data
    console.log('Current Question:', question);
    console.log('Safe Question:', safeQuestion);
    safeQuestion.nominees.forEach((nominee, index) => {
        console.log(`Nominee ${index}:`, nominee);
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
                    
                    // Debug each nominee as we process it
                    console.log('Processing nominee:', {
                        id: nomineeId,
                        name: nomineeName,
                        image: nominee.image,
                        fullData: nominee
                    });
                    
                    // Try different URL formats
                    const imageUrl = nominee.image;
                    const fullImageUrl = `${MCA.staticURL}${nominee.image}`;
                    const alternateUrl = `${MCA.baseURL}/uploads/nominees/${nomineeId}.jpeg`;
                    
                    console.log('Attempting image URLs:', {
                        relative: imageUrl,
                        full: fullImageUrl,
                        alternate: alternateUrl
                    });
                    
                    return `
                        <div class="nominee-card ${hasVoted === nomineeId ? 'selected' : ''}" 
                             data-nominee-id="${nomineeId}"
                             onclick="selectNominee('${safeQuestion.id}', '${nomineeId}')">
                            <div class="nominee-avatar">
                                <img src="${imageUrl}" 
                                     alt="${nominee.name}" 
                                     class="nominee-avatar-img"
                                     data-full-url="${fullImageUrl}"
                                     data-alt-url="${alternateUrl}"
                                     onerror="tryAlternateImageUrls(this, '${nomineeName}')">
                            </div>
                            <div class="nominee-info">
                                <h3 class="nominee-name">${nomineeName}</h3>
                            </div>
                            ${hasVoted === nomineeId ? '<div class="selected-indicator">✓</div>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            
            <!-- Submit Button -->
            <div class="vote-button-container">
                <button class="btn btn-primary ${hasVoted ? 'btn-disabled' : ''}" 
                        id="submitVoteBtn"
                        onclick="submitCurrentVote()"
                        ${hasVoted ? 'disabled' : ''}>
                    ${hasVoted ? 'Vote Submitted' : 'Submit Vote'}
                </button>
            </div>

            <!-- Navigation Buttons -->
            <div class="navigation-buttons">
                <button class="nav-btn ${currentQuestionIndex === 0 ? 'disabled' : ''}" 
                        onclick="previousUserQuestion()" 
                        ${currentQuestionIndex === 0 ? 'disabled' : ''}>
                    ← Previous
                </button>
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

            .nominee-card:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .nominee-card.selected {
                border-color: #fff;
                background: rgba(255, 255, 255, 0.15);
            }

            .nominee-avatar {
                width: 200px;
                height: 200px;
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 15px;
                background: rgba(255, 255, 255, 0.1);
            }

            .nominee-avatar-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
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
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
            }

            .vote-button-container {
                text-align: center;
                margin: 30px 0;
            }

            .btn-primary {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.3s ease;
            }

            .btn-primary:hover:not(.btn-disabled) {
                background: #45a049;
            }

            .btn-disabled {
                background: #666;
                cursor: not-allowed;
            }

            .navigation-buttons {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin-top: 20px;
            }

            .nav-btn {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 8px 20px;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .nav-btn:hover:not(.disabled) {
                border-color: white;
            }

            .nav-btn.disabled {
                opacity: 0.5;
                cursor: not-allowed;
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
        submitBtn.innerHTML = 'Submit Vote';
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

// Handle image loading errors
function handleImageError(img, nomineeName) {
    console.error('Failed to load image for nominee:', nomineeName, 'URL:', img.src);
    
    // Set a default avatar or placeholder
    img.src = `${MCA.staticURL}/assets/images/default-avatar.png`;
    img.onerror = null; // Prevent infinite error loop if default image also fails
    
    // Add a class to style the failed image container
    img.parentElement.classList.add('image-load-failed');
}

function tryAlternateImageUrls(img, nomineeName) {
    console.log('Image load failed for:', nomineeName);
    console.log('Current URL:', img.src);
    console.log('Full URL:', img.dataset.fullUrl);
    console.log('Alternate URL:', img.dataset.altUrl);

    // If we're using the relative URL, try the full URL
    if (!img.src.startsWith('http')) {
        console.log('Trying full URL...');
        img.src = img.dataset.fullUrl;
        return;
    }

    // If full URL failed, try alternate URL
    if (img.src === img.dataset.fullUrl) {
        console.log('Trying alternate URL...');
        img.src = img.dataset.altUrl;
        return;
    }

    // If all URLs failed, use default avatar
    console.error('All image URLs failed for nominee:', nomineeName);
    img.src = '/assets/images/default-avatar.jpg';
    img.onerror = null; // Prevent infinite error loop
    img.parentElement.classList.add('image-load-failed');
}