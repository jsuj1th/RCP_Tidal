// Leaflet (OpenStreetMap) Integration - No API Key Required!
import { PIPELINE_START_COORDS } from './config.js';
import { distanceToLatLng, SENSITIVE_LOCATIONS, PIPELINE_TEES } from './geoData.js';

export class LeafletMapIntegration {
    constructor() {
        this.map = null;
        this.pipelinePolyline = null;
        this.anomalyMarkers = [];
        this.sensitiveLocationMarkers = [];
        this.alertCircles = [];
        this.teeMarkers = [];
        this.teeBranches = [];
    }

    // Initialize the map
    async initMap(containerId) {
        const mapContainer = document.getElementById(containerId);
        if (!mapContainer) {
            throw new Error('Map container not found: ' + containerId);
        }

        try {
            // Create Leaflet map
            this.map = L.map(containerId).setView(
                [PIPELINE_START_COORDS.lat, PIPELINE_START_COORDS.lng], 
                13
            );

            // Add OpenStreetMap tiles (free, no API key!)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);

            // Add sensitive location markers
            this.addSensitiveLocationMarkers();
            
            console.log('Leaflet map initialized successfully');
        } catch (error) {
            console.error('Error creating map:', error);
            throw error;
        }
    }

    // Draw pipeline on map with VERY smooth curves
    drawPipeline(maxDistanceFeet, segmentLength = 25) {  // Reduced to 25ft for ultra-smooth curves!
        if (!this.map) return;

        const pipelineCoords = [];
        for (let dist = 0; dist <= maxDistanceFeet; dist += segmentLength) {
            const coords = distanceToLatLng(dist);
            pipelineCoords.push([coords.lat, coords.lng]);
        }

        if (this.pipelinePolyline) {
            this.map.removeLayer(this.pipelinePolyline);
        }

        this.pipelinePolyline = L.polyline(pipelineCoords, {
            color: '#3B82F6',
            weight: 5,  // Slightly thicker to show curves better
            opacity: 0.9,
            smoothFactor: 1.5  // More smoothing
        }).addTo(this.map);
        
        // Draw tees
        this.drawTees();
    }

    // Draw pipeline tees (branch connections)
    drawTees() {
        if (!this.map) return;

        // Clear existing tees
        this.teeMarkers.forEach(m => this.map.removeLayer(m));
        this.teeBranches.forEach(b => this.map.removeLayer(b));
        this.teeMarkers = [];
        this.teeBranches = [];

        PIPELINE_TEES.forEach(tee => {
            // Main tee location
            const teeCoords = [tee.lat, tee.lng];
            
            // Create tee marker
            const teeIcon = L.divIcon({
                html: `<div style="background-color: #8B5CF6; width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 12px; font-weight: bold; color: white;">T</div>`,
                className: 'tee-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            const marker = L.marker(teeCoords, {
                icon: teeIcon
            }).addTo(this.map);

            marker.bindPopup(`
                <div style="font-family: monospace; min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #8B5CF6;">
                        🔀 ${tee.name}
                    </h3>
                    <p style="margin: 4px 0; font-size: 12px;">
                        <strong>Type:</strong> ${tee.type}<br>
                        <strong>Distance:</strong> ${tee.distance.toLocaleString()} ft<br>
                        <strong>Branch Length:</strong> ${tee.branchLength.toLocaleString()} ft<br>
                        <strong>Direction:</strong> ${tee.branchDirection}°
                    </p>
                </div>
            `);

            this.teeMarkers.push(marker);

            // Draw branch line
            const branchEndCoords = this.calculateBranchEnd(tee);
            const branch = L.polyline([teeCoords, branchEndCoords], {
                color: '#8B5CF6',
                weight: 3,
                opacity: 0.7,
                dashArray: '5, 10'
            }).addTo(this.map);

            this.teeBranches.push(branch);
        });
    }

    // Calculate branch end coordinates
    calculateBranchEnd(tee) {
        const FEET_PER_DEGREE_LAT = 364000;
        const FEET_PER_DEGREE_LNG = 288200;
        
        const directionRad = (tee.branchDirection * Math.PI) / 180;
        const deltaLat = (tee.branchLength * Math.cos(directionRad)) / FEET_PER_DEGREE_LAT;
        const deltaLng = (tee.branchLength * Math.sin(directionRad)) / FEET_PER_DEGREE_LNG;
        
        return [
            tee.lat + deltaLat,
            tee.lng + deltaLng
        ];
    }

    // Add sensitive location markers
    addSensitiveLocationMarkers() {
        if (!this.map) return;

        SENSITIVE_LOCATIONS.forEach(location => {
            // Get icon based on type
            const icon = this.getLocationIcon(location.type, location.priority);
            
            // Create marker
            const marker = L.marker([location.lat, location.lng], {
                icon: icon
            }).addTo(this.map);

            // Add popup
            marker.bindPopup(`
                <div style="font-family: monospace; min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: ${location.priority === 'critical' ? '#EF4444' : '#F59E0B'};">
                        ${this.getLocationEmoji(location.type)} ${location.name}
                    </h3>
                    <p style="margin: 4px 0; font-size: 12px;">
                        <strong>Type:</strong> ${location.type}<br>
                        <strong>Priority:</strong> ${location.priority}<br>
                        <strong>Safety Radius:</strong> ${location.radius} ft
                    </p>
                </div>
            `);

            // Add safety radius circle
            const radiusMeters = location.radius * 0.3048; // Convert feet to meters
            const circle = L.circle([location.lat, location.lng], {
                color: location.priority === 'critical' ? '#EF4444' : '#F59E0B',
                fillColor: location.priority === 'critical' ? '#EF4444' : '#F59E0B',
                fillOpacity: 0.15,
                radius: radiusMeters
            }).addTo(this.map);

            this.sensitiveLocationMarkers.push({ marker, circle });
            this.alertCircles.push(circle);
        });
    }

    // Get icon for location type
    getLocationIcon(type, priority) {
        const color = priority === 'critical' ? 'red' : priority === 'high' ? 'orange' : 'yellow';
        const emoji = this.getLocationEmoji(type);
        
        return L.divIcon({
            html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 16px;">${emoji}</div>`,
            className: 'custom-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    }

    // Get emoji for location type
    getLocationEmoji(type) {
        const emojiMap = {
            'school': '🏫',
            'hospital': '🏥',
            'residential': '🏘️',
            'public': '🏛️',
            'senior_care': '🏥',
            'commercial': '🏢'
        };
        return emojiMap[type] || '📍';
    }

    // Add anomaly markers
    addAnomalyMarkers(anomalies) {
        if (!this.map) return;

        // Clear existing markers
        this.anomalyMarkers.forEach(m => this.map.removeLayer(m));
        this.anomalyMarkers = [];

        anomalies.forEach(anomaly => {
            const coords = distanceToLatLng(anomaly.dist_22_aligned || anomaly.distance);
            const isCritical = anomaly.severity_level === 'Critical' || anomaly.status === 'Critical';
            
            const icon = L.divIcon({
                html: `<div style="background-color: ${isCritical ? '#EF4444' : '#F59E0B'}; width: ${isCritical ? 12 : 8}px; height: ${isCritical ? 12 : 8}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.5);"></div>`,
                className: 'anomaly-marker',
                iconSize: [isCritical ? 12 : 8, isCritical ? 12 : 8],
                iconAnchor: [isCritical ? 6 : 4, isCritical ? 6 : 4]
            });

            const marker = L.marker([coords.lat, coords.lng], {
                icon: icon
            }).addTo(this.map);

            marker.bindPopup(`
                <div style="font-family: monospace; font-size: 11px; min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: ${isCritical ? '#EF4444' : '#F59E0B'};">
                        ${isCritical ? '🚨 Critical' : '⚠️'} Anomaly
                    </h3>
                    <p style="margin: 2px 0;">
                        <strong>Distance:</strong> ${(anomaly.dist_22_aligned || 0).toFixed(0)} ft<br>
                        <strong>Depth:</strong> ${anomaly.depth_22 || 'N/A'}%<br>
                        <strong>Growth:</strong> ${(anomaly.annual_growth_rate || 0).toFixed(2)}%/yr<br>
                        <strong>Severity:</strong> ${(anomaly.severity_score || 0).toFixed(0)}/100
                    </p>
                </div>
            `);

            this.anomalyMarkers.push(marker);
        });
    }

    // Highlight anomaly on map
    highlightAnomalyOnMap(anomaly) {
        if (!this.map) return;

        const coords = distanceToLatLng(anomaly.dist_22_aligned || anomaly.distance);
        
        // Pan to location
        this.map.setView([coords.lat, coords.lng], 16, {
            animate: true,
            duration: 1
        });

        // Find and open popup for this marker
        this.anomalyMarkers.forEach(marker => {
            const pos = marker.getLatLng();
            if (Math.abs(pos.lat - coords.lat) < 0.0001 && 
                Math.abs(pos.lng - coords.lng) < 0.0001) {
                marker.openPopup();
            }
        });
    }

    // Resize map (call when container size changes)
    resize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }
}
