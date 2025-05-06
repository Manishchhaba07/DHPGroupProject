document.addEventListener('DOMContentLoaded', function() {
    // Initialize chart
    let aqiChart;
    
    // Get DOM elements
    const graphType = document.getElementById('graphType');
    const yearSelect = document.getElementById('yearSelect');
    const country1 = document.getElementById('country1');
    const country2 = document.getElementById('country2');
    const country3 = document.getElementById('country3');
    const updateButton = document.getElementById('updateGraph');
    const lineChartControls = document.getElementById('lineChartControls');
    const noDataMessage = document.getElementById('noDataMessage');
    
    // Add event listeners
    graphType.addEventListener('change', handleGraphTypeChange);
    updateButton.addEventListener('click', updateGraph);
    
    // Initial setup
    fetchCountryData();
    
    // Handle graph type change
    function handleGraphTypeChange() {
        const isBarChart = graphType.value === 'bar';
        yearSelect.style.display = isBarChart ? 'inline-block' : 'inline-block';
        document.getElementById('yearLabel').style.display = isBarChart ? 'inline-block' : 'inline-block';
        lineChartControls.style.display = isBarChart ? 'none' : 'flex';
    }
    
    function fetchCountryData() {
        fetch('/api/country-graph-data')
            .then(response => response.json())
            .then(data => {
                populateCountryDropdowns(data);
                // Create initial graph
                updateGraph();
            })
            .catch(error => {
                console.error('Error fetching country data:', error);
            });
    }
    
    function populateCountryDropdowns(data) {
        // Sort countries alphabetically
        const sortedCountries = data.sort((a, b) => a.country.localeCompare(b.country));
        
        // Create country options
        const countryOptions = sortedCountries.map(country => {
            return `<option value="${country.country}">${country.country}</option>`;
        });
        
        // Set default countries
        country1.innerHTML = countryOptions.join('');
        country2.innerHTML = countryOptions.join('');
        country3.innerHTML = countryOptions.join('');
        
        // Set some default selections
        country1.value = 'India';
        country2.value = 'Bangladesh';
        country3.value = 'Pakistan';
    }
    
    function getTopCountries(data, count = 10) {
        // Sort countries by most recent year AQI (2024 is at index 0 in years array)
        return data
            .filter(country => country.years && country.years.length > 0 && country.years[0] !== null)
            .sort((a, b) => b.years[0] - a.years[0])
            .slice(0, count);
    }
    
    function hasNullValues(data) {
        return data.some(item => item === null || item === undefined);
    }
    
    function updateGraph() {
        fetch('/api/country-graph-data')
            .then(response => response.json())
            .then(data => {
                const type = graphType.value;
                const selectedYear = yearSelect.value;
                
                let chartOptions;
                let hasNull = false;
                
                if (type === 'line') {
                    // Get selected countries for line chart
                    const selectedCountries = [
                        country1.value,
                        country2.value,
                        country3.value
                    ];
                    
                    const filteredData = data.filter(country => 
                        selectedCountries.includes(country.country)
                    );
                    
                    // Check for null values in years data
                    filteredData.forEach(country => {
                        if (hasNullValues(country.years)) {
                            hasNull = true;
                        }
                    });
                    
                    // Line chart for trends over years
                    chartOptions = {
                        type: 'line',
                        data: {
                            labels: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'],
                            datasets: filteredData.map((country, index) => {
                                // Generate a color based on index
                                const hue = (index * 70) % 360;
                                const color = `hsla(${hue}, 70%, 60%, 1)`;
                                return {
                                    label: country.country,
                                    data: country.years.reverse(), // Reverse to get chronological order
                                    fill: false,
                                    borderColor: color,
                                    backgroundColor: color,
                                    tension: 0.1,
                                    spanGaps: true // Allow gaps for null values
                                };
                            })
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            aspectRatio: 2,
                            scales: {
                                y: {
                                    title: {
                                        display: true,
                                        text: 'AQI Value'
                                    },
                                    beginAtZero: true
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Year'
                                    }
                                }
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'AQI Trends (2018-2024)'
                                },
                                legend: {
                                    position: 'top',
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const value = context.raw;
                                            if (value === null) {
                                                return `${context.dataset.label}: Data not available`;
                                            }
                                            return `${context.dataset.label}: ${value}`;
                                        }
                                    }
                                }
                            }
                        }
                    };
                } else if (type === 'bar') {
                    // Get top 10 countries for bar chart
                    const topCountries = getTopCountries(data, 10);
                    
                    // Find year index (0 = 2024, 1 = 2023, etc.)
                    const yearIndex = 2024 - parseInt(selectedYear);
                    
                    // Check for null values
                    if (topCountries.some(country => country.years[yearIndex] === null)) {
                        hasNull = true;
                    }
                    
                    // Create a color array for the bars
                    const backgroundColors = topCountries.map((_, index) => {
                        const hue = (index * 36) % 360; // Spread colors across the spectrum
                        return `hsla(${hue}, 70%, 60%, 0.7)`;
                    });
                    
                    const borderColors = topCountries.map((_, index) => {
                        const hue = (index * 36) % 360;
                        return `hsla(${hue}, 70%, 60%, 1)`;
                    });
                    
                    chartOptions = {
                        type: 'bar',
                        data: {
                            labels: topCountries.map(country => country.country),
                            datasets: [{
                                label: `AQI Values (${selectedYear})`,
                                data: topCountries.map(country => country.years[yearIndex]),
                                backgroundColor: backgroundColors,
                                borderColor: borderColors,
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            aspectRatio: 2,
                            scales: {
                                y: {
                                    title: {
                                        display: true,
                                        text: 'AQI Value'
                                    },
                                    beginAtZero: true
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Countries'
                                    }
                                }
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: `Top 10 Most Polluted Countries (${selectedYear})`
                                },
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const value = context.raw;
                                            if (value === null) {
                                                return "Data not available";
                                            }
                                            return `AQI: ${value}`;
                                        }
                                    }
                                }
                            }
                        }
                    };
                }
                
                createChart(chartOptions);
                
                // Show or hide no data message
                if (hasNull) {
                    noDataMessage.classList.remove('hidden');
                } else {
                    noDataMessage.classList.add('hidden');
                }
            })
            .catch(error => {
                console.error('Error updating graph:', error);
            });
    }
    
    function createChart(options) {
        const ctx = document.getElementById('aqiChart').getContext('2d');
        
        // Destroy previous chart if it exists
        if (aqiChart) {
            aqiChart.destroy();
        }
        
        // Create new chart
        aqiChart = new Chart(ctx, options);
    }
    
    // Initialize with bar chart selected by default
    graphType.value = 'bar';
    handleGraphTypeChange();
});