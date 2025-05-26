// Adresuggesties module
export class AddressSuggestions {
    constructor() {
        this.suggestionBoxes = {
            'ophaaladres': 'ophaaladres-suggesties',
            'afzetadres': 'afzetadres-suggesties'
        };
    }

    async getSuggestions(inputElement, suggestionBoxId) {
        try {
            const suggestionBox = document.getElementById(suggestionBoxId);
            if (!suggestionBox) return;

            const searchTerm = inputElement.value.trim();
            if (searchTerm.length < 3) {
                suggestionBox.innerHTML = '';
                suggestionBox.classList.remove('active');
                return;
            }

            // Simuleer API-aanroep
            await new Promise(resolve => setTimeout(resolve, 500));

            const mockData = {
                results: [
                    { address: { freeformAddress: `${searchTerm}straat 123, Amsterdam` } },
                    { address: { freeformAddress: `${searchTerm}weg 456, Rotterdam` } },
                    { address: { freeformAddress: `${searchTerm}plein 789, Utrecht` } }
                ]
            };

            this.processSuggestions(mockData, suggestionBox, inputElement, suggestionBoxId);
        } catch (error) {
            console.error('Fout bij het ophalen van adressuggesties:', error);
        }
    }

    processSuggestions(data, suggestionBox, inputElement, suggestionBoxId) {
        try {
            if (!data || !data.results || !Array.isArray(data.results)) {
                console.error('Ongeldige data ontvangen voor adressuggesties');
                return;
            }

            const shownResults = data.results
                .map(r => ({
                    formatted: r.address?.freeformAddress
                }))
                .filter(r => r.formatted);

            suggestionBox.innerHTML = shownResults.map(r => {
                const safeValue = this.escapeHtml(r.formatted);
                const inputIdSafe = this.escapeHtml(inputElement.id);
                const suggestionBoxIdSafe = this.escapeHtml(suggestionBoxId);
                return `<div class="adres-suggestie-item" onclick="kiesAdresSuggestie('${inputIdSafe}', '${suggestionBoxIdSafe}', '${safeValue}')">${r.formatted}</div>`;
            }).join('');

            suggestionBox.classList.add('active');
        } catch (error) {
            console.error('Fout bij verwerken van adressuggesties:', error);
            suggestionBox.innerHTML = '';
            suggestionBox.classList.remove('active');
        }
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Statische methode om suggestieboxen te sluiten
    static closeAllSuggestions() {
        document.querySelectorAll('.adres-suggesties').forEach(box => {
            box.innerHTML = '';
            box.classList.remove('active');
        });
    }

    // Statische methode voor klikbuiten event
    static setupClickOutsideHandler() {
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.adres-suggestie-item') && !e.target.matches('input[type="text"]')) {
                AddressSuggestions.closeAllSuggestions();
            }
        });
    }
}
