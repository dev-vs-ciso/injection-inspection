// Site-specific JavaScript for SecureBank Pro

// Security training utilities
window.SecurityTraining = {
    highlightVulnerability: function(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('vulnerable-content');
            if (message) {
                element.title = message;
            }
        }
    },
    
    showSecurityAlert: function(message, type = 'warning') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        const container = document.querySelector('.container main');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
        }
    }
};

// Auto-dismiss alerts after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    const alerts = document.querySelectorAll('.alert-dismissible');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
});

// Form validation for security training
document.addEventListener('DOMContentLoaded', function() {
    // Highlight potential SQL injection patterns in forms
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
    inputs.forEach(function(input) {
        input.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            const sqlPatterns = ["'", '"', 'or ', 'and ', 'union ', 'select ', 'drop ', 'insert ', 'update ', 'delete '];
            
            if (sqlPatterns.some(pattern => value.includes(pattern))) {
                this.classList.add('border-warning');
                this.title = 'Potential SQL injection pattern detected (for educational purposes)';
            } else {
                this.classList.remove('border-warning');
                this.title = '';
            }
        });
    });
});

// Transaction search enhancements
if (window.location.pathname.includes('/Transaction/Search')) {
    document.addEventListener('DOMContentLoaded', function() {
        const searchTypeSelect = document.getElementById('searchType');
        if (searchTypeSelect) {
            searchTypeSelect.addEventListener('change', function() {
                if (this.value === 'advanced') {
                    SecurityTraining.showSecurityAlert(
                        '⚠️ Advanced search mode uses direct SQL queries and may be vulnerable to injection attacks.',
                        'warning'
                    );
                }
            });
        }
    });
}