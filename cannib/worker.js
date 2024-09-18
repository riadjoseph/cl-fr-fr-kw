// worker.js

let keywordData = [];
let loadedChunks = {};

// Function to fetch a specific chunk
async function fetchChunk(chunkNumber) {
    try {
        const response = await fetch(`chunks/chunk_${chunkNumber}.json`);
        if (!response.ok) throw new Error(`Failed to load chunk ${chunkNumber}`);
        const data = await response.json();
        return data;
    } catch (error) {
        postMessage({ status: 'error', message: error.message });
        return [];
    }
}

// Function to load multiple chunks
async function loadChunks(chunkNumbers) {
    const promises = chunkNumbers.map(num => fetchChunk(num));
    const results = await Promise.all(promises);
    results.forEach((chunk, index) => {
        const chunkNumber = chunkNumbers[index];
        keywordData = keywordData.concat(chunk);
        loadedChunks[chunkNumber] = true;
    });
    postMessage({ status: 'loaded', loadedChunks: chunkNumbers, total: chunkNumbers.length });
}

// Listen for messages from the main thread
self.onmessage = async (event) => {
    const { action, payload } = event.data;

    switch (action) {
        case 'LOAD_CHUNKS':
            const { chunksToLoad } = payload;
            await loadChunks(chunksToLoad);
            break;

        default:
            postMessage({ status: 'error', message: `Unknown action: ${action}` });
    }
};