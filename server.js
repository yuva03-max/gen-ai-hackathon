const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "500889e3ed8865441bbfb67e99b9a412";
const PRIMARY_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'static')));

// Helper: Call Groq API
async function callGroq(messages, model, apiKey) {
    if (!apiKey) {
        throw new Error("Groq API Key is not configured.");
    }

    const payload = {
        model: model,
        messages: messages,
        max_tokens: 1500,
        temperature: 0.7,
    };

    try {
        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            timeout: 60000
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            let message = error.response.data?.error?.message || error.message;

            if (status === 401) message = "Invalid Groq API Key.";
            if (status === 403) message = "Groq API Forbidden. Check account credits or model restrictions.";
            if (status === 429) message = "Rate limit exceeded. Please wait a moment and try again.";

            const err = new Error(message);
            err.status = status;
            throw err;
        }
        throw error;
    }
}

// Routes
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'templates', 'index.html');
    res.sendFile(indexPath);
});

app.post('/api/chat', async (req, res) => {
    try {
        const { system_prompt, user_prompt, lang_instruction = "" } = req.body;

        if (!user_prompt) {
            return res.status(400).json({ error: { message: "user_prompt is required" } });
        }

        const isMarketRequest = ["price", "mandi", "market", "trend", "prediction"].some(kw =>
            user_prompt.toLowerCase().includes(kw)
        );

        if (isMarketRequest) {
            return await handleMarketPrices(req, res);
        }

        const enhancedSystemPrompt =
            (system_prompt || "You are an Expert AI Agriculture Assistant.") +
            "\nRules: Provide expert agricultural guidance. Keep responses simple, clear, and farmer-friendly. " +
            "Focus on Indian agriculture context. Provide concise, actionable, and practical answers." +
            lang_instruction;

        const messages = [
            { role: "system", content: enhancedSystemPrompt },
            { role: "user", content: user_prompt }
        ];

        const response = await callGroq(messages, PRIMARY_MODEL, GROQ_API_KEY);
        res.json({ ...response, function: "AI Assistant" });
    } catch (error) {
        res.status(error.status || 500).json({ error: { message: error.message } });
    }
});

app.post('/api/vision', async (req, res) => {
    try {
        const { image, system_prompt, lang_instruction = "" } = req.body;
        if (!image) {
            return res.status(400).json({ error: { message: "Image data is required" } });
        }

        const enhancedSystemPrompt =
            (system_prompt || "Analyze this crop image.") +
            "\nRules: Identify crop type, growth stage, disease, pests, and nutrient deficiencies. " +
            "Provide treatment recommendations. Keep responses clear and farmer-friendly." +
            lang_instruction;

        const messages = [
            { role: "system", content: enhancedSystemPrompt },
            {
                role: "user",
                content: [
                    { type: "image_url", image_url: { url: image } }
                ]
            }
        ];

        const response = await callGroq(messages, VISION_MODEL, GROQ_API_KEY);
        res.json({ ...response, function: "Plant Vision" });
    } catch (error) {
        res.status(error.status || 500).json({ error: { message: error.message } });
    }
});

app.post('/api/soil-vision', async (req, res) => {
    try {
        const { image, lang_instruction = "" } = req.body;
        if (!image) {
            return res.status(400).json({ error: { message: "Image data is required" } });
        }

        const systemPrompt =
            "You are an expert soil scientist analysing a soil or field image.\n" +
            "Tasks:\n" +
            "1) Identify likely soil type (clay, loam, sandy, black soil, or mix).\n" +
            "2) Use soil colour and texture to estimate relative organic matter (low, medium, high).\n" +
            "3) Look for signs of erosion or land degradation (gullies, exposed roots, bare patches).\n" +
            "4) Analyse crack patterns or surface condition to infer moisture level (dry/cracked, moist, waterlogged).\n" +
            "5) Give short, practical recommendations for improving soil health and moisture management.\n" +
            "Keep the explanation simple and farmer-friendly. Answer in Markdown with clear sections and bullet points." +
            lang_instruction;

        const messages = [
            { role: "system", content: systemPrompt },
            {
                role: "user",
                content: [
                    { type: "image_url", image_url: { url: image } }
                ]
            }
        ];

        const response = await callGroq(messages, VISION_MODEL, GROQ_API_KEY);
        res.json({ ...response, function: "Soil Vision" });
    } catch (error) {
        res.status(error.status || 500).json({ error: { message: error.message } });
    }
});

app.post('/api/vision-local', async (req, res) => {
    res.status(503).json({
        error: {
            message: "Local vision stack (TensorFlow/OpenCV) is not available in Node.js version yet. Use Groq Vision engine instead."
        }
    });
});

app.post('/api/crop-calendar', async (req, res) => {
    try {
        const { crop, location = "India", season = "the current season", lang_instruction = "" } = req.body;

        if (!crop) {
            return res.status(400).json({ error: { message: "crop is required" } });
        }

        const userPrompt = `Generate a detailed crop calendar for ${crop} in ${location} during ${season}.`;
        const systemPrompt =
            "You are an Expert AI Crop Calendar Generator. Include sowing, growth, irrigation phases, " +
            "fertilization, and harvest timing. Keep responses simple, clear, and farmer-friendly. " +
            "Focus on Indian agriculture context." +
            lang_instruction;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        const response = await callGroq(messages, PRIMARY_MODEL, GROQ_API_KEY);
        res.json({ ...response, function: "Crop Calendar" });
    } catch (error) {
        res.status(error.status || 500).json({ error: { message: error.message } });
    }
});

app.post('/api/irrigation', async (req, res) => {
    try {
        const { crop, growth_stage = "general", climate = "not specified", lang_instruction = "" } = req.body;

        if (!crop) {
            return res.status(400).json({ error: { message: "crop is required" } });
        }

        const userPrompt = `Recommend an irrigation schedule for ${crop} at ${growth_stage} growth stage. Soil/climate condition: ${climate}.`;
        const systemPrompt =
            "You are an Irrigation Management Expert. Recommend schedules, promote water efficiency, " +
            "and explain reasoning. Keep responses simple, clear, and farmer-friendly. " +
            "Focus on Indian agriculture context." +
            lang_instruction;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        const response = await callGroq(messages, PRIMARY_MODEL, GROQ_API_KEY);
        res.json({ ...response, function: "Irrigation Management" });
    } catch (error) {
        res.status(error.status || 500).json({ error: { message: error.message } });
    }
});

app.post('/api/natural-fertilizers', async (req, res) => {
    try {
        const {
            crop,
            soil_type = "unspecified soil type",
            goal = "improve yield and soil health using only natural inputs",
            problem = "",
            region = "India",
            lang_instruction = ""
        } = req.body;

        if (!crop) {
            return res.status(400).json({ error: { message: "crop is required" } });
        }

        const userPrompt =
            `Farmer details:\n` +
            `- Crop: ${crop}\n` +
            `- Soil type/condition: ${soil_type}\n` +
            `- Region: ${region}\n` +
            `- Main goal: ${goal}\n` +
            `- Field notes / problems: ${problem || "none specified"}\n\n` +
            `Generate a natural / organic fertilizer management plan for this situation.`;

        const systemPrompt =
            "You are an Organic & Natural Fertilizer Specialist for Indian agriculture.\n" +
            "ONLY recommend natural / organic inputs such as farmyard manure, vermicompost, compost, green manures,\n" +
            "neem cake, oil cakes, biofertilizers (Rhizobium, Azotobacter, PSB, etc.), liquid organic tonics (e.g. jeevamrut, panchagavya),\n" +
            "and on-farm residues. Do NOT recommend chemical / synthetic NPK or complex fertilizers.\n\n" +
            "For each answer:\n" +
            "1) Start with a short summary of the soil and crop situation.\n" +
            "2) Recommend 3–5 main organic fertilizer options with:\n" +
            "   - Material name and simple description\n" +
            "   - Approximate dose per acre / hectare and timing (basal, top dressing, foliar, etc.)\n" +
            "   - Method of application and safety notes\n" +
            "3) Add a simple \"Farmer reference\" section listing common organic fertilizers, what they mainly supply (N / P / K / micronutrients / organic matter)\n" +
            "   and when they are best used.\n" +
            "4) Emphasise soil health, long term organic matter build-up, and residue-free production.\n" +
            "5) Keep the language very simple, farmer-friendly, and practical.\n" +
            "If exact doses are unknown, give safe approximate ranges and clearly mark them as approximate.\n" +
            "Focus on Indian crops and conditions.\n" +
            "Answer in Markdown with clear headings and bullet points." +
            lang_instruction;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        const response = await callGroq(messages, PRIMARY_MODEL, GROQ_API_KEY);
        res.json({ ...response, function: "Natural Fertilizer Guide" });
    } catch (error) {
        res.status(error.status || 500).json({ error: { message: error.message } });
    }
});


app.post('/api/market-prices', async (req, res) => {
    await handleMarketPrices(req, res);
});

async function handleMarketPrices(req, res) {
    try {
        const { crop, region, district, user_prompt, lang_instruction = "" } = req.body;

        const cropName = crop || user_prompt || "crops";
        const location = district || region || "local region";

        const userPrompt = `Fetch or simulate market prices for ${cropName} in ${location}. Provide current price range, trends, and a short-term outlook. Include approximate mandi prices in INR per quintal.`;
        const systemPrompt =
            "You are a Market Price Analyst for Indian agriculture. Provide realistic price ranges, trends, " +
            "and outlooks. Label estimates clearly. Keep responses simple, clear, and farmer-friendly." +
            lang_instruction;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        const response = await callGroq(messages, PRIMARY_MODEL, GROQ_API_KEY);
        res.json({ ...response, function: "Market Prices" });
    } catch (error) {
        res.status(error.status || 500).json({ error: { message: error.message } });
    }
}

app.get('/api/weather', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ error: { message: "lat and lon are required" } });
        }

        const response = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
            params: {
                lat,
                lon,
                appid: OPENWEATHER_API_KEY,
                units: "metric"
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: { message: "Failed to fetch weather data" } });
    }
});

app.get('/api/forecast', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ error: { message: "lat and lon are required" } });
        }

        const response = await axios.get("https://api.openweathermap.org/data/2.5/forecast", {
            params: {
                lat,
                lon,
                appid: OPENWEATHER_API_KEY,
                units: "metric"
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: { message: "Failed to fetch forecast data" } });
    }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: {
            message: err.message || "Internal Server Error"
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open in browser: http://localhost:${PORT}`);
});

module.exports = app;


