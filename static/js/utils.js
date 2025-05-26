// Utility functies voor de applicatie

export function formatPrice(amount) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export function validatePhone(phone) {
  const re = /^[0-9\s+\-()]{10,20}$/;
  return re.test(phone);
}

export function showError(element, message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  
  // Verwijder bestaande foutmeldingen
  const existingError = element.parentNode.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }
  
  element.classList.add('error');
  element.parentNode.insertBefore(errorDiv, element.nextSibling);
}

export function clearError(element) {
  element.classList.remove('error');
  const errorMessage = element.parentNode.querySelector('.error-message');
  if (errorMessage) {
    errorMessage.remove();
  }
}
