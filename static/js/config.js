/**
 * Config — Frontend app preferences (no API keys stored client-side)
 * The Groq API key is stored on the backend (Python).
 */

export const Config = {
    THEME_KEY: 'chisa_theme',
    HISTORY_KEY: 'chisa_history',

    getTheme() {
        return localStorage.getItem(this.THEME_KEY) || 'light';
    },

    setTheme(theme) {
        localStorage.setItem(this.THEME_KEY, theme);
    },

    getHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];
        } catch {
            return [];
        }
    },

    saveHistoryEntry(entry) {
        const history = this.getHistory();
        history.unshift({ ...entry, timestamp: new Date().toISOString() });
        if (history.length > 20) history.pop();
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    }
};
