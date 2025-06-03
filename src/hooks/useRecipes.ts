import { useState, useEffect } from 'react';
import { searchRecipes, getRecipeById, transformSpoonacularRecipe } from '../services/api';
import { recipeCache, initializeCache, getRecipes } from '../services/recipeCache';
import type { Recipe } from '../components/RecipePanel';

export interface UseRecipesOptions {
  initialCuisine?: string;
  limit?: number;
}

/**
 * Custom hook for fetching and managing recipe data from Spoonacular API
 */
export function useRecipes({ initialCuisine, limit = 12 }: UseRecipesOptions = {}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCuisine, setSelectedCuisine] = useState<string | undefined>(initialCuisine);
  
  // Initialize cache on first load
  useEffect(() => {
    const initCache = async () => {
      setLoading(true);
      
      try {
        // Initialize cache with popular cuisines
        const success = await initializeCache();
        if (!success) {
          console.warn('Cache initialization encountered issues');
        }
        
        // Load all recipes from cache for initial display
        const allCachedRecipes = recipeCache.getAllRecipes();
        if (allCachedRecipes.length > 0) {
          setRecipes(allCachedRecipes);
        } else {
          // If cache is empty, fetch some default recipes
          await fetchRecipesForCuisine('Italian');
        }
      } catch (err) {
        console.error('Error initializing cache:', err);
        setError('Failed to initialize recipe data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    initCache();
  }, []); // Run only once on component mount
  
  // Fetch recipes based on selected cuisine
  useEffect(() => {
    if (!selectedCuisine) return;
    
    fetchRecipesForCuisine(selectedCuisine);
  }, [selectedCuisine]);
  
  // Function to fetch recipes for a specific cuisine
  const fetchRecipesForCuisine = async (cuisine: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // First check if we have this cuisine in cache
      if (recipeCache.hasCuisine(cuisine)) {
        const cachedRecipes = recipeCache.getRecipesForCuisine(cuisine);
        setRecipes(cachedRecipes);
        setLoading(false);
        return;
      }
      
      // Not in cache, fetch from API
      const fetchedRecipes = await getRecipes(cuisine);
      setRecipes(fetchedRecipes);
    } catch (err) {
      console.error(`Error fetching ${cuisine} recipes:`, err);
      setError(`Failed to fetch ${cuisine} recipes. Please try again later.`);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Toggle favorite status of a recipe
   */
  const toggleFavorite = (id: string) => {
    setRecipes(prevRecipes => 
      prevRecipes.map(recipe => 
        recipe.id === id 
          ? { ...recipe, isFavorite: !recipe.isFavorite } 
          : recipe
      )
    );
  };
  
  /**
   * Get recipes filtered by region
   */
  const getRecipesByRegion = (region: string | null) => {
    if (!region) return recipes;
    return recipes.filter(recipe => recipe.region === region);
  };
  
  /**
   * Update selected cuisine and refetch recipes
   */
  const updateCuisine = (cuisine: string) => {
    setSelectedCuisine(cuisine);
  };
  
  return {
    recipes,
    loading,
    error,
    toggleFavorite,
    getRecipesByRegion,
    updateCuisine,
    selectedCuisine,
  };
}
