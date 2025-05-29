import { SECURITY_CONFIG } from '../../config/security.js';

class LocationService {
  constructor() {
    this.config = SECURITY_CONFIG.tomtom;
    this.cache = new Map();
  }

  /**
   * Haal coördinaten op voor een adres
   * @param {string} address - Het adres om te geocoden
   * @returns {Promise<{lat: number, lon: number}>} De coördinaten van het adres
   */
  async getCoordinates(address) {
    if (!address) {
      throw new Error('Adres is verplicht');
    }

    // Controleer cache eerst
    const cacheKey = `coords_${address.toLowerCase().trim()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Verwijder speciale tekens en codeer het adres
      const cleanedAddress = encodeURIComponent(
        address.replace(/[^a-zA-Z0-9 ]/g, '').trim()
      );
      
      const url = `${this.config.baseUrl}${this.config.endpoints.geocode}/${cleanedAddress}.json?key=${this.config.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`TomTom API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error('Geen resultaten gevonden voor dit adres');
      }
      
      const { lat, lon } = data.results[0].position;
      const result = { lat, lon };
      
      // Sla op in cache
      this.cache.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('Fout bij ophalen coördinaten:', error);
      throw new Error('Kon locatiegegevens niet ophalen. Controleer het adres en probeer het opnieuw.');
    }
  }

  /**
   * Bereken de route tussen meerdere punten
   * @param {Array<{lat: number, lon: number}>} waypoints - Lijst van waypoints
   * @returns {Promise<{distance: number, duration: number, route: Array}>} Routedetails
   */
  async calculateRoute(waypoints) {
    if (!waypoints || waypoints.length < 2) {
      throw new Error('Minstens twee waypoints zijn vereist');
    }

    try {
      // Maak een string van alle waypoints
      const waypointsStr = waypoints
        .map(wp => `${wp.lon},${wp.lat}`)
        .join(':');
      
      const url = `${
        this.config.baseUrl
      }${
        this.config.endpoints.route
      }/${waypointsStr}/json?key=${this.config.apiKey}&traffic=true`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`TomTom API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error('Geen route gevonden');
      }
      
      const route = data.routes[0];
      
      return {
        distance: route.summary.lengthInMeters / 1000, // km
        duration: route.summary.travelTimeInSeconds / 60, // minuten
        route: route.legs
      };
      
    } catch (error) {
      console.error('Fout bij berekenen route:', error);
      throw new Error('Kon de route niet berekenen. Probeer het opnieuw.');
    }
  }

  /**
   * Haal verkeersinformatie op voor een locatie
   * @param {{lat: number, lon: number}} location - De locatie om verkeer voor te controleren
   * @returns {Promise<{currentSpeed: number, freeFlowSpeed: number, trafficRatio: number}>} Verkeersinformatie
   */
  async getTrafficInfo(location) {
    try {
      const { lat, lon } = location;
      const url = `https://api.tomtom.com/traffic/services/4${
        this.config.endpoints.traffic
      }?point=${lat},${lon}&unit=KMPH&key=${this.config.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`TomTom Traffic API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.flowSegmentData) {
        throw new Error('Geen verkeersgegevens beschikbaar');
      }
      
      const { currentSpeed, freeFlowSpeed } = data.flowSegmentData;
      
      return {
        currentSpeed,
        freeFlowSpeed,
        trafficRatio: currentSpeed / freeFlowSpeed
      };
      
    } catch (error) {
      console.error('Fout bij ophalen verkeersinformatie:', error);
      // Geef standaardwaarden terug bij fout
      return {
        currentSpeed: 50,
        freeFlowSpeed: 80,
        trafficRatio: 0.6
      };
    }
  }
}

// Exporteer een singleton instance
let locationService = null;

/**
 * Initialiseer de locatie service
 * @returns {LocationService} De geïnitialiseerde locatie service
 */
const initLocationService = () => {
  if (!locationService) {
    locationService = new LocationService();
  }
  return locationService;
};

export { initLocationService, LocationService };
