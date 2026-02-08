// Geographic Data and Sensitive Locations
// This module handles coordinate conversion and proximity detection

import { PIPELINE_START_COORDS, PIPELINE_DIRECTION } from './config.js';

// Pipeline waypoints for VERY CURVED realistic path - Maximum curves!
export const PIPELINE_WAYPOINTS = [
    { distance: 0, lat: 29.7604, lng: -95.3698, direction: 45 },      // Start
    { distance: 1000, lat: 29.7612, lng: -95.3688, direction: 70 },   // Sharp right
    { distance: 2000, lat: 29.7625, lng: -95.3672, direction: 30 },   // Sharp left
    { distance: 3000, lat: 29.7635, lng: -95.3662, direction: 80 },   // Sharp right
    { distance: 4000, lat: 29.7650, lng: -95.3645, direction: 20 },   // Sharp left
    { distance: 5000, lat: 29.7658, lng: -95.3638, direction: 75 },   // Sharp right
    { distance: 6000, lat: 29.7672, lng: -95.3620, direction: 35 },   // Sharp left
    { distance: 7000, lat: 29.7680, lng: -95.3612, direction: 85 },   // Very sharp right
    { distance: 8000, lat: 29.7698, lng: -95.3592, direction: 25 },   // Sharp left (Tee A)
    { distance: 9000, lat: 29.7705, lng: -95.3585, direction: 70 },   // Sharp right
    { distance: 10000, lat: 29.7720, lng: -95.3568, direction: 30 },  // Sharp left
    { distance: 11000, lat: 29.7728, lng: -95.3560, direction: 80 },  // Sharp right
    { distance: 12000, lat: 29.7745, lng: -95.3542, direction: 20 },  // Sharp left
    { distance: 13000, lat: 29.7752, lng: -95.3535, direction: 75 },  // Sharp right
    { distance: 14000, lat: 29.7768, lng: -95.3518, direction: 35 },  // Sharp left
    { distance: 15000, lat: 29.7775, lng: -95.3510, direction: 85 },  // Very sharp right
    { distance: 16000, lat: 29.7792, lng: -95.3490, direction: 25 },  // Sharp left
    { distance: 17000, lat: 29.7798, lng: -95.3483, direction: 70 },  // Sharp right
    { distance: 18000, lat: 29.7815, lng: -95.3465, direction: 30 },  // Sharp left (Tee B)
    { distance: 19000, lat: 29.7822, lng: -95.3458, direction: 80 },  // Sharp right
    { distance: 20000, lat: 29.7838, lng: -95.3440, direction: 20 },  // Sharp left
    { distance: 21000, lat: 29.7845, lng: -95.3433, direction: 75 },  // Sharp right
    { distance: 22000, lat: 29.7860, lng: -95.3415, direction: 35 },  // Sharp left
    { distance: 23000, lat: 29.7868, lng: -95.3408, direction: 85 },  // Very sharp right
    { distance: 24000, lat: 29.7885, lng: -95.3388, direction: 25 },  // Sharp left
    { distance: 25000, lat: 29.7892, lng: -95.3381, direction: 70 },  // Sharp right
    { distance: 26000, lat: 29.7908, lng: -95.3363, direction: 30 },  // Sharp left
    { distance: 27000, lat: 29.7915, lng: -95.3356, direction: 80 },  // Sharp right
    { distance: 28000, lat: 29.7932, lng: -95.3338, direction: 20 },  // Sharp left (Tee C)
    { distance: 29000, lat: 29.7938, lng: -95.3331, direction: 75 },  // Sharp right
    { distance: 30000, lat: 29.7955, lng: -95.3313, direction: 35 },  // Sharp left
    { distance: 31000, lat: 29.7962, lng: -95.3306, direction: 85 },  // Very sharp right
    { distance: 32000, lat: 29.7978, lng: -95.3286, direction: 25 },  // Sharp left
    { distance: 33000, lat: 29.7985, lng: -95.3279, direction: 70 },  // Sharp right
    { distance: 34000, lat: 29.8002, lng: -95.3261, direction: 30 },  // Sharp left
    { distance: 35000, lat: 29.8008, lng: -95.3254, direction: 80 },  // Sharp right
    { distance: 36000, lat: 29.8025, lng: -95.3236, direction: 20 },  // Sharp left
    { distance: 37000, lat: 29.8032, lng: -95.3229, direction: 75 },  // Sharp right
    { distance: 38000, lat: 29.8048, lng: -95.3211, direction: 35 },  // Sharp left
    { distance: 39000, lat: 29.8055, lng: -95.3204, direction: 60 },  // Moderate right
    { distance: 40000, lat: 29.8070, lng: -95.3188, direction: 45 },  // Final straighten
];

// Pipeline tees (branch connections) - Updated coordinates
export const PIPELINE_TEES = [
    {
        distance: 8000,
        lat: 29.7698,
        lng: -95.3592,
        name: "Tee A - Industrial Branch",
        branchDirection: 120,
        branchLength: 2000,
        type: "industrial"
    },
    {
        distance: 18000,
        lat: 29.7815,
        lng: -95.3465,
        name: "Tee B - Residential Supply",
        branchDirection: 330,
        branchLength: 1500,
        type: "residential"
    },
    {
        distance: 28000,
        lat: 29.7932,
        lng: -95.3338,
        name: "Tee C - Commercial District",
        branchDirection: 90,
        branchLength: 2500,
        type: "commercial"
    }
];

// Sensitive locations along the pipeline route (example data)
export const SENSITIVE_LOCATIONS = [
    {
        name: "Lincoln Elementary School",
        type: "school",
        lat: 29.7650,
        lng: -95.3650,
        radius: 500, // feet
        priority: "high"
    },
    {
        name: "Memorial Hospital",
        type: "hospital",
        lat: 29.7700,
        lng: -95.3600,
        radius: 1000, // feet
        priority: "critical"
    },
    {
        name: "Riverside Residential Area",
        type: "residential",
        lat: 29.7750,
        lng: -95.3550,
        radius: 300, // feet
        priority: "high"
    },
    {
        name: "City Park & Recreation Center",
        type: "public",
        lat: 29.7800,
        lng: -95.3500,
        radius: 400, // feet
        priority: "medium"
    },
    {
        name: "Oakwood Senior Living",
        type: "senior_care",
        lat: 29.7550,
        lng: -95.3700,
        radius: 500, // feet
        priority: "critical"
    },
    {
        name: "Downtown Shopping District",
        type: "commercial",
        lat: 29.7604,
        lng: -95.3698,
        radius: 200, // feet
        priority: "medium"
    }
];

// Convert pipeline distance (feet) to lat/lng coordinates with curves
export function distanceToLatLng(distanceFeet) {
    // Find the two waypoints this distance falls between
    let startWaypoint = PIPELINE_WAYPOINTS[0];
    let endWaypoint = PIPELINE_WAYPOINTS[PIPELINE_WAYPOINTS.length - 1];
    
    for (let i = 0; i < PIPELINE_WAYPOINTS.length - 1; i++) {
        if (distanceFeet >= PIPELINE_WAYPOINTS[i].distance && 
            distanceFeet <= PIPELINE_WAYPOINTS[i + 1].distance) {
            startWaypoint = PIPELINE_WAYPOINTS[i];
            endWaypoint = PIPELINE_WAYPOINTS[i + 1];
            break;
        }
    }
    
    // If beyond last waypoint, extrapolate
    if (distanceFeet > PIPELINE_WAYPOINTS[PIPELINE_WAYPOINTS.length - 1].distance) {
        startWaypoint = PIPELINE_WAYPOINTS[PIPELINE_WAYPOINTS.length - 2];
        endWaypoint = PIPELINE_WAYPOINTS[PIPELINE_WAYPOINTS.length - 1];
    }
    
    // Interpolate between waypoints
    const segmentDistance = endWaypoint.distance - startWaypoint.distance;
    const distanceInSegment = distanceFeet - startWaypoint.distance;
    const ratio = segmentDistance > 0 ? distanceInSegment / segmentDistance : 0;
    
    const lat = startWaypoint.lat + (endWaypoint.lat - startWaypoint.lat) * ratio;
    const lng = startWaypoint.lng + (endWaypoint.lng - startWaypoint.lng) * ratio;
    
    return { lat, lng };
}

// Calculate distance between two lat/lng points (in feet)
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 20902231; // Earth radius in feet
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Check if an anomaly is near sensitive locations
export function checkProximityToSensitiveLocations(anomalyDistanceFeet) {
    const anomalyCoords = distanceToLatLng(anomalyDistanceFeet);
    const nearbyLocations = [];
    
    SENSITIVE_LOCATIONS.forEach(location => {
        const distance = calculateDistance(
            anomalyCoords.lat,
            anomalyCoords.lng,
            location.lat,
            location.lng
        );
        
        if (distance <= location.radius) {
            nearbyLocations.push({
                ...location,
                distanceToAnomaly: Math.round(distance),
                withinRadius: true
            });
        }
    });
    
    return nearbyLocations;
}

// Get priority level for proximity alert
export function getProximityAlertLevel(nearbyLocations) {
    if (nearbyLocations.length === 0) return null;
    
    const hasCritical = nearbyLocations.some(loc => loc.priority === 'critical');
    const hasHigh = nearbyLocations.some(loc => loc.priority === 'high');
    
    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    return 'medium';
}

// Format location type for display
export function formatLocationType(type) {
    const typeMap = {
        'school': '🏫 School',
        'hospital': '🏥 Hospital',
        'residential': '🏘️ Residential',
        'public': '🏛️ Public Facility',
        'senior_care': '🏥 Senior Care',
        'commercial': '🏢 Commercial'
    };
    return typeMap[type] || type;
}

// Generate Google Maps URL for location
export function getGoogleMapsUrl(lat, lng, zoom = 15) {
    return `https://www.google.com/maps/@${lat},${lng},${zoom}z`;
}

// Get all sensitive locations within a distance range
export function getSensitiveLocationsInRange(startDistFeet, endDistFeet) {
    const locations = [];
    
    for (let dist = startDistFeet; dist <= endDistFeet; dist += 100) {
        const coords = distanceToLatLng(dist);
        
        SENSITIVE_LOCATIONS.forEach(location => {
            const distance = calculateDistance(
                coords.lat,
                coords.lng,
                location.lat,
                location.lng
            );
            
            if (distance <= location.radius && !locations.find(l => l.name === location.name)) {
                locations.push({
                    ...location,
                    pipelineDistance: dist
                });
            }
        });
    }
    
    return locations;
}
