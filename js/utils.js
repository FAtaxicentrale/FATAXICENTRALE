// Utility functies voor de applicatie

// Debounce functie om het aantal aanroepen te beperken
function debounce(func, wait) {
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

// Eenvoudige cache implementatie
const createCache = (ttl = 3600000, maxItems = 50) => {
  const cache = new Map();
  
  return {
    set: (key, value) => {
      if (!window.appConfig?.cache?.enabled) return;
      
      // Verwijder oudste items als we het maximum bereiken
      if (cache.size >= maxItems) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
      
      cache.set(key, {
        data: value,
        timestamp: Date.now()
      });
    },
    
    get: (key) => {
      if (!window.appConfig?.cache?.enabled) return null;
      
      const item = cache.get(key);
      if (!item) return null;
      
      // Controleer of het item niet is verlopen
      if (Date.now() - item.timestamp > ttl) {
        cache.delete(key);
        return null;
      }
      
      return item.data;
    },
    
    clear: () => cache.clear(),
    
    delete: (key) => cache.delete(key)
  };
};

// Maak een cache instantie aan
const addressCache = createCache(
  window.appConfig?.cache?.ttl || 3600000,
  window.appConfig?.cache?.maxItems || 50
);

// Hulp functie om coördinaten op te halen voor een adres
async function getCoordinates(address) {
  if (!address || address.length < 3) return null;
  
  // Controleer eerst de cache
  const cacheKey = `coords_${address}`.toLowerCase();
  const cached = addressCache.get(cacheKey);
  if (cached) return cached;
  
  try {
    const response = await fetch(
      `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(address)}.json` +
      `?key=${window.appConfig.tomtomApiKey}&limit=1`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('Geen resultaten gevonden');
    }
    
    const { lat, lon } = data.results[0].position;
    const result = { lat, lon, address: data.results[0].address };
    
    // Sla het resultaat op in de cache
    addressCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Fout bij ophalen coördinaten:', error);
    throw error;
  }
}

// Hulp functie om een adres op te halen voor coördinaten
async function getAddressFromCoordinates(lat, lon) {
  const cacheKey = `address_${lat}_${lon}`;
  const cached = addressCache.get(cacheKey);
  if (cached) return cached;
  
  try {
    const response = await fetch(
      `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json` +
      `?key=${window.appConfig.tomtomApiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.addresses || data.addresses.length === 0) {
      throw new Error('Geen adres gevonden voor deze coördinaten');
    }
    
    const address = data.addresses[0].address;
    const formattedAddress = address.freeformAddress || 
      [address.streetName, address.streetNumber, address.municipality]
        .filter(Boolean).join(' ');
    
    const result = {
      formatted: formattedAddress,
      ...address
    };
    
    // Sla het resultaat op in de cache
    addressCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Fout bij ophalen adres:', error);
    throw error;
  }
}

// Exporteer de functies
window.utils = {
  debounce,
  createCache,
  getCoordinates,
  getAddressFromCoordinates,
  addressCache
};
