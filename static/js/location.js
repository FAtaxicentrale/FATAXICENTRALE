// Locatie-gerelateerde functies
class LocationService {
  constructor() {
    this.currentPosition = null;
    this.watchId = null;
  }

  // Vraag toestemming voor locatie
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocatie wordt niet ondersteund door deze browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = position;
          resolve(position);
        },
        (error) => {
          let errorMessage = 'Kan uw locatie niet bepalen.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Toegang tot locatie is geweigerd. Activeer dit in uw browserinstellingen.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Locatie-informatie is niet beschikbaar.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Het duurde te lang om uw locatie te bepalen.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  // Start het volgen van de locatie
  watchPosition(onSuccess, onError) {
    if (!navigator.geolocation) {
      onError(new Error('Geolocatie wordt niet ondersteund door deze browser.'));
      return null;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentPosition = position;
        onSuccess(position);
      },
      (error) => {
        let errorMessage = 'Kan uw locatie niet volgen.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Toegang tot locatie is geweigerd. Activeer dit in uw browserinstellingen.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Locatie-informatie is niet beschikbaar.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Het duurde te lang om uw locatie te bepalen.';
            break;
        }
        onError(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return this.watchId;
  }

  // Stop met het volgen van de locatie
  clearWatch() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Bereken afstand tussen twee coördinaten in kilometers
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Straal van de aarde in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Converteer graden naar radialen
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Controleer of twee locaties dicht bij elkaar liggen (in meters)
  isNearby(lat1, lon1, lat2, lon2, maxDistanceMeters = 50) {
    const distanceKm = this.calculateDistance(lat1, lon1, lat2, lon2);
    return distanceKm * 1000 <= maxDistanceMeters;
  }

  // Zoek adressen met de OpenStreetMap Nominatim API
  async searchAddress(query) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Kon geen verbinding maken met de adresservice');
      }
      
      const data = await response.json();
      return data.map(item => ({
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        address: item.address || {}
      }));
    } catch (error) {
      console.error('Fout bij het zoeken naar adres:', error);
      throw error;
    }
  }
}

// Maak beschikbaar in het globale bereik
// Maak beschikbaar in globaal bereik
if (typeof window !== 'undefined') {
  window.LocationService = LocationService;
}
