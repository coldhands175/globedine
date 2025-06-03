/**
 * Spoonacular API service
 * Documentation: https://spoonacular.com/food-api/docs
 */

// NOTE: You'll need to replace this with your actual API key from Spoonacular
// Get one from: https://spoonacular.com/food-api/console#Dashboard
const API_KEY = '52a9dd1d347844378be7d8d835e2ed91';
const BASE_URL = 'https://api.spoonacular.com';

// Common query params used with most endpoints
interface CommonQueryParams {
  number?: number; // Number of results to return
  offset?: number; // Number of results to skip (for pagination)
  apiKey?: string; // API key (will default to the one above)
}

// Query params for recipe search
interface SearchRecipesParams extends CommonQueryParams {
  query?: string; // Search query
  cuisine?: string; // Filter by cuisine (e.g., "italian", "chinese", etc.)
  diet?: string; // Filter by diet (e.g., "vegetarian", "vegan", etc.)
  intolerances?: string; // Filter by intolerances (e.g., "gluten", "dairy", etc.)
  type?: string; // Filter by meal type (e.g., "main course", "dessert", etc.)
  includeIngredients?: string; // Filter by included ingredients
  excludeIngredients?: string; // Filter by excluded ingredients
  maxReadyTime?: number; // Maximum ready time in minutes
  addRecipeInformation?: boolean; // Include detailed information about recipes
  fillIngredients?: boolean; // Add information about the ingredients
  instructionsRequired?: boolean; // Only return recipes with instructions
  sort?: string; // Sort the results (e.g., "popularity", "healthiness")
  sortDirection?: string; // Sort direction ("asc" or "desc")
}

// Recipe information returned from the search endpoint
export interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
  missedIngredients: Ingredient[];
  usedIngredients: Ingredient[];
  unusedIngredients: Ingredient[];
  likes: number;
}

// Detailed recipe information
export interface SpoonacularRecipeDetail {
  id: number;
  title: string;
  image: string;
  imageType: string;
  servings: number;
  readyInMinutes: number;
  license: string;
  sourceName: string;
  sourceUrl: string;
  spoonacularSourceUrl: string;
  aggregateLikes: number;
  healthScore: number;
  spoonacularScore: number;
  pricePerServing: number;
  analyzedInstructions: AnalyzedInstruction[];
  cheap: boolean;
  creditsText: string;
  cuisines: string[];
  dairyFree: boolean;
  diets: string[];
  gaps: string;
  glutenFree: boolean;
  instructions: string;
  ketogenic: boolean;
  lowFodmap: boolean;
  occasions: string[];
  sustainable: boolean;
  vegan: boolean;
  vegetarian: boolean;
  veryHealthy: boolean;
  veryPopular: boolean;
  weightWatcherSmartPoints: number;
  dishTypes: string[];
  extendedIngredients: ExtendedIngredient[];
  summary: string;
  winePairing: WinePairing;
}

// Types for recipe details
interface AnalyzedInstruction {
  name: string;
  steps: Step[];
}

interface Step {
  number: number;
  step: string;
  ingredients: Ingredient[];
  equipment: Equipment[];
  length?: {
    number: number;
    unit: string;
  };
}

interface Ingredient {
  id: number;
  name: string;
  localizedName: string;
  image: string;
}

interface Equipment {
  id: number;
  name: string;
  localizedName: string;
  image: string;
}

interface ExtendedIngredient {
  id: number;
  aisle: string;
  image: string;
  consistency: string;
  name: string;
  nameClean: string;
  original: string;
  originalName: string;
  amount: number;
  unit: string;
  meta: string[];
  measures: {
    us: {
      amount: number;
      unitShort: string;
      unitLong: string;
    };
    metric: {
      amount: number;
      unitShort: string;
      unitLong: string;
    };
  };
}

interface WinePairing {
  pairedWines: string[];
  pairingText: string;
  productMatches: {
    id: number;
    title: string;
    description: string;
    price: string;
    imageUrl: string;
    averageRating: number;
    ratingCount: number;
    score: number;
    link: string;
  }[];
}

/**
 * Search for recipes using various criteria
 */
export const searchRecipes = async (params: SearchRecipesParams = {}): Promise<SpoonacularRecipe[]> => {
  try {
    const queryParams = new URLSearchParams({
      apiKey: params.apiKey || API_KEY,
      number: String(params.number || 12),
      offset: String(params.offset || 0),
      ...Object.entries(params)
        .filter(([key]) => key !== 'apiKey' && key !== 'number' && key !== 'offset')
        .filter(([_, value]) => value !== undefined && value !== null)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: String(value) }), {})
    });

    const response = await fetch(`${BASE_URL}/recipes/complexSearch?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error searching recipes:', error);
    return [];
  }
};

/**
 * Get recipe information by ID
 */
export const getRecipeById = async (id: number): Promise<SpoonacularRecipeDetail | null> => {
  try {
    const queryParams = new URLSearchParams({
      apiKey: API_KEY,
    });

    const response = await fetch(`${BASE_URL}/recipes/${id}/information?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting recipe ${id}:`, error);
    return null;
  }
};

/**
 * Search recipes by cuisine
 */
export const getRecipesByCuisine = async (cuisine: string, params: CommonQueryParams = {}): Promise<SpoonacularRecipe[]> => {
  return searchRecipes({ ...params, cuisine });
};

/**
 * Convert Spoonacular coordinates to [lat, lng] format
 * NOTE: Spoonacular doesn't provide coordinates directly, so we'll need to map cuisines to regions
 */
const cuisineToCoordinates: Record<string, [number, number]> = {
  'african': [8.7832, 34.5085],
  'american': [39.7837304, -100.4458825],
  'british': [55.3781, -3.4360],
  'cajun': [30.9843, -91.9623],
  'caribbean': [18.2208, -66.5901],
  'chinese': [35.8617, 104.1954],
  'eastern european': [50.0755, 14.4378],
  'european': [48.8566, 2.3522],
  'french': [46.2276, 2.2137],
  'german': [51.1657, 10.4515],
  'greek': [39.0742, 21.8243],
  'indian': [20.5937, 78.9629],
  'irish': [53.1424, -7.6921],
  'italian': [41.8719, 12.5674],
  'japanese': [36.2048, 138.2529],
  'jewish': [31.0461, 34.8516],
  'korean': [35.9078, 127.7669],
  'latin american': [-8.7832, -55.4915],
  'mediterranean': [41.2921, 28.2978],
  'mexican': [23.6345, -102.5528],
  'middle eastern': [29.2985, 42.5510],
  'nordic': [60.1282, 18.6435],
  'southern': [33.2467, -88.7477],
  'spanish': [40.4637, -3.7492],
  'thai': [15.8700, 100.9925],
  'vietnamese': [14.0583, 108.2772],
};

/**
 * Transform Spoonacular recipe to app Recipe format
 */
export const transformSpoonacularRecipe = (recipe: SpoonacularRecipeDetail): any => {
  // Get coordinates based on cuisine or default to random position
  const coordinates = recipe.cuisines?.length > 0 && cuisineToCoordinates[recipe.cuisines[0].toLowerCase()]
    ? cuisineToCoordinates[recipe.cuisines[0].toLowerCase()]
    : [Math.random() * 180 - 90, Math.random() * 360 - 180];

  // Get country from cuisine or use "Global"
  const country = recipe.cuisines?.length > 0 
    ? recipe.cuisines[0].split(" ").map(word => word[0].toUpperCase() + word.slice(1)).join(" ")
    : "Global";

  return {
    id: `spoonacular-${recipe.id}`,
    title: recipe.title,
    country,
    region: getRegionFromCountry(country),
    prepTime: `${recipe.readyInMinutes} min`,
    image: recipe.image,
    isFavorite: false,
    description: recipe.summary.replace(/<\/?[^>]+(>|$)/g, ""), // Remove HTML tags
    coordinates: coordinates,
    ingredients: recipe.extendedIngredients.map(ing => `${ing.amount} ${ing.unit} ${ing.name}`),
    instructions: recipe.analyzedInstructions[0]?.steps.map(step => step.step) || [],
    dietaryTags: getDietaryTags(recipe),
  };
};

/**
 * Helper function to extract dietary tags from a recipe
 */
const getDietaryTags = (recipe: SpoonacularRecipeDetail): string[] => {
  const tags: string[] = [];
  
  if (recipe.vegetarian) tags.push('vegetarian');
  if (recipe.vegan) tags.push('vegan');
  if (recipe.glutenFree) tags.push('gluten-free');
  if (recipe.dairyFree) tags.push('dairy-free');
  
  // Add diet types as tags
  if (recipe.diets && recipe.diets.length > 0) {
    recipe.diets.forEach(diet => {
      if (!tags.includes(diet)) {
        tags.push(diet);
      }
    });
  }
  
  return tags;
};

/**
 * Helper function to get region from country
 */
const getRegionFromCountry = (country: string): string => {
  const countryToRegion: Record<string, string> = {
    'American': 'North America',
    'Mexican': 'North America',
    'Canadian': 'North America',
    'British': 'Europe',
    'French': 'Europe',
    'Italian': 'Europe',
    'Spanish': 'Europe',
    'German': 'Europe',
    'Greek': 'Europe',
    'Mediterranean': 'Europe',
    'Indian': 'Asia',
    'Chinese': 'Asia',
    'Japanese': 'Asia',
    'Korean': 'Asia',
    'Thai': 'Asia',
    'Vietnamese': 'Asia',
    'Middle Eastern': 'Asia',
    'Brazilian': 'South America',
    'Peruvian': 'South America',
    'Argentine': 'South America',
    'Colombian': 'South America',
    'African': 'Africa',
    'Moroccan': 'Africa',
    'Ethiopian': 'Africa',
    'Australian': 'Australia',
    'New Zealand': 'Australia',
  };
  
  return countryToRegion[country] || 'Global';
};
