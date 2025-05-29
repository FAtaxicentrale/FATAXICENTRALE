// Configuratie voor de applicatie
window.appConfig = {
  // TomTom API sleutel
  tomtomApiKey: 'fLy6nvAxRi3ACx2G69Q9fHabDwHz80fe',
  
  // API basis URL
  apiBaseUrl: window.location.hostname === 'fataxi.github.io' 
    ? 'https://yolo-n9xa.onrender.com' 
    : '',
    
  // Instellingen voor geolocatie
  geolocationOptions: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  },
  
  // Instellingen voor adressuggesties
  addressSuggestions: {
    minLength: 3,
    limit: 5,
    countrySet: 'NL',
    typeahead: true
  },
  
  // Cache instellingen
  cache: {
    enabled: true,
    ttl: 3600000, // 1 uur in milliseconden
    maxItems: 50
  }
};
