/**
 * ================================================================
 *  Chisa AI — Advanced Plant Vision Module
 *  8 Advanced AI-powered features via Groq Vision
 * ================================================================
 */

import { API } from '../api.js';
import { TTS } from './tts.js';

export const Vision = {

    /* ── State ── */
    currentFile: null,
    scanHistory: [],  // Disease progression tracking

    init() {
        const uploadZone = document.getElementById('upload-zone');
        const fileInput  = document.getElementById('disease-file-input');
        const analyzeBtn = document.getElementById('analyze-btn');
        const clearBtn   = document.getElementById('clear-img-btn');
        const qrBtn      = document.getElementById('vision-qr-btn');

        if (!fileInput) return;

        /* Click on zone → file picker */
        uploadZone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target !== fileInput) fileInput.click();
        });

        /* File selected */
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) {
                this.currentFile = fileInput.files[0];
                this.handlePreview(this.currentFile);
            }
        });

        /* Drag-and-drop */
        uploadZone.addEventListener('dragover',  (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
        uploadZone.addEventListener('dragleave', ()  => uploadZone.classList.remove('drag-over'));
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
                this.currentFile = file;
                this.handlePreview(file);
            }
        });

        if (analyzeBtn) analyzeBtn.addEventListener('click', () => this.analyzeImage());
        if (clearBtn)   clearBtn.addEventListener('click',   () => this.resetPanel());
        if (qrBtn)      qrBtn.addEventListener('click',      () => this.generateQRReport());

        /* Mode selector tabs */
        document.querySelectorAll('.vision-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.vision-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    },

    /* ─────────────────────────────────────────────
       PREVIEW
    ───────────────────────────────────────────── */
    handlePreview(file) {
        const previewImg       = document.getElementById('preview-img');
        const previewContainer = document.getElementById('image-preview-container');
        const placeholder      = document.querySelector('.upload-content');

        if (previewImg) {
            previewImg.src = URL.createObjectURL(file);
            previewContainer.classList.remove('d-none');
            if (placeholder) placeholder.classList.add('d-none');
        }

        /* Pulse the analyze button */
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) analyzeBtn.classList.add('pulse-ready');
    },

    /* ─────────────────────────────────────────────
       MAIN ANALYSIS
    ───────────────────────────────────────────── */
    async analyzeImage() {
        const fileInput = document.getElementById('disease-file-input');
        const file = fileInput?.files ? fileInput.files[0] : null;
        if (!file) {
            this.showAlert('Please select a plant photo first.', 'warning');
            return;
        }

        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.classList.remove('pulse-ready');
            analyzeBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i>Scanning…';
        }

        this.resetResultPanel();
        this.setLoading(true);

        /* Reset all stat cards */
        this.setCard('v-severity',    '—', 'Severity',       'vision-chip-neutral');
        this.setCard('v-pathogen',    '—', 'Pathogen Type',  'vision-chip-neutral');
        this.setCard('v-stage',       '—', 'Disease Stage',  'vision-chip-neutral');
        this.setCard('v-spread-risk', '—', 'Spread Risk',    'vision-chip-neutral');

        try {
            const systemPrompt = this.buildSystemPrompt();
            const safeName = file.name || 'plant-photo';
            const analysis = await API.askVision(file, systemPrompt);

            this.setLoading(false);
            this.renderResult(analysis, safeName);
            this.parseAndFillCards(analysis);
            this.renderProgressBar(analysis);
            this.renderSpreadRisk(analysis);
            this.storeToHistory(analysis);

        } catch (e) {
            console.error('[Vision] Error:', e);
            this.setLoading(false);
            document.getElementById('disease-result').innerHTML =
                `<div class="alert alert-danger rounded-3">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    <strong>Analysis Failed:</strong> ${e.message}
                </div>`;
        } finally {
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '<i class="fas fa-microscope me-2"></i><span data-i18n="vision.analyze">Run Analysis</span>';
            }
        }
    },

    /* ─────────────────────────────────────────────
       SYSTEM PROMPT — All 8 features in one call
    ───────────────────────────────────────────── */
    buildSystemPrompt() {
        return `You are an Advanced Agricultural Plant Pathologist AI. Analyze the provided plant/leaf image with expert precision.

Provide your analysis in EXACTLY this Markdown structure (use these exact headings):

## 🔍 Plant Identification
- Plant species and variety

## ⚠️ Early-Stage Detection
- Detect ANY early symptoms BEFORE they become fully visible (micro-lesions, color shifts, texture anomalies)
- State confidence: [HIGH / MEDIUM / LOW]
- Early warning: [YES / NO]

## 🦠 Disease Detection (Multi-Disease Scan)
- List ALL detected diseases (even mild ones)
- For each disease: name, affected area %, severity [Mild / Moderate / Severe / Critical]

## 🧫 Pathogen Classification
- Primary pathogen type: [Fungal / Bacterial / Viral / Pest / Nutrient Deficiency / Abiotic]
- Specific pathogen name if identifiable
- Key diagnostic features used

## 📈 Disease Progression Stage
- Current stage: [Stage 1: Early / Stage 2: Moderate / Stage 3: Severe / Stage 4: Critical]
- Progression speed: [Slow / Moderate / Fast]
- Estimated days since infection onset

## 🔬 Root Cause Analysis
- Primary cause (why did this disease occur?)
- Contributing environmental factors
- Agronomic practices that led to this

## 🌍 Spread Risk Prediction
- Spread risk to neighboring plants: [Low / Medium / High / Critical]
- Transmission method (wind/water/contact/insect)
- Estimated radius of risk in meters
- Recommended isolation zone

## 💊 Treatment Protocol
- Immediate action (within 24 hours)
- Chemical treatment (if needed): product name + dosage
- Organic alternatives
- Preventive measures for healthy plants

## 📊 Recovery Prognosis
- Recovery probability: [percentage]
- Expected recovery time
- Long-term management advice

Keep the response detailed but farmer-friendly. Use bullet points. Provide specific, actionable advice.`;
    },

    /* ─────────────────────────────────────────────
       RENDER RESULT
    ───────────────────────────────────────────── */
    renderResult(analysis, filename) {
        const resultDiv = document.getElementById('disease-result');
        const timestamp = new Date().toLocaleTimeString();

        resultDiv.innerHTML = `
            <div class="vision-result-header">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="vision-result-badge badge-success-soft">
                        <i class="fas fa-check-circle me-1"></i>Analysis Complete
                    </span>
                    <span class="vision-result-badge badge-info-soft">
                        <i class="fas fa-clock me-1"></i>${timestamp}
                    </span>
                    <span class="vision-result-badge badge-neutral-soft">
                        <i class="fas fa-file-image me-1"></i>${filename}
                    </span>
                </div>
                ${TTS.getButtonHTML()}
            </div>
            <div class="markdown-body vision-markdown mt-3">${marked.parse(analysis)}</div>
            <div class="mt-3 d-flex gap-2 flex-wrap">
                <button class="btn vision-action-btn" id="vision-qr-btn">
                    <i class="fas fa-qrcode me-2"></i>Generate QR Report
                </button>
                <button class="btn vision-action-btn-outline" onclick="window.print()">
                    <i class="fas fa-print me-2"></i>Print Report
                </button>
            </div>`;

        TTS.bindToContainer(resultDiv, analysis);

        /* Bind QR button after render */
        const qrBtn = document.getElementById('vision-qr-btn');
        if (qrBtn) qrBtn.addEventListener('click', () => this.generateQRReport(analysis));
    },

    /* ─────────────────────────────────────────────
       PARSE & FILL STAT CARDS
    ───────────────────────────────────────────── */
    parseAndFillCards(text) {
        const lower = text.toLowerCase();

        /* Severity */
        if (lower.includes('critical'))       this.setCard('v-severity', 'Critical', 'Severity', 'vision-chip-critical');
        else if (lower.includes('severe'))    this.setCard('v-severity', 'Severe',   'Severity', 'vision-chip-danger');
        else if (lower.includes('moderate'))  this.setCard('v-severity', 'Moderate', 'Severity', 'vision-chip-warning');
        else if (lower.includes('mild'))      this.setCard('v-severity', 'Mild',     'Severity', 'vision-chip-success');
        else                                  this.setCard('v-severity', 'Healthy',  'Severity', 'vision-chip-success');

        /* Pathogen */
        if (lower.includes('fungal') || lower.includes('fungus'))
            this.setCard('v-pathogen', 'Fungal', 'Pathogen', 'vision-chip-purple');
        else if (lower.includes('bacterial') || lower.includes('bacteria'))
            this.setCard('v-pathogen', 'Bacterial', 'Pathogen', 'vision-chip-red');
        else if (lower.includes('viral') || lower.includes('virus'))
            this.setCard('v-pathogen', 'Viral', 'Pathogen', 'vision-chip-orange');
        else if (lower.includes('pest') || lower.includes('insect'))
            this.setCard('v-pathogen', 'Pest', 'Pathogen', 'vision-chip-warning');
        else if (lower.includes('nutrient') || lower.includes('deficiency'))
            this.setCard('v-pathogen', 'Nutrient', 'Pathogen', 'vision-chip-info');
        else
            this.setCard('v-pathogen', 'Abiotic', 'Pathogen', 'vision-chip-neutral');

        /* Stage */
        if (lower.includes('stage 4') || lower.includes('stage 4:'))
            this.setCard('v-stage', 'Stage 4', 'Disease Stage', 'vision-chip-critical');
        else if (lower.includes('stage 3') || lower.includes('stage 3:'))
            this.setCard('v-stage', 'Stage 3', 'Disease Stage', 'vision-chip-danger');
        else if (lower.includes('stage 2') || lower.includes('stage 2:'))
            this.setCard('v-stage', 'Stage 2', 'Disease Stage', 'vision-chip-warning');
        else if (lower.includes('stage 1') || lower.includes('stage 1:') || lower.includes('early'))
            this.setCard('v-stage', 'Stage 1', 'Disease Stage', 'vision-chip-success');
        else
            this.setCard('v-stage', 'Normal', 'Disease Stage', 'vision-chip-success');

        /* Spread Risk */
        if (lower.includes('spread risk') && (lower.includes('critical') || lower.includes('very high')))
            this.setCard('v-spread-risk', 'Critical', 'Spread Risk', 'vision-chip-critical');
        else if (lower.includes('high') && lower.includes('spread'))
            this.setCard('v-spread-risk', 'High', 'Spread Risk', 'vision-chip-danger');
        else if (lower.includes('medium') && lower.includes('spread'))
            this.setCard('v-spread-risk', 'Medium', 'Spread Risk', 'vision-chip-warning');
        else
            this.setCard('v-spread-risk', 'Low', 'Spread Risk', 'vision-chip-success');
    },

    /* ─────────────────────────────────────────────
       PROGRESSION BAR
    ───────────────────────────────────────────── */
    renderProgressBar(text) {
        const lower = text.toLowerCase();
        const bar = document.getElementById('disease-progress-bar');
        const label = document.getElementById('disease-progress-label');
        if (!bar) return;

        let pct = 10, color = '#22c55e', stage = 'Healthy / Stage 1';
        if (lower.includes('stage 4') || lower.includes('critical')) {
            pct = 95; color = '#ef4444'; stage = 'Stage 4 — Critical';
        } else if (lower.includes('stage 3') || lower.includes('severe')) {
            pct = 72; color = '#f97316'; stage = 'Stage 3 — Severe';
        } else if (lower.includes('stage 2') || lower.includes('moderate')) {
            pct = 45; color = '#eab308'; stage = 'Stage 2 — Moderate';
        } else if (lower.includes('stage 1') || lower.includes('mild') || lower.includes('early')) {
            pct = 20; color = '#84cc16'; stage = 'Stage 1 — Mild';
        }

        bar.style.width = pct + '%';
        bar.style.background = color;
        bar.setAttribute('aria-valuenow', pct);
        if (label) label.textContent = stage;
    },

    /* ─────────────────────────────────────────────
       SPREAD RISK RING
    ───────────────────────────────────────────── */
    renderSpreadRisk(text) {
        const lower = text.toLowerCase();
        const ring = document.getElementById('spread-risk-ring');
        if (!ring) return;

        let pct = 15, color = '#22c55e', label = 'Low Risk';
        if (lower.includes('spread risk') && lower.includes('critical'))  { pct = 95; color = '#ef4444'; label = 'Critical'; }
        else if (lower.includes('spread') && lower.includes('high'))      { pct = 70; color = '#f97316'; label = 'High Risk'; }
        else if (lower.includes('spread') && lower.includes('medium'))    { pct = 45; color = '#eab308'; label = 'Medium Risk'; }

        const circumference = 2 * Math.PI * 36;
        const offset = circumference - (pct / 100) * circumference;
        ring.style.strokeDasharray  = circumference;
        ring.style.strokeDashoffset = offset;
        ring.style.stroke = color;

        const rLabel = document.getElementById('spread-risk-label');
        if (rLabel) rLabel.textContent = label;
        const rPct = document.getElementById('spread-risk-pct');
        if (rPct) rPct.textContent = pct + '%';
    },

    /* ─────────────────────────────────────────────
       QR REPORT GENERATION
    ───────────────────────────────────────────── */
    generateQRReport(analysisText) {
        const modal = document.getElementById('vision-qr-modal');
        if (!modal) return;

        /* Build compact report text for QR */
        const lines = (analysisText || '').split('\n').filter(l => l.trim()).slice(0, 20);
        const shortReport = lines.join(' | ').substring(0, 200);
        const reportUrl = `data:text/plain,${encodeURIComponent(shortReport)}`;

        /* Generate QR using Google Charts API (no library needed) */
        const qrImg = document.getElementById('qr-code-img');
        if (qrImg) {
            const encoded = encodeURIComponent(
                `Chisa AI Plant Report\n${new Date().toLocaleDateString()}\n${shortReport}`
            );
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
        }

        /* Show modal */
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        /* Download JSON report */
        this._lastAnalysis = analysisText;
    },

    downloadReport() {
        const report = {
            timestamp: new Date().toISOString(),
            application: 'Chisa AI Smart Agriculture',
            feature: 'Advanced Plant Vision',
            analysis: this._lastAnalysis || 'No analysis available',
            cards: {
                severity:   document.getElementById('v-severity')?.querySelector('.vision-card-value')?.textContent,
                pathogen:   document.getElementById('v-pathogen')?.querySelector('.vision-card-value')?.textContent,
                stage:      document.getElementById('v-stage')?.querySelector('.vision-card-value')?.textContent,
                spreadRisk: document.getElementById('v-spread-risk')?.querySelector('.vision-card-value')?.textContent,
            }
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chisa-plant-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    /* ─────────────────────────────────────────────
       HELPERS
    ───────────────────────────────────────────── */
    setCard(id, value, label, chipClass) {
        const card = document.getElementById(id);
        if (!card) return;
        const valEl   = card.querySelector('.vision-card-value');
        const labelEl = card.querySelector('.vision-card-label');
        const chip    = card.querySelector('.vision-chip');
        if (valEl)   valEl.textContent   = value;
        if (labelEl) labelEl.textContent = label;
        if (chip) {
            chip.className = `vision-chip ${chipClass}`;
            chip.textContent = value;
        }
    },

    setLoading(on) {
        const result = document.getElementById('disease-result');
        const bar    = document.getElementById('disease-progress-bar');
        if (on) {
            result.innerHTML = `
                <div class="text-center py-5">
                    <div class="vision-scan-animation mb-3">
                        <i class="fas fa-leaf fa-3x vision-pulse-icon"></i>
                        <div class="vision-scan-line"></div>
                    </div>
                    <p class="fw-semibold text-success mt-3">Scanning with Groq Vision AI…</p>
                    <small class="text-secondary d-block">Early detection · Multi-disease · Pathogen type · Spread risk</small>
                </div>`;
            if (bar) { bar.style.width = '0%'; }
        }
    },

    resetResultPanel() {
        const result = document.getElementById('disease-result');
        if (result) result.innerHTML = '';
        const bar   = document.getElementById('disease-progress-bar');
        const label = document.getElementById('disease-progress-label');
        const ring  = document.getElementById('spread-risk-ring');
        if (bar)   { bar.style.width = '0%'; bar.style.background = '#e5e7eb'; }
        if (label) label.textContent = 'Awaiting scan…';
        const rPct   = document.getElementById('spread-risk-pct');
        const rLabel = document.getElementById('spread-risk-label');
        if (ring) { ring.style.strokeDashoffset = 2 * Math.PI * 36; ring.style.stroke = '#e5e7eb'; }
        if (rPct)   rPct.textContent   = '—';
        if (rLabel) rLabel.textContent = 'Not scanned';
    },

    resetPanel() {
        const fileInput = document.getElementById('disease-file-input');
        if (fileInput) fileInput.value = '';
        this.currentFile = null;
        const previewContainer = document.getElementById('image-preview-container');
        const previewImg       = document.getElementById('preview-img');
        const placeholder      = document.querySelector('.upload-content');
        if (previewImg)   previewImg.src = '';
        if (previewContainer) previewContainer.classList.add('d-none');
        if (placeholder) placeholder.classList.remove('d-none');
        this.resetResultPanel();
        ['v-severity', 'v-pathogen', 'v-stage', 'v-spread-risk'].forEach(id => {
            this.setCard(id, '—', id === 'v-severity' ? 'Severity' : id === 'v-pathogen' ? 'Pathogen Type' : id === 'v-stage' ? 'Disease Stage' : 'Spread Risk', 'vision-chip-neutral');
        });
    },

    storeToHistory(analysis) {
        this.scanHistory.unshift({ ts: new Date().toISOString(), analysis: analysis.substring(0, 400) });
        if (this.scanHistory.length > 10) this.scanHistory.pop();
        let h = JSON.parse(localStorage.getItem('chisa_history') || '[]');
        h.unshift({ type: 'vision_advanced', data: { snippet: analysis.substring(0, 80) }, timestamp: new Date() });
        if (h.length > 20) h.pop();
        localStorage.setItem('chisa_history', JSON.stringify(h));
    },

    showAlert(msg, type = 'info') {
        const result = document.getElementById('disease-result');
        if (result) result.innerHTML = `<div class="alert alert-${type} rounded-3"><i class="fas fa-info-circle me-2"></i>${msg}</div>`;
    }
};
