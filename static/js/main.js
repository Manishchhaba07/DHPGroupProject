document.addEventListener('DOMContentLoaded', function() {
    // Toggle dark mode functionality
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    if (darkModeSwitch) {
        // Check for saved preference
        const darkModePreference = localStorage.getItem('darkMode');
        if (darkModePreference === 'false') {
            document.body.classList.add('light-mode');
            darkModeSwitch.checked = false;
        }
        
        // Toggle dark/light mode
        darkModeSwitch.addEventListener('change', function() {
            document.body.classList.toggle('light-mode');
            localStorage.setItem('darkMode', !this.checked);
        });
    }
    
    // Handle country links to show chart
    const countryLinks = document.querySelectorAll('.country-link');
    const chartContainer = document.getElementById('chart-container');
    const chartTitle = document.getElementById('chart-title');
    const ctx = document.getElementById('countryChart');
    
    if (countryLinks.length > 0 && chartContainer && chartTitle && ctx) {
        countryLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const countryName = this.dataset.country;
                showCountryChart(countryName);
            });
        });
    }
    
    // Function to display country chart
    function showCountryChart(countryName) {
        // Show chart container
        chartContainer.classList.remove('hidden');
        chartTitle.textContent = `${countryName} - AQI Trend (2018-2024)`;
        
        // Scroll to chart
        chartContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Fetch country data
        fetch('/api/country-graph-data')
            .then(response => response.json())
            .then(data => {
                const countryData = data.find(item => item.country === countryName);
                
                if (!countryData) {
                    console.error(`Country data not found for: ${countryName}`);
                    return;
                }
                
                // Destroy existing chart if it exists
                if (window.countryTrendChart instanceof Chart) {
                    window.countryTrendChart.destroy();
                }
                
                // Create new chart
                window.countryTrendChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'],
                        datasets: [{
                            label: 'AQI Value',
                            data: countryData.years.slice().reverse(), // Reverse to have chronological order
                            borderColor: '#7e57c2',
                            backgroundColor: 'rgba(126, 87, 194, 0.1)',
                            pointBackgroundColor: '#7e57c2',
                            borderWidth: 2,
                            tension: 0.3,
                            pointRadius: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                labels: {
                                    font: {
                                        size: 14
                                    },
                                    color: '#e0e0e0'
                                }
                            },
                            tooltip: {
                                backgroundColor: '#252535',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                borderColor: '#7e57c2',
                                borderWidth: 1,
                                callbacks: {
                                    label: function(context) {
                                        return `AQI: ${context.parsed.y ?? 'No data'}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: {
                                    color: '#444'
                                },
                                ticks: {
                                    color: '#e0e0e0'
                                }
                            },
                            y: {
                                grid: {
                                    color: '#444'
                                },
                                ticks: {
                                    color: '#e0e0e0'
                                },
                                beginAtZero: true
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                chartTitle.textContent = 'Error loading chart data';
            });
    }
    
    // Add image loading functionality for cause images
    function loadCauseImages() {
        const causeImages = document.querySelectorAll('.cause-image img');
        
        // Array of air pollution image URLs
        const pollutionImageUrls = [
            'https://images.unsplash.com/photo-1526951521990-620dc14c214b', // Dustan Woodhouse
            'https://images.unsplash.com/photo-1499937479142-61a6ce103b26', // Tatiana Zhukova
            'https://images.unsplash.com/flagged/photo-1572213426852-0e4ed8f41ff6', // Antoine GIRET
            'https://images.unsplash.com/photo-1602084551218-a28205125639', // Beth Jnr
            'https://images.unsplash.com/photo-1532300481631-0bc14f3b7699', // Photoholgic
            'https://images.unsplash.com/flagged/photo-1577912504896-abc46b500434'  // Ryan De Hamer
        ];
        
        // Set image sources
        causeImages.forEach((img, index) => {
            if (index < pollutionImageUrls.length) {
                img.src = pollutionImageUrls[index];
                img.alt = `Air Pollution Image ${index + 1}`;
                img.addEventListener('error', function() {
                    // Fallback if image fails to load
                    this.src = 'https://via.placeholder.com/400x200?text=Air+Pollution+Image';
                });
            }
        });
    }
    
    // Call this function to load images
    loadCauseImages();
});
