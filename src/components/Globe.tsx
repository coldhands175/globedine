import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { motion } from "framer-motion";
import { X } from "lucide-react";

// Extend the Window interface to include the Globe instance
declare global {
  interface Window {
    Globe: any;
  }
}

export interface Recipe {
  id: string;
  title: string;
  country: string;
  region: string;
  coordinates: [number, number];
  image?: string;
  isFavorite?: boolean;
  prepTime?: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  dietaryTags?: string[];
}

interface Region {
  lat: number;
  lng: number;
  name: string;
  color: string;
}

interface GlobeProps {
  onRegionHover?: (region: string | null) => void;
  highlightedRegion?: string | null;
  rotationSpeed?: number;
  interactive?: boolean;
  activeRegion?: { name: string };
  recipes?: Recipe[];
  selectedRecipe?: Recipe | null;
  onRegionSelect?: (payload: {
    id: string;
    name: string;
    description: string;
    coordinates: [number, number];
  }) => void;
  onRecipeSelect?: (recipe: Recipe) => void;
}

interface TooltipData {
  visible: boolean;
  country: string;
  region: string;
  coordinates: [number, number];
  signature_dish?: string;
  cuisine_style?: string;
  popular_ingredients?: string[];
  food_fact?: string;
}

// Default region data
const defaultRegions: Region[] = [
  { lat: 40, lng: -95, name: "North America", color: "#1a659e" },
  { lat: -10, lng: -55, name: "South America", color: "#33658a" },
  { lat: 50, lng: 10, name: "Europe", color: "#2f4858" },
  { lat: 0, lng: 20, name: "Africa", color: "#f26419" },
  { lat: 35, lng: 100, name: "Asia", color: "#55dde0" },
  { lat: -25, lng: 135, name: "Australia", color: "#f6ae2d" },
];

// Country to region mapping for accurate region determination
const countryToRegion: Record<string, string> = {
  // North America
  'United States': 'North America',
  'Canada': 'North America',
  'Mexico': 'North America',
  'Cuba': 'North America',
  
  // South America
  'Brazil': 'South America',
  'Argentina': 'South America',
  'Chile': 'South America',
  'Peru': 'South America',
  'Colombia': 'South America',
  
  // Europe
  'Italy': 'Europe',
  'France': 'Europe',
  'Spain': 'Europe',
  'Germany': 'Europe',
  'United Kingdom': 'Europe',
  'Greece': 'Europe',
  'Portugal': 'Europe',
  
  // Asia
  'China': 'Asia',
  'Japan': 'Asia',
  'India': 'Asia',
  'Thailand': 'Asia',
  'Vietnam': 'Asia',
  'Korea': 'Asia',
  'Malaysia': 'Asia',
  'Indonesia': 'Asia',
  
  // Africa
  'Egypt': 'Africa',
  'Morocco': 'Africa',
  'Ethiopia': 'Africa',
  'South Africa': 'Africa',
  'Nigeria': 'Africa',
  
  // Australia/Oceania
  'Australia': 'Australia',
  'New Zealand': 'Australia'
};

// Food-related data for countries (mock data)
const foodData: Record<string, { dish: string, cuisine: string, ingredients: string[], fact: string }> = {
  'United States': {
    dish: 'Hamburger',
    cuisine: 'Diverse American',
    ingredients: ['Beef', 'Cheese', 'Lettuce', 'Tomato'],
    fact: 'Americans consume over 50 billion hamburgers annually.'
  },
  'Italy': {
    dish: 'Pizza Napoletana',
    cuisine: 'Mediterranean',
    ingredients: ['Tomatoes', 'Mozzarella', 'Basil', 'Olive oil'],
    fact: 'Traditional Neapolitan pizza takes only 60-90 seconds to bake.'
  },
  'Japan': {
    dish: 'Sushi',
    cuisine: 'Japanese',
    ingredients: ['Rice', 'Seaweed', 'Fish', 'Vinegar'],
    fact: 'Sushi originally began as a preservation method, with fish fermented in rice.'
  },
  'France': {
    dish: 'Coq au Vin',
    cuisine: 'French',
    ingredients: ['Chicken', 'Red wine', 'Mushrooms', 'Garlic'],
    fact: 'France has over 400 distinct types of cheese.'
  },
  'Mexico': {
    dish: 'Tacos',
    cuisine: 'Mexican',
    ingredients: ['Corn tortilla', 'Meat', 'Salsa', 'Cilantro', 'Onion'],
    fact: 'Traditional Mexican cuisine is a UNESCO cultural heritage.'
  },
  'India': {
    dish: 'Curry',
    cuisine: 'Indian',
    ingredients: ['Spices', 'Vegetables', 'Rice', 'Yogurt'],
    fact: 'India has the world\'s largest vegetarian population.'
  },
  'China': {
    dish: 'Dim Sum',
    cuisine: 'Chinese',
    ingredients: ['Flour', 'Various fillings', 'Soy sauce'],
    fact: 'Chinese cuisine has over 8 major regional styles.'
  },
};

// Simpler implementation of the Globe component
export const GlobeComponent = ({
  onRegionHover = () => {},
  highlightedRegion = null,
  rotationSpeed = 0.001,
  interactive = true,
  activeRegion,
  recipes = [],
  selectedRecipe = null,
  onRegionSelect = () => {},
  onRecipeSelect = () => {},
}: GlobeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [currentRegion, setCurrentRegion] = useState<string | null>(null);
  const [hoveredRecipe, setHoveredRecipe] = useState<Recipe | null>(null);
  const arcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isGlobeLoaded, setIsGlobeLoaded] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  // Create a memoized version of the recipes data as points
  const recipesData = React.useMemo(() => {
    return recipes.map(recipe => ({
      ...recipe,
      lat: recipe.coordinates?.[0] || defaultRegions.find(r => r.name === recipe.region)?.lat || 0,
      lng: recipe.coordinates?.[1] || defaultRegions.find(r => r.name === recipe.region)?.lng || 0,
      color: recipe.isFavorite ? '#ffd700' : '#ff6b6b',
      altitude: 0.07,
      radius: recipe.id === selectedRecipe?.id ? 0.4 : 0.25,
    }));
  }, [recipes, selectedRecipe]);

  // Load GeoJSON data for countries
  useEffect(() => {
    const fetchGeoJSON = async () => {
      try {
        const response = await fetch('/datasets/ne_110m_admin_0_countries.geojson');
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const data = await response.json();
        setGeoJsonData(data);
      } catch (error) {
        console.error("Error fetching GeoJSON:", error);
      }
    };
    
    fetchGeoJSON();
  }, []);

  // Load the Globe.gl script - only once, no removal on unmount
  useEffect(() => {
    // Check if script already exists
    const existingScript = document.getElementById('globe-gl-script');
    if (existingScript) {
      setIsGlobeLoaded(true);
      return;
    }

    // Add the script tag for Globe.gl to the page
    const script = document.createElement('script');
    script.id = 'globe-gl-script';
    script.src = "https://cdn.jsdelivr.net/npm/globe.gl@2.29.0/dist/globe.gl.min.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    
    script.onload = () => {
      console.log("Globe.gl script loaded");
      setIsGlobeLoaded(true);
    };
    
    document.body.appendChild(script);
    console.log("Globe.gl script added to page");

    // No cleanup for the script - we want it to persist across component mounts
    // to avoid reloading it multiple times
  }, []);

  // Handle country click - creates tooltip with food data
  const handleCountryClick = (country: any) => {
    if (!country?.properties) return;
    
    const countryName = country.properties.ADMIN || 'Unknown';
    console.log(`Country clicked: ${countryName}`);
    
    // Find closest region to the country's position
    let lat = 0, lng = 0;
    
    try {
      if (country.geometry && 
          country.geometry.coordinates && 
          country.geometry.coordinates[0] && 
          country.geometry.coordinates[0][0]) {
        // Get coordinates from first point
        const coords = country.geometry.coordinates[0][0];
        lng = coords[0] || 0;
        lat = coords[1] || 0;
        console.log(`Coordinates: lat ${lat}, lng ${lng}`);
      }
    } catch (e) {
      console.error("Error accessing coordinates", e);
      return;
    }
    
    // Determine region from country-to-region mapping or fallback to coordinates
    let regionName = countryToRegion[countryName] || '';
    let closestRegion;
    
    if (regionName) {
      // Use the mapped region if available
      closestRegion = defaultRegions.find(r => r.name === regionName) || defaultRegions[0];
      console.log(`Found region from mapping: ${closestRegion.name} for country: ${countryName}`);
    } else {
      // Fallback to calculating closest region by distance
      closestRegion = defaultRegions[0];
      let minDistance = Number.MAX_VALUE;
      
      defaultRegions.forEach(region => {
        const distance = Math.sqrt(
          Math.pow(region.lat - lat, 2) + 
          Math.pow(region.lng - lng, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestRegion = region;
        }
      });
      
      console.log(`Closest region by calculation: ${closestRegion.name}`);
    }
    
    // Get food data for the clicked country or use generic data
    const countryFoodData = foodData[countryName] || {
      dish: 'Local specialties',
      cuisine: 'Regional cuisine',
      ingredients: ['Local ingredients'],
      fact: 'Every cuisine tells a story about its culture and history.'
    };
    
    // Create tooltip with food information
    const tooltipData: TooltipData = {
      visible: true,
      country: countryName,
      region: closestRegion.name,
      coordinates: [lat, lng] as [number, number],
      signature_dish: countryFoodData.dish,
      cuisine_style: countryFoodData.cuisine,
      popular_ingredients: countryFoodData.ingredients,
      food_fact: countryFoodData.fact
    };
    
    console.log('Setting tooltip with data:', tooltipData);
    setTooltip(tooltipData);
    
    // Also notify parent component about selected region
    onRegionSelect({
      id: closestRegion.name.toLowerCase().replace(/\\s+/g, "-"),
      name: closestRegion.name,
      description: `Explore cuisines from ${closestRegion.name}`,
      coordinates: [closestRegion.lat, closestRegion.lng],
    });
  };

  // Initialize globe once it's loaded and data is available
  useEffect(() => {
    if (!isGlobeLoaded || !containerRef.current || !window.Globe || !geoJsonData) {
      return;
    }

    console.log("Initializing globe with GeoJSON data");
    
    // Clear existing Globe instances to prevent DOM conflicts
    if (globeRef.current) {
      try {
        // We already have a globe instance, don't create a new one
        return;
      } catch (e) {
        console.warn('Error checking existing globe instance, will create a new one');
      }
    }
    
    try {
      // Create a new globe instance
      const containerWidth = containerRef.current.clientWidth || 800;
      const containerHeight = containerRef.current.clientHeight || 600;
      
      const globe = window.Globe()
        .width(containerWidth)
        .height(containerHeight)
        (containerRef.current);
      
      // Store reference for later use
      globeRef.current = globe;
      
      // Basic globe configuration
      globe
        .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .showAtmosphere(true);
      
      // Add hex polygon layer for countries with yellow-green color palette
      globe
        .hexPolygonsData(geoJsonData.features)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.3)
        .hexPolygonColor(() => {
          // Generate colors in yellow-green spectrum
          const hue = Math.floor(60 + Math.random() * 60); // Hue between 60 (yellow) and 120 (green)
          const saturation = Math.floor(70 + Math.random() * 30); // 70-100%
          const lightness = Math.floor(30 + Math.random() * 40); // 30-70%
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        });
      
      // Add recipe points if available
      if (recipes.length > 0) {
        globe
          .pointsData(recipesData)
          .pointColor(d => d.id === selectedRecipe?.id ? '#ffd700' : '#e67e22') // Use a consistent orange color for recipe points
          .pointAltitude(0.07)
          .pointRadius(d => d.id === selectedRecipe?.id ? 0.4 : 0.25)
          .pointLabel(d => {
            return `
              <div style="text-align:center;color:white;background:rgba(0,0,0,0.75);padding:5px;border-radius:5px">
                <div style="font-weight:bold">${d.title || ''}</div>
                <div>${d.country || ''}</div>
              </div>
            `;
          });
      }
      
      // Set up hover events for countries
      globe.onHexPolygonHover(polygon => {
        if (polygon && polygon.properties) {
          const countryName = polygon.properties.ADMIN;
          setCurrentRegion(countryName);
          onRegionHover(countryName);
        } else {
          setCurrentRegion(null);
          onRegionHover(null);
        }
      });
      
      // Set up click event for countries - directly triggers the country click handler
      globe.onHexPolygonClick(handleCountryClick);
      
      // Extra click handler on the globe surface for debugging
      globe.onGlobeClick((coords: any) => {
        console.log('Globe clicked at:', coords);
      });
      
      // Camera controls
      if (!interactive && globe.controls) {
        const controls = globe.controls();
        if (controls) {
          controls.autoRotate = true;
          controls.autoRotateSpeed = rotationSpeed * 1000;
        }
      }
      
      // If there's an active region, fly to it
      if (activeRegion) {
        const region = defaultRegions.find(r => r.name === activeRegion.name);
        if (region) {
          globe.pointOfView(
            { lat: region.lat, lng: region.lng, altitude: 1.5 },
            1000
          );
        }
      }
      
      // Handle window resize
      const handleResize = () => {
        if (containerRef.current && globe) {
          globe.width(containerRef.current.clientWidth)
               .height(containerRef.current.clientHeight);
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Return cleanup function - only remove event listener, don't destroy globe
      return () => {
        window.removeEventListener('resize', handleResize);
        // We intentionally don't destroy the globe here to prevent DOM conflicts
        // It will be garbage collected when the component truly unmounts
      };
    } catch (error) {
      console.error('Error initializing globe:', error);
    }
  }, [
    isGlobeLoaded, 
    geoJsonData,
    // Remove dependencies that might cause too many re-renders
    // Only re-initialize on fundamental changes
  ]);
  
  // Handle updates to globe properties without re-initializing
  useEffect(() => {
    if (!globeRef.current) return;
    
    try {
      const globe = globeRef.current;
      
      // Update recipe points if available
      if (recipes.length > 0) {
        globe
          .pointsData(recipesData)
          .pointColor(d => d.id === selectedRecipe?.id ? '#ffd700' : d.color)
          .pointRadius(d => d.id === selectedRecipe?.id ? 0.4 : 0.25);
      }
      
    } catch (error) {
      console.error('Error updating globe properties:', error);
    }
  }, [recipes, recipesData, selectedRecipe]);

  // Center globe on selected recipe's country and add pulsing effect
  useEffect(() => {
    if (!globeRef.current || !selectedRecipe) return;

    // Center the globe on the recipe's coordinates
    try {
      console.log(`Centering globe on recipe: ${selectedRecipe.title}, coordinates: ${selectedRecipe.coordinates}`);
      const [lat, lng] = selectedRecipe.coordinates;
      
      // Animate move to the recipe coordinates with appropriate altitude
      globeRef.current.pointOfView(
        { lat, lng, altitude: 1.8 },
        1000 // Animation duration in milliseconds
      );
    } catch (e) {
      console.error("Error centering globe on recipe:", e);
    }
    
    // Add pulsing effect for the selected recipe's point
    let pulseSize = 0.3;
    let growing = true;
    const pulseInterval = setInterval(() => {
      if (growing) {
        pulseSize += 0.005;
        if (pulseSize >= 0.5) growing = false;
      } else {
        pulseSize -= 0.005;
        if (pulseSize <= 0.3) growing = true;
      }
      
      try {
        if (globeRef.current) {
          globeRef.current.pointRadius(d => {
            return d && d.id === selectedRecipe.id ? pulseSize : 0.25;
          });
        }
      } catch (e) {
        console.error("Error in pulse effect:", e);
      }
    }, 50);

    return () => clearInterval(pulseInterval);
  }, [selectedRecipe]);

  // Display a temporary arc when a recipe is selected
  useEffect(() => {
    if (!globeRef.current || !selectedRecipe) return;

    const [lat, lng] = selectedRecipe.coordinates;
    const globe = globeRef.current;

    const arc = [{
      startLat: lat,
      startLng: lng,
      endLat: lat,
      endLng: lng,
      color: '#ff6b6b'
    }];

    globe.arcsData(arc)
         .arcColor('color')
         .arcAltitude(0.2)
         .arcStroke(0.5)
         .arcDashLength(0.4)
         .arcDashGap(4)
         .arcDashInitialGap(() => Math.random() * 4)
         .arcDashAnimateTime(1000);

    // Remove arc after a short delay
    const timeoutId = setTimeout(() => {
      globe.arcsData([]);
    }, 2000);

    arcTimeoutRef.current = timeoutId;

    return () => {
      if (arcTimeoutRef.current) {
        clearTimeout(arcTimeoutRef.current);
        arcTimeoutRef.current = null;
      }
      globe.arcsData([]);
    };
  }, [selectedRecipe]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Debug message */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-md text-sm z-30">
        Tooltip state: {tooltip ? 'Active' : 'Not active'}
      </div>

      {/* Hover region indicator */}
      {currentRegion && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-md text-sm pointer-events-none z-10"
        >
          {currentRegion}
        </motion.div>
      )}
      
      {/* Hovered recipe info */}
      {hoveredRecipe && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-md pointer-events-none z-10"
        >
          {hoveredRecipe.title}
          <div className="text-xs text-gray-300">{hoveredRecipe.country}</div>
        </motion.div>
      )}
      
      {/* Country info tooltip that appears on click */}
      {tooltip && tooltip.visible && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 pointer-events-auto">
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="bg-black/95 text-white px-6 py-4 rounded-lg shadow-xl
                      border border-gray-600 min-w-[300px] max-w-md pointer-events-auto"
            style={{ boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)' }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-bold text-blue-300">{tooltip.country}</h3>
              <button 
                onClick={() => {
                  console.log('Close button clicked');
                  setTooltip(null);
                }} 
                className="p-1 rounded-full hover:bg-gray-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="text-gray-400">Region:</span>
                <span className="font-medium">{tooltip.region}</span>
              </div>
              {tooltip.signature_dish && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Signature Dish:</span>
                  <span className="font-medium">{tooltip.signature_dish}</span>
                </div>
              )}
              {tooltip.cuisine_style && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Cuisine Style:</span>
                  <span className="font-medium">{tooltip.cuisine_style}</span>
                </div>
              )}
              {tooltip.popular_ingredients && tooltip.popular_ingredients.length > 0 && (
                <div className="border-t border-gray-700 pt-2 pb-1">
                  <span className="text-gray-400 block mb-1">Popular Ingredients:</span>
                  <div className="flex flex-wrap gap-1">
                    {tooltip.popular_ingredients.map((ingredient, i) => (
                      <span key={i} className="bg-gray-800 px-2 py-0.5 rounded text-xs">{ingredient}</span>
                    ))}
                  </div>
                </div>
              )}
              {tooltip.food_fact && (
                <div className="border-t border-gray-700 pt-2 mt-1">
                  <span className="text-gray-400 block mb-1">Food Fact:</span>
                  <p className="text-xs italic">"{tooltip.food_fact}"</p>
                </div>
              )}
              <div className="pt-4 text-center">
                <button
                  onClick={() => {
                    console.log('Explore button clicked for country:', tooltip.country);
                    // Notify parent about country selection
                    if (onRegionSelect) {
                      onRegionSelect({
                        id: tooltip.country.toLowerCase().replace(/\s+/g, "-"),
                        name: tooltip.country,
                        description: `Recipes from ${tooltip.country}`,
                        coordinates: tooltip.coordinates
                      });
                    }
                    setTooltip(null);
                  }}
                  className="text-sm bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-md transition-colors w-full"
                >
                  Explore Recipes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Export as default as well for backward compatibility
export default GlobeComponent;
