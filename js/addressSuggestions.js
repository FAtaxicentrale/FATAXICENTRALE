// Module voor adressuggesties
const AddressSuggestions = (() => {
  // Cache voor adressuggesties
  const suggestionCache = window.utils.createCache(1800000); // 30 minuten cache
  
  // Haal adressuggesties op van de API
  async function fetchAddressSuggestions(query) {
    if (!query || query.length < (window.appConfig?.addressSuggestions?.minLength || 3)) {
      return [];
    }
    
    // Controleer eerst de cache
    const cacheKey = `suggest_${query}`.toLowerCase();
    const cached = suggestionCache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const params = new URLSearchParams({
        key: window.appConfig.tomtomApiKey,
        limit: window.appConfig.addressSuggestions.limit,
        countrySet: window.appConfig.addressSuggestions.countrySet,
        typeahead: window.appConfig.addressSuggestions.typeahead,
        language: 'nl-NL',
        view: 'NL'
      });
      
      const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?${params}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Ongeldig antwoord van de server');
      }
      
      // Formatteer de resultaten
      const suggestions = data.results
        .filter(result => result.address && result.address.freeformAddress)
        .map(result => ({
          formatted: result.address.freeformAddress,
          street: result.address.streetName,
          number: result.address.streetNumber,
          city: result.address.municipality,
          postalCode: result.address.postalCode,
          country: result.address.country,
          position: result.position
        }));
      
      // Sla de suggesties op in de cache
      suggestionCache.set(cacheKey, suggestions);
      
      return suggestions;
    } catch (error) {
      console.error('Fout bij ophalen adressuggesties:', error);
      throw error;
    }
  }
  
  // Maak een suggestielijst in het DOM
  function createSuggestionList(suggestions, inputElement, onSelect) {
    if (!suggestions || suggestions.length === 0) {
      return null;
    }
    
    const list = document.createElement('div');
    list.className = 'address-suggestions';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Adres suggesties');
    
    // Voeg elk suggestie-item toe aan de lijst
    suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'address-suggestion-item';
      item.setAttribute('role', 'option');
      item.setAttribute('id', `suggestion-${inputElement.id}-${index}`);
      item.setAttribute('aria-selected', 'false');
      item.tabIndex = -1;
      
      // Maak een leesbare weergave van het adres
      const addressParts = [];
      if (suggestion.street) addressParts.push(suggestion.street);
      if (suggestion.number) addressParts.push(suggestion.number);
      
      const addressLine1 = addressParts.join(' ');
      const addressLine2 = [suggestion.postalCode, suggestion.city]
        .filter(Boolean)
        .join(' ');
      
      item.innerHTML = `
        <div class="suggestion-main">
          <span class="suggestion-street">${addressLine1}</span>
          <span class="suggestion-city">${addressLine2}</span>
        </div>
      `;
      
      // Voeg event listeners toe voor klik en toetsenbordnavigatie
      item.addEventListener('click', () => {
        onSelect(suggestion);
        removeSuggestionList(inputElement);
      });
      
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(suggestion);
          removeSuggestionList(inputElement);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextItem = item.nextElementSibling || item.parentElement.firstElementChild;
          if (nextItem) nextItem.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevItem = item.previousElementSibling || item.parentElement.lastElementChild;
          if (prevItem) prevItem.focus();
        } else if (e.key === 'Escape') {
          removeSuggestionList(inputElement);
          inputElement.focus();
        }
      });
      
      list.appendChild(item);
    });
    
    return list;
  }
  
  // Verwijder een suggestielijst uit het DOM
  function removeSuggestionList(inputElement) {
    const existingList = inputElement.parentNode.querySelector('.address-suggestions');
    if (existingList) {
      existingList.remove();
    }
  }
  
  // Initialiseer een invoerveld met adressuggesties
  function initAddressInput(inputElement, options = {}) {
    if (!inputElement || !(inputElement instanceof HTMLInputElement)) {
      throw new Error('Ongeldig invoerveld opgegeven');
    }
    
    const {
      onSelect = () => {},
      minLength = 3,
      debounceTime = 300,
      placeholder = 'Typ een adres...'
    } = options;
    
    // Stel standaard placeholder in
    if (!inputElement.placeholder) {
      inputElement.placeholder = placeholder;
    }
    
    // Voeg een wrapper toe rond het invoerveld indien nog niet aanwezig
    let wrapper = inputElement.parentElement;
    if (!wrapper.classList.contains('address-input-wrapper')) {
      wrapper = document.createElement('div');
      wrapper.className = 'address-input-wrapper';
      inputElement.parentNode.insertBefore(wrapper, inputElement);
      wrapper.appendChild(inputElement);
    }
    
    // Voeg een knop toe om de huidige locatie te gebruiken
    if (!wrapper.querySelector('.location-button')) {
      const locationButton = document.createElement('button');
      locationButton.type = 'button';
      locationButton.className = 'location-button';
      locationButton.innerHTML = '📍';
      locationButton.title = 'Mijn huidige locatie gebruiken';
      locationButton.setAttribute('aria-label', 'Mijn huidige locatie gebruiken');
      
      locationButton.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          const position = await window.LocationService.getCurrentPosition();
          const address = await window.utils.getAddressFromCoordinates(position.lat, position.lon);
          inputElement.value = address.formatted;
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          
          if (typeof onSelect === 'function') {
            onSelect({
              ...address,
              position: {
                lat: position.lat,
                lon: position.lon
              }
            });
          }
        } catch (error) {
          console.error('Fout bij ophalen locatie:', error);
          window.showSubtleError('Kon locatie niet ophalen. Controleer uw toestemmingen.', inputElement.id);
        }
      });
      
      wrapper.appendChild(locationButton);
    }
    
    // Voeg een indicator toe voor het laden van suggesties
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.style.display = 'none';
    wrapper.appendChild(loadingIndicator);
    
    // Debounce de invoer om te voorkomen dat er te veel verzoeken worden gedaan
    const debouncedInputHandler = window.utils.debounce(async (e) => {
      const query = e.target.value.trim();
      
      // Verwijder bestaande suggesties
      removeSuggestionList(inputElement);
      
      if (query.length < minLength) return;
      
      try {
        // Toon laadindicator
        loadingIndicator.style.display = 'block';
        
        // Haal suggesties op
        const suggestions = await fetchAddressSuggestions(query);
        
        // Verberg laadindicator
        loadingIndicator.style.display = 'none';
        
        if (suggestions.length === 0) {
          window.showSubtleError('Geen adressen gevonden', inputElement.id);
          return;
        }
        
        // Toon suggesties
        const suggestionList = createSuggestionList(suggestions, inputElement, (selectedSuggestion) => {
          inputElement.value = selectedSuggestion.formatted;
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          
          if (typeof onSelect === 'function') {
            onSelect(selectedSuggestion);
          }
        });
        
        if (suggestionList) {
          wrapper.appendChild(suggestionList);
          // Focus op het eerste item voor betere toegankelijkheid
          const firstItem = suggestionList.querySelector('.address-suggestion-item');
          if (firstItem) firstItem.focus();
        }
      } catch (error) {
        console.error('Fout bij verwerken adressuggesties:', error);
        loadingIndicator.style.display = 'none';
        window.showSubtleError('Fout bij ophalen adressen', inputElement.id);
      }
    }, debounceTime);
    
    // Voeg event listeners toe
    inputElement.addEventListener('input', debouncedInputHandler);
    
    // Sluit suggesties bij klik buiten het invoerveld
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        removeSuggestionList(inputElement);
      }
    });
    
    // Toetsenbordnavigatie
    inputElement.addEventListener('keydown', (e) => {
      const suggestionsList = wrapper.querySelector('.address-suggestions');
      
      if (!suggestionsList) return;
      
      const items = Array.from(suggestionsList.querySelectorAll('.address-suggestion-item'));
      const currentIndex = items.findIndex(item => item === document.activeElement);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        items[prevIndex]?.focus();
      } else if (e.key === 'Escape') {
        removeSuggestionList(inputElement);
        inputElement.focus();
      }
    });
    
    // Maak een API beschikbaar voor dit specifieke invoerveld
    return {
      destroy: () => {
        inputElement.removeEventListener('input', debouncedInputHandler);
        removeSuggestionList(inputElement);
        if (wrapper && wrapper.parentNode) {
          wrapper.parentNode.insertBefore(inputElement, wrapper);
          wrapper.remove();
        }
      },
      refresh: () => {
        if (inputElement.value.length >= minLength) {
          debouncedInputHandler({ target: inputElement });
        }
      }
    };
  }
  
  // Openbare API
  return {
    init: initAddressInput,
    fetchSuggestions: fetchAddressSuggestions
  };
})();

// Maak de module beschikbaar in het globale bereik
window.AddressSuggestions = AddressSuggestions;
