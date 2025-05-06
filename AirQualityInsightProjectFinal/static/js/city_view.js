document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map centered on India
    const map = L.map('map').setView([20.5937, 78.9629], 5);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add the legend
    addLegend(map);
    
    // Set up month selector
    const monthSelector = document.getElementById('month-selector');
    monthSelector.addEventListener('change', function() {
        loadCityData(this.value);
    });
    
    // Load initial data (January by default)
    loadCityData('Jan');
    
    function getMarkerColor(aqi) {
        if (aqi <= 50) return '#00e400'; // Good
        if (aqi <= 100) return '#ffff00'; // Moderate
        if (aqi <= 150) return '#ff7e00'; // Unhealthy for Sensitive Groups
        if (aqi <= 200) return '#ff0000'; // Unhealthy
        if (aqi <= 300) return '#99004c'; // Very Unhealthy
        return '#7e0023'; // Hazardous
    }
    
    function getAQICategory(aqi) {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
        if (aqi <= 200) return 'Unhealthy';
        if (aqi <= 300) return 'Very Unhealthy';
        return 'Hazardous';
    }
    
    function loadCityData(month) {
        // Clear existing markers
        map.eachLayer(function(layer) {
            if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
        
        // Update loading indicator
        document.getElementById('data-status').textContent = 'Loading city data...';
        
        // Fetch city data for the selected month
        fetch(`/api/city-aqi?month=${month}`)
            .then(response => response.json())
            .then(data => {
                // Update data status
                document.getElementById('data-status').textContent = 
                    `Showing AQI data for ${data.length} cities (${month})`;
                
                data.forEach(city => {
                    const markerColor = getMarkerColor(city.aqi);
                    const aqiCategory = getAQICategory(city.aqi);
                    
                    // Create a custom marker
                    const marker = L.circleMarker([city.lat, city.lon], {
                        radius: Math.min(Math.max(city.aqi / 15, 5), 15), // Scale size with AQI
                        fillColor: markerColor,
                        color: '#000',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).addTo(map);
                    
                    // Add a popup with city information
                    marker.bindPopup(`
                        <strong>${city.city}</strong>
                        <br>${city.state}
                        <br>AQI: ${city.aqi}
                        <br>Category: <span style="color:${markerColor}">${aqiCategory}</span>
                    `);
                });
            })
            .catch(error => {
                console.error('Error fetching city data:', error);
                document.getElementById('data-status').textContent = 
                    'Error loading data. Please try again.';
            });
    }
    
    function addLegend(map) {
        const legend = L.control({position: 'bottomright'});
        
        legend.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'info legend');
            const grades = [0, 51, 101, 151, 201, 301];
            const labels = ['Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous'];
            const colors = ['#00e400', '#ffff00', '#ff7e00', '#ff0000', '#99004c', '#7e0023'];
            
            div.innerHTML = '<h4>AQI Legend</h4>';
            
            // Loop through our density intervals and generate a label with a colored square for each interval
            for (let i = 0; i < grades.length; i++) {
                div.innerHTML += 
                    '<i style="background:' + colors[i] + '"></i> ' +
                    grades[i] + (grades[i + 1] ? '&ndash;' + (grades[i + 1] - 1) + '<br>' : '+') + 
                    ' ' + labels[i] + '<br>';
            }
            
            return div;
        };
        
        legend.addTo(map);
    }
});