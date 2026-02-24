import { API } from '../api.js';
import { TTS } from './tts.js';

export const Tools = {
    init() {
        this.bindForm('crop-calendar-form', this.handleCalendar);
        this.bindForm('irrigation-guide-form', this.handleIrrigation);
        this.bindForm('market-prices-form', this.handleMarket);
        this.bindForm('fertilizer-guide-form', this.handleFertilizers);
    },

    bindForm(id, handler) {
        const form = document.getElementById(id);
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                handler.call(this);
            });
        }
    },

    async handleCalendar() {
        const crop = document.getElementById('crop-type').value;
        const div = document.getElementById('calendar-result');
        div.innerHTML = '<div class="spinner-border text-success"></div> Generating...';
        try {
            const result = await API.askCalendar(crop);
            div.innerHTML = `
                <div class="p-3 bg-light border rounded result-with-tts">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <strong>Crop Calendar</strong>
                        ${TTS.getButtonHTML()}
                    </div>
                    <div class="markdown-body">${marked.parse(result)}</div>
                </div>`;
            TTS.bindToContainer(div, result);
        } catch (e) {
            div.innerHTML = `<div class="alert alert-warning">Error: ${e.message}</div>`;
        }
    },

    async handleIrrigation() {
        const crop = document.getElementById('irrigation-crop').value;
        const soil = document.getElementById('soil-type').value;
        const div = document.getElementById('irrigation-result');
        div.innerHTML = '<div class="spinner-border text-primary"></div> Calculating...';
        try {
            const result = await API.askIrrigation(crop, '', soil);
            div.innerHTML = `
                <div class="p-3 bg-light border rounded result-with-tts">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <strong>Irrigation Guide</strong>
                        ${TTS.getButtonHTML()}
                    </div>
                    <div class="markdown-body">${marked.parse(result)}</div>
                </div>`;
            TTS.bindToContainer(div, result);
        } catch (e) {
            div.innerHTML = `<div class="alert alert-warning">Error: ${e.message}</div>`;
        }
    },

    async handleMarket() {
        const crop = document.getElementById('market-crop').value;
        const district = document.getElementById('district').value;
        const div = document.getElementById('market-result');
        div.innerHTML = '<div class="spinner-border text-success"></div> Fetching...';
        try {
            const result = await API.askMarket(crop, '', district);
            div.innerHTML = `
                <div class="p-3 bg-light border rounded result-with-tts">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <strong>Market Prices</strong>
                        ${TTS.getButtonHTML()}
                    </div>
                    <div class="markdown-body">${marked.parse(result)}</div>
                </div>`;
            TTS.bindToContainer(div, result);
        } catch (e) {
            div.innerHTML = `<div class="alert alert-warning">Error: ${e.message}</div>`;
        }
    },

    async handleFertilizers() {
        const crop = document.getElementById('fertilizer-crop').value;
        const soil = document.getElementById('fertilizer-soil').value;
        const goal = document.getElementById('fertilizer-goal').value;
        const notes = document.getElementById('fertilizer-notes').value;
        const region = document.getElementById('fertilizer-region').value;
        const div = document.getElementById('fertilizer-result');
        div.innerHTML = '<div class="spinner-border text-success"></div> Preparing organic fertilizer plan...';
        try {
            const result = await API.askNaturalFertilizers(crop, soil, goal, notes, region);
            div.innerHTML = `
                <div class="p-3 bg-light border rounded result-with-tts">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <strong>Natural / Organic Fertilizer Guide</strong>
                        ${TTS.getButtonHTML()}
                    </div>
                    <div class="markdown-body">${marked.parse(result)}</div>
                </div>`;
            TTS.bindToContainer(div, result);
        } catch (e) {
            div.innerHTML = `<div class="alert alert-warning">Error: ${e.message}</div>`;
        }
    },

    saveHistory(type, data) {
        let history = JSON.parse(localStorage.getItem('chisa_history')) || [];
        history.unshift({ type, data, timestamp: new Date() });
        localStorage.setItem('chisa_history', JSON.stringify(history));
    }
};
