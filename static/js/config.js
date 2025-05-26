// Configuratie voor de applicatie
export const config = {
  apiUrl: 'https://api.example.com',
  mapbox: {
    accessToken: 'your_mapbox_access_token',
    style: 'mapbox://styles/mapbox/streets-v11'
  },
  defaultLanguage: 'nl',
  supportedLanguages: ['nl', 'en', 'fr', 'de', 'es', 'it', 'pl', 'pt', 'ar', 'tr'],
  payment: {
    ideal: {
      issuer: 'ideal_INGBNL2A', // Voorbeeld bank
      amount: 0, // Wordt dynamisch ingesteld
      description: 'Taxirit',
      redirectUrl: window.location.origin + '/betaalstatus.html'
    }
  },
  validation: {
    minNameLength: 2,
    maxNameLength: 100,
    phonePattern: /^[0-9\s+\-()]{10,20}$/,
    emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
};
