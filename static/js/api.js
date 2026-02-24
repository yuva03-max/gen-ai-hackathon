import { Config } from './config.js';
import { I18n } from './modules/i18n.js';

/**
 * API Manager
 * Calls the Backend which proxies to OpenRouter and OpenWeather.
 */
export const API = {

    async askLLM(systemPrompt, userPrompt) {
        const langInstr = I18n.getAILanguageInstruction();
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_prompt: (systemPrompt || '') + langInstr,
                user_prompt: userPrompt
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    },

    async askVision(imageFile, systemPrompt) {
        const optimizedImage = await this.optimizeImage(imageFile);
        const langInstr = I18n.getAILanguageInstruction();
        const response = await fetch('/api/vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_prompt: (systemPrompt || '') + langInstr,
                image: optimizedImage
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    },

    async askSoilVision(imageFile) {
        const optimizedImage = await this.optimizeImage(imageFile);
        const langInstr = I18n.getAILanguageInstruction();
        const response = await fetch('/api/soil-vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: optimizedImage, lang_instruction: langInstr })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    },

    async askCalendar(crop, location = "", season = "") {
        const langInstr = I18n.getAILanguageInstruction();
        const response = await fetch('/api/crop-calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ crop, location, season, lang_instruction: langInstr })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    },

    async askIrrigation(crop, growthStage = "", climate = "") {
        const langInstr = I18n.getAILanguageInstruction();
        const response = await fetch('/api/irrigation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ crop, growth_stage: growthStage, climate, lang_instruction: langInstr })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    },

    async askNaturalFertilizers(crop, soilType = "", goal = "", problem = "", region = "") {
        const langInstr = I18n.getAILanguageInstruction();
        const response = await fetch('/api/natural-fertilizers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                crop,
                soil_type: soilType,
                goal,
                problem,
                region,
                lang_instruction: langInstr
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    },


    async askMarket(crop, region = "", district = "") {
        const langInstr = I18n.getAILanguageInstruction();
        const response = await fetch('/api/market-prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ crop, region, district, lang_instruction: langInstr })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    },

    async getWeather(lat, lon) {
        const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        return await response.json();
    },

    async getForecast(lat, lon) {
        const response = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
        return await response.json();
    },

    // Helper: Resize and Compress Image
    optimizeImage(file, maxWidth = 1024, maxHeight = 1024) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
            };
            reader.onerror = error => reject(error);
        });
    },

    // Helper: Convert File to Base64 (Kept for compatibility)
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
};
