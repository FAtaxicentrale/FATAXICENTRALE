/**
 * Adresuggesties module voor het ophalen en weergeven van adressuggesties
 * Gebruikt de PDOK Locatieserver API voor het zoeken naar Nederlandse adressen
 */
export class AddressSuggestions {
    constructor() {
        this.suggestionBoxes = {};
        this.apiEndpoint = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest';
        this.detailsEndpoint = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup';
        this.timeout = null;
        this.minQueryLength = 2;
        this.debounceDelay = 300;
        this.currentRequest = null;
        this.cache = new Map();
    }

    /**
     * Initialiseer een invoerveld met adressuggesties
     * @param {string} inputId - ID van het invoerveld
     * @param {string} suggestionBoxId - ID van het element waar de suggesties worden weergegeven
     * @param {Function} onSelect - Callback functie die wordt aangeroepen bij selectie van een adres
     */
    init(inputId, suggestionBoxId, onSelect) {
        const input = document.getElementById(inputId);
        const suggestionBox = document.getElementById(suggestionBoxId);
        
        if (!input || !suggestionBox) {
            console.error('Invoerveld of suggestiebox niet gevonden');
            return;
        }

        // Sla referenties op
        this.suggestionBoxes[inputId] = {
            input,
            box: suggestionBox,
            onSelect
        };

        // Voeg event listeners toe
        input.addEventListener('input', this.handleInput.bind(this, inputId));
        input.addEventListener('focus', this.handleInput.bind(this, inputId));
        input.addEventListener('blur', () => {
            // Wacht even voordat de suggesties worden verborgen om klikken mogelijk te maken
            setTimeout(() => {
                this.hideSuggestions(inputId);
            }, 200);
        });

        // Voeg CSS-klassen toe
        input.classList.add('address-input');
        suggestionBox.classList.add('suggestions');
    }

    /**
     * Verwerk invoer en toon suggesties
     * @param {string} inputId - ID van het invoerveld
     */
    async handleInput(inputId) {
        const { input, box } = this.suggestionBoxes[inputId] || {};
        if (!input || !box) return;

        const query = input.value.trim();

        // Verberg suggesties als de invoer te kort is of leeg is
        if (query.length < this.minQueryLength) {
            this.hideSuggestions(inputId);
            return;
        }

        // Annuleer eventuele lopende timeouts
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        // Gebruik debouncing om het aantal API-aanroepen te beperken
        this.timeout = setTimeout(async () => {
            try {
                const suggestions = await this.fetchSuggestions(query);
                this.displaySuggestions(inputId, suggestions);
            } catch (error) {
                console.error('Fout bij ophalen suggesties:', error);
                this.hideSuggestions(inputId);
            }
        }, this.debounceDelay);
    }

    /**
     * Haal adressuggesties op van de PDOK API
     * @param {string} query - Zoekopdracht
     * @returns {Promise<Array>} Lijst met suggesties
     */
    async fetchSuggestions(query) {
        // Controleer eerst de cache
        if (this.cache.has(query)) {
            return this.cache.get(query);
        }

        // Annuleer eventuele lopende verzoeken
        if (this.currentRequest) {
            this.currentRequest.abort();
        }

        try {
            // Maak een nieuw abort controller aan
            const controller = new AbortController();
            this.currentRequest = controller;

            const params = new URLSearchParams({
                q: query,
                rows: 5,
                fl: '*',
                fq: 'type:(gemeente OR weg OR postcode OR adres OR woonplaats)',
                df: 'suggest_ps_gewijzigd_epoch',
                sort: 'suggest_ps_gewijzigd_epoch desc',
                wt: 'json'
            });

            const response = await fetch(`${this.apiEndpoint}?${params}`, {
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Verwerk de respons en haal details op voor elk resultaat
            const results = data.response?.docs || [];
            const suggestions = [];
            
            for (const item of results) {
                // Haal gedetailleerde informatie op voor elk resultaat
                const details = await this.fetchAddressDetails(item.id);
                if (details) {
                    suggestions.push(details);
                }
                
                // Beperk het aantal resultaten
                if (suggestions.length >= 5) break;
            }
            
            // Sla de resultaten op in de cache
            this.cache.set(query, suggestions);
            
            return suggestions;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Verzoek geannuleerd');
                return [];
            }
            console.error('Fout bij ophalen suggesties:', error);
            throw error;
        } finally {
            this.currentRequest = null;
        }
    }

    /**
     * Haal gedetailleerde adresinformatie op
     * @param {string} id - ID van het adres
     * @returns {Promise<Object|null>} Gedetailleerde adresinformatie
     */
    async fetchAddressDetails(id) {
        try {
            const params = new URLSearchParams({
                id: id,
                fl: '*',
                wt: 'json'
            });

            const response = await fetch(`${this.detailsEndpoint}?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const doc = data.response?.docs?.[0];
            
            if (!doc) return null;
            
            // Formatteer het adres
            return {
                id: doc.id,
                displayName: doc.weergavenaam,
                street: doc.straatnaam || '',
                number: doc.huis_nlt || '',
                postalCode: doc.postcode || '',
                city: doc.woonplaatsnaam || doc.gemeentenaam || '',
                province: doc.provincienaam || '',
                lat: doc.centroide_ll?.replace('POINT(', '').split(' ')[1],
                lng: doc.centroide_ll?.replace('POINT(', '').split(' ')[0],
                type: doc.type
            };
            
        } catch (error) {
            console.error('Fout bij ophalen adresdetails:', error);
            return null;
        }
    }

    /**
     * Toon suggesties in de suggestiebox
     * @param {string} inputId - ID van het invoerveld
     * @param {Array} suggestions - Lijst met suggesties
     */
    displaySuggestions(inputId, suggestions) {
        const { box, onSelect } = this.suggestionBoxes[inputId] || {};
        if (!box) return;

        // Maak de suggesties leeg
        box.innerHTML = '';

        if (!suggestions || suggestions.length === 0) {
            this.hideSuggestions(inputId);
            return;
        }

        // Voeg elke suggestie toe aan de box
        suggestions.forEach(suggestion => {
            if (!suggestion) return;
            
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion.displayName;
            
            // Voeg een klikgebeurtenis toe
            item.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Voorkom dat het invoerveld de focus verliest
                this.selectSuggestion(inputId, suggestion);
            });
            
            box.appendChild(item);
        });

        // Toon de suggestiebox
        box.classList.add('visible');
    }

    /**
     * Verberg de suggesties voor een invoerveld
     * @param {string} inputId - ID van het invoerveld
     */
    hideSuggestions(inputId) {
        const { box } = this.suggestionBoxes[inputId] || {};
        if (box) {
            box.classList.remove('visible');
        }
    }

    /**
     * Verwerk de selectie van een suggestie
     * @param {string} inputId - ID van het invoerveld
     * @param {Object} suggestion - Geselecteerde suggestie
     */
    selectSuggestion(inputId, suggestion) {
        const { input, onSelect } = this.suggestionBoxes[inputId] || {};
        if (!input) return;

        // Vul het invoerveld met de weergavenaam
        input.value = suggestion.displayName;
        
        // Verberg de suggesties
        this.hideSuggestions(inputId);
        
        // Roep de callback aan met de geselecteerde suggestie
        if (typeof onSelect === 'function') {
            onSelect(suggestion);
        }
    }

    /**
     * Vernietig de module en ruim event listeners op
     */
    destroy() {
        // Verwijder alle event listeners en referenties
        Object.keys(this.suggestionBoxes).forEach(inputId => {
            const { input } = this.suggestionBoxes[inputId] || {};
            if (input) {
                input.removeEventListener('input', this.handleInput);
                input.removeEventListener('focus', this.handleInput);
                input.classList.remove('address-input');
            }
        });

        this.suggestionBoxes = {};
        this.cache.clear();
        
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        
        if (this.currentRequest) {
            this.currentRequest.abort();
            this.currentRequest = null;
        }
    }
}

export default AddressSuggestions;
