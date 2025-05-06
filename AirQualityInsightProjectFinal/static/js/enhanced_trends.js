document.addEventListener('DOMContentLoaded', function() {
  // Welcome box animation
  setTimeout(function() {
    document.getElementById("welcomeBox").style.display = "block";
  }, 500);

  // Scroll animations
  const scrollElements = document.querySelectorAll(".scroll-animate");
  
  const elementInView = (el, dividend = 1) => {
    const elementTop = el.getBoundingClientRect().top;
    return (elementTop <= (window.innerHeight || document.documentElement.clientHeight) / dividend);
  };

  const displayScrollElement = (element) => {
    element.classList.add("visible");
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
  window.addEventListener("scroll", () => {
    handleScrollAnimation();
  });

  // Initialize the table and data loading
  initTrendsData();
});

// Global variables for data management
let countriesData = [];
let filteredData = [];
let currentPage = 1;
let rowsPerPage = 10;

// Health impact information by AQI level
const healthImpacts = {
  good: {
    title: "Good",
    color: "#4CAF50",
    description: "Air quality is considered satisfactory, and air pollution poses little or no risk.",
    recommendations: "Ideal for outdoor activities and exercise."
  },
  moderate: {
    title: "Moderate",
    color: "#FFC107",
    description: "Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.",
    recommendations: "Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion."
  },
  unhealthy: {
    title: "Unhealthy",
    color: "#FF9800",
    description: "Members of sensitive groups may experience health effects. The general public is not likely to be affected.",
    recommendations: "Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion."
  },
  veryUnhealthy: {
    title: "Very Unhealthy",
    color: "#F44336",
    description: "Health warnings of emergency conditions. The entire population is more likely to be affected.",
    recommendations: "Active children and adults, and people with respiratory disease, such as asthma, should avoid all outdoor exertion; everyone else should limit outdoor exertion."
  },
  hazardous: {
    title: "Hazardous",
    color: "#7E0023",
    description: "Health alert: everyone may experience more serious health effects.",
    recommendations: "Everyone should avoid all outdoor exertion."
  }
};

async function initTrendsData() {
  try {
    console.log('Starting to fetch country trends data...');
    document.getElementById('trendsTableBody').innerHTML = 
      '<tr><td colspan="6" class="loading-message">Loading country data...</td></tr>';
      
    // Fetch countries data
    const response = await fetch('/api/country-trends');
    console.log('Fetch response:', response);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('Fetched data from API:', data);
    
    if (!data || data.error) {
      throw new Error(data.error || 'Invalid data received from server');
    }
    
    if (data.length === 0) {
      throw new Error('No countries data found');
    }
    
    // Process the data to include derived information
    countriesData = data.map(country => {
      // Calculate the 7-year trend (difference between oldest and newest available data)
      let oldestValue = null;
      let newestValue = null;
      
      if (!country.years || !Array.isArray(country.years)) {
        console.error('Invalid years data for country:', country);
        return {
          ...country,
          years: [null, null, null, null, null, null, null],
          trend: null,
          trendPercent: null
        };
      }
      
      for (let i = 0; i < country.years.length; i++) {
        if (country.years[i] !== null && newestValue === null) {
          newestValue = country.years[i];
        }
      }
      
      for (let i = country.years.length - 1; i >= 0; i--) {
        if (country.years[i] !== null && oldestValue === null) {
          oldestValue = country.years[i];
        }
      }
      
      let trend = null;
      let trendPercent = null;
      
      if (oldestValue !== null && newestValue !== null) {
        trend = newestValue - oldestValue;
        trendPercent = (trend / oldestValue) * 100;
      }
      
      return {
        ...country,
        trend,
        trendPercent
      };
    });
    
    // Sort by rank by default
    countriesData.sort((a, b) => (a.rank || 999) - (b.rank || 999));
    
    // Initialize filtered data with all countries
    filteredData = [...countriesData];
    
    // Update summary cards with actual data
    updateSummaryCards(countriesData);
    
    // Render the table with initial data
    renderTable();
    renderPagination();
    
    // Setup event listeners for filters and search
    setupEventListeners();
    
  } catch (error) {
    console.error('Error loading countries data:', error);
    document.getElementById('trendsTableBody').innerHTML = 
      `<tr><td colspan="6" class="loading-message">Error loading data: ${error.message}</td></tr>`;
  }
}

function renderTable() {
  const tableBody = document.getElementById('trendsTableBody');
  if (!tableBody) return;
  
  // Clear table
  tableBody.innerHTML = '';
  
  // Calculate start and end indices for pagination
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
  
  // Get current page data
  const currentPageData = filteredData.slice(startIndex, endIndex);
  
  if (currentPageData.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-message">No data found matching your criteria</td></tr>';
    return;
  }
  
  // Create table rows
  currentPageData.forEach((country, index) => {
    const row = document.createElement('tr');
    
    // Rank column
    const rankCell = document.createElement('td');
    rankCell.className = 'rank-column';
    rankCell.textContent = country.rank || '-';
    row.appendChild(rankCell);
    
    // Country column
    const countryCell = document.createElement('td');
    countryCell.className = 'country-column';
    const countryName = document.createElement('span');
    countryName.className = 'country-name';
    countryName.textContent = country.country;
    countryName.setAttribute('data-country-index', startIndex + index);
    countryName.addEventListener('click', () => showCountryDetail(startIndex + index));
    countryCell.appendChild(countryName);
    row.appendChild(countryCell);
    
    // Population column
    const populationCell = document.createElement('td');
    populationCell.className = 'population-column';
    populationCell.textContent = country.population ? country.population.toLocaleString() : '-';
    row.appendChild(populationCell);
    
    // AQI 2024 column
    const aqiCell = document.createElement('td');
    aqiCell.className = 'aqi-column';
    if (country.years[0] !== null) {
      const aqiBadge = document.createElement('span');
      aqiBadge.className = `aqi-badge ${getAQIClass(country.years[0])}`;
      aqiBadge.textContent = country.years[0].toFixed(1);
      aqiCell.appendChild(aqiBadge);
    } else {
      aqiCell.textContent = '-';
    }
    row.appendChild(aqiCell);
    
    // Trend column
    const trendCell = document.createElement('td');
    trendCell.className = 'trend-column';
    
    if (country.trend !== null) {
      // Create trend visualization
      const trendChart = document.createElement('div');
      trendChart.className = 'trend-chart';
      
      // Calculate trend line and markers
      const trendLine = document.createElement('div');
      trendLine.className = 'trend-line';
      trendChart.appendChild(trendLine);
      
      // Add markers for each available year data
      const validYears = country.years.filter(y => y !== null);
      if (validYears.length > 1) {
        const min = Math.min(...validYears);
        const max = Math.max(...validYears);
        const range = max - min;
        
        country.years.forEach((year, i) => {
          if (year !== null) {
            const marker = document.createElement('div');
            marker.className = 'trend-marker';
            
            // Position horizontally based on year index
            const posX = (i / (country.years.length - 1)) * 100;
            
            // Position vertically based on value
            const posY = range === 0 ? 50 : 100 - ((year - min) / range) * 100;
            
            marker.style.left = `${posX}%`;
            marker.style.top = `${posY}%`;
            marker.title = `${year.toFixed(1)} in ${2024 - i}`;
            
            trendChart.appendChild(marker);
          }
        });
      }
      
      trendCell.appendChild(trendChart);
      
      // Add trend percentage
      const trendValue = document.createElement('span');
      trendValue.className = country.trend < 0 ? 'trend-down' : 'trend-up';
      const trendIcon = country.trend < 0 ? '↓' : '↑';
      trendValue.textContent = ` ${trendIcon} ${Math.abs(country.trendPercent).toFixed(1)}%`;
      trendCell.appendChild(trendValue);
    } else {
      trendCell.textContent = '-';
    }
    
    row.appendChild(trendCell);
    
    // Details button column
    const actionCell = document.createElement('td');
    actionCell.className = 'action-column';
    const detailButton = document.createElement('button');
    detailButton.className = 'detail-button';
    detailButton.textContent = 'Details';
    detailButton.addEventListener('click', () => showCountryDetail(startIndex + index));
    actionCell.appendChild(detailButton);
    row.appendChild(actionCell);
    
    tableBody.appendChild(row);
  });
}

function renderPagination() {
  const paginationContainer = document.getElementById('pagination');
  if (!paginationContainer) return;
  
  paginationContainer.innerHTML = '';
  
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  
  // Add rows per page selector
  const rowsPerPageContainer = document.createElement('div');
  rowsPerPageContainer.className = 'rows-selector';
  
  const rowsLabel = document.createElement('label');
  rowsLabel.textContent = 'Rows per page: ';
  rowsPerPageContainer.appendChild(rowsLabel);
  
  const rowsSelect = document.createElement('select');
  rowsSelect.id = 'rowsPerPageSelect';
  [10, 25, 50, 100].forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    if (value === rowsPerPage) option.selected = true;
    rowsSelect.appendChild(option);
  });
  
  rowsSelect.addEventListener('change', () => {
    rowsPerPage = parseInt(rowsSelect.value);
    currentPage = 1; // Reset to first page
    renderTable();
    renderPagination();
  });
  
  rowsPerPageContainer.appendChild(rowsSelect);
  paginationContainer.appendChild(rowsPerPageContainer);
  
  // No need for pagination if only one page
  if (totalPages <= 1) {
    const pageInfo = document.createElement('div');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Showing ${Math.min(filteredData.length, rowsPerPage)} of ${filteredData.length} countries`;
    paginationContainer.appendChild(pageInfo);
    return;
  }
  
  // Add page navigation
  const pageNavigation = document.createElement('div');
  pageNavigation.className = 'page-navigation';
  
  // Previous button
  const prevButton = document.createElement('div');
  prevButton.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
  if (currentPage > 1) {
    prevButton.addEventListener('click', () => changePage(currentPage - 1));
  }
  pageNavigation.appendChild(prevButton);
  
  // Page numbers
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement('div');
    pageButton.className = `page-item ${i === currentPage ? 'active' : ''}`;
    pageButton.textContent = i;
    pageButton.addEventListener('click', () => changePage(i));
    pageNavigation.appendChild(pageButton);
  }
  
  // Next button
  const nextButton = document.createElement('div');
  nextButton.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
  if (currentPage < totalPages) {
    nextButton.addEventListener('click', () => changePage(currentPage + 1));
  }
  pageNavigation.appendChild(nextButton);
  
  paginationContainer.appendChild(pageNavigation);
  
  // Page info
  const pageInfo = document.createElement('div');
  pageInfo.className = 'page-info';
  const startItem = (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(startItem + rowsPerPage - 1, filteredData.length);
  pageInfo.textContent = `Showing ${startItem}-${endItem} of ${filteredData.length} countries`;
  paginationContainer.appendChild(pageInfo);
}

function changePage(newPage) {
  currentPage = newPage;
  renderTable();
  renderPagination();
  // Scroll to top of table for better UX
  document.querySelector('.table-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setupEventListeners() {
  // Search functionality
  const searchInput = document.getElementById('countrySearch');
  const searchButton = document.getElementById('searchButton');
  
  if (searchInput && searchButton) {
    const performSearch = () => {
      const searchTerm = searchInput.value.trim().toLowerCase();
      filteredData = countriesData.filter(country => 
        country.country.toLowerCase().includes(searchTerm)
      );
      currentPage = 1; // Reset to first page when searching
      renderTable();
      renderPagination();
    };
    
    searchInput.addEventListener('input', performSearch);
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') performSearch();
    });
  }
  
  // Sorting functionality
  const sortSelect = document.getElementById('sortBy');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const sortValue = sortSelect.value;
      
      switch (sortValue) {
        case 'rank':
          filteredData.sort((a, b) => (a.rank || 999) - (b.rank || 999));
          break;
        case 'name':
          filteredData.sort((a, b) => a.country.localeCompare(b.country));
          break;
        case 'aqi':
          filteredData.sort((a, b) => {
            const aqi_a = a.years[0] !== null ? a.years[0] : -1;
            const aqi_b = b.years[0] !== null ? b.years[0] : -1;
            return aqi_b - aqi_a; // Descending order
          });
          break;
        case 'improvement':
          filteredData.sort((a, b) => (a.trend || 0) - (b.trend || 0)); // Ascending (negative is improvement)
          break;
        case 'worsened':
          filteredData.sort((a, b) => (b.trend || 0) - (a.trend || 0)); // Descending
          break;
      }
      
      currentPage = 1; // Reset to first page when sorting
      renderTable();
      renderPagination();
    });
  }
  
  // Region filter
  const regionFilter = document.getElementById('regionFilter');
  if (regionFilter) {
    // Map countries to regions (simplified mapping)
    const regionMapping = {
      'asia': ['China', 'India', 'Japan', 'Indonesia', 'South Korea', 'Thailand', 'Vietnam', 'Singapore', 'Malaysia', 'Bangladesh', 'Pakistan', 'Myanmar', 'Philippines'],
      'africa': ['Nigeria', 'South Africa', 'Egypt', 'Morocco', 'Kenya', 'Ethiopia', 'Algeria', 'Tunisia', 'Ghana', 'Uganda', 'Chad', 'Zimbabwe'],
      'europe': ['Germany', 'France', 'United Kingdom', 'Italy', 'Spain', 'Poland', 'Netherlands', 'Belgium', 'Sweden', 'Norway', 'Finland', 'Denmark', 'Switzerland', 'Austria'],
      'northAmerica': ['United States', 'Canada', 'Mexico'],
      'southAmerica': ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Peru', 'Ecuador', 'Venezuela', 'Uruguay'],
      'oceania': ['Australia', 'New Zealand', 'Fiji', 'Papua New Guinea']
    };
    
    regionFilter.addEventListener('change', () => {
      const selectedRegion = regionFilter.value;
      
      if (selectedRegion === 'all') {
        filteredData = [...countriesData];
      } else {
        const countriesInRegion = regionMapping[selectedRegion] || [];
        filteredData = countriesData.filter(country => 
          countriesInRegion.includes(country.country)
        );
      }
      
      currentPage = 1; // Reset to first page when filtering
      renderTable();
      renderPagination();
    });
  }
}

function showCountryDetail(index) {
  const country = filteredData[index];
  if (!country) return;
  
  const modal = document.getElementById('countryDetailModal');
  const modalCountryName = document.getElementById('modalCountryName');
  const modalAqiBadge = document.getElementById('modalAqiBadge');
  const modalPopulation = document.getElementById('modalPopulation');
  const modalRank = document.getElementById('modalRank');
  const modalTrend = document.getElementById('modalTrend');
  const modalAnalysisBody = document.getElementById('modalAnalysisBody');
  
  // Set modal content
  modalCountryName.textContent = country.country;
  
  const currentAQI = country.years[0];
  if (currentAQI !== null) {
    modalAqiBadge.textContent = `AQI: ${currentAQI.toFixed(1)}`;
    modalAqiBadge.className = `modal-badge ${getAQIClass(currentAQI)}`;
  } else {
    modalAqiBadge.textContent = 'AQI: N/A';
    modalAqiBadge.className = 'modal-badge no-data';
  }
  
  modalPopulation.textContent = country.population ? country.population.toLocaleString() : 'N/A';
  modalRank.textContent = country.rank || 'N/A';
  
  if (country.trend !== null) {
    const trendIcon = country.trend < 0 ? '↓' : '↑';
    const trendClass = country.trend < 0 ? 'change-down' : 'change-up';
    modalTrend.innerHTML = `<span class="${trendClass}">${trendIcon} ${Math.abs(country.trendPercent).toFixed(1)}%</span>`;
  } else {
    modalTrend.textContent = 'N/A';
  }
  
  // Create chart
  createCountryChart(country);
  
  // Year-by-year analysis
  modalAnalysisBody.innerHTML = '';
  
  const years = [2024, 2023, 2022, 2021, 2020, 2019, 2018];
  let previousValue = null;
  
  for (let i = 0; i < country.years.length; i++) {
    const year = years[i];
    const value = country.years[i];
    
    if (value !== null) {
      const row = document.createElement('tr');
      
      // Year cell
      const yearCell = document.createElement('td');
      yearCell.textContent = year;
      row.appendChild(yearCell);
      
      // AQI value cell
      const valueCell = document.createElement('td');
      valueCell.textContent = value.toFixed(1);
      valueCell.className = getAQIClass(value);
      row.appendChild(valueCell);
      
      // Change cell
      const changeCell = document.createElement('td');
      if (previousValue !== null) {
        const change = value - previousValue;
        const changePercent = (change / previousValue) * 100;
        const changeIcon = change < 0 ? '↓' : '↑';
        changeCell.innerHTML = `<span class="${change < 0 ? 'change-down' : 'change-up'}">${changeIcon} ${Math.abs(changePercent).toFixed(1)}%</span>`;
      } else {
        changeCell.textContent = '-';
      }
      row.appendChild(changeCell);
      
      // Status cell
      const statusCell = document.createElement('td');
      if (previousValue !== null) {
        const change = value - previousValue;
        if (Math.abs(change) < 1) {
          statusCell.innerHTML = '<span class="status-stable">Stable</span>';
        } else if (change < 0) {
          statusCell.innerHTML = '<span class="status-improved">Improved</span>';
        } else {
          statusCell.innerHTML = '<span class="status-worsened">Worsened</span>';
        }
      } else {
        statusCell.textContent = '-';
      }
      row.appendChild(statusCell);
      
      modalAnalysisBody.appendChild(row);
      previousValue = value;
    }
  }
  
  // Add health impact section
  const healthImpactSection = createHealthImpactSection(currentAQI);
  document.getElementById('modalContent').appendChild(healthImpactSection);
  
  // Display modal
  modal.style.display = 'block';
}

function createCountryChart(country) {
  const ctx = document.getElementById('modalChart').getContext('2d');
  
  // Clear existing chart if any
  if (window.countryDetailChart) {
    window.countryDetailChart.destroy();
  }
  
  const years = [2024, 2023, 2022, 2021, 2020, 2019, 2018];
  const chartData = country.years.map((value, index) => ({
    x: years[index],
    y: value
  })).filter(item => item.y !== null);
  
  // Sort by year (x value) for proper line display
  chartData.sort((a, b) => a.x - b.x);
  
  // Set a fixed height for the chart container to prevent stretching
  document.querySelector('.modal-chart-container').style.height = '300px';
  
  window.countryDetailChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: 'AQI Value',
        data: chartData,
        backgroundColor: 'rgba(3, 218, 198, 0.1)',
        borderColor: '#03dac6',
        borderWidth: 2,
        pointBackgroundColor: '#03dac6',
        pointBorderColor: '#03dac6',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#03dac6',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true, // Change to true to maintain aspect ratio
      aspectRatio: 2, // Set fixed aspect ratio
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Year',
            color: '#e0e0e0'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#e0e0e0',
            stepSize: 1,
            callback: function(value) {
              return value;
            }
          }
        },
        y: {
          title: {
            display: true,
            text: 'AQI Value',
            color: '#e0e0e0'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#e0e0e0'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: function(tooltipItems) {
              return `Year: ${tooltipItems[0].raw.x}`;
            },
            label: function(context) {
              return `AQI: ${context.raw.y.toFixed(1)}`;
            },
            afterLabel: function(context) {
              const aqi = context.raw.y;
              let category = "Good";
              
              if (aqi > 300) category = "Hazardous";
              else if (aqi > 200) category = "Very Unhealthy";
              else if (aqi > 150) category = "Unhealthy";
              else if (aqi > 100) category = "Unhealthy for Sensitive Groups";
              else if (aqi > 50) category = "Moderate";
              
              return `Category: ${category}`;
            }
          }
        }
      },
      animation: {
        duration: 1500,
        easing: 'easeOutQuart'
      }
    }
  });
}

function createHealthImpactSection(aqi) {
  const section = document.createElement('div');
  section.className = 'modal-health-impact';
  
  const heading = document.createElement('h3');
  heading.textContent = 'Health Impact Information';
  section.appendChild(heading);
  
  let impactInfo;
  
  if (aqi === null) {
    impactInfo = {
      title: "Unknown",
      color: "#777",
      description: "No AQI data available for this country.",
      recommendations: "Cannot provide health recommendations without AQI data."
    };
  } else if (aqi <= 50) {
    impactInfo = healthImpacts.good;
  } else if (aqi <= 100) {
    impactInfo = healthImpacts.moderate;
  } else if (aqi <= 200) {
    impactInfo = healthImpacts.unhealthy;
  } else if (aqi <= 300) {
    impactInfo = healthImpacts.veryUnhealthy;
  } else {
    impactInfo = healthImpacts.hazardous;
  }
  
  const impactGrid = document.createElement('div');
  impactGrid.className = 'health-impact-grid';
  
  // Category info
  const categoryBox = document.createElement('div');
  categoryBox.className = 'impact-category';
  categoryBox.style.backgroundColor = impactInfo.color + '20'; // Add transparency
  categoryBox.style.borderColor = impactInfo.color;
  
  const categoryTitle = document.createElement('h4');
  categoryTitle.textContent = impactInfo.title;
  categoryTitle.style.color = impactInfo.color;
  categoryBox.appendChild(categoryTitle);
  
  if (aqi !== null) {
    const categoryValue = document.createElement('div');
    categoryValue.className = 'category-value';
    categoryValue.textContent = `AQI: ${aqi.toFixed(1)}`;
    categoryBox.appendChild(categoryValue);
  }
  
  impactGrid.appendChild(categoryBox);
  
  // Impact description
  const descriptionBox = document.createElement('div');
  descriptionBox.className = 'impact-description';
  
  const descTitle = document.createElement('h4');
  descTitle.textContent = 'Health Effects';
  descriptionBox.appendChild(descTitle);
  
  const descText = document.createElement('p');
  descText.textContent = impactInfo.description;
  descriptionBox.appendChild(descText);
  
  impactGrid.appendChild(descriptionBox);
  
  // Recommendations
  const recommendBox = document.createElement('div');
  recommendBox.className = 'impact-recommendations';
  
  const recTitle = document.createElement('h4');
  recTitle.textContent = 'Recommendations';
  recommendBox.appendChild(recTitle);
  
  const recText = document.createElement('p');
  recText.textContent = impactInfo.recommendations;
  recommendBox.appendChild(recText);
  
  impactGrid.appendChild(recommendBox);
  
  section.appendChild(impactGrid);
  
  return section;
}

function getAQIClass(value) {
  if (value === null) return 'no-data';
  if (value <= 50) return 'aqi-good';
  if (value <= 100) return 'aqi-moderate';
  if (value <= 200) return 'aqi-unhealthy';
  return 'aqi-hazardous';
}

function closeWelcome() {
  document.getElementById("welcomeBox").style.display = "none";
}

function closeCountryModal() {
  document.getElementById('countryDetailModal').style.display = 'none';
  
  // Remove health impact section to avoid duplication on next open
}

// Function to update the data summary cards with real data
function updateSummaryCards(data) {
  if (!data || !data.length) return;
  
  // Count countries
  document.querySelector('.data-card:nth-child(1) .data-value').textContent = data.length;
  
  // Count years (max 7 years of data)
  document.querySelector('.data-card:nth-child(2) .data-value').textContent = '7';
  
  // Calculate global trend
  let trendsCount = 0;
  let trendsSum = 0;
  data.forEach(country => {
    if (country.trend !== null) {
      trendsCount++;
      trendsSum += country.trendPercent;
    }
  });
  
  const avgTrend = trendsCount > 0 ? (trendsSum / trendsCount).toFixed(1) : '0.0';
  const trendElement = document.querySelector('.data-card:nth-child(3) .data-value');
  if (trendElement) {
    trendElement.textContent = `${avgTrend < 0 ? '' : '+'}${avgTrend}%`;
    trendElement.className = `data-value ${avgTrend < 0 ? 'trend-improved' : 'trend-worsened'}`;
  }
  
  // Count countries with critical AQI (>100)
  const criticalCount = data.filter(country => country.years[0] !== null && country.years[0] > 100).length;
  const criticalElement = document.querySelector('.data-card:nth-child(4) .data-value');
  if (criticalElement) {
    criticalElement.textContent = `${criticalCount} Countries`;
  }
  const healthSection = document.querySelector('.modal-health-impact');
  if (healthSection) healthSection.remove();
}

// Close modal when clicking outside of it
window.onclick = function(event) {
  const modal = document.getElementById('countryDetailModal');
  if (event.target === modal) {
    closeCountryModal();
  }
};