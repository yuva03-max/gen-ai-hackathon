import { API } from '../api.js';
import { I18n } from './i18n.js';

export const Chat = {
    init() {
        const sendBtn = document.getElementById('send-btn');
        const userInput = document.getElementById('user-input');
        const voiceBtn = document.getElementById('voice-btn');
        const attachBtn = document.getElementById('attach-btn');

        if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());

        if (userInput) {
            // Auto-resize textarea
            userInput.addEventListener('input', () => {
                userInput.style.height = 'auto';
                userInput.style.height = (userInput.scrollHeight) + 'px';
            });

            // Handle Enter key
            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (voiceBtn) voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        if (attachBtn) {
            attachBtn.addEventListener('click', () => {
                document.getElementById('chat-file-input').click();
            });
        }

        document.getElementById('chat-file-input')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.addMessage(`Selected image: ${file.name} (Ready for future multimodal update)`, 'user');
                // Reset file input
                e.target.value = '';
            }
        });

        // Quick Chips
        document.querySelectorAll('.quick-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const question = e.target.getAttribute('data-question');
                if (userInput) {
                    userInput.value = question;
                    userInput.dispatchEvent(new Event('input')); // Trigger resize
                    this.sendMessage();
                }
            });
        });

        // Initialize Text-to-Speech
        this.initTTS();
        // Initialize Speech Recognition
        this.initSTT();

        // Update STT language when user switches language
        document.addEventListener('chisa:langchange', (e) => {
            if (this.recognition) {
                this.recognition.lang = e.detail.locale;
            }
        });
    },

    // --- Speech Recognition (STT) ---
    recognition: null,
    isRecording: false,

    initSTT() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('Speech recognition not supported');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = I18n.getLocale();

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const userInput = document.getElementById('user-input');
            if (userInput) {
                userInput.value += (userInput.value ? ' ' : '') + transcript;
                userInput.dispatchEvent(new Event('input')); // Trigger resize
            }
        };

        this.recognition.onstart = () => {
            this.isRecording = true;
            document.getElementById('voice-btn')?.classList.add('recording');
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            document.getElementById('voice-btn')?.classList.remove('recording');
        };

        this.recognition.onerror = () => {
            this.isRecording = false;
            document.getElementById('voice-btn')?.classList.remove('recording');
        };
    },

    toggleVoiceInput() {
        if (!this.recognition) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    },

    async sendMessage() {
        const userInput = document.getElementById('user-input');
        const message = userInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        userInput.value = '';
        userInput.style.height = 'auto'; // Reset height
        this.showTypingIndicator();

        try {
            // Real API Call
            const systemPrompt = "You are a helpful agricultural assistant for farmers. Keep answers concise and practical.";
            const response = await API.askLLM(systemPrompt, message);

            this.hideTypingIndicator();
            this.addMessage(response, 'bot');

        } catch (e) {
            console.error(e);
            this.hideTypingIndicator();
            this.addMessage("Sorry, I encountered an error. Please try again later.", 'bot');
        }
    },

    addMessage(content, sender) {
        const chatMessages = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = `message ${sender}`;

        let iconHtml = '';
        let ttsButtonHtml = '';
        if (sender === 'bot') {
            iconHtml = `<div class="me-2 d-flex align-items-end mb-1"><img src="/static/img/logo.png" width="30" class="rounded-circle"></div>`;
            ttsButtonHtml = `<button class="tts-toggle-btn" title="Speak / Stop"><i class="fas fa-volume-up"></i></button>`;
        }

        const contentHtml = `<div class="message-content">${content.replace(/\n/g, '<br>')}</div>`;

        div.innerHTML = sender === 'bot' ? (iconHtml + contentHtml + ttsButtonHtml) : contentHtml;

        // Bind TTS toggle for bot messages
        if (sender === 'bot') {
            const ttsBtn = div.querySelector('.tts-toggle-btn');
            if (ttsBtn) {
                ttsBtn.addEventListener('click', () => this.toggleTTS(ttsBtn, content));
            }
        }

        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },

    showTypingIndicator() {
        const chatMessages = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.id = 'typing';
        div.className = 'message bot';
        div.innerHTML = `<div class="me-2 d-flex align-items-end mb-1"><img src="/static/img/logo.png" width="30" class="rounded-circle"></div><div class="message-content"><i class="fas fa-ellipsis-h animate-pulse"></i></div>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },

    hideTypingIndicator() {
        const el = document.getElementById('typing');
        if (el) el.remove();
    },

    // --- Text-to-Speech ---
    currentUtterance: null,
    currentButton: null,

    initTTS() {
        // No global buttons to init anymore
    },

    toggleTTS(button, text) {
        const icon = button.querySelector('i');

        // If currently speaking this message, stop it
        if (this.currentButton === button && window.speechSynthesis.speaking) {
            this.stopSpeaking();
            icon.className = 'fas fa-volume-up';
            this.currentButton = null;
            return;
        }

        // Stop any other speech first
        this.stopSpeaking();
        if (this.currentButton) {
            const prevIcon = this.currentButton.querySelector('i');
            if (prevIcon) prevIcon.className = 'fas fa-volume-up';
        }

        // Start speaking this message
        this.speak(text, button);
        icon.className = 'fas fa-stop';
        this.currentButton = button;
    },

    speak(text, button) {
        if ('speechSynthesis' in window) {
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
        } else {
            alert('Text-to-Speech is not supported in your browser.');
        }
    },

    stopSpeaking() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
};
