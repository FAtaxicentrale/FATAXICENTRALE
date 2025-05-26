// Map module voor het beheren van de kaartfunctionaliteit
class MapManager {
    constructor() {
        this.map = null;
        this.routeLayer = null;
        this.startMarker = null;
        this.endMarker = null;
        this.userLocationMarker = null;
        this.initialized = false;
        this.routeControl = null;
        this.waypoints = [];
        this.lastDistance = 0;
        this.lastDuration = 0;
    }

    // Initialiseer de kaart
    init() {
        if (this.initialized || !document.getElementById('map')) return;
        
        try {
            // Stel de kaart in met een standaardweergave van Nederland
            this.map = L.map('map', {
                center: [52.1326, 5.2913], // Centrum van Nederland
                zoom: 8,
                zoomControl: false
            });
            
            // Voeg zoom controls toe
            L.control.zoom({
                position: 'topright'
            }).addTo(this.map);
            
            // Voeg het OpenStreetMap kaartlaag toe
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                detectRetina: true
            }).addTo(this.map);
            
            // Maak een laag voor routes en markers
            this.routeLayer = L.layerGroup().addTo(this.map);
            
            // Voeg een schaalbalk toe
            L.control.scale({
                imperial: false,
                metric: true,
                position: 'bottomright'
            }).addTo(this.map);
            
            this.initialized = true;
            console.log('Kaart succesvol geïnitialiseerd');
            
            // Activeer locatiebepaling
            this.locateUser();
            
        } catch (error) {
            console.error('Fout bij het initialiseren van de kaart:', error);
        }
        
        return this.map;
    }
    
    // Vind de huidige locatie van de gebruiker
    locateUser() {
        if (!this.initialized || !navigator.geolocation) return;
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            position => this.onLocationFound(position),
            error => this.onLocationError(error),
            options
        );
    }
    
    // Wordt aangeroepen wanneer de locatie is gevonden
    onLocationFound(position) {
        if (!this.initialized) return;
        
        const { latitude, longitude } = position.coords;
        const accuracy = position.coords.accuracy;
        
        // Voeg een marker toe voor de huidige locatie
        if (this.userLocationMarker) {
            this.map.removeLayer(this.userLocationMarker);
        }
        
        this.userLocationMarker = L.marker([latitude, longitude])
            .addTo(this.map)
            .bindPopup('Uw locatie (nauwkeurigheid: ' + Math.round(accuracy) + ' meter)')
            .openPopup();
        
        // Centreer de kaart op de gebruiker
        this.map.setView([latitude, longitude], 13);
    }
    
    // Wordt aangeroepen bij een fout bij het ophalen van de locatie
    onLocationError(error) {
        console.warn('Fout bij ophalen locatie:', error.message);
        
        // Toon een vriendelijk bericht aan de gebruiker
        if (this.initialized) {
            L.popup()
                .setLatLng([52.1326, 5.2913])
                .setContent('Kon uw locatie niet bepalen. Zorg ervoor dat u locatietoegang heeft ingeschakeld.')
                .openOn(this.map);
        }
    }
    
    // Voeg een route toe aan de kaart
    async addRoute(start, end, waypoints = []) {
        if (!this.initialized || !start || !end) {
            throw new Error('Kaart of adressen niet correct geïnitialiseerd');
        }
        
        try {
            // Verwijder bestaande route
            this.clearRoute();
            
            // Converteer adressen naar coördinaten
            const startCoords = await this.geocodeAddress(start);
            const endCoords = await this.geocodeAddress(end);
            
            if (!startCoords || !endCoords) {
                throw new Error('Kon een of beide adressen niet vinden');
            }
            
            // Sla waypoints op voor later gebruik
            this.waypoints = [
                L.latLng(startCoords.lat, startCoords.lng),
                ...waypoints.map(wp => L.latLng(wp.lat, wp.lng)),
                L.latLng(endCoords.lat, endCoords.lng)
            ];
            
            // Voeg markers toe voor begin- en eindpunt
            this.startMarker = L.marker([startCoords.lat, startCoords.lng], {
                icon: L.divIcon({
                    className: 'start-marker',
                    html: '🟢',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                })
            }).addTo(this.routeLayer)
              .bindPopup('Vertrekpunt: ' + start);
            
            this.endMarker = L.marker([endCoords.lat, endCoords.lng], {
                icon: L.divIcon({
                    className: 'end-marker',
                    html: '🔴',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                })
            }).addTo(this.routeLayer)
              .bindPopup('Bestemming: ' + end);
            
            // Bereken en toon de route met OSRM
            await this.calculateAndDisplayRoute();
            
            // Geef de afstand en reistijd terug
            return {
                distance: this.lastDistance,
                duration: this.lastDuration
            };
            
        } catch (error) {
            console.error('Fout bij het toevoegen van route:', error);
            throw error;
        }
    }
    
    // Verwijder de huidige route van de kaart
    clearRoute() {
        if (this.routeLayer) {
            this.routeLayer.clearLayers();
            this.startMarker = null;
            this.endMarker = null;
        }
    }
    
    // Voeg een marker toe aan de kaart
    addMarker(latLng, options = {}) {
        if (!this.initialized) return null;
        return L.marker(latLng, options).addTo(this.map);
    }
    
    // Verwijder een marker van de kaart
    removeMarker(marker) {
        if (marker && this.map.hasLayer(marker)) {
            this.map.removeLayer(marker);
        }
    }
    
    // Converteer een adres naar coördinaten met behulp van Nominatim
    async geocodeAddress(address) {
        if (!address) return null;
        
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    displayName: data[0].display_name
                };
            }
            return null;
        } catch (error) {
            console.error('Fout bij het omzetten van adres naar coördinaten:', error);
            return null;
        }
    }
    
    // Bereken en toon de route met behulp van OSRM
    async calculateAndDisplayRoute() {
        if (!this.initialized || this.waypoints.length < 2) return;
        
        try {
            // Maak een lijst van waypoints voor de OSRM API
            const waypointCoords = this.waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
            
            // Haal route op van OSRM service
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${waypointCoords}?overview=full&geometries=geojson`
            );
            
            if (!response.ok) {
                throw new Error('Kon routegegevens niet ophalen');
            }
            
            const data = await response.json();
            
            if (data.routes && data.routes[0]) {
                const route = data.routes[0];
                
                // Sla afstand en duur op
                this.lastDistance = (route.distance / 1000).toFixed(1); // km
                this.lastDuration = Math.ceil(route.duration / 60); // minuten
                
                // Toon de route op de kaart
                if (this.routeControl) {
                    this.map.removeControl(this.routeControl);
                }
                
                const routeGeoJSON = {
                    type: 'Feature',
                    properties: {},
                    geometry: route.geometry
                };
                
                L.geoJSON(routeGeoJSON, {
                    style: {
                        color: '#3498db',
                        weight: 5,
                        opacity: 0.8
                    }
                }).addTo(this.routeLayer);
                
                // Pas de kaartweergave aan op de route
                const bounds = L.geoJSON(routeGeoJSON).getBounds();
                this.map.fitBounds(bounds, { padding: [50, 50] });
                
                return {
                    distance: this.lastDistance,
                    duration: this.lastDuration
                };
            }
            
        } catch (error) {
            console.error('Fout bij het berekenen van de route:', error);
            throw error;
        }
    }
    
    // Wis de huidige route van de kaart
    clearRoute() {
        if (this.routeLayer) {
            this.routeLayer.clearLayers();
        }
        
        if (this.routeControl) {
            this.map.removeControl(this.routeControl);
            this.routeControl = null;
        }
        
        this.waypoints = [];
        this.lastDistance = 0;
        this.lastDuration = 0;
    }
    
    // Vernietig de kaart en ruim op
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        
        this.routeLayer = null;
        this.startMarker = null;
        this.endMarker = null;
        this.userLocationMarker = null;
        this.initialized = false;
        this.routeControl = null;
        this.waypoints = [];
    }
}

// Maak een enkele instantie beschikbaar
const mapManager = new MapManager();

// Initialiseer de kaart wanneer het DOM geladen is
document.addEventListener('DOMContentLoaded', () => {
    mapManager.init();
});

export { mapManager };
