// Locatie-gerelateerde functies
export class LocationService {
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
        let errorMessage = 'Fout bij het volgen van uw locatie.';
        onError(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000
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
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Afstand in kilometers
  }

  // Converteer graden naar radialen
  deg2rad(deg) {
    return deg * (Math.PI / 180);
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
