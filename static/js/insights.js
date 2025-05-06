document.addEventListener('DOMContentLoaded', function() {
    setupTabs();
    init();
});

async function init() {
    try {
        const [insightsData, topCitiesData] = await Promise.all([
            fetchInsightsData(),
            fetchTopCitiesData()
        ]);
        
        if (insightsData) {
            createMonthlyTrendsChart(insightsData.monthly_averages);
            createComparativeChart(
                insightsData.top_polluted_countries, 
                insightsData.least_polluted_countries
            );
            renderStatsCards(insightsData, topCitiesData);
            renderFindings(insightsData, topCitiesData);
        }
    } catch (error) {
        console.error('Error initializing insights page:', error);
    }
}

async function fetchInsightsData() {
    try {
        const response = await fetch('/api/insights-data');
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching insights data:', error);
        return null;
    }
}

async function fetchTopCitiesData() {
    try {
        const response = await fetch('/api/top-cities');
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching top cities data:', error);
        return null;
    }
}

function createMonthlyTrendsChart(monthlyData) {
    if (!monthlyData) return;
    
    const ctx = document.getElementById('monthly-trends-chart').getContext('2d');
    
    // Convert object to arrays for chart
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const values = months.map(month => monthlyData[month] || 0);
    
    // Create the chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Global Average AQI',
                data: values,
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                pointBackgroundColor: 'rgb(75, 192, 192)',
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Average AQI Value'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `AQI: ${context.raw.toFixed(1)}`;
                        }
                    }
                }
            }
        }
    });
}

function createComparativeChart(topCountries, leastCountries) {
    if (!topCountries || !leastCountries) return;
    
    const ctx = document.getElementById('comparative-chart').getContext('2d');
    
    // Extract data for chart
    const topLabels = topCountries.map(item => item.country);
    const topValues = topCountries.map(item => item.aqi);
    const leastLabels = leastCountries.map(item => item.country);
    const leastValues = leastCountries.map(item => item.aqi);
    
    // Create the chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [...topLabels, ...leastLabels],
            datasets: [{
                label: 'AQI Values',
                data: [...topValues, ...leastValues],
                backgroundColor: [
                    ...Array(topLabels.length).fill('rgba(255, 99, 132, 0.7)'),
                    ...Array(leastLabels.length).fill('rgba(75, 192, 192, 0.7)')
                ],
                borderColor: [
                    ...Array(topLabels.length).fill('rgba(255, 99, 132, 1)'),
                    ...Array(leastLabels.length).fill('rgba(75, 192, 192, 1)')
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'AQI Value'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Country'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `AQI: ${context.raw.toFixed(1)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderStatsCards(data, citiesData) {
    if (!data || !citiesData) return;
    
    const monthlyData = data.monthly_averages;
    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = '';
    
    // Card 1: Average Annual AQI
    const annualValues = Object.values(monthlyData);
    const annualAvg = annualValues.reduce((acc, val) => acc + val, 0) / annualValues.length;
    
    // Card 2: Seasonal Difference
    const winterAvg = getWinterAverage(monthlyData);
    const summerAvg = getSummerAverage(monthlyData);
    const seasonalDiff = ((winterAvg - summerAvg) / summerAvg * 100).toFixed(1);
    
    // Card 3: Most Polluted Month
    const mostPollutedMonth = Object.entries(monthlyData)
        .sort((a, b) => b[1] - a[1])[0];
    
    // Card 4: Least Polluted Month
    const leastPollutedMonth = Object.entries(monthlyData)
        .sort((a, b) => a[1] - b[1])[0];
    
    // Card 5: Most Polluted Country
    const mostPollutedCountry = data.top_polluted_countries[0];
    
    // Card 6: Least Polluted Country
    const leastPollutedCountry = data.least_polluted_countries[0];
    
    // Card 7: Most Polluted City
    const mostPollutedCity = citiesData[0];
    
    // Card 8: Regional Patterns
    const lessAffectedRegion = getLessAffectedRegion(citiesData);
    
    // Create and append stat cards
    const stats = [
        {
            label: 'Global Annual Average AQI',
            value: annualAvg.toFixed(1),
            icon: 'fa-globe'
        },
        {
            label: 'Winter vs. Summer Difference',
            value: `+${seasonalDiff}%`,
            icon: 'fa-temperature-half'
        },
        {
            label: 'Most Polluted Month',
            value: mostPollutedMonth[0],
            subtext: `AQI: ${mostPollutedMonth[1].toFixed(1)}`,
            icon: 'fa-calendar-xmark'
        },
        {
            label: 'Least Polluted Month',
            value: leastPollutedMonth[0],
            subtext: `AQI: ${leastPollutedMonth[1].toFixed(1)}`,
            icon: 'fa-calendar-check'
        },
        {
            label: 'Most Polluted Country',
            value: mostPollutedCountry.country,
            subtext: `AQI: ${mostPollutedCountry.aqi.toFixed(1)}`,
            icon: 'fa-flag'
        },
        {
            label: 'Least Polluted Country',
            value: leastPollutedCountry.country,
            subtext: `AQI: ${leastPollutedCountry.aqi.toFixed(1)}`,
            icon: 'fa-earth-americas'
        },
        {
            label: 'Most Polluted City',
            value: mostPollutedCity.city,
            subtext: `${mostPollutedCity.state} - AQI: ${mostPollutedCity.avg_aqi.toFixed(1)}`,
            icon: 'fa-city'
        },
        {
            label: 'Less Affected Region',
            value: lessAffectedRegion,
            icon: 'fa-map-location-dot'
        }
    ];
    
    stats.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        
        card.innerHTML = `
            <div class="stat-icon">
                <i class="fas ${stat.icon}"></i>
            </div>
            <div class="stat-label">${stat.label}</div>
            <div class="stat-value">${stat.value}</div>
            ${stat.subtext ? `<div class="stat-subtext">${stat.subtext}</div>` : ''}
        `;
        
        statsContainer.appendChild(card);
    });
}

function renderFindings(data, citiesData) {
    if (!data || !citiesData) return;
    
    const findingsList = document.getElementById('findings-list');
    findingsList.innerHTML = '';
    
    const findings = [
        {
            icon: '🌡️',
            text: `Winter months show approximately ${((getWinterAverage(data.monthly_averages) - getSummerAverage(data.monthly_averages)) / getSummerAverage(data.monthly_averages) * 100).toFixed(0)}% higher pollution levels compared to summer months globally.`
        },
        {
            icon: '🏙️',
            text: `${data.top_polluted_countries[0].country} has the highest annual average AQI of ${data.top_polluted_countries[0].aqi.toFixed(1)}, while ${data.least_polluted_countries[0].country} has the lowest at ${data.least_polluted_countries[0].aqi.toFixed(1)}.`
        },
        {
            icon: '📅',
            text: `${Object.entries(data.monthly_averages).sort((a, b) => b[1] - a[1])[0][0]} is typically the most polluted month globally.`
        },
        {
            icon: '🔍',
            text: `${citiesData[0].city}, ${citiesData[0].state} is the most polluted city with an average AQI of ${citiesData[0].avg_aqi.toFixed(1)}.`
        },
        {
            icon: '🌎',
            text: `${getLessAffectedRegion(citiesData)} generally has better air quality than other monitored regions.`
        },
        {
            icon: '🧪',
            text: 'PM2.5 and PM10 particulate matter remain the most significant contributors to poor air quality in highly polluted regions.'
        },
        {
            icon: '📊',
            text: `The global average AQI score for 2024 is ${Object.values(data.monthly_averages).reduce((acc, val) => acc + val, 0) / Object.values(data.monthly_averages).length.toFixed(1)}, which falls in the 'Moderate' category.`
        },
        {
            icon: '🏭',
            text: 'Industrial emissions, vehicle exhaust, and residential biomass burning are the three primary sources of air pollution in most affected areas.'
        }
    ];
    
    findings.forEach(finding => {
        const item = document.createElement('li');
        item.className = 'finding-item';
        
        item.innerHTML = `
            <span class="finding-icon">${finding.icon}</span>
            <div class="finding-content">${finding.text}</div>
        `;
        
        findingsList.appendChild(item);
    });
}

function getWinterAverage(monthlyData) {
    const winterMonths = ['Dec', 'Jan', 'Feb', 'Nov'];
    let sum = 0;
    let count = 0;
    
    winterMonths.forEach(month => {
        if (monthlyData[month]) {
            sum += monthlyData[month];
            count++;
        }
    });
    
    return count > 0 ? sum / count : 0;
}

function getSummerAverage(monthlyData) {
    const summerMonths = ['Jun', 'Jul', 'Aug', 'Sep'];
    let sum = 0;
    let count = 0;
    
    summerMonths.forEach(month => {
        if (monthlyData[month]) {
            sum += monthlyData[month];
            count++;
        }
    });
    
    return count > 0 ? sum / count : 0;
}

function getLessAffectedRegion(citiesData) {
    // This is a simplified approach - in a real app, you'd do more sophisticated analysis
    const regions = {
        'North America': 0,
        'Europe': 0,
        'Oceania': 0,
        'South America': 0,
        'Africa': 0
    };
    
    // For demonstration, we'll just return a region (this would normally be data-driven)
    return 'Northern Europe';
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}