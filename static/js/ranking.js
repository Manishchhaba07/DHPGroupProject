document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    init();
    
    // Set up scroll animations
    const scrollElements = document.querySelectorAll('.scroll-animate');
    const elementInView = (el, dividend = 1) => {
        const elementTop = el.getBoundingClientRect().top;
        return (elementTop <= (window.innerHeight || document.documentElement.clientHeight) / dividend);
    };

    const displayScrollElement = (element) => {
        element.classList.add('visible');
    };

    const handleScrollAnimation = () => {
        scrollElements.forEach((el) => {
            if (elementInView(el, 1.25)) {
                displayScrollElement(el);
            }
        });
    };

    // Initialize on load
    handleScrollAnimation();
    
    // Add scroll event
    window.addEventListener('scroll', () => {
        handleScrollAnimation();
    });
    
    // Set up modal close functionality
    const detailModal = document.getElementById('detail-modal');
    const closeDetailModal = document.querySelector('.close-detail-modal');
    
    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', () => {
            detailModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === detailModal) {
            detailModal.style.display = 'none';
        }
    });
});

async function init() {
    try {
        // Initialize loading states
        document.getElementById('chart-detail-text').textContent = 'Loading data...';
        
        // Fetch country ranking data
        const data = await fetchRankingData();
        
        // Render country lists
        renderMostPollutedList(data);
        renderLeastPollutedList(data);
        
        // Create initial chart
        createRankingChart(data, 'top10');
        
        // Update instruction text
        document.getElementById('chart-detail-text').textContent = 'Hover over chart bars for more detailed information';
        
    } catch (error) {
        console.error('Error initializing ranking page:', error);
        document.getElementById('chart-detail-text').textContent = 'Error loading data. Please try again.';
    }
}

async function fetchRankingData() {
    try {
        const response = await fetch('/api/ranking-data');
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching ranking data:', error);
        return [];
    }
}

async function fetchIndianCitiesData() {
    try {
        const response = await fetch('/api/indian-cities');
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching Indian cities data:', error);
        return [];
    }
}

function getAQIClass(value) {
    if (value <= 50) return 'good';
    if (value <= 100) return 'moderate';
    if (value <= 150) return 'unhealthy-sensitive';
    if (value <= 200) return 'unhealthy';
    if (value <= 300) return 'very-unhealthy';
    return 'hazardous';
}

function getAQIColor(value) {
    if (value <= 50) return '#00e400';
    if (value <= 100) return '#ffff00';
    if (value <= 150) return '#ff7e00';
    if (value <= 200) return '#ff0000';
    if (value <= 300) return '#99004c';
    return '#7e0023';
}

function renderMostPollutedList(data) {
    const mostPollutedList = document.getElementById('most-polluted-list');
    if (!mostPollutedList) return;
    
    mostPollutedList.innerHTML = '';
    
    // Sort by AQI in descending order (most polluted first)
    const sortedData = [...data].sort((a, b) => b.aqi - a.aqi);
    
    // Get top 10
    const topTen = sortedData.slice(0, 10);
    
    topTen.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.className = `ranking-item ${getAQIClass(item.aqi)}`;
        
        listItem.innerHTML = `
            <span class="rank">${index + 1}</span>
            <span class="country-name">${item.country}</span>
            <span class="aqi-value" style="color: ${getAQIColor(item.aqi)}">${item.aqi.toFixed(1)}</span>
        `;
        
        mostPollutedList.appendChild(listItem);
    });
}

function renderLeastPollutedList(data) {
    const leastPollutedList = document.getElementById('least-polluted-list');
    if (!leastPollutedList) return;
    
    leastPollutedList.innerHTML = '';
    
    // Sort by AQI in ascending order (least polluted first)
    const sortedData = [...data].sort((a, b) => a.aqi - b.aqi);
    
    // Get top 10 least polluted
    const leastTen = sortedData.slice(0, 10);
    
    leastTen.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.className = `ranking-item ${getAQIClass(item.aqi)}`;
        
        listItem.innerHTML = `
            <span class="rank">${index + 1}</span>
            <span class="country-name">${item.country}</span>
            <span class="aqi-value" style="color: ${getAQIColor(item.aqi)}">${item.aqi.toFixed(1)}</span>
        `;
        
        leastPollutedList.appendChild(listItem);
    });
}

async function createRankingChart(data, view) {
    const ctx = document.getElementById('ranking-chart').getContext('2d');
    let chartData;
    let title;
    
    // Hide Indian cities section by default
    document.getElementById('indian-cities-section').classList.add('hidden');
    
    if (view === 'top10') {
        // Top 10 most polluted
        const topTen = [...data].sort((a, b) => b.aqi - a.aqi).slice(0, 10);
        chartData = {
            labels: topTen.map(item => item.country),
            values: topTen.map(item => item.aqi),
            colors: topTen.map(item => getAQIColor(item.aqi)),
            rawData: topTen
        };
        title = 'Top 10 Most Polluted Countries (2024)';
    } else if (view === 'bottom10') {
        // Top 10 least polluted
        const bottomTen = [...data].sort((a, b) => a.aqi - b.aqi).slice(0, 10);
        chartData = {
            labels: bottomTen.map(item => item.country),
            values: bottomTen.map(item => item.aqi),
            colors: bottomTen.map(item => getAQIColor(item.aqi)),
            rawData: bottomTen
        };
        title = 'Top 10 Least Polluted Countries (2024)';
    } else if (view === 'compare') {
        // Compare major countries (top 15 by population with AQI data)
        const majorCountries = [...data]
            .filter(item => item.population > 50000000)
            .sort((a, b) => b.population - a.population)
            .slice(0, 15);
        
        chartData = {
            labels: majorCountries.map(item => item.country),
            values: majorCountries.map(item => item.aqi),
            colors: majorCountries.map(item => getAQIColor(item.aqi)),
            rawData: majorCountries
        };
        title = 'AQI Comparison of Major Countries (2024)';
    } else if (view === 'india-cities') {
        // Fetch and display Indian cities data
        document.getElementById('chart-detail-text').textContent = 'Loading Indian cities data...';
        
        try {
            const citiesData = await fetchIndianCitiesData();
            
            if (citiesData.length === 0) {
                document.getElementById('chart-detail-text').textContent = 'No Indian cities data available.';
                return;
            }
            
            // Prepare chart data
            citiesData.sort((a, b) => b.avg_aqi - a.avg_aqi);
            const topCities = citiesData.slice(0, 10);
            
            chartData = {
                labels: topCities.map(item => `${item.city}, ${item.state}`),
                values: topCities.map(item => item.avg_aqi),
                colors: topCities.map(item => getAQIColor(item.avg_aqi)),
                rawData: topCities
            };
            
            title = 'Top 10 Most Polluted Indian Cities (2024 Average)';
            
            // Render the cities grid
            renderIndianCitiesGrid(citiesData);
            
            // Show the Indian cities section
            document.getElementById('indian-cities-section').classList.remove('hidden');
            
        } catch (error) {
            console.error('Error loading Indian cities data:', error);
            document.getElementById('chart-detail-text').textContent = 'Error loading Indian cities data.';
            return;
        }
    }
    
    // Update instruction text
    if (view !== 'india-cities') {
        document.getElementById('chart-detail-text').textContent = 'Hover over chart bars for more detailed information';
    }
    
    // Destroy previous chart if it exists
    if (window.rankingChart) {
        window.rankingChart.destroy();
    }
    
    // Create chart
    window.rankingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'AQI Value',
                data: chartData.values,
                backgroundColor: chartData.colors,
                borderColor: chartData.colors.map(color => color === '#ffff00' ? '#999900' : color), // Darker border for yellow
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'AQI Value',
                        color: '#e0e0e0'
                    },
                    grid: {
                        color: 'rgba(200, 200, 200, 0.1)'
                    },
                    ticks: {
                        color: '#e0e0e0'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(200, 200, 200, 0.1)'
                    },
                    ticks: {
                        color: '#e0e0e0',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    color: '#e0e0e0',
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 16
                    },
                    bodyFont: {
                        size: 14
                    },
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            return chartData.labels[index];
                        },
                        label: function(context) {
                            let item = chartData.rawData[context.dataIndex];
                            let label = `AQI: ${context.raw.toFixed(1)}`;
                            
                            if (view === 'india-cities') {
                                return [label, 'Click for monthly breakdown'];
                            } else {
                                if (item.population) {
                                    label += ` | Population: ${(item.population/1000000).toFixed(1)}M`;
                                }
                                return [label, 'Click for detailed information'];
                            }
                        }
                    }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const selectedItem = chartData.rawData[index];
                    
                    if (view === 'india-cities') {
                        showCityDetails(selectedItem);
                    } else {
                        showCountryDetails(selectedItem);
                    }
                }
            },
            onHover: function(event, elements) {
                event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
            }
        }
    });
}

function showCountryDetails(country) {
    const modal = document.getElementById('detail-modal');
    const modalTitle = document.getElementById('detail-modal-title');
    const modalContent = document.getElementById('detail-modal-content');
    
    modalTitle.textContent = `${country.country} - Air Quality Details`;
    
    let healthRisk = 'Low';
    let healthDescription = 'Air quality is considered satisfactory, and air pollution poses little or no risk.';
    
    if (country.aqi > 100) {
        healthRisk = 'Moderate';
        healthDescription = 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.';
    }
    if (country.aqi > 150) {
        healthRisk = 'High';
        healthDescription = 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.';
    }
    if (country.aqi > 200) {
        healthRisk = 'Very High';
        healthDescription = 'Health alert: everyone may experience more serious health effects.';
    }
    if (country.aqi > 300) {
        healthRisk = 'Hazardous';
        healthDescription = 'Health warnings of emergency conditions. The entire population is likely to be affected.';
    }
    
    modalContent.innerHTML = `
        <div class="detail-stats">
            <div class="detail-stat-item">
                <span class="detail-stat-label">AQI Value (2024):</span>
                <span class="detail-stat-value" style="color: ${getAQIColor(country.aqi)}">${country.aqi.toFixed(1)}</span>
            </div>
            <div class="detail-stat-item">
                <span class="detail-stat-label">Global Rank:</span>
                <span class="detail-stat-value">${country.rank || 'N/A'}</span>
            </div>
            <div class="detail-stat-item">
                <span class="detail-stat-label">Population:</span>
                <span class="detail-stat-value">${country.population ? (country.population/1000000).toFixed(1) + 'M' : 'N/A'}</span>
            </div>
        </div>
        
        <div class="health-impact">
            <h3>Health Impact Analysis</h3>
            <div class="health-risk-indicator" style="background-color: ${getAQIColor(country.aqi)}">
                <span class="risk-level">Risk Level: ${healthRisk}</span>
            </div>
            <p>${healthDescription}</p>
        </div>
        
        <div class="detail-actions">
            <button class="detail-action-btn">
                <i class="fas fa-file-export"></i> Export Data
            </button>
            <button class="detail-action-btn">
                <i class="fas fa-chart-line"></i> View Trends
            </button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function showCityDetails(city) {
    const modal = document.getElementById('detail-modal');
    const modalTitle = document.getElementById('detail-modal-title');
    const modalContent = document.getElementById('detail-modal-content');
    
    modalTitle.textContent = `${city.city}, ${city.state} - Monthly AQI (2024)`;
    
    // Prepare monthly data for chart
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyValues = months.map(month => city.monthly_data[month] || 0);
    const monthlyColors = monthlyValues.map(value => getAQIColor(value));
    
    // Create HTML content
    let content = `
        <div class="detail-stats">
            <div class="detail-stat-item">
                <span class="detail-stat-label">Average AQI:</span>
                <span class="detail-stat-value" style="color: ${getAQIColor(city.avg_aqi)}">${city.avg_aqi.toFixed(1)}</span>
            </div>
            <div class="detail-stat-item">
                <span class="detail-stat-label">State:</span>
                <span class="detail-stat-value">${city.state}</span>
            </div>
        </div>
        
        <div class="city-monthly-chart-container">
            <canvas id="cityMonthlyChart" height="250"></canvas>
        </div>
        
        <div class="monthly-breakdown">
            <h3>Monthly AQI Breakdown</h3>
            <div class="monthly-grid">
    `;
    
    // Add monthly data
    months.forEach(month => {
        const value = city.monthly_data[month];
        if (value) {
            content += `
                <div class="monthly-item" style="border-left: 3px solid ${getAQIColor(value)}">
                    <div class="monthly-name">${month}</div>
                    <div class="monthly-value" style="color: ${getAQIColor(value)}">${value.toFixed(1)}</div>
                </div>
            `;
        } else {
            content += `
                <div class="monthly-item">
                    <div class="monthly-name">${month}</div>
                    <div class="monthly-value">No data</div>
                </div>
            `;
        }
    });
    
    content += `
            </div>
        </div>
    `;
    
    modalContent.innerHTML = content;
    
    // Show modal
    modal.style.display = 'block';
    
    // Create chart
    setTimeout(() => {
        const ctx = document.getElementById('cityMonthlyChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Monthly AQI',
                    data: monthlyValues,
                    backgroundColor: monthlyColors,
                    borderColor: monthlyColors.map(color => color === '#ffff00' ? '#999900' : color),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'AQI Value',
                            color: '#e0e0e0'
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.1)'
                        },
                        ticks: {
                            color: '#e0e0e0'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(200, 200, 200, 0.1)'
                        },
                        ticks: {
                            color: '#e0e0e0'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly AQI Variation (2024)',
                        font: {
                            size: 16
                        },
                        color: '#e0e0e0'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                if (value === 0) {
                                    return 'No data available';
                                } else {
                                    return `AQI: ${value.toFixed(1)}`;
                                }
                            }
                        }
                    }
                }
            }
        });
    }, 100);
}

function renderIndianCitiesGrid(citiesData) {
    const citiesGrid = document.getElementById('indian-cities-grid');
    citiesGrid.innerHTML = '';
    
    // Sort by average AQI descending
    citiesData.sort((a, b) => b.avg_aqi - a.avg_aqi);
    
    // Take top 10 cities
    const topCities = citiesData.slice(0, 10);
    
    topCities.forEach(city => {
        const cityCard = document.createElement('div');
        cityCard.className = 'city-card';
        cityCard.addEventListener('click', () => showCityDetails(city));
        
        const aqiClass = getAQIClass(city.avg_aqi);
        const aqiColor = getAQIColor(city.avg_aqi);
        
        cityCard.innerHTML = `
            <div class="city-name">${city.city}, ${city.state}</div>
            <div class="city-aqi" style="color: ${aqiColor}; background-color: rgba(${hexToRgb(aqiColor)}, 0.1);">
                ${city.avg_aqi.toFixed(1)}
            </div>
        `;
        
        citiesGrid.appendChild(cityCard);
    });
}

// Helper function to convert hex to rgb for background opacity
function hexToRgb(hex) {
    // Remove hash if present
    hex = hex.replace('#', '');
    
    // Convert 3-digit hex to 6-digit
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
}

async function switchView(view) {
    // Update active button
    document.querySelectorAll('.view-options button').forEach(button => {
        if (button.getAttribute('data-view') === view) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Hide city section when not viewing Indian cities
    if (view !== 'india-cities') {
        document.getElementById('indian-cities-section').classList.add('hidden');
    }
    
    // Update chart
    if (view === 'india-cities') {
        // For Indian cities view, createRankingChart will fetch its own data
        await createRankingChart([], view);
    } else {
        // For other views, fetch country data first
        const data = await fetchRankingData();
        await createRankingChart(data, view);
    }
}

function setupEventListeners() {
    // Set up view switching
    const viewButtons = document.querySelectorAll('.view-options button');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            switchView(view);
        });
    });
}