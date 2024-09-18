document.addEventListener('DOMContentLoaded', () => {
    // Load the JSON data (replace this with an actual fetch or a locally loaded JSON file)
    const DATA_URL = 'kw-gap2.json';
    
    // Variables for chart and data storage
    let competitorChart;
    let filteredData = [];
    
    // Debounce utility function
    function debounce(func, delay) {
        let debounceTimer;
        return function(...args) {
            const context = this;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    }
    
    // Fetch JSON data and initialize
    async function fetchData() {
        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching JSON data:', error);
            alert('Failed to load data. Please check the console for details.');
            return [];
        }
    }

    // Function to get query parameters
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Initialize Chart.js chart
    function initializeChart() {
        const ctx = document.getElementById('competitorChart').getContext('2d');
        competitorChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allows CSS to control the height
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Distribution of Intents Across Competitors'
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                scales: {
                    x: { 
                        stacked: true, // Stack bars for each intent
                        title: { 
                            display: true, 
                            text: 'Competitors' 
                        },
                        ticks: { 
                            autoSkip: false, 
                            maxRotation: 90, 
                            minRotation: 45 
                        }
                    },
                    y: { 
                        stacked: true, // Stack bars for each intent
                        title: { 
                            display: true, 
                            text: 'Number of Keywords' 
                        },
                        beginAtZero: true 
                    }
                }
            }
        });
    }

    // Update the chart based on filtered data
    function updateChart(data) {
        const competitors = new Set();
        const intentsSet = new Set();
        const dataMap = {}; // { intent1: { competitor1: count, competitor2: count }, ... }

        // Aggregate data
        data.forEach(item => {
            const intent = item.Intents || 'N/A';
            const competitorRanks = getCompetitorsWithRanks(item);

            Object.keys(competitorRanks).forEach(competitor => {
                const rank = competitorRanks[competitor];
                if (rank > 0) {
                    competitors.add(competitor);
                    intentsSet.add(intent);

                    if (!dataMap[intent]) dataMap[intent] = {};
                    if (!dataMap[intent][competitor]) dataMap[intent][competitor] = 0;

                    dataMap[intent][competitor]++;
                }
            });
        });

        const labels = [...competitors].sort(); // Sort for consistency
        const intents = [...intentsSet].sort();

        // Generate distinct colors for each intent
        const colorPalette = [
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(199, 199, 199, 0.6)',
            'rgba(83, 102, 255, 0.6)'
        ];

        const datasets = intents.map((intent, index) => {
            const backgroundColor = colorPalette[index % colorPalette.length];
            return {
                label: intent,
                data: labels.map(competitor => dataMap[intent][competitor] || 0),
                backgroundColor: backgroundColor,
                borderColor: backgroundColor.replace('0.6', '1'),
                borderWidth: 1
            };
        });

        // Update Chart.js data
        competitorChart.data.labels = labels;
        competitorChart.data.datasets = datasets;
        competitorChart.update();
    }

    // Function to handle the Download CSV functionality
    function downloadCsv() {
        const csvContent = [
            ['Keyword', 'Intents', 'Volume', 'Highest Competitor', 'Competitor Pages'].join(',')
        ];

        filteredData.forEach(item => {
            const competitors = getCompetitorsWithRanks(item);
            const highest = getHighestRankingCompetitor(competitors);
            const competitorPages = getCompetitorPages(item);

            csvContent.push([
                `"${item.Keyword}"`, // Encapsulate in quotes in case of commas
                `"${item.Intents || 'N/A'}"`,
                item.Volume,
                highest.competitor ? `"${highest.competitor} (Rank: ${highest.rank})"` : 'N/A',
                `"${Object.values(competitorPages).join('; ')}"`
            ].join(','));
        });

        const csvBlob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);

        const a = document.createElement('a');
        a.href = csvUrl;
        a.download = 'filtered_results.csv';
        a.click();
    }

    // Get competitors with valid ranks
    function getCompetitorsWithRanks(item) {
        const competitors = {};
        for (const key in item) {
            if (!key.includes('(pages)') && !["Keyword", "Intents", "Volume", "Keyword Difficulty", "CPC", "Competition Density", "Results", "Region"].includes(key)) {
                const rank = item[key];
                if (rank > 0 && typeof rank === 'number') competitors[key] = rank;
            }
        }
        return competitors;
    }

    // Get the highest ranking competitor
    function getHighestRankingCompetitor(competitors) {
        let highestCompetitor = null;
        let highestRank = Infinity;
        for (const [competitor, rank] of Object.entries(competitors)) {
            if (rank < highestRank) {
                highestRank = rank;
                highestCompetitor = competitor;
            }
        }
        return { competitor: highestCompetitor, rank: highestRank };
    }

    // Get competitor pages with URLs
    function getCompetitorPages(item) {
        const pages = {};
        for (const key in item) {
            if (key.includes('(pages)') && item[key] !== null) {
                const competitorName = key.replace(' (pages)', '');
                pages[competitorName] = item[key];
            }
        }
        return pages;
    }

    // Render the table based on the filtered data
    function renderTable() {
        const tbody = document.querySelector('#resultsTable tbody');
        tbody.innerHTML = '';

        filteredData.forEach(item => {
            const competitors = getCompetitorsWithRanks(item);
            const highest = getHighestRankingCompetitor(competitors);
            const competitorPages = getCompetitorPages(item);

            const tr = document.createElement('tr');

            // Keyword Cell
            const keywordTd = document.createElement('td');
            keywordTd.textContent = item.Keyword;
            tr.appendChild(keywordTd);

            // Intents Cell
            const intentsTd = document.createElement('td');
            intentsTd.textContent = item.Intents || 'N/A';
            tr.appendChild(intentsTd);

            // Volume Cell
            const volumeTd = document.createElement('td');
            volumeTd.textContent = item.Volume;
            tr.appendChild(volumeTd);

            // Highest Ranking Competitor Cell
            const highestTd = document.createElement('td');
            highestTd.textContent = highest.competitor ? `${highest.competitor} (Rank: ${highest.rank})` : 'N/A';
            tr.appendChild(highestTd);

            // Competitor Pages Cell
            const pagesTd = document.createElement('td');
            if (Object.keys(competitorPages).length > 0) {
                for (const [comp, url] of Object.entries(competitorPages)) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.textContent = comp;
                    link.target = '_blank';
                    link.classList.add('competitor-link');
                    link.style.textDecoration = 'none';
                    link.style.color = '#1a0dab';

                    // Create icon element
                    const icon = document.createElement('span');
                    icon.textContent = ' ↗'; // Unicode character for "open in new tab"
                    icon.classList.add('open-icon');

                    pagesTd.appendChild(link);
                    pagesTd.appendChild(icon);
                    pagesTd.appendChild(document.createElement('br'));
                }
            } else {
                pagesTd.textContent = 'N/A';
            }
            tr.appendChild(pagesTd);

            tbody.appendChild(tr);
        });
    }

    // Function to handle URL query strings for search terms, allowing Unicode characters like Japanese and Arabic
    function updateUrlWithQuery(searchTerm) {
        const url = new URL(window.location.href);
        
        // Encode the search term to retain Unicode characters
        const queryParam = encodeURIComponent(searchTerm.trim());
        
        url.searchParams.set('q', queryParam);
        window.history.pushState({}, '', url);
    }

    // Main logic to handle filtering, searching, and chart updates
    async function initDashboard() {
        const data = await fetchData();
        const regionSelect = document.getElementById('regionSelect');
        const competitorSelect = document.getElementById('competitorSelect');
        const keywordSearch = document.getElementById('keywordSearch');
        const downloadButton = document.getElementById('downloadCsv');

        // Populate region dropdown
        const uniqueRegions = [...new Set(data.map(item => item.Region))].sort();
        uniqueRegions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionSelect.appendChild(option);
        });

        // Event listener for Region selection
        regionSelect.addEventListener('change', function() {
            const selectedRegion = this.value;
            // Reset to all data before applying region filter
            filteredData = selectedRegion ? data.filter(item => item.Region === selectedRegion) : data.slice();
            
            // If there's a search term, apply it on top of the region filter
            const searchTerm = keywordSearch.value.trim().toLowerCase();
            if (searchTerm) {
                filteredData = filteredData.filter(item => item.Keyword.toLowerCase().includes(searchTerm));
            }

            // Apply competitor filter if a competitor is selected
            const selectedCompetitor = competitorSelect.value;
            if (selectedCompetitor) {
                filteredData = filteredData.filter(item => {
                    const competitors = getCompetitorsWithRanks(item);
                    return Object.keys(competitors).includes(selectedCompetitor);
                });
            }

            renderTable();
            updateChart(filteredData);
            populateCompetitorDropdown(filteredData);
        });

        // Event listener for keyword search with debounce
        keywordSearch.addEventListener('input', debounce(function() {
            const searchTerm = this.value.trim().toLowerCase();
            updateUrlWithQuery(this.value.trim());
            
            // Start with all data or filtered by region if a region is selected
            const selectedRegion = regionSelect.value;
            filteredData = selectedRegion ? data.filter(item => item.Region === selectedRegion) : data.slice();
            
            if (searchTerm) {
                filteredData = filteredData.filter(item => item.Keyword.toLowerCase().includes(searchTerm));
            }

            // Apply competitor filter if a competitor is selected
            const selectedCompetitor = competitorSelect.value;
            if (selectedCompetitor) {
                filteredData = filteredData.filter(item => {
                    const competitors = getCompetitorsWithRanks(item);
                    return Object.keys(competitors).includes(selectedCompetitor);
                });
            }

            renderTable();
            updateChart(filteredData);
            populateCompetitorDropdown(filteredData);
        }, 300)); // 300ms delay

        // Event listener for Competitor selection
        competitorSelect.addEventListener('change', function() {
            const selectedCompetitor = this.value;
            if (selectedCompetitor) {
                filteredData = filteredData.filter(item => {
                    const competitors = getCompetitorsWithRanks(item);
                    return Object.keys(competitors).includes(selectedCompetitor);
                });
            } else {
                // If no competitor is selected, reset to previous filteredData based on region and search
                const selectedRegion = regionSelect.value;
                const searchTerm = keywordSearch.value.trim().toLowerCase();
                filteredData = selectedRegion ? data.filter(item => item.Region === selectedRegion) : data.slice();
                if (searchTerm) {
                    filteredData = filteredData.filter(item => item.Keyword.toLowerCase().includes(searchTerm));
                }
            }
            renderTable();
            updateChart(filteredData);
        });

        // Download CSV button event
        downloadButton.addEventListener('click', downloadCsv);

        // Initialize chart
        initializeChart();

        // Check if there's a 'q' parameter in the URL and apply the search filter
        const queryParam = getQueryParam('q');
        if (queryParam) {
            const decodedQuery = decodeURIComponent(queryParam);
            keywordSearch.value = decodedQuery;
            // Trigger the input event to apply the filter
            const event = new Event('input');
            keywordSearch.dispatchEvent(event);
        } else {
            // If no query parameter, show all data initially
            filteredData = data.slice();
            renderTable();
            updateChart(filteredData);
            populateCompetitorDropdown(filteredData);
        }
    }

    // Populate competitor dropdown dynamically based on filtered data
    function populateCompetitorDropdown(filteredData) {
        const competitorSelect = document.getElementById('competitorSelect');
        competitorSelect.innerHTML = '<option value="">-- Select Competitor --</option>';
        
        let competitors = new Set();

        filteredData.forEach(item => {
            const competitorRanks = getCompetitorsWithRanks(item);
            Object.keys(competitorRanks).forEach(competitor => competitors.add(competitor));
        });

        competitors.forEach(competitor => {
            let option = document.createElement('option');
            option.value = competitor;
            option.textContent = competitor;
            competitorSelect.appendChild(option);
        });

        competitorSelect.disabled = competitors.size === 0;
    }

    // Initialize the dashboard on page load
    initDashboard();
});