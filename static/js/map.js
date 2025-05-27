// Map module voor het beheren van de kaartfunctionaliteit
export class MapManager {
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
        this.mapElementId = 'map';
    }

    /**
     * Initialiseer de kaart
     * @param {string} elementId - ID van het HTML element voor de kaart
     */
    async initializeMap(elementId = 'map') {
        if (this.initialized) return;
        
        this.mapElementId = elementId;
        
        try {
            // Wacht tot de DOM volledig is geladen
            if (document.readyState === 'loading') {
                await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
            }

            // Controleer of het kaart element bestaat
            if (!document.getElementById(this.mapElementId)) {
                throw new Error(`Kaart element met ID '${this.mapElementId}' niet gevonden`);
            }

            // Stel de kaart in met een standaardweergave van Nederland
            this.map = L.map(this.mapElementId, {
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
            
            return this;
            
        } catch (error) {
            console.error('Fout bij het initialiseren van de kaart:', error);
            throw error;
        }
    }

    /**
     * Voeg een marker toe aan de kaart
     * @param {Array} latlng - Array met [latitude, longitude]
     * @param {Object} options - Opties voor de marker
     * @returns {L.Marker} De toegevoegde marker
     */
    addMarker(latlng, options = {}) {
        if (!this.initialized) return null;
        
        const defaultOptions = {
            draggable: false,
            title: 'Locatie',
            icon: L.divIcon({
                className: 'custom-marker',
                html: '📍',
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
            })
        };
        
        const marker = L.marker(latlng, { ...defaultOptions, ...options });
        marker.addTo(this.map);
        
        return marker;
    }

    /**
     * Toon een route tussen twee punten
     * @param {Array} start - Startpunt [lat, lng]
     * @param {Array} end - Eindpunt [lat, lng]
     * @returns {Promise<Object>} Route informatie
     */
    async showRoute(start, end) {
        if (!this.initialized) {
            throw new Error('Kaart is niet geïnitialiseerd');
        }

        try {
            // Verwijder bestaande route
            if (this.routeControl) {
                this.map.removeControl(this.routeControl);
                this.routeControl = null;
            }

            // Voeg start- en eindmarkers toe
            if (this.startMarker) this.map.removeLayer(this.startMarker);
            if (this.endMarker) this.map.removeLayer(this.endMarker);

            this.startMarker = this.addMarker(start, {
                title: 'Startpunt',
                icon: L.divIcon({
                    className: 'start-marker',
                    html: '🟢',
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                })
            });

            this.endMarker = this.addMarker(end, {
                title: 'Eindpunt',
                icon: L.divIcon({
                    className: 'end-marker',
                    html: '🔴',
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                })
            });

            // Bereken en toon de route
            this.routeControl = L.Routing.control({
                waypoints: [
                    L.latLng(start[0], start[1]),
                    L.latLng(end[0], end[1])
                ],
                routeWhileDragging: false,
                show: false,
                lineOptions: {
                    styles: [{ color: '#3b82f6', opacity: 0.8, weight: 5 }]
                },
                createMarker: () => null // Voorkom standaard markers
            }).addTo(this.map);

            // Pas de view aan op de route
            const bounds = L.latLngBounds([start, end]);
            this.map.fitBounds(bounds, { padding: [50, 50] });

            // Retourneer belofte die wordt opgelost wanneer de route is geladen
            return new Promise((resolve) => {
                this.routeControl.on('routesfound', (e) => {
                    const routes = e.routes;
                    if (routes && routes[0]) {
                        this.lastDistance = routes[0].summary.totalDistance / 1000; // km
                        this.lastDuration = Math.ceil(routes[0].summary.totalTime / 60); // minuten
                        
                        resolve({
                            distance: this.lastDistance,
                            duration: this.lastDuration,
                            instructions: routes[0].instructions
                        });
                    }
                });
            });
            
        } catch (error) {
            console.error('Fout bij het berekenen van de route:', error);
            throw error;
        }
    }

    /**
     * Haal de huidige locatie van de gebruiker op
     * @returns {Promise<Array>} [latitude, longitude]
     */
    async getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocatie wordt niet ondersteund door deze browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    resolve([latitude, longitude]);
                },
                (error) => {
                    console.error('Fout bij ophalen locatie:', error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Centreer de kaart op de huidige locatie van de gebruiker
     */
    async centerOnUserLocation() {
        try {
            const [lat, lng] = await this.getUserLocation();
            
            // Verwijder bestaande gebruikerslocatie marker
            if (this.userLocationMarker) {
                this.map.removeLayer(this.userLocationMarker);
            }
            
            // Voeg nieuwe marker toe
            this.userLocationMarker = this.addMarker([lat, lng], {
                title: 'Uw locatie',
                icon: L.divIcon({
                    className: 'user-location-marker',
                    html: '📍',
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                })
            });
            
            // Centreer de kaart
            this.map.setView([lat, lng], 15);
            
            return [lat, lng];
            
        } catch (error) {
            console.error('Kan niet centreren op gebruikerslocatie:', error);
            throw error;
        }
    }

    /**
     * Vernieuw de kaartweergave
     */
    refresh() {
        if (this.initialized) {
            this.map.invalidateSize();
        }
    }

    /**
     * Vernietig de kaart en maak schoon
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.initialized = false;
            this.routeLayer = null;
            this.startMarker = null;
            this.endMarker = null;
            this.userLocationMarker = null;
            this.routeControl = null;
        }
    }
}

// Exporteer de MapManager klasse
export default MapManager;
