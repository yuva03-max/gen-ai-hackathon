import { Config } from './config.js';
import { Dashboard } from './modules/dashboard.js';
import { Chat } from './modules/chat.js';
import { Vision } from './modules/vision.js';
import { Tools } from './modules/tools.js';
import { Soil } from './modules/soil.js';
import { I18n } from './modules/i18n.js';

class ChisaApp {
    constructor() {
        this.init();
    }

    init() {
        console.log('🌱 Chisa AI Initializing...');

        // 1. Initialize Language System first (so translations apply to UI)
        I18n.init();

        // 2. Initialize Feature Modules
        Dashboard.init();
        Chat.init();
        Vision.init();
        Tools.init();
        Soil.init();

        // 2. Setup Tab Navigation
        this.setupTabs();

        // 3. Theme Logic
        this.setupTheme();

        // 4. Update Time
        this.updateTime();
        setInterval(() => this.updateTime(), 60000);
    }

    setupTabs() {
        const navLinks = document.querySelectorAll('.sidebar .nav-link[data-tab]');
        // Map section ID → i18n title key
        const titleKeys = {
            'dashboard-section': 'title.dashboard',
            'chat-section':      'title.chat',
            'disease-section':   'title.disease',
            'soil-section':      'title.soil',
            'calendar-section':  'title.calendar',
            'irrigation-section':'title.irrigation',
            'fertilizer-section':'title.fertilizer',
            'market-section':    'title.market'
        };

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('data-tab');

                // Update nav active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Show correct tab pane
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('show', 'active');
                });
                const target = document.getElementById(targetId);
                if (target) {
                    target.classList.add('show', 'active');
                }

                // Update page title using i18n
                const titleEl = document.getElementById('page-title');
                if (titleEl) {
                    const key = titleKeys[targetId];
                    titleEl.textContent = key ? I18n.t(key) : 'Chisa AI';
                }
            });
        });
    }

    setupTheme() {
        const theme = Config.getTheme();
        document.body.setAttribute('data-theme', theme);

        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            const icon = toggle.querySelector('i');
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

            toggle.addEventListener('click', () => {
                const current = document.body.getAttribute('data-theme');
                const newTheme = current === 'dark' ? 'light' : 'dark';
                document.body.setAttribute('data-theme', newTheme);
                Config.setTheme(newTheme);
                icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            });
        }
    }

    updateTime() {
        const el = document.getElementById('current-date');
        if (el) {
            const now = new Date();
            el.textContent = now.toLocaleDateString('en-IN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }
    }
}

// Start App
document.addEventListener('DOMContentLoaded', () => {
    window.app    = new ChisaApp();
    window.Vision = Vision;   // expose for inline QR modal onclick
});
