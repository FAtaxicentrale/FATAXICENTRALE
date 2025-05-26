/**
 * Beheert het opslaan en laden van niet-opgeslagen formuliergegevens
 */
class DraftManager {
  constructor() {
    this.DRAFT_EXPIRY = 24 * 60 * 60 * 1000; // 24 uur
    this.DRAFT_KEY = 'draftRit';
  }

  /**
   * Laad opgeslagen velden bij het laden van de pagina
   */
  loadDraft(fields) {
    try {
      const saved = JSON.parse(localStorage.getItem(this.DRAFT_KEY) || '{}');
      
      // Controleer of de draft niet verlopen is
      if (saved.timestamp && (Date.now() - saved.timestamp < this.DRAFT_EXPIRY)) {
        fields.forEach(field => {
          const el = document.getElementById(field);
          if (el && saved[field] !== undefined) {
            el.value = saved[field];
            
            // Activeer change event voor afhankelijke velden
            if (typeof el.onchange === 'function') {
              el.onchange();
            }
          }
        });
        
        console.log('Opgeslagen gegevens geladen');
        return true;
      } else if (saved.timestamp) {
        console.log('Opgeslagen gegevens zijn verlopen');
        localStorage.removeItem(this.DRAFT_KEY);
      }
    } catch (error) {
      console.error('Fout bij het laden van opgeslagen gegevens:', error);
    }
    
    return false;
  }

  /**
   * Sla wijzigingen op in localStorage
   */
  setupDraftSaving(fields) {
    fields.forEach(field => {
      const el = document.getElementById(field);
      if (el) {
        el.addEventListener('change', () => {
          try {
            const draft = JSON.parse(localStorage.getItem(this.DRAFT_KEY) || '{}');
            draft[field] = el.value;
            draft.timestamp = Date.now();
            localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
          } catch (error) {
            console.error('Fout bij het opslaan van gegevens:', error);
          }
        });
      }
    });
  }

  /**
   * Initialiseer de draft functionaliteit
   * @param {string[]} fields - Lijst van veldnamen die opgeslagen moeten worden
   */
  initDraftManager(fields) {
    // Laad bestaande gegevens
    const hasDraft = this.loadDraft(fields);
    
    // Sla wijzigingen op
    this.setupDraftSaving(fields);
    
    return hasDraft;
  }
}

// Maak de klasse beschikbaar in de globale scope
window.DraftManager = DraftManager;

// Maak een instantie beschikbaar voor direct gebruik
window.draftManager = new DraftManager();
