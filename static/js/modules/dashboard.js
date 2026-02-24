import { API } from '../api.js';

export const Dashboard = {
    init() {
        this.updateRealtimeWeather();
        this.updateHealthMetrics();
        setInterval(() => this.updateRealtimeWeather(), 600000); // Create 10 min refresh
    },

    async updateRealtimeWeather() {
        if (!navigator.geolocation) {
            this.setMockWeather();
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const data = await API.getWeather(latitude, longitude);

                if (data.main && data.weather) {
                    const temp = Math.round(data.main.temp);
                    const wind = Math.round(data.wind.speed * 3.6); // Convert m/s to km/h
                    const humidity = data.main.humidity;
                    const desc = data.weather[0].description.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); // Capitalize

                    this.updateDOM('dash-weather-temp', `${temp}°C`);
                    this.updateDOM('dash-weather-desc', desc);
                    this.updateDOM('dash-weather-wind', `<i class="fas fa-wind text-secondary"></i> ${wind} km/h`);
                    this.updateDOM('dash-weather-humidity', `<i class="fas fa-tint text-info"></i> ${humidity}% Humidity`);
                }

                // Fetch Forecast
                const forecastData = await API.getForecast(latitude, longitude);
                this.renderForecast(forecastData);

            } catch (e) {
                console.error('Weather error:', e);
                this.setMockWeather();
            }
        }, () => this.setMockWeather());
    },

    renderForecast(data) {
        if (!data || !data.list) return;

        const container = document.getElementById('forecast-container');
        if (!container) return;

        // Group by day (OpenWeatherMap gives 3h intervals, we take one per day, e.g., noon)
        const daily = {};
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toLocaleDateString();
            if (!daily[dayKey] && date.getHours() >= 11) {
                daily[dayKey] = item;
            }
        });

        // Ensure we have 5 days, if logic skips today due to time, fallback to first available
        let days = Object.values(daily).slice(0, 5);
        if (days.length === 0) days = data.list.slice(0, 5); // Fallback

        container.innerHTML = days.map(day => {
            const date = new Date(day.dt * 1000);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const temp = Math.round(day.main.temp);
            const icon = day.weather[0].icon;
            return `
                <div class="col">
                    <div class="p-3 bg-light rounded h-100 hover-shadow transition-fast">
                        <div class="small fw-bold text-secondary mb-2">${dayName}</div>
                        <img src="https://openweathermap.org/img/wn/${icon}.png" alt="Icon" width="40">
                        <div class="h5 fw-bold my-1 mb-0">${temp}°C</div>
                        <div class="small text-muted" style="font-size: 0.75rem;">${day.weather[0].main}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    setMockWeather() {
        this.updateDOM('dash-weather-temp', "28°C");
        this.updateDOM('dash-weather-desc', "Sunny (Demo)");
    },

    updateHealthMetrics() {
        const history = JSON.parse(localStorage.getItem('chisa_history')) || [];

        let health = 94;
        let pestRisk = 'Low';
        let pestBadge = '<i class="fas fa-check-circle me-1"></i> Safe';

        const recentIssues = history.filter(h => h.type === 'vision' && h.data.health === 'bad');
        if (recentIssues.length > 0) {
            health = 94 - (recentIssues.length * 15);
            pestRisk = 'High';
            pestBadge = '<i class="fas fa-exclamation-triangle me-1"></i> Alert';
        }

        const healthEl = document.getElementById('dash-health-val');
        const barEl = document.getElementById('dash-health-bar');

        if (healthEl) {
            healthEl.textContent = `${Math.max(0, health)}%`;
            healthEl.className = `stat-value ${health > 80 ? 'text-success' : (health > 50 ? 'text-warning' : 'text-danger')}`;
        }
        if (barEl) {
            barEl.style.width = `${Math.max(0, health)}%`;
            barEl.className = `progress-bar ${health > 80 ? 'bg-success' : (health > 50 ? 'bg-warning' : 'bg-danger')}`;
        }

        this.updateDOM('dash-pest-val', pestRisk);
        this.updateDOM('dash-pest-badge', pestBadge);

        // Update Recent Activity Card
        this.updateInsightsCard(history);
    },

    updateInsightsCard(history) {
        const insightCard = document.querySelector('.card-gradient .card-body');
        if (insightCard && history.length > 0) {
            const latest = history[0];
            let icon = 'lightbulb';
            let title = 'Recent Activity';
            let text = '';

            if (latest.type === 'calendar') {
                icon = 'calendar-alt';
                title = 'Latest Crop Schedule';
                text = `Generated calendar for ${latest.data.crop || 'Crop'}`;
            } else if (latest.type === 'irrigation') {
                icon = 'tint';
                title = 'Irrigation Alert';
                text = `Irrigation plan for ${latest.data.crop || 'Crop'}`;
            } else if (latest.type === 'vision') {
                icon = 'camera';
                title = 'Plant Scan';
                text = `Analyzed plant health: ${latest.data.health === 'good' ? 'Healthy' : 'Issues Found'}`;
            }

            insightCard.innerHTML = `
                <div class="mb-3 text-white opacity-75"><i class="fas fa-${icon} fa-2x"></i></div>
                <h5 class="text-white mb-2">${title}</h5>
                <p class="mb-0 fst-italic text-white small opacity-75">"${text}"</p>
                <div class="mt-3 text-end"><small class="text-white opacity-50">Just now</small></div>
            `;
        }
    },

    updateDOM(id, content) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = content;
    }
};
