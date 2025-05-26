// Utility functies voor de applicatie
const utils = {
  formatPrice: function(amount) {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  },

  formatDate: function(date) {
    return new Date(date).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  debounce: function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  validateEmail: function(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },

  validatePhone: function(phone) {
    const re = /^[0-9\s+\-()]{10,20}$/;
    return re.test(phone);
  },

  showError: function(element, message) {
    // Verwijder bestaande foutmelding
    this.clearError(element);
    
    // Voeg error class toe
    element.classList.add('error');
    
    // Maak foutmelding element
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    // Voeg toe na het input element
    element.parentNode.insertBefore(errorElement, element.nextSibling);
  },

  clearError: function(element) {
    // Verwijder error class
    element.classList.remove('error');
    
    // Verwijder eventuele bestaande foutmelding
    const errorElement = element.parentNode.querySelector('.error-message');
    if (errorElement) {
      errorElement.remove();
    }
  }
};

// Maak utils beschikbaar in het globale bereik
if (typeof window !== 'undefined') {
  window.utils = utils;
}
