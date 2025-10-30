const searchForm = document.getElementById('searchForm');
const bookInput = document.getElementById('bookInput');
const searchBtn = document.getElementById('searchBtn');
const modelSelect = document.getElementById('modelSelect');
const loading = document.getElementById('loading');
const results = document.getElementById('results');

// Load available models on page load
async function loadModels() {
    try {
        const response = await fetch('/api/tags');
        const data = await response.json();
        
        if (data.models && data.models.length > 0) {
            modelSelect.innerHTML = '';
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.name;
                modelSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.log('Could not load models, using defaults');
    }
}

// Get book recommendations
async function getRecommendations(book, model) {
    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                book: book,
                model: model
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Failed to get recommendations: ${error.message}`);
    }
}

// Display results
function displayResults(data) {
    if (data.error) {
        results.innerHTML = `
            <div class="error">
                <strong>Error:</strong> ${data.error}
                ${data.details ? `<br><small>${data.details}</small>` : ''}
            </div>
        `;
        return;
    }

    results.innerHTML = `
        <div class="original-book">
            <strong>Recommendations for:</strong> "${data.originalBook}"
        </div>
        <div class="recommendations">
            ${data.recommendations}
        </div>
        <div style="margin-top: 15px; font-size: 14px; color: #666;">
            <em>Generated using ${data.model}</em>
        </div>
    `;
}

// Handle form submission
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const book = bookInput.value.trim();
    const model = modelSelect.value;
    
    if (!book) return;

    // Show loading state
    loading.classList.remove('hidden');
    results.innerHTML = '';
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';

    try {
        const recommendationData = await getRecommendations(book, model);
        displayResults(recommendationData);
    } catch (error) {
        displayResults({ error: error.message });
    } finally {
        loading.classList.add('hidden');
        searchBtn.disabled = false;
        searchBtn.textContent = 'Get Recommendations';
    }
});

// Load models when page loads
loadModels();

// Focus on search input
bookInput.focus();

// Add keyboard shortcut (Enter to search)
bookInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !searchBtn.disabled) {
        searchForm.dispatchEvent(new Event('submit'));
    }
});