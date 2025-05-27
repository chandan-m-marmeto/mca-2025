import { api } from './app.js';

export function initVoting() {
    console.group('Voting Interface Initialization');
    console.log('🚀 Initializing voting interface...'); // Debug log
    
    // Check authentication first
    if (!api.isAuthenticated()) {
        console.log('❌ User not authenticated, skipping voting interface initialization');
        console.groupEnd();
        return;
    }
    
    // Initialize state
    let currentQuestionIndex = 0;
    let questions = [];

    // Get the container
    const votingSection = document.getElementById('voting-section');
    console.log('📍 Voting section element:', votingSection); // Debug element

    if (!votingSection) {
        console.error('❌ Voting section not found');
        console.groupEnd();
        return;
    }

    // Show the voting section and hide auth section
    document.getElementById('auth-section').classList.add('hidden');
    votingSection.classList.remove('hidden');
    console.log('🎯 Removed hidden class from voting section');

    // Initialize voting section
    console.log('🔄 Setting up voting section HTML structure');
    votingSection.innerHTML = `
        <div class="vote-container">
            <div class="vote-content">
                <h2 class="page-title">Vote for Your Colleagues</h2>
                <div class="questions-container">
                    <div class="voting-content">
                        <div class="questions-list"></div>
                        <div class="pagination-controls">
                            <button class="pagination-btn prev" title="Previous Question">
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <span class="pagination-info">Question <span id="current-question">1</span> of <span id="total-questions">1</span></span>
                            <button class="pagination-btn next" title="Next Question">
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    console.log('✅ Voting section HTML structure set up');

    // Add pagination event listeners
    const prevBtn = document.querySelector('.pagination-btn.prev');
    const nextBtn = document.querySelector('.pagination-btn.next');
    console.log('📍 Pagination buttons:', { prevBtn, nextBtn }); // Debug elements

    prevBtn.addEventListener('click', () => {
        console.log('⬅️ Previous button clicked, current index:', currentQuestionIndex);
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderCurrentQuestion();
        }
    });

    nextBtn.addEventListener('click', () => {
        console.log('➡️ Next button clicked, current index:', currentQuestionIndex);
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            renderCurrentQuestion();
        }
    });

    // Load active questions
    loadActiveQuestions();

    async function loadActiveQuestions() {
        console.group('Loading Active Questions');
        try {
            console.log('🔄 Fetching active questions from API...');
            const response = await api.fetch('/api/vote/questions', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📦 API Response:', response); // Debug response
            
            if (!response) {
                throw new Error('No response from server');
            }

            // The response is the array directly, not wrapped in a data property
            if (!Array.isArray(response)) {
                console.error('❌ Invalid response format - expected array:', response);
                throw new Error('Invalid response format: expected an array');
            }

            questions = response;
            console.log('📝 Loaded questions:', questions); // Debug questions
            
            if (questions.length > 0) {
                console.log('🎯 Questions available, rendering first question...');
                currentQuestionIndex = 0;
                await renderCurrentQuestion();
            } else {
                console.log('ℹ️ No questions available');
                showNoQuestionsMessage();
            }
        } catch (error) {
            console.error('❌ Failed to load questions:', error);
            showError(`Failed to load questions: ${error.message}`);
            showNoQuestionsMessage();
        } finally {
            console.groupEnd();
        }
    }

    async function renderCurrentQuestion() {
        console.group('Rendering Current Question');
        const questionsList = document.querySelector('.questions-list');
        console.log('📍 Questions list element:', questionsList); // Debug element

        if (!questionsList) {
            console.error('❌ Questions list element not found');
            console.groupEnd();
            return;
        }

        const currentQuestion = questions[currentQuestionIndex];
        console.log('📝 Current question data:', currentQuestion); // Debug current question

        if (!currentQuestion) {
            console.log('ℹ️ No current question to render');
            showNoQuestionsMessage();
            console.groupEnd();
            return;
        }

        try {
            // Ensure nominees is an array and has required properties
            const nominees = Array.isArray(currentQuestion.nominees) ? currentQuestion.nominees : [];
            console.log('👥 Processed nominees:', nominees); // Debug processed nominees

            console.log('🎨 Rendering question HTML structure');
            const questionHtml = `
                <div class="question-card">
                    <div class="question-header">
                        <h3>${currentQuestion.title || 'Untitled Question'}</h3>
                        <span class="time-info">Ends: ${formatDate(currentQuestion.endTime || currentQuestion.endDate)}</span>
                    </div>
                    <p class="question-description">${currentQuestion.description || 'No description available'}</p>
                    <form class="vote-form" data-question-id="${currentQuestion._id}" onsubmit="return false;">
                        <div class="nominees-list">
                            ${nominees.map((nominee, index) => {
                                console.log(`👤 Rendering nominee ${index + 1}:`, nominee); // Debug each nominee
                                return `
                                    <div class="nominee-option">
                                        <input type="radio" 
                                            name="vote" 
                                            id="nominee-${nominee._id}" 
                                            value="${nominee._id}">
                                        <label for="nominee-${nominee._id}" class="nominee-label">
                                            <div class="nominee-info">
                                                <span class="nominee-name">${nominee.name || 'Unnamed Nominee'}</span>
                                                <span class="nominee-department">${nominee.department || 'No Department'}</span>
                                            </div>
                                        </label>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <button type="submit" class="btn-primary submit-vote">
                            Submit Vote
                        </button>
                    </form>
                </div>
            `;

            questionsList.innerHTML = questionHtml;
            console.log('✅ Question HTML rendered');

            // Add submit handler
            const form = questionsList.querySelector('.vote-form');
            if (form) {
                form.addEventListener('submit', handleVoteSubmit);
                console.log('✅ Vote form submit handler attached');
            }

            // Update pagination
            updatePaginationControls();
            console.log('✅ Pagination controls updated');
        } catch (error) {
            console.error('❌ Error rendering question:', error);
            showError('Failed to render question');
        } finally {
            console.groupEnd();
        }
    }

    function updatePaginationControls() {
        const prevBtn = document.querySelector('.pagination-btn.prev');
        const nextBtn = document.querySelector('.pagination-btn.next');
        const currentQuestionSpan = document.getElementById('current-question');
        const totalQuestionsSpan = document.getElementById('total-questions');

        if (!questions.length) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            currentQuestionSpan.textContent = '0';
            totalQuestionsSpan.textContent = '0';
            return;
        }

        currentQuestionSpan.textContent = (currentQuestionIndex + 1).toString();
        totalQuestionsSpan.textContent = questions.length.toString();

        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.disabled = currentQuestionIndex === questions.length - 1;
    }

    function showNoQuestionsMessage() {
        const questionsList = document.querySelector('.questions-list');
        if (questionsList) {
            questionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>No active questions available at the moment.</p>
                    <p class="sub-text">Please check back later!</p>
                </div>
            `;
        }
        updatePaginationControls();
    }

    function showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    function showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'No end date set';
        try {
            return new Date(dateStr).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    }

    async function handleVoteSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const questionId = form.dataset.questionId;
        const selectedInput = form.querySelector('input[name="vote"]:checked');

        if (!selectedInput) {
            showError('Please select a nominee to vote.');
            return;
        }

        const nomineeId = selectedInput.value;
        submitBtn.disabled = true;

        try {
            console.log('Submitting vote:', { questionId, nomineeId }); // Debug log
            const response = await api.fetch('/api/vote/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionId,
                    nomineeId
                })
            });

            console.log('Vote response:', response); // Debug log

            if (response && response.message) {
                showSuccess(response.message || 'Vote submitted successfully!');
                
                // Move to next question if available
                if (currentQuestionIndex < questions.length - 1) {
                    currentQuestionIndex++;
                    renderCurrentQuestion();
                } else {
                    renderCurrentQuestion(); // Re-render current question to show voted state
                }
            } else {
                throw new Error(response?.error || 'Failed to submit vote');
            }
        } catch (error) {
            console.error('Failed to submit vote:', error);
            showError(error.message || 'Failed to submit vote. Please try again.');
        } finally {
            submitBtn.disabled = false;
        }
    }
} 