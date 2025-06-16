import validEmails from '../config/validEmails.js';

// Validate email against valid email list
export const validateEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    
    // Convert email to lowercase and check if it's in the valid list
    return validEmails.includes(email.toLowerCase());
};

// Validate password strength
export const validatePassword = (password) => {
    if (!password || typeof password !== 'string') return false;
    
    // Password must be at least 8 characters long and contain:
    // - At least one uppercase letter
    // - At least one lowercase letter
    // - At least one number
    // - At least one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

// Check if voting is active for a question
export const isVotingActive = (question) => {
    if (!question || !question.startTime || !question.endTime) return false;

    const now = new Date();
    const start = new Date(question.startTime);
    const end = new Date(question.endTime);

    return (
        question.isActive &&
        start instanceof Date && !isNaN(start) &&
        end instanceof Date && !isNaN(end) &&
        now >= start && now <= end
    );
};

// Validate nominees data
export const validateNominees = (nominees) => {
    if (!Array.isArray(nominees) || nominees.length === 0) {
        return false;
    }

    return nominees.every(nominee => {
        return (
            nominee &&
            typeof nominee === 'object' &&
            typeof nominee.name === 'string' && nominee.name.trim().length > 0 &&
            typeof nominee.department === 'string' && nominee.department.trim().length > 0
        );
    });
};

// Validate date range
export const validateDateRange = (startTime, endTime) => {
    if (!startTime || !endTime) return false;

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (!(start instanceof Date) || isNaN(start) ||
        !(end instanceof Date) || isNaN(end)) {
        return false;
    }

    // Ensure minimum 3-hour voting window
    const minVotingWindow = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
    const votingWindow = end.getTime() - start.getTime();

    return (
        start < end &&
        start >= now &&
        votingWindow >= minVotingWindow
    );
}; 