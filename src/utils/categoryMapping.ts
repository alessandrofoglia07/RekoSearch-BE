export const CATEGORY_MAPPING: Record<string, string> = {
    // Nature & Landscapes
    "Tree": "Nature",
    "Forest": "Nature",
    "Mountain": "Nature",
    "Water": "Nature",
    "River": "Nature",
    "Lake": "Nature",
    "Sky": "Nature",
    "Cloud": "Nature",
    "Sunset": "Nature",

    // Outdoor & Scenery
    "Beach": "Outdoor",
    "Desert": "Outdoor",
    "Snow": "Outdoor",
    "Ocean": "Outdoor",
    "Park": "Outdoor",

    // Animals & Wildlife
    "Animal": "Wildlife",
    "Mammal": "Wildlife",
    "Bird": "Wildlife",
    "Fish": "Wildlife",
    "Reptile": "Wildlife",
    "Insect": "Wildlife",
    "Dog": "Pets",
    "Cat": "Pets",
    "Horse": "Pets",
    "Rabbit": "Pets",

    // People & Emotions
    "Person": "People",
    "Face": "People",
    "Child": "People",
    "Smile": "People",
    "Selfie": "People",
    "Crowd": "People",

    // Urban & Architecture
    "Building": "Architecture",
    "House": "Architecture",
    "City": "Architecture",
    "Bridge": "Architecture",
    "Skyscraper": "Architecture",
    "Street": "Architecture",

    // Vehicles & Transportation
    "Car": "Vehicles",
    "Truck": "Vehicles",
    "Bicycle": "Vehicles",
    "Motorcycle": "Vehicles",
    "Boat": "Vehicles",
    "Airplane": "Vehicles",
    "Train": "Vehicles",

    // Food & Drinks
    "Food": "Food",
    "Meal": "Food",
    "Drink": "Food",
    "Dessert": "Food",
    "Fruit": "Food",
    "Vegetable": "Food",
    "Coffee": "Food",

    // Art & Entertainment
    "Drawing": "Art",
    "Painting": "Art",
    "Sculpture": "Art",
    "Concert": "Entertainment",
    "Theater": "Entertainment",
    "Film": "Entertainment",
    "Game": "Entertainment",

    // Sports & Fitness
    "Soccer": "Sports",
    "Basketball": "Sports",
    "Tennis": "Sports",
    "Running": "Sports",
    "Swimming": "Sports",
    "Cycling": "Sports",
    "Yoga": "Sports",

    // Fashion & Accessories
    "Clothing": "Fashion",
    "Shoe": "Fashion",
    "Hat": "Fashion",
    "Bag": "Fashion",
    "Watch": "Fashion",

    // Objects & Tools
    "Tool": "Objects",
    "Computer": "Objects",
    "Phone": "Objects",
    "Camera": "Objects",
    "Book": "Objects",
    "Chair": "Objects",

    // Events & Celebrations
    "Party": "Events",
    "Wedding": "Events",
    "Birthday": "Events",
    "Festival": "Events",

    // Sci-Fi & Space
    "Star": "Space",
    "Planet": "Space",
    "Galaxy": "Space",
    "Astronaut": "Space",

    // Default fallback category
    "Default": "Uncategorized"
};

export const CATEGORIES = Object.values(CATEGORY_MAPPING).filter((category, index, self) => self.indexOf(category) === index);