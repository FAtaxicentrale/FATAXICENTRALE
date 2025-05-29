// Eenvoudige versie van security.js voor browser gebruik
const SECURITY_CONFIG = {
  app: {
    apiBaseUrl: window.location.origin,
    secret: 'tijdelijke_geheime_sleutel', // Vervang dit door een veilige sleutel in productie
    env: 'development'
  },
  api: {
    timeout: 30000 // 30 seconden timeout
  }
};

// Exporteer de configuratie
if (typeof module !== 'undefined' && module.exports) {
  // Node.js omgeving
  module.exports = { SECURITY_CONFIG };
} else {
  // Browser omgeving
  window.SECURITY_CONFIG = SECURITY_CONFIG;
}
