// Module voor locatie-gerelateerde functionaliteit
const LocationService = (() => {
  // Huidige gebruikerslocatie
  let currentLocation = null;
  
  // Haal de huidige locatie op
  async function getCurrentPosition(options = {}) {
    if (!navigator.geolocation) {
      throw new Error('Geolocatie wordt niet ondersteund door deze browser');
    }
    
    const geolocationOptions = {
      ...window.appConfig.geolocationOptions,
      ...options
    };
    
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => {
          currentLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          resolve(currentLocation);
        },
        error => {
          let errorMessage = 'Kan locatie niet bepalen';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Toestemming voor locatie geweigerd. Activeer locatietoegang in uw browserinstellingen.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Locatie-informatie is niet beschikbaar. Controleer uw netwerkverbinding.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Het ophalen van de locatie duurde te lang. Probeer het opnieuw.';
              break;
            default:
              errorMessage = `Fout bij ophalen locatie: ${error.message}`;
          }
          
          reject(new Error(errorMessage));
        },
        geolocationOptions
      );
    });
  }
  
  // Vul een adresveld in met het huidige adres
  async function fillAddressField(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) {
      throw new Error(`Veld met ID ${fieldId} niet gevonden`);
    }
    
    try {
      // Toon laadstatus
      const originalValue = field.value;
      field.value = 'Locatie ophalen...';
      field.disabled = true;
      
      // Haal locatie op
      const position = await getCurrentPosition();
      
      // Haal adres op
      const address = await window.utils.getAddressFromCoordinates(position.lat, position.lon);
      
      // Vul het veld in
      field.value = address.formatted;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      
      return address;
    } catch (error) {
      console.error('Fout bij invullen adresveld:', error);
      field.value = originalValue;
      throw error;
    } finally {
      field.disabled = false;
    }
  }
  
  // Voeg een marker toe aan de kaart op de opgegeven locatie
  function addMarkerToMap(map, lat, lon, title = 'Locatie', icon = null) {
    if (!map) {
      console.warn('Geen kaart beschikbaar om marker aan toe te voegen');
      return null;
    }
    
    const defaultIcon = L.icon({
      iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-blue.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    
    const marker = L.marker([lat, lon], {
      title,
      icon: icon || defaultIcon,
      draggable: true
    }).addTo(map);
    
    // Beweeg de kaart naar de marker
    map.setView([lat, lon], 16);
    
    return marker;
  }
  
  // Verwijder een marker van de kaart
  function removeMarker(marker) {
    if (marker && marker.remove) {
      marker.remove();
    }
  }
  
  // Open een popup met een formulier om een adres te bewerken
  function openAddressEditPopup(map, lat, lon, onSave) {
    const popup = L.popup()
      .setLatLng([lat, lon])
      .setContent(`
        <div class="address-edit-popup">
          <h3>Adres bewerken</h3>
          <div class="form-group">
            <label for="edit-street">Straat</label>
            <input type="text" id="edit-street" class="form-control">
          </div>
          <div class="form-group">
            <label for="edit-number">Huisnummer</label>
            <input type="text" id="edit-number" class="form-control">
          </div>
          <div class="form-group">
            <label for="edit-city">Plaats</label>
            <input type="text" id="edit-city" class="form-control">
          </div>
          <div class="form-group">
            <label for="edit-postal">Postcode</label>
            <input type="text" id="edit-postal" class="form-control">
          </div>
          <div class="button-group">
            <button id="save-address" class="btn btn-primary">Opslaan</button>
            <button id="cancel-edit" class="btn btn-secondary">Annuleren</button>
          </div>
        </div>
      `)
      .openOn(map);
    
    // Voeg event listeners toe aan de knoppen
    document.getElementById('save-address')?.addEventListener('click', () => {
      const address = {
        street: document.getElementById('edit-street')?.value || '',
        number: document.getElementById('edit-number')?.value || '',
        city: document.getElementById('edit-city')?.value || '',
        postalCode: document.getElementById('edit-postal')?.value || ''
      };
      
      if (typeof onSave === 'function') {
        onSave(address);
      }
      
      map.closePopup();
    });
    
    document.getElementById('cancel-edit')?.addEventListener('click', () => {
      map.closePopup();
    });
    
    return popup;
  }
  
  // Openbare API
  return {
    getCurrentPosition,
    fillAddressField,
    addMarkerToMap,
    removeMarker,
    openAddressEditPopup,
    get currentLocation() {
      return currentLocation;
    }
  };
})();

// Maak de service beschikbaar in het globale bereik
window.LocationService = LocationService;
