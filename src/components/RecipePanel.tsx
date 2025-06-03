import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Heart, ArrowLeft } from "lucide-react";

export interface Recipe {
  id: string;
  title: string;
  country: string;
  region: string;
  prepTime: string;
  image: string;
  isFavorite: boolean;
  description: string;
  coordinates: [number, number];
  ingredients?: string[];
  instructions?: string[];
  dietaryTags?: string[];
}

interface RecipePanelProps {
  selectedRegion?: string | null;
  onRegionSelect?: (region: string) => void;
  recipes?: Recipe[];
  selectedRecipe?: Recipe | null;
  onRecipeSelect?: (recipe: Recipe) => void;
  onToggleFavorite?: (id: string) => void;
}

const RecipePanel = ({
  selectedRegion = null,
  onRegionSelect = () => {},
  recipes = [],
  selectedRecipe = null,
  onRecipeSelect = () => {},
  onToggleFavorite = () => {},
}: RecipePanelProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("explore");
  const [selectedRecipeState, setSelectedRecipeState] = useState<Recipe | null>(null);
  const [dietaryFilters, setDietaryFilters] = useState<string[]>([]);

  const dietaryOptions = [
    { id: "vegetarian", label: "Vegetarian" },
    { id: "vegan", label: "Vegan" },
    { id: "gluten-free", label: "Gluten-Free" },
    { id: "dairy-free", label: "Dairy-Free" },
  ];

  const toggleDietaryFilter = (filter: string) => {
    setDietaryFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesDietary =
      dietaryFilters.length === 0 ||
      (recipe.dietaryTags &&
        dietaryFilters.every((filter) =>
          recipe.dietaryTags?.includes(filter)
        ));

    // We should trust the recipes already filtered by Home component
    // and only apply search and dietary filters here
    // The region filtering is already handled by the Home component
    
    return matchesSearch && matchesDietary;
  });

  const favoriteRecipes = recipes.filter((recipe) => recipe.isFavorite);
  const displayedRecipes = activeTab === "explore" ? filteredRecipes : favoriteRecipes;
  const currentRecipe = selectedRecipeState || selectedRecipe;

  const handleRecipeClick = (recipe: Recipe) => {
    onRecipeSelect(recipe);
    setSelectedRecipeState(recipe);
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(id);
  };

  // Recipe Detail View
  const renderRecipeDetail = () => (
    <div className="h-full flex flex-col">
      <div className="relative w-full h-48 bg-slate-800">
        <img
          src={currentRecipe?.image}
          alt={currentRecipe?.title}
          className="w-full h-full object-cover"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-slate-900/50 rounded-full hover:bg-slate-800/80"
          onClick={(e) => currentRecipe && handleToggleFavorite(currentRecipe.id, e)}
        >
          <Heart
            className={`h-5 w-5 ${
              currentRecipe?.isFavorite ? "fill-red-500 text-red-500" : "text-white"
            }`}
          />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
            {currentRecipe?.country}
          </Badge>
          <Badge variant="outline" className="border-slate-700 text-slate-300">
            {currentRecipe?.prepTime}
          </Badge>
          {currentRecipe?.dietaryTags?.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            >
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-slate-300 mb-6">
          {currentRecipe?.description}
        </p>

        <div className="space-y-6">
          {currentRecipe?.ingredients && currentRecipe.ingredients.length > 0 && (
            <div>
              <h4 className="font-medium text-white mb-3">Ingredients</h4>
              <ul className="space-y-2">
                {currentRecipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 mr-2 flex-shrink-0"></span>
                    <span className="text-slate-300 text-sm">{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentRecipe?.instructions && currentRecipe.instructions.length > 0 && (
            <div>
              <h4 className="font-medium text-white mb-3">Instructions</h4>
              <ol className="space-y-3">
                {currentRecipe.instructions.map((step, index) => (
                  <li key={index} className="flex">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-medium mr-3 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-slate-300 text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Recipe List View
  const renderRecipeList = () => (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-2 pb-1 border-b border-slate-800">
        <div className="flex space-x-1">
          <Button
            variant={activeTab === "explore" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("explore")}
            className={`flex-1 ${
              activeTab === "explore"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Explore
          </Button>
          <Button
            variant={activeTab === "favorites" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("favorites")}
            className={`flex-1 ${
              activeTab === "favorites"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Favorites
          </Button>
        </div>

        <div className="flex flex-wrap gap-1 my-2">
          {dietaryOptions.map((option) => (
            <button
              key={option.id}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                dietaryFilters.includes(option.id)
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
              onClick={() => toggleDietaryFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {displayedRecipes.length > 0 ? (
            displayedRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="group flex items-center p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => handleRecipeClick(recipe)}
              >
                <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">
                    {recipe.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {recipe.country} • {recipe.prepTime}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {recipe.dietaryTags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {recipe.dietaryTags && recipe.dietaryTags.length > 2 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-400">
                        +{recipe.dietaryTags.length - 2}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 ml-2 p-1.5 rounded-full hover:bg-slate-700 transition-opacity"
                  onClick={(e) => handleToggleFavorite(recipe.id, e)}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      recipe.isFavorite ? "fill-red-500 text-red-500" : "text-slate-400"
                    }`}
                  />
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">
                No recipes found
              </h3>
              <p className="text-sm text-slate-400 max-w-xs">
                {activeTab === "favorites"
                  ? "You haven't favorited any recipes yet."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <Card className="w-full h-full flex flex-col bg-slate-900 border-slate-800 rounded-xl overflow-hidden">
      <CardHeader className="pb-2 border-b border-slate-800">
        <CardTitle className="flex items-center justify-between">
          {currentRecipe ? (
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mr-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                onClick={() => {
                  setSelectedRecipeState(null);
                  onRecipeSelect(null);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-white truncate">{currentRecipe.title}</span>
            </div>
          ) : (
            <span className="text-white">
              {selectedRegion ? `${selectedRegion} Recipes` : "Global Recipes"}
            </span>
          )}
          
          {!currentRecipe && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="search"
                placeholder="Search recipes..."
                className="pl-8 w-[180px] h-9 rounded-md bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        {currentRecipe ? renderRecipeDetail() : renderRecipeList()}
      </CardContent>
    </Card>
  );
};

export default RecipePanel;
