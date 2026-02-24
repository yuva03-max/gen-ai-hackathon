/**
 * Shared Text-to-Speech Utility
 */
import { I18n } from './i18n.js';
export const TTS = {
    currentButton: null,

    /**
     * Creates a TTS toggle button HTML string
     */
    getButtonHTML() {
        return `<button class="tts-toggle-btn" title="Speak / Stop"><i class="fas fa-volume-up"></i></button>`;
    },

    /**
     * Binds TTS toggle to a container element
     * @param {HTMLElement} container - The result container
     * @param {string} text - The text to speak
     */
    bindToContainer(container, text) {
        const btn = container.querySelector('.tts-toggle-btn');
        if (btn) {
            btn.addEventListener('click', () => this.toggle(btn, text));
        }
    },

    /**
     * Toggle TTS play/stop
     */
    toggle(button, text) {
        const icon = button.querySelector('i');

        // If currently speaking, stop
        if (this.currentButton === button && window.speechSynthesis.speaking) {
            this.stop();
            icon.className = 'fas fa-volume-up';
            this.currentButton = null;
            return;
        }

        // Stop any other speech
        this.stop();
        if (this.currentButton) {
            const prevIcon = this.currentButton.querySelector('i');
            if (prevIcon) prevIcon.className = 'fas fa-volume-up';
        }

        // Start speaking
        this.speak(text, button);
        icon.className = 'fas fa-stop';
        this.currentButton = button;
    },

    speak(text, button) {
        if (!('speechSynthesis' in window)) {
            alert('Text-to-Speech is not supported in your browser.');
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = I18n.getLocale();
        utterance.rate = 0.95;
        utterance.pitch = 1;

        utterance.onend = () => {
            if (button) {
                const icon = button.querySelector('i');
                if (icon) icon.className = 'fas fa-volume-up';
            }
            this.currentButton = null;
        };

        window.speechSynthesis.speak(utterance);
    },

    stop() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
};
