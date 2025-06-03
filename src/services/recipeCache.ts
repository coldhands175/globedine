import { 
  searchRecipes, 
  getRecipeById, 
  transformSpoonacularRecipe,
  SpoonacularRecipeDetail
} from './api';
import type { Recipe } from '../components/RecipePanel';
import { getMockRecipesForCuisine, getAllMockRecipes } from './mockData';

// We're exclusively using mock data for the application
export const mockDataState = {
  usingMockData: true, // Always true since we're only using mock data
  apiError: null as Error | null
};

// Cache keys
const CACHE_PREFIX = 'global-cuisine-';
const CACHE_CUISINES = `${CACHE_PREFIX}cuisines`;
const CACHE_TIMESTAMP = `${CACHE_PREFIX}timestamp`;
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Cache for storing recipe data from Spoonacular
 */
export class RecipeCache {
  private inMemoryCache: Record<string, Recipe[]> = {};
  
  /**
   * Initialize cache from localStorage
   */
  constructor() {
    this.loadFromLocalStorage();
  }
  
  /**
   * Check if the cache has data for a cuisine
   */
  hasCuisine(cuisine: string): boolean {
    return !!this.inMemoryCache[cuisine] && this.inMemoryCache[cuisine].length > 0;
  }
  
  /**
   * Get cached recipes for a cuisine
   */
  getRecipesForCuisine(cuisine: string): Recipe[] {
    return this.inMemoryCache[cuisine] || [];
  }
  
  /**
   * Get all cached recipes
   */
  getAllRecipes(): Recipe[] {
    return Object.values(this.inMemoryCache).flat();
  }
  
  /**
   * Add recipes to cache and save to localStorage
   */
  addRecipes(cuisine: string, recipes: Recipe[]): void {
    this.inMemoryCache[cuisine] = recipes;
    this.saveToLocalStorage();
  }
  
  /**
   * Load cache from localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      // Check if cache is expired
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP);
      const now = new Date().getTime();
      
      if (timestamp && now - parseInt(timestamp) < CACHE_EXPIRY) {
        // Cache is still valid, load it
        const cuisines = JSON.parse(localStorage.getItem(CACHE_CUISINES) || '[]');
        
        // Load each cuisine's recipes
        cuisines.forEach((cuisine: string) => {
          const cachedData = localStorage.getItem(`${CACHE_PREFIX}${cuisine}`);
          if (cachedData) {
            this.inMemoryCache[cuisine] = JSON.parse(cachedData);
          }
        });
        
        console.log(`Loaded ${Object.keys(this.inMemoryCache).length} cuisines from cache`);
      } else {
        // Cache is expired or doesn't exist
        console.log('Cache expired or not found');
        this.clearCache();
      }
    } catch (error) {
      console.error('Error loading cache from localStorage:', error);
      this.clearCache();
    }
  }
  
  /**
   * Save cache to localStorage
   */
  private saveToLocalStorage(): void {
    try {
      // Save timestamp
      localStorage.setItem(CACHE_TIMESTAMP, new Date().getTime().toString());
      
      // Save list of cuisines
      const cuisines = Object.keys(this.inMemoryCache);
      localStorage.setItem(CACHE_CUISINES, JSON.stringify(cuisines));
      
      // Save each cuisine's recipes
      cuisines.forEach(cuisine => {
        localStorage.setItem(
          `${CACHE_PREFIX}${cuisine}`, 
          JSON.stringify(this.inMemoryCache[cuisine])
        );
      });
      
      console.log(`Saved ${cuisines.length} cuisines to cache`);
    } catch (error) {
      console.error('Error saving cache to localStorage:', error);
    }
  }
  
  /**
   * Clear the cache
   */
  clearCache(): void {
    this.inMemoryCache = {};
    
    // Clear all cache items from localStorage
    const cuisines = JSON.parse(localStorage.getItem(CACHE_CUISINES) || '[]');
    cuisines.forEach((cuisine: string) => {
      localStorage.removeItem(`${CACHE_PREFIX}${cuisine}`);
    });
    
    localStorage.removeItem(CACHE_CUISINES);
    localStorage.removeItem(CACHE_TIMESTAMP);
    
    console.log('Cache cleared');
  }
}

// Singleton instance
export const recipeCache = new RecipeCache();

/**
 * Initialize or update the cache with recipes from all specified cuisines
 * This can be called on app startup to populate the cache
 */
export async function initializeCache(cuisines: string[] = []): Promise<boolean> {
  try {
    // If no cuisines provided, use default cuisines
    const cuisinesToCache = cuisines.length > 0 ? cuisines : [
      'Italian', 'Mexican', 'Chinese', 'Indian', 'Japanese', 
      'Thai', 'French', 'Spanish', 'Greek', 'American'
    ];
    
    console.log(`Initializing cache with ${cuisinesToCache.length} cuisines (mock data only)`);
    
    // Set mock data mode to true - we're only using mock data
    mockDataState.usingMockData = true;
    
    // Load all mock recipes
    console.log('Loading all mock recipes');
    const allMockRecipes = getAllMockRecipes();
    
    // Add each cuisine's recipes to the cache
    Object.entries(allMockRecipes).forEach(([cuisine, recipes]) => {
      if (!recipeCache.hasCuisine(cuisine)) {
        // Make sure we're passing an array of recipes
        if (Array.isArray(recipes)) {
          recipeCache.addRecipes(cuisine, recipes);
          console.log(`Added ${recipes.length} ${cuisine} mock recipes to cache`);
        } else {
          // Handle unexpected case where recipes isn't an array
          console.warn(`Skipping ${cuisine} - recipes is not an array`);
        }
      } else {
        console.log(`${cuisine} mock recipes already in cache, skipping`);
      }
    });
    
    console.log(`Saved ${Object.keys(allMockRecipes).length} cuisines to cache`);
    return true;
  } catch (error) {
    console.error('Error initializing cache with mock data:', error);
    return false;
  }
}

/**
 * Get recipes from cache if available, otherwise use mock data
 * This version only uses mock data without any API calls
 */
export async function getRecipes(cuisine?: string, forceRefresh = false): Promise<Recipe[]> {
  if (!cuisine) {
    // Return all cached recipes if no cuisine specified
    return recipeCache.getAllRecipes();
  }
  
  // Check if cuisine is in cache
  if (recipeCache.hasCuisine(cuisine) && !forceRefresh) {
    console.log(`Returning ${cuisine} recipes from cache`);
    return recipeCache.getRecipesForCuisine(cuisine);
  }
  
  // Not in cache or refresh requested, load mock data
  console.log(`Loading mock data for ${cuisine}`);
  const mockRecipes = getMockRecipesForCuisine(cuisine);
  
  // Add to cache
  if (mockRecipes.length > 0) {
    recipeCache.addRecipes(cuisine, mockRecipes);
    console.log(`Added ${mockRecipes.length} ${cuisine} mock recipes to cache`);
  } else {
    console.log(`No mock recipes found for ${cuisine}`);
  }
  
  return mockRecipes;
}
