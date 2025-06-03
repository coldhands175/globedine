import React, { useState, useEffect } from "react";
import { Search, Filter, Heart, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import GlobeComponent from "./Globe";
import RecipePanel from "./RecipePanel";
import { useRecipes } from "../hooks/useRecipes";
import type { Recipe } from './RecipePanel';
import { mockDataState } from '../services/recipeCache';

/* ---------------------------------------------------------------- */
/*  Types                                                           */
/* ---------------------------------------------------------------- */
interface Region {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number];
}

// Re-export the Recipe type for consistency
export type { Recipe };

const Home = () => {
  /* -------------- state ----------------------------------------- */
  const [activeRegion, setActiveRegion] = useState<Region | null>(null);
  const [highlightedRegion, setHighlightedRegion] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [view, setView] = useState<"explore" | "search" | "favorites">(
    "explore",
  );

  /* -------------- Spoonacular API integration ------------------ */
  // Available cuisines that can be explored
  const cuisines = [
    "African", "American", "British", "Chinese", "European", "French", 
    "German", "Greek", "Indian", "Italian", "Japanese", "Korean", 
    "Mexican", "Middle Eastern", "Spanish", "Thai", "Vietnamese"
  ];
  
  // Use our custom hook to fetch and manage recipes
  const { 
    recipes, 
    loading, 
    error, 
    toggleFavorite: apiToggleFavorite, 
    getRecipesByRegion,
    updateCuisine,
    selectedCuisine 
  } = useRecipes({ limit: 20 }); // Start with 20 recipes 

  // Update cuisine when region changes
  useEffect(() => {
    if (activeRegion) {
      // Map specific countries to cuisines (takes precedence)
      const countryToCuisine: Record<string, string> = {
        // European countries
        "Italy": "Italian",
        "France": "French",
        "Spain": "Spanish",
        "Greece": "Greek",
        "Germany": "German",
        "United Kingdom": "British",
        
        // Asian countries
        "China": "Chinese",
        "Japan": "Japanese",
        "Thailand": "Thai",
        "India": "Indian",
        "Korea": "Korean",
        "Vietnam": "Vietnamese",
        
        // American countries
        "USA": "American",
        "United States": "American",
        "United States of America": "American",
        "Mexico": "Mexican",
        
        // Middle Eastern
        "Lebanon": "Middle Eastern",
        "Turkey": "Middle Eastern",
        "Iran": "Middle Eastern",
      };
      
      // Map regions to cuisines (used as fallback)
      const regionToCuisine: Record<string, string> = {
        "North America": "American",
        "South America": "Latin American",
        "Europe": "European",
        "Africa": "African",
        "Asia": "Asian",
        "Australia": "Australian"
      };
      
      // First check if we have a specific mapping for this country
      let cuisine = countryToCuisine[activeRegion.name];
      
      // If not, fall back to region mapping
      if (!cuisine) {
        cuisine = regionToCuisine[activeRegion.name];
      }
      
      // If we still don't have a mapping, use Italian as a default instead of the first cuisine
      if (!cuisine) {
        cuisine = "Italian";
      }
      
      console.log(`Mapping region/country ${activeRegion.name} to cuisine: ${cuisine}`);
      updateCuisine(cuisine);
    }
  }, [activeRegion]);

  /* -------------- derived recipe list --------------------------- */
  /* -------------- derived recipe list --------------------------- */
  const filteredRecipes = recipes.filter((r) => {
    if (view === "favorites") return r.isFavorite;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      // Search by title, country, region, description
      const basicMatch = (
        r.title.toLowerCase().includes(query) ||
        r.country.toLowerCase().includes(query) ||
        r.region.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query)
      );
      
      // Search by ingredients (if available)
      const ingredientMatch = r.ingredients ? 
        r.ingredients.some(ingredient => ingredient.toLowerCase().includes(query)) : 
        false;
        
      return basicMatch || ingredientMatch;
    }
    
    // If activeRegion is set, filter by region or country
    if (activeRegion) {
      // Log the activeRegion details for debugging
      console.log(`Filtering recipes for: ${activeRegion.name}`);

      // Comprehensive mapping of countries to cuisines and normalized names
      const countryToCuisine: Record<string, string> = {
        // European countries
        "Italy": "Italian",
        "Italia": "Italian",
        "France": "French",
        "España": "Spanish",
        "Spain": "Spanish",
        "Greece": "Greek",
        "Germany": "German",
        "United Kingdom": "British",
        "Great Britain": "British",
        "Russia": "Russian",
        "Portugal": "Portuguese",
        
        // Asian countries
        "China": "Chinese",
        "Japan": "Japanese",
        "Thailand": "Thai",
        "India": "Indian",
        "Korea": "Korean",
        "Korea, Republic of": "Korean",
        "Vietnam": "Vietnamese",
        
        // American countries
        "USA": "American",
        "United States": "American",
        "United States of America": "American",
        "Mexico": "Mexican",
        "Brasil": "Brazilian",
        "Brazil": "Brazilian",
        "Argentina": "Argentine",
        
        // Middle Eastern
        "Lebanon": "Middle Eastern",
        "Turkey": "Middle Eastern",
        "Iran": "Middle Eastern",
      };

      // Check if we're filtering by a region (continent)
      const continents = ["North America", "South America", "Europe", "Asia", "Africa", "Australia", "Oceania"];
      if (continents.includes(activeRegion.name)) {
        console.log(`Filtering by continent/region: ${activeRegion.name}`);
        return r.region.toLowerCase() === activeRegion.name.toLowerCase();
      }
      
      // Case-insensitive direct country matching
      if (r.country.toLowerCase() === activeRegion.name.toLowerCase()) {
        console.log(`Recipe ${r.title} matches country ${activeRegion.name} directly`);
        return true;
      }

      // Check for partial country name matches
      if (r.country.toLowerCase().includes(activeRegion.name.toLowerCase()) || 
          activeRegion.name.toLowerCase().includes(r.country.toLowerCase())) {
        console.log(`Recipe ${r.title} partially matches country ${activeRegion.name}`);
        return true;
      }
      
      // Try to match based on cuisine (from our country-to-cuisine mapping)
      const targetCuisine = countryToCuisine[activeRegion.name];
      if (targetCuisine) {
        // Check if recipe has matching cuisine in title or description
        if (r.title.toLowerCase().includes(targetCuisine.toLowerCase()) ||
            (r.description && r.description.toLowerCase().includes(targetCuisine.toLowerCase()))) {
          console.log(`Recipe ${r.title} matches cuisine ${targetCuisine}`);
          return true;
        }

        // Recipe ID-based cuisine matching
        if (r.id.startsWith('mock-')) {
          const idNum = parseInt(r.id.replace('mock-', ''));
          
          // Check ID ranges that correspond to cuisines
          if (targetCuisine === "Italian" && idNum >= 100 && idNum < 200) return true;
          if (targetCuisine === "Mexican" && idNum >= 200 && idNum < 300) return true;
          if (targetCuisine === "Chinese" && idNum >= 300 && idNum < 400) return true;
          if (targetCuisine === "Indian" && idNum >= 400 && idNum < 500) return true;
          if (targetCuisine === "Japanese" && idNum >= 500 && idNum < 600) return true;
          if (targetCuisine === "Thai" && idNum >= 600 && idNum < 700) return true;
          if (targetCuisine === "French" && idNum >= 700 && idNum < 800) return true;
          if (targetCuisine === "American" && idNum >= 800 && idNum < 900) return true;
          if (targetCuisine === "Spanish" && idNum >= 900 && idNum < 1000) {
            console.log(`Found Spanish recipe by ID pattern: ${r.title}`);
            return true;
          }
          if (targetCuisine === "Greek" && idNum >= 1000 && idNum < 1100) return true;
        }
      }
      
      return false;
    }
    
    return true;
  });

  /* -------------- globe callbacks ------------------------------- */
  const handleRegionSelect = (region: Region | null) => {
    setActiveRegion(region);
    setSelectedRecipe(null);
    // Clear highlighted region if clicking away
    setHighlightedRegion(region ? region.name : null);
  };
  const handleRegionHover = (name: string | null) => setHighlightedRegion(name);
  
  // Adapter function to match RecipePanel's onRegionSelect prop type
  const handleRegionSelectByName = (regionName: string) => {
    const region = {
      id: regionName.toLowerCase().replace(/\s+/g, "-"),
      name: regionName,
      description: `Explore cuisines from ${regionName}`,
      coordinates: [0, 0] as [number, number] // Default coordinates
    };
    handleRegionSelect(region);
  };

  /* -------------- recipe callbacks ------------------------------ */
  const handleRecipeSelect = (recipe: Recipe | null) => {
    setSelectedRecipe(recipe);
    if (recipe) {
      setHighlightedRegion(recipe.region);
    }
  };
  
  const toggleFavorite = (id: string) => {
    apiToggleFavorite(id);
    // If the currently selected recipe is being toggled, update it
    if (selectedRecipe && selectedRecipe.id === id) {
      setSelectedRecipe({
        ...selectedRecipe,
        isFavorite: !selectedRecipe.isFavorite
      });
    }
  };

  /* -------------- render ---------------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* ---------- header ---------- */}
      <header className="p-4 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-xl font-bold">GC</span>
          </div>
          <h1 className="text-2xl font-bold">Global Cuisine Explorer</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative w-64">
            <Input
              type="text"
              placeholder="Search recipes..."
              className="bg-slate-800 border-slate-600 text-white pr-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          <Button variant="outline" size="icon" className="border-slate-600">
            <Filter className="h-4 w-4" />
          </Button>

          <Button
            variant={view === "favorites" ? "default" : "outline"}
            size="icon"
            className={view === "favorites" ? "" : "border-slate-600"}
            onClick={() =>
              setView(view === "favorites" ? "explore" : "favorites")
            }
          >
            <Heart
              className="h-4 w-4"
              fill={view === "favorites" ? "white" : "none"}
            />
          </Button>
        </div>
      </header>

      {/* ---------- main ---------- */}
      <main className="container mx-auto p-4 flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
        {/* Globe */}
        <div className="lg:w-2/3 flex justify-center items-center h-full overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[500px] w-full">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-400 text-center">Loading recipes from around the world...</p>
              <p className="text-slate-500 text-sm mt-2 text-center">Initializing recipe cache for faster browsing</p>
              <div className="mt-4 bg-slate-800 px-4 py-2 rounded-md text-xs text-slate-400 max-w-md text-center">
                <p>First load may take a moment as we fetch recipes from various cuisines</p>
                <p className="mt-1">Future visits will be much faster!</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[500px] w-full">
              <p className="text-red-500 mb-2">Error loading recipes</p>
              <p className="text-slate-400 text-sm">{error}</p>
            </div>
          ) : (
            <GlobeComponent
              activeRegion={activeRegion}
              onRegionHover={handleRegionHover}
              onRegionSelect={handleRegionSelect}
              highlightedRegion={highlightedRegion}
              recipes={filteredRecipes}
              selectedRecipe={selectedRecipe}
              onRecipeSelect={handleRecipeSelect}
            />
          )}
        </div>

        {/* Recipe side-panel */}
        <div className="lg:w-1/3 h-full flex flex-col overflow-hidden">
          <Tabs value={view} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800">
              <TabsTrigger value="explore" onClick={() => setView("explore")}>
                Explore
              </TabsTrigger>
              <TabsTrigger value="search" onClick={() => setView("search")}>
                Search
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                onClick={() => setView("favorites")}
              >
                Favorites
              </TabsTrigger>
            </TabsList>

            {/* Explore panel (default) */}
            <TabsContent value="explore" className="mt-4 overflow-auto h-[calc(100%-70px)]">
              <RecipePanel
                selectedRegion={activeRegion?.name || null}
                onRegionSelect={handleRegionSelectByName}
                recipes={filteredRecipes}
                selectedRecipe={selectedRecipe}
                onRecipeSelect={handleRecipeSelect}
                onToggleFavorite={toggleFavorite}
              />
            </TabsContent>

            {/* Search panel */}
            <TabsContent value="search" className="mt-4 overflow-auto h-[calc(100%-70px)]">
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <h2 className="text-xl font-semibold mb-4">Search Results</h2>
                  {searchQuery ? (
                    filteredRecipes.length ? (
                      filteredRecipes.map((r) => (
                        <div 
                          key={r.id} 
                          onClick={() => handleRecipeSelect(r)}
                          className="p-2 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <img 
                              src={r.image} 
                              alt={r.title} 
                              className="w-16 h-16 rounded-md object-cover"
                            />
                            <div>
                              <h3 className="font-medium">{r.title}</h3>
                              <p className="text-sm text-slate-400">{r.country}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400">
                        No recipes found matching “{searchQuery}”
                      </p>
                    )
                  ) : (
                    <p className="text-slate-400">
                      Enter a search term to find recipes
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Favorites panel */}
            <TabsContent value="favorites" className="mt-4 overflow-auto h-[calc(100%-70px)]">
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <h2 className="text-xl font-semibold mb-4">
                    Your Favorite Recipes
                  </h2>
                  {filteredRecipes.length ? (
                    filteredRecipes.map((r) => (
                      <div 
                        key={r.id} 
                        onClick={() => handleRecipeSelect(r)}
                        className="p-2 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <img 
                            src={r.image} 
                            alt={r.title} 
                            className="w-16 h-16 rounded-md object-cover"
                          />
                          <div>
                            <h3 className="font-medium">{r.title}</h3>
                            <p className="text-sm text-slate-400">{r.country}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">
                      You haven’t added any favorites yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* ---------- footer ---------- */}
      <footer className="p-4 border-t border-slate-700 text-center text-slate-400 text-sm">
        &copy; 2025 Global Cuisine Explorer — discover the world through food.
      </footer>
    </div>
  );
};

export default Home;
