import { API } from '../api.js';
import { TTS } from './tts.js';

export const Soil = {

    init() {
        const uploadZone = document.getElementById('soil-upload-zone');
        const fileInput  = document.getElementById('soil-file-input');
        const analyzeBtn = document.getElementById('soil-analyze-btn');
        const clearBtn   = document.getElementById('soil-clear-btn');

        if (!fileInput) return;

        // Click on zone → open file picker
        uploadZone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target !== fileInput) fileInput.click();
        });

        // File selected
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) this.handlePreview(fileInput.files[0]);
        });

        // Drag-and-drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('soil-drag-over');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('soil-drag-over');
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('soil-drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
                this.handlePreview(file);
            }
        });

        if (analyzeBtn) analyzeBtn.addEventListener('click', () => this.analyzeImage());

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.resetPanel());
        }
    },

    handlePreview(file) {
        const previewImg       = document.getElementById('soil-preview-img');
        const previewContainer = document.getElementById('soil-preview-container');
        const placeholder      = document.getElementById('soil-upload-placeholder');

        if (previewImg) {
            previewImg.src = URL.createObjectURL(file);
            previewContainer.classList.remove('d-none');
            if (placeholder) placeholder.classList.add('d-none');
        }
    },

    async analyzeImage() {
        const fileInput = document.getElementById('soil-file-input');
        if (!fileInput.files[0]) {
            alert('Please select a soil photo first.');
            return;
        }

        const resultDiv = document.getElementById('soil-result');
        // Show spinner
        resultDiv.innerHTML = `
            <div class="text-center py-5">
                <div class="soil-spinner mb-3">
                    <i class="fas fa-circle-notch fa-spin fa-3x text-amber"></i>
                </div>
                <p class="text-muted fw-semibold">Analysing soil with Groq Vision AI…</p>
                <small class="text-secondary">Detecting type · organic matter · erosion · moisture</small>
            </div>`;

        // Reset stat chips
        this.setStatCard('soil-type-card',    '—', 'detecting…',   'soil-chip-neutral');
        this.setStatCard('organic-card',      '—', 'detecting…',   'soil-chip-neutral');
        this.setStatCard('erosion-card',      '—', 'detecting…',   'soil-chip-neutral');
        this.setStatCard('moisture-card',     '—', 'detecting…',   'soil-chip-neutral');

        try {
            const analysis = await API.askSoilVision(fileInput.files[0]);

            // Parse quick stats from markdown text
            this.parseAndFillCards(analysis);

            resultDiv.innerHTML = `
                <div class="p-3 result-with-tts">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h5 class="text-amber m-0">
                            <i class="fas fa-layer-group me-2"></i>Soil Analysis Report
                        </h5>
                        ${TTS.getButtonHTML()}
                    </div>
                    <div class="markdown-body">${marked.parse(analysis)}</div>
                </div>`;

            TTS.bindToContainer(resultDiv, analysis);

        } catch (e) {
            console.error('[Soil] Error:', e);
            resultDiv.innerHTML = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>Analysis Failed: ${e.message}</div>`;
        }
    },

    /**
     * Scan the AI markdown output for key soil indicators and update the stat cards.
     */
    parseAndFillCards(text) {
        const lower = text.toLowerCase();

        // --- Soil Type ---
        const soilTypes = {
            'black soil': { label: 'Black Soil', cls: 'soil-chip-dark' },
            'clay':       { label: 'Clay',       cls: 'soil-chip-brown' },
            'loam':       { label: 'Loam',       cls: 'soil-chip-amber' },
            'sandy':      { label: 'Sandy',      cls: 'soil-chip-sand' },
            'silt':       { label: 'Silt',       cls: 'soil-chip-brown' },
            'red soil':   { label: 'Red Soil',   cls: 'soil-chip-red'  },
        };
        let detectedType = { label: 'Unknown', cls: 'soil-chip-neutral' };
        for (const [key, val] of Object.entries(soilTypes)) {
            if (lower.includes(key)) { detectedType = val; break; }
        }
        this.setStatCard('soil-type-card', detectedType.label, 'Soil Type', detectedType.cls);

        // --- Organic Matter ---
        let organicLabel = 'Unknown', organicCls = 'soil-chip-neutral';
        if (lower.includes('high organic') || lower.includes('organic matter: high') || lower.includes('rich in organic')) {
            organicLabel = 'High 🌿'; organicCls = 'soil-chip-green';
        } else if (lower.includes('medium organic') || lower.includes('moderate organic') || lower.includes('organic matter: medium')) {
            organicLabel = 'Medium 🌱'; organicCls = 'soil-chip-amber';
        } else if (lower.includes('low organic') || lower.includes('poor in organic') || lower.includes('organic matter: low')) {
            organicLabel = 'Low ⚠️'; organicCls = 'soil-chip-red';
        }
        this.setStatCard('organic-card', organicLabel, 'Organic Matter', organicCls);

        // --- Erosion ---
        let erosionLabel = 'None Detected', erosionCls = 'soil-chip-green';
        if (lower.includes('severe erosion') || lower.includes('heavy erosion')) {
            erosionLabel = 'Severe ⛔'; erosionCls = 'soil-chip-red';
        } else if (lower.includes('moderate erosion') || lower.includes('signs of erosion')) {
            erosionLabel = 'Moderate ⚠️'; erosionCls = 'soil-chip-amber';
        } else if (lower.includes('mild erosion') || lower.includes('minor erosion')) {
            erosionLabel = 'Mild ℹ️'; erosionCls = 'soil-chip-blue';
        } else if (lower.includes('no erosion') || lower.includes('no sign')) {
            erosionLabel = 'None ✅'; erosionCls = 'soil-chip-green';
        }
        this.setStatCard('erosion-card', erosionLabel, 'Erosion / Degradation', erosionCls);

        // --- Moisture ---
        let moistureLabel = 'Unknown', moistureCls = 'soil-chip-neutral';
        if (lower.includes('waterlogged') || lower.includes('saturated')) {
            moistureLabel = 'Waterlogged 💧'; moistureCls = 'soil-chip-blue';
        } else if (lower.includes('moist') && !lower.includes('very moist')) {
            moistureLabel = 'Moist ✅'; moistureCls = 'soil-chip-green';
        } else if (lower.includes('dry') || lower.includes('cracked') || lower.includes('moisture stress')) {
            moistureLabel = 'Dry / Cracked 🌵'; moistureCls = 'soil-chip-red';
        } else if (lower.includes('adequate moisture')) {
            moistureLabel = 'Adequate 👍'; moistureCls = 'soil-chip-green';
        }
        this.setStatCard('moisture-card', moistureLabel, 'Moisture Level', moistureCls);
    },

    setStatCard(id, value, label, chipClass) {
        const card = document.getElementById(id);
        if (!card) return;
        const valEl   = card.querySelector('.soil-stat-value');
        const labelEl = card.querySelector('.soil-stat-label');
        if (valEl)   valEl.textContent   = value;
        if (labelEl) labelEl.textContent = label;
    },

    resetPanel() {
        const fileInput        = document.getElementById('soil-file-input');
        const previewContainer = document.getElementById('soil-preview-container');
        const placeholder      = document.getElementById('soil-upload-placeholder');
        const previewImg       = document.getElementById('soil-preview-img');
        const resultDiv        = document.getElementById('soil-result');

        if (fileInput)        fileInput.value = '';
        if (previewImg)       previewImg.src = '';
        if (previewContainer) previewContainer.classList.add('d-none');
        if (placeholder)      placeholder.classList.remove('d-none');

        ['soil-type-card', 'organic-card', 'erosion-card', 'moisture-card'].forEach(id => {
            this.setStatCard(id, '—', 'Waiting…', 'soil-chip-neutral');
        });

        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="text-center text-secondary py-5">
                    <i class="fas fa-mountain fa-3x mb-3 opacity-25"></i>
                    <p class="lead small">Upload a soil or field photo to begin analysis</p>
                </div>`;
        }
    }
};
