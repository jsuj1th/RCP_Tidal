// Featherless.ai API Configuration
// Get your free API key at: https://featherless.ai/

export const FEATHERLESS_API_KEY = 'rc_7b1bf25f8b748d4df69fd46efce9f9b802aec5647778ba7fcd7ce5f2492452da';
export const FEATHERLESS_API_URL = 'https://api.featherless.ai/v1/chat/completions';
export const FEATHERLESS_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct';

// Instructions:
// 1. Sign up at https://featherless.ai/
// 2. Get your API key from the dashboard
// 3. Replace 'YOUR_API_KEY_HERE' with your actual API key
// 4. Save this file

// Google Maps API Configuration
export const GOOGLE_MAPS_API_KEY = 'AIzaSyC96p21BWfYlJc90gFwuhuebjSl437Of3c';

// Pipeline Geographic Configuration
// Example: Houston, TX area pipeline
export const PIPELINE_START_COORDS = {
    lat: 29.7604,  // Houston latitude
    lng: -95.3698  // Houston longitude
};

// Convert pipeline distance (feet) to approximate lat/lng
// Assuming pipeline runs roughly northeast
export const PIPELINE_DIRECTION = 45; // degrees from north
