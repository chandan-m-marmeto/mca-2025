// Authentication-specific functions

function validateEmail(email) {
    const re = /^[^\s@]+@marmeto\.com$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

// Real-time email validation
document.addEventListener('DOMContentLoaded', function() {
    const loginEmail = document.getElementById('loginEmail');
    const registerEmail = document.getElementById('registerEmail');
    
    if (loginEmail) {
        loginEmail.addEventListener('input', function() {
            if (this.value && !validateEmail(this.value)) {
                this.style.borderColor = '#ef4444';
                showEmailError(this, 'Please use your @marmeto.com email');
            } else {
                this.style.borderColor = '#e5e7eb';
                hideEmailError(this);
            }
        });
    }
    
    if (registerEmail) {
        registerEmail.addEventListener('input', function() {
            if (this.value && !validateEmail(this.value)) {
                this.style.borderColor = '#ef4444';
                showEmailError(this, 'Please use your @marmeto.com email');
            } else {
                this.style.borderColor = '#e5e7eb';
                hideEmailError(this);
            }
        });
    }
});

function showEmailError(input, message) {
    let errorEl = input.parentNode.querySelector('.email-error');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'email-error';
        errorEl.style.cssText = 'color: #ef4444; font-size: 0.875rem; margin-top: 0.25rem;';
        input.parentNode.appendChild(errorEl);
    }
    errorEl.textContent = message;
}

function hideEmailError(input) {
    const errorEl = input.parentNode.querySelector('.email-error');
    if (errorEl) {
        errorEl.remove();
    }
}