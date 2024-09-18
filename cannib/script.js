// script.js

// Global Variables
let keywordData = [];
let filters = {};
let currentSort = { column: null, direction: 'asc' };
const itemsPerPage = 20;
let currentPage = 1;
const columnsToExclude = ['Parameter', 'Param=?srstlid', 'Query', 'cluster'];
const sortableColumns = [
    'Keyword',
    'Page',
    'PageType_Botify_Merged',
    'Clicks',
    'Impressions',
    'Avg_Position',
    'Comment',
    'Directory_1',
    'Directory_2',
    'Clicks_pct_vs_Query',
    'Clicks_pct_vs_Page',
    'Lang_Folder',
    'Query_String',
    'Market',
    'Directory_3',
    'Directory_4',
    'Directory_5',
    'Directory_6',
    'Directory_7',
    'Directory_8',
    'Breadcrumb',
    'Cluster',
    'PageType_Botify'
];
const totalChunks = 11; // Set this to the exact number of chunks you have
let loadedChunks = {}; // To keep track of loaded chunks

// Chart Instance
let directoryChart;

// Initialize the Chart
function initChart() {
    const ctx = document.getElementById('directoryChart').getContext('2d');
    directoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [], // PageType_Botify_Merged values
            datasets: [{
                label: 'Count of URLs',
                data: [],
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Segments'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Count of URLs'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Count of URLs per Segment'
                }
            }
        }
    });
}

// Update the Chart with Filtered Data
function updateChart(filteredData) {
    const segmentCounts = {};
    filteredData.forEach(item => {
        const segment = item['PageType_Botify_Merged'];
        if (segment) {
            if (!segmentCounts[segment]) {
                segmentCounts[segment] = 0;
            }
            segmentCounts[segment]++;
        }
    });

    const labels = Object.keys(segmentCounts);
    const data = labels.map(label => segmentCounts[label]);

    directoryChart.data.labels = labels;
    directoryChart.data.datasets[0].data = data;
    directoryChart.update();
}

// Apply Filters to Data
function applyFilters(data, filters) {
    return data.filter(item => {
        return Object.entries(filters).every(([key, values]) => {
            if (key === 'Avg_Position') {
                const avgPosition = parseFloat(item.Avg_Position);
                return values.some(range => {
                    if (range === '21+') {
                        return avgPosition >= 21;
                    }
                    const [min, max] = range.split('-').map(Number);
                    return avgPosition >= min && avgPosition <= max;
                });
            } else if (key === 'PageType_Botify_Merged') {
                return values.includes(item['PageType_Botify_Merged']);
            } else if (key === 'Market') {
                return values.includes(item['Market']);
            } else if (key === 'Cluster') {
                return values.includes(item['Cluster']);
            }
            // Add more conditions here if you have other filter keys
            return true; // Default to true if key is not recognized
        });
    });
}

// Render Table Headers
function renderHeaders() {
    const headerRow = document.getElementById('headerRow');
    headerRow.innerHTML = '';
    if (keywordData.length > 0) {
        const allHeaders = Object.keys(keywordData[0]).filter(header => !columnsToExclude.includes(header));
        const reorderedHeaders = [
            'Keyword',
            'Page',
            'Clicks',
            'Impressions',
            'Avg_Position',
            'Comment',
            'Directory_1',
            'Directory_2',
            'Full Breadcrumb Name',
            'PageType_Botify_Merged',
            'Cluster',
            ...allHeaders.filter(header => ![
                'Keyword',
                'Page',
                'Clicks',
                'Impressions',
                'Avg_Position',
                'Comment',
                'Directory_1',
                'Directory_2',
                'Full Breadcrumb Name',
                'PageType_Botify_Merged',
                'Cluster'
            ].includes(header))
        ];
        reorderedHeaders.forEach(header => {
            const th = document.createElement('th');
            th.innerHTML = header.replace(/_/g, ' ').replace(/ /g, '<br>');
            th.setAttribute('data-column', header);
            if (sortableColumns.includes(header)) {
                th.style.cursor = 'pointer';
                th.onclick = () => sortTable(header);
                if (currentSort.column === header) {
                    th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
                }
            }
            headerRow.appendChild(th);
        });
    }
}

// Render the Data Table
function renderTable() {
    const filteredData = applyFilters(keywordData, filters);
    console.log('Data to render:', filteredData); // For debugging
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';

    // Sort Data
    if (currentSort.column) {
        filteredData.sort((a, b) => {
            let valueA = a[currentSort.column];
            let valueB = b[currentSort.column];
            if (typeof valueA === 'string') valueA = valueA.toLowerCase();
            if (typeof valueB === 'string') valueB = valueB.toLowerCase();
            if (currentSort.column === 'Keyword' || currentSort.column === 'Page') {
                return currentSort.direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
            }
            if (valueA < valueB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    paginatedData.forEach(item => {
        const row = tbody.insertRow();
        const allKeys = Object.keys(item).filter(key => !columnsToExclude.includes(key));
        const reorderedKeys = [
            'Keyword',
            'Page',
            'Clicks',
            'Impressions',
            'Avg_Position',
            'Comment',
            'Directory_1',
            'Directory_2',
            'Full Breadcrumb Name',
            'PageType_Botify_Merged',
            'Cluster',
            ...allKeys.filter(key => ![
                'Keyword',
                'Page',
                'Clicks',
                'Impressions',
                'Avg_Position',
                'Comment',
                'Directory_1',
                'Directory_2',
                'Full Breadcrumb Name',
                'PageType_Botify_Merged',
                'Cluster'
            ].includes(key))
        ];
        reorderedKeys.forEach(key => {
            const cell = row.insertCell();
            cell.setAttribute('data-label', key);

            if (key === 'Keyword' || key === 'Page') {
                const content = document.createElement('div');
                content.textContent = item[key];
                content.style.display = 'inline-block';

                const copyBtn = document.createElement('span');
                copyBtn.innerHTML = '&#128203;'; // Copy icon
                copyBtn.className = 'copy-btn';
                copyBtn.title = 'Copy to clipboard';
                copyBtn.onclick = (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(item[key]);
                    alert('Copied to clipboard!');
                };

                const openBtn = document.createElement('span');
                openBtn.innerHTML = '&#128279;'; // Link icon
                openBtn.className = 'open-btn';
                openBtn.title = 'Open in new tab';
                openBtn.onclick = (e) => {
                    e.stopPropagation();
                    let url;
                    if (key === 'Keyword') {
                        url = `https://www.google.com/search?q=${encodeURIComponent(item[key])}`;
                    } else {
                        url = item[key];
                    }
                    window.open(url, '_blank');
                };

                cell.appendChild(content);
                cell.appendChild(copyBtn);
                cell.appendChild(openBtn);

                if (key === 'Page') {
                    cell.classList.add('url-cell');
                }
            } else {
                cell.textContent = item[key];
            }

            // Click to filter
            cell.onclick = () => addFilter(key, item[key]);
        });
    });

    // Update the chart with the filtered data
    updateChart(filteredData);

    // Update the summary table
    updateSummaryTable(filteredData);

    // Update row count
    updateRowCount(filteredData.length);

    // Log for debugging
    console.log('Rendered data count:', filteredData.length);
}

// Update the Summary Table
function updateSummaryTable(filteredData) {
    const tbody = document.querySelector('#summaryTable tbody');
    tbody.innerHTML = '';

    if (filteredData.length > 0) {
        // Find the Keyword with the highest Clicks_pct_vs_Query
        let maxClicksPctQueryItem = filteredData.reduce((maxItem, currentItem) => {
            const currentValue = parseFloat(currentItem.Clicks_pct_vs_Query);
            const maxValue = parseFloat(maxItem.Clicks_pct_vs_Query);
            return currentValue > maxValue ? currentItem : maxItem;
        }, filteredData[0]);

        // Find the URL with the highest Clicks_pct_vs_Page
        let maxClicksPctPageItem = filteredData.reduce((maxItem, currentItem) => {
            const currentValue = parseFloat(currentItem.Clicks_pct_vs_Page) || 0;
            const maxValue = parseFloat(maxItem.Clicks_pct_vs_Page) || 0;
            return currentValue > maxValue ? currentItem : maxItem;
        }, filteredData[0]);

        // Add rows to the summary table
        const keywordRow = tbody.insertRow();
        keywordRow.insertCell().textContent = 'Keyword with Highest Clicks_pct_vs_Query';
        const keywordCell = keywordRow.insertCell();
        keywordCell.textContent = maxClicksPctQueryItem.Keyword;
        keywordCell.onclick = () => addFilter('Keyword', maxClicksPctQueryItem.Keyword);
        keywordCell.style.cursor = 'pointer';

        const urlRow = tbody.insertRow();
        urlRow.insertCell().textContent = 'URL with Highest Clicks_pct_vs_Page';
        const urlCell = urlRow.insertCell();
        urlCell.textContent = maxClicksPctPageItem.Page;
        urlCell.onclick = () => addFilter('Page', maxClicksPctPageItem.Page);
        urlCell.style.cursor = 'pointer';
    } else {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 2;
        cell.textContent = 'No data available';
    }
}

// Render Pagination Controls
function renderPagination() {
    const paginationControls = document.getElementById('paginationControls');
    paginationControls.innerHTML = '';

    const filteredData = applyFilters(keywordData, filters);
    const pageCount = Math.ceil(filteredData.length / itemsPerPage);

    for (let i = 1; i <= pageCount; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.className = 'page-button' + (i === currentPage ? ' active' : '');
        button.onclick = () => {
            currentPage = i;
            renderTable();
            renderPagination();
        };
        paginationControls.appendChild(button);
    }
}

// Sort the Table by a Column
function resetSorting() {
    currentSort = { column: null, direction: 'asc' };
    renderHeaders();
    renderTable();
    updateChart(applyFilters(keywordData, filters));
}

function sortTable(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    renderTable();
    renderHeaders();
}

// Add a Filter
function addFilter(key, value) {
    // Map keys to data keys
    const keyMapping = {
        'PageType_Botify': 'PageType_Botify_Merged',
        // Add other mappings if necessary
    };
    const dataKey = keyMapping[key] || key;

    if (!filters[dataKey]) {
        filters[dataKey] = [];
    }
    if (!filters[dataKey].includes(value)) {
        filters[dataKey].push(value);
    }
    // Reset to first page
    currentPage = 1;
    renderTable();
    renderActiveFilters();
    renderPagination();
    updateChart(applyFilters(keywordData, filters));
}

// Remove a Filter
function removeFilter(key) {
    delete filters[key];
    // Reset to first page
    currentPage = 1;
    renderTable();
    renderActiveFilters();
    renderPagination();
}

// Render Active Filters
function renderActiveFilters() {
    const activeFilters = document.getElementById('activeFilters');
    activeFilters.innerHTML = '';
    Object.entries(filters).forEach(([key, values]) => {
        values.forEach(value => {
            const filterDiv = document.createElement('div');
            filterDiv.className = 'filter';
            filterDiv.textContent = `${key}: ${value}`;
            const removeIcon = document.createElement('span');
            removeIcon.className = 'remove-filter';
            removeIcon.textContent = '✖';
            removeIcon.onclick = () => removeFilter(key);
            filterDiv.appendChild(removeIcon);
            activeFilters.appendChild(filterDiv);
        });
    });
}

// Download Filtered Data as CSV
function downloadCSV() {
    const filteredData = applyFilters(keywordData, filters);

    if (filteredData.length === 0) {
        alert('No data to download.');
        return;
    }

    const headers = Object.keys(filteredData[0]).filter(header => !columnsToExclude.includes(header));
    const csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n"
        + filteredData.map(row => {
            return headers.map(key => {
                let value = row[key];
                // Escape double quotes
                if (typeof value === 'string') {
                    value = value.replace(/"/g, '""');
                    return `"${value}"`;
                }
                return value;
            }).join(",");
        }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "keyword_data_filtered.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Clear All Filters
function clearFilters() {
    filters = {};
    
    // Clear select elements
    ['marketFilter', 'segmentFilter', 'clusterFilter'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            Array.from(select.options).forEach(option => option.selected = false);
        }
    });

    // Reset to first page
    currentPage = 1;

    // Clear active filters display
    const activeFilters = document.getElementById('activeFilters');
    if (activeFilters) {
        activeFilters.innerHTML = '';
    }

    // Re-render table with all data
    renderTable();
    renderPagination();

    // Update chart with all data
    updateChart(keywordData);

    // Log for debugging
    console.log('Filters cleared:', filters);
    console.log('Data count after clearing:', keywordData.length);
}

// Update Row Count Display
function updateRowCount(count) {
    const rowCountElement = document.getElementById('rowCount');
    rowCountElement.textContent = `Showing ${count} row${count !== 1 ? 's' : ''} on page ${currentPage}`;
}

// Initialize the Application
document.addEventListener('DOMContentLoaded', function() {
    initChart();
    loadData();
});

// Load Data Function
function loadData() {
    const totalChunks = 11; // Set this to the exact number of chunks you have
    let loadedChunks = 0;
    keywordData = [];

    function loadChunk(chunkNumber) {
        fetch(`chunks/chunk_${chunkNumber}.json`)
            .then(response => response.json())
            .then(data => {
                keywordData = keywordData.concat(data);
                loadedChunks++;
                updateLoadingProgress(loadedChunks, totalChunks);
                
                if (loadedChunks === totalChunks) {
                    finishLoading();
                }
            })
            .catch(error => console.error(`Error loading chunk ${chunkNumber}:`, error));
    }

    function updateLoadingProgress(loaded, total) {
        const progress = Math.round((loaded / total) * 100);
        const loadingProgress = document.getElementById('loadingProgress');
        loadingProgress.textContent = `Loading data: ${progress}%`;
        loadingProgress.style.display = 'block';
    }

    function finishLoading() {
        renderHeaders();
        renderTable();
        renderPagination();
        populateFilters();
        addFilterEventListeners();
        document.getElementById('loadingProgress').style.display = 'none';
    }

    for (let i = 1; i <= totalChunks; i++) {
        loadChunk(i);
    }
}

// Populate Filters Function
function populateFilters() {
    populateFilter('marketFilter', 'Market');
    populateFilter('segmentFilter', 'PageType_Botify_Merged');
    populateFilter('clusterFilter', 'Cluster');
}

// Populate Individual Filter
function populateFilter(filterId, dataKey) {
    const filterElement = document.getElementById(filterId);
    const uniqueValues = [...new Set(keywordData.map(item => item[dataKey]))].sort();
    
    filterElement.innerHTML = '';
    uniqueValues.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        filterElement.appendChild(option);
    });
}

// Add Filter Event Listeners
function addFilterEventListeners() {
    const filterMapping = {
        'marketFilter': 'Market',
        'segmentFilter': 'PageType_Botify_Merged',
        'clusterFilter': 'Cluster'
    };

    ['marketFilter', 'segmentFilter', 'clusterFilter'].forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', (event) => {
                const select = event.target;
                const selectedOptions = Array.from(select.selectedOptions).map(option => option.value);
                const filterKey = filterMapping[filterId];

                if (selectedOptions.length > 0) {
                    filters[filterKey] = selectedOptions;
                } else {
                    delete filters[filterKey];
                }
                currentPage = 1;
                renderTable();
                renderActiveFilters();
                renderPagination();
                updateChart(applyFilters(keywordData, filters));
            });
        } else {
            console.error(`Filter element ${filterId} not found`);
        }
    });
}

// Get Filtered Data Function
function getFilteredData() {
    const filteredData = applyFilters(keywordData, filters);
    console.log('Filtered data:', filteredData); // For debugging
    return filteredData;
}