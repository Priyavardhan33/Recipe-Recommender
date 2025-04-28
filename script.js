// API Configuration
//const API_KEY = '817b75a351a04b3f9d85435835962662';
// Remove unused API keys and keep only the active one
const API_KEY = '21f7690d90f54b0daf2d58b52ff02443';
const BASE_URL = 'https://api.spoonacular.com/recipes';

const searchInput = document.querySelector('.search-section input');
const searchButton = document.querySelector('.search-icon');
const cuisineSelect = document.getElementById('cuisineSelect');
const timeSelect = document.getElementById('timeSelect');
const recipeGrid = document.querySelector('.recipe-grid');

async function searchRecipes(isInitialLoad = false) {
    const searchTerm = searchInput.value.toLowerCase();
    const cuisine = cuisineSelect.value;
    const time = timeSelect.value;

    try {
        recipeGrid.innerHTML = '<p>Loading recipes...</p>';
        
        let apiUrl = `${BASE_URL}/complexSearch?apiKey=${API_KEY}`;
        apiUrl += '&number=12&addRecipeInformation=true&instructionsRequired=true';
        apiUrl += '&fillIngredients=true';
        
        // Add random sorting for initial load
        if (isInitialLoad) {
            apiUrl += '&sort=random';
        }
        
        if (cuisine === 'Indian' && searchTerm.includes('chicken')) {
            apiUrl += `&cuisine=${encodeURIComponent(cuisine)}`;
            apiUrl += `&query=${encodeURIComponent('chicken')}`;
            apiUrl += '&excludeIngredients=coconut';
            apiUrl += '&excludeTitle=spicy,coconut';
        } else {
            if (cuisine) {
                apiUrl += `&cuisine=${encodeURIComponent(cuisine)}`;
            }
            if (searchTerm) {
                apiUrl += `&query=${encodeURIComponent(searchTerm)}`;
            }
        }
        
        if (time && time !== 'more') {
            apiUrl += `&maxReadyTime=${time}`;
        }

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.code === 402) {
            throw new Error('Daily API quota exceeded. Please try again tomorrow.');
        }

        displayRecipes(data.results || []);
    } catch (error) {
        console.error('API Error:', error);
        recipeGrid.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

function displayRecipes(recipes) {
    recipeGrid.innerHTML = '';
    
    // Filter recipes to only include those with images
    const recipesWithImages = recipes.filter(recipe => recipe.image);
    
    if (recipesWithImages.length === 0) {
        recipeGrid.innerHTML = '<p>No recipes found with images. Try adjusting your search criteria.</p>';
        return;
    }

    recipesWithImages.forEach(recipe => {
        const recipeCard = `
            <div class="recipe-card" onclick="fetchAndShowInstructions(${recipe.id}, '${recipe.title}')">
                <img src="${recipe.image}" alt="${recipe.title}">
                <h3>${recipe.title}</h3>
                <div class="recipe-details">
                    <div class="recipe-info">
                        <h4>Diet Type:</h4>
                        <p>${recipe.vegetarian ? 'Vegetarian' : 'Non-Vegetarian'}.</p>
                        ${recipe.vegan ? '<p>Vegan.</p>' : ''}
                        ${recipe.glutenFree ? '<p>Gluten-Free.</p>' : ''}
                        ${recipe.dairyFree ? '<p>Dairy-Free.</p>' : ''}
                        
                        <h4>Cooking Details:</h4>
                        <p>Cooking Time: ${recipe.readyInMinutes || 'N/A'} minutes.</p>
                        <p>Servings: ${recipe.servings || 'N/A'}.</p>
                        <p>Health Score: ${recipe.healthScore || 'N/A'}.</p>
                    </div>
                </div>
            </div>
        `;
        recipeGrid.innerHTML += recipeCard;
    });
}

async function fetchAndShowInstructions(recipeId, title) {
    try {
        // Fetch both instructions and recipe information
        const [instructionsResponse, recipeInfoResponse] = await Promise.all([
            fetch(`${BASE_URL}/${recipeId}/analyzedInstructions?apiKey=${API_KEY}`),
            fetch(`${BASE_URL}/${recipeId}/information?apiKey=${API_KEY}`)
        ]);
        
        const data = await instructionsResponse.json();
        const recipeInfo = await recipeInfoResponse.json();
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        let instructionsHtml = '';
        if (data && data.length > 0 && data[0].steps) {
            // Add video section if available
            const videoSection = recipeInfo.videoUrl ? `
                <div class="recipe-video">
                    <h3>Cooking Video</h3>
                    <div class="video-container">
                        <iframe 
                            src="${recipeInfo.videoUrl}"
                            frameborder="0"
                            allowfullscreen>
                        </iframe>
                    </div>
                </div>
            ` : '';

            instructionsHtml = `
                <h2>${title}</h2>
                ${videoSection}
                <div class="cooking-steps">
                    ${data[0].steps.map((step, index) => `
                        <div class="step">
                            <h3>Step ${index + 1}</h3>
                            <p>${step.step}</p>
                            ${step.ingredients && step.ingredients.length > 0 ? 
                                `<p class="ingredients">Ingredients: ${step.ingredients.map(ing => ing.name).join(', ')}</p>` 
                                : ''}
                            ${step.equipment && step.equipment.length > 0 ? 
                                `<p class="equipment">Equipment: ${step.equipment.map(eq => eq.name).join(', ')}</p>`
                                : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            instructionsHtml = '<p>No instructions available for this recipe.</p>';
        }
        
        modalContent.innerHTML = instructionsHtml;
        
        // Show modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.appendChild(modalContent);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.className = 'modal-close';
        modalContent.appendChild(closeButton);
        document.body.classList.add('modal-open');
        
        closeButton.onclick = () => {
            document.body.removeChild(modal);
            document.body.classList.remove('modal-open');
        };
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                document.body.classList.remove('modal-open');
            }
        });

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error fetching recipe instructions:', error);
        alert('Failed to load recipe instructions. Please try again.');
    }
}

// Event listeners
searchButton.addEventListener('click', searchRecipes);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchRecipes();
});
cuisineSelect.addEventListener('change', searchRecipes);
timeSelect.addEventListener('change', searchRecipes);

// Initial load
window.onload = () => searchRecipes(true);

// ✅ Back to Top button logic
const backToTopBtn = document.getElementById('backToTop');

window.onscroll = () => {
    if (window.scrollY > 300) {
        backToTopBtn.style.display = 'block';
    } else {
        backToTopBtn.style.display = 'none';
    }
};

backToTopBtn.onclick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
