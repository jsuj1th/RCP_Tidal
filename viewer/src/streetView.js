import { GOOGLE_MAPS_API_KEY } from './config.js';
import { distanceToLatLng } from './geoData.js';

export class StreetViewIntegration {
    constructor() {
        this.panorama = null;
        this.svService = null;
        this.isLoaded = false;
        this.containerId = 'street-view-container';
        this.fallbackContainerId = 'street-view-fallback';
    }

    async init() {
        if (this.isLoaded) return;

        return new Promise((resolve, reject) => {
            if (window.google && window.google.maps) {
                this.isLoaded = true;
                this.svService = new google.maps.StreetViewService();
                this.createFallbackContainer();
                resolve();
                return;
            }

            const script = document.createElement('script');
            // Adding geometry library to compute heading
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=streetView,geometry`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                this.isLoaded = true;
                this.svService = new google.maps.StreetViewService();
                this.createFallbackContainer();
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    createFallbackContainer() {
        const parent = document.getElementById(this.containerId);
        if (!parent) return;

        const fallback = document.createElement('div');
        fallback.id = this.fallbackContainerId;
        fallback.className = 'absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-[100] hidden pointer-events-auto';
        fallback.innerHTML = `
            <svg class="w-12 h-12 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v10.764a1 1 0 01-1.447.894L15 18M9 6l-5.447 2.724A1 1 0 003 9.618v10.764a1 1 0 001.447.894L9 18M9 6v12m6-8v12M9 6l6-3"></path>
            </svg>
            <h3 class="text-white font-bold text-lg mb-2">No Street View Available</h3>
            <p class="text-slate-400 text-sm max-w-xs text-center">There is no street-level imagery within a 200m radius of these pipeline coordinates.</p>
        `;
        parent.appendChild(fallback);
    }

    showStreetView(distance) {
        if (!this.isLoaded) return;

        const coords = distanceToLatLng(distance);
        const position = { lat: coords.lat, lng: coords.lng };

        if (!this.panorama) {
            this.panorama = new google.maps.StreetViewPanorama(
                document.getElementById(this.containerId),
                {
                    position: position,
                    zoom: 1,
                    disableDefaultUI: false,
                    showRoadLabels: true
                }
            );
            
            // Allow clicking to interact with street view even under overlay
            const mapContainer = document.getElementById(this.containerId);
            if (mapContainer) {
                mapContainer.style.pointerEvents = 'auto';
            }
        }

        const fallback = document.getElementById(this.fallbackContainerId);

        // Find nearest panorama within 200 meters since pipeline might be off-road
        this.svService.getPanorama({ location: position, radius: 200 }, (data, status) => {
            if (status === 'OK') {
                if (fallback) fallback.classList.add('hidden');
                this.panorama.setVisible(true);
                this.panorama.setPano(data.location.pano);
                
                // Calculate heading to look AT the pipeline from the street
                const heading = google.maps.geometry.spherical.computeHeading(
                    data.location.latLng,
                    new google.maps.LatLng(position.lat, position.lng)
                );
                
                this.panorama.setPov({
                    heading: heading,
                    pitch: 0
                });
            } else {
                this.panorama.setVisible(false);
                if (fallback) fallback.classList.remove('hidden');
            }
        });
    }

    resize() {
        if (this.panorama) {
            google.maps.event.trigger(this.panorama, 'resize');
        }
    }
}
