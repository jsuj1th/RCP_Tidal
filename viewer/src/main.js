import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class PipelineViewer {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a); // slate-900

        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
        this.setupControls();

        this.anomalies = [];
        this.pipeSegments = [];
        this.featureMarkers = [];
        this.jointMap = new Map();

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredSegment = null;
        this.criticalIndex = -1;
        this.showLabels = false;
        this.labelSprites = []; // Store label sprites

        // Tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'fixed pointer-events-none bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs border border-white/20 hidden z-50 font-mono backdrop-blur-md shadow-xl';
        document.body.appendChild(this.tooltip);

        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('click', (e) => this.onClick(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('keydown', (e) => this.onKeyDown(e));


        document.getElementById('toggle-labels').onchange = (e) => this.toggleLabels(e.target.checked);
        document.getElementById('btn-next-crit').onclick = () => this.flyToNextCritical();
        document.getElementById('dist-slider').oninput = (e) => this.onSliderInput(e);
        document.getElementById('btn-apply-range').onclick = () => this.applyRangeFilter();
        document.getElementById('btn-reset-range').onclick = () => this.resetRangeFilter();
        document.getElementById('btn-apply-neighbor').onclick = () => this.applyNeighborhoodFilter();
        
        // Filter toggle functionality
        document.getElementById('btn-toggle-filters').onclick = () => this.toggleFiltersSection();

        this.init();
        this.animate();
        window.viewer = this;
    }

    onKeyDown(e) {
    }

    toggleFiltersSection() {
        const section = document.getElementById('filters-section');
        const btnText = document.getElementById('filter-btn-text');
        
        if (section.classList.contains('hidden')) {
            section.classList.remove('hidden');
            btnText.innerText = 'Hide Filters';
        } else {
            section.classList.add('hidden');
            btnText.innerText = 'Show Filters';
        }
    }

    toggleLabels(show) {
        this.showLabels = show;
        
        if (show) {
            this.createJointLabels();
        } else {
            this.removeJointLabels();
        }
    }

    createJointLabels() {
        // Remove existing labels first
        this.removeJointLabels();
        
        // Create labels for visible pipe segments
        this.pipeSegments.forEach(segment => {
            if (!segment.visible) return;
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 128;
            
            // Draw background
            context.fillStyle = 'rgba(15, 23, 42, 0.9)';
            context.roundRect(10, 10, 236, 108, 10);
            context.fill();
            
            // Draw border
            context.strokeStyle = 'rgba(59, 130, 246, 0.5)';
            context.lineWidth = 2;
            context.roundRect(10, 10, 236, 108, 10);
            context.stroke();
            
            // Draw text
            context.fillStyle = '#60a5fa';
            context.font = 'bold 32px Arial';
            context.textAlign = 'center';
            context.fillText(`Joint ${segment.userData.joint}`, 128, 55);
            
            context.fillStyle = '#94a3b8';
            context.font = '20px Arial';
            context.fillText(`${segment.userData.dist.toFixed(0)} ft`, 128, 90);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            
            sprite.position.set(0, 4, segment.position.z);
            sprite.scale.set(8, 4, 1);
            
            this.scene.add(sprite);
            this.labelSprites.push(sprite);
        });
    }

    removeJointLabels() {
        this.labelSprites.forEach(sprite => {
            this.scene.remove(sprite);
            if (sprite.material.map) sprite.material.map.dispose();
            sprite.material.dispose();
        });
        this.labelSprites = [];
    }

    toggleFilters() {
        const content = document.getElementById('filters-content');
        const chevron = document.getElementById('filter-chevron');
        
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            chevron.style.transform = 'rotate(0deg)';
        } else {
            content.classList.add('hidden');
            chevron.style.transform = 'rotate(-90deg)';
        }
    }

    onMouseMove(event) {
        // Get canvas container bounds for accurate mouse coordinates
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();
        
        // Check if mouse is within canvas bounds
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) {
            this.tooltip.classList.add('hidden');
            if (this.hoveredSegment) this.hoveredSegment.material.emissive.setHex(0x000000);
            this.hoveredSegment = null;
            return;
        }
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.pipeSegments);

        if (intersects.length > 0) {
            const data = intersects[0].object.userData;
            this.tooltip.style.left = `${event.clientX + 15}px`;
            this.tooltip.style.top = `${event.clientY + 15}px`;
            this.tooltip.innerText = `Joint: ${data.joint} | Dist: ${Math.round(data.dist)} ft`;
            this.tooltip.classList.remove('hidden');

            // Subtle highlight on hover
            if (this.hoveredSegment !== intersects[0].object) {
                if (this.hoveredSegment) this.hoveredSegment.material.emissive.setHex(0x000000);
                this.hoveredSegment = intersects[0].object;
                this.hoveredSegment.material.emissive.setHex(0x112233);
            }
        } else {
            this.tooltip.classList.add('hidden');
            if (this.hoveredSegment) this.hoveredSegment.material.emissive.setHex(0x000000);
            this.hoveredSegment = null;
        }
    }

    flyToNextCritical() {
        const criticals = this.anomalyData.filter(a => a.status === 'Critical');
        if (criticals.length === 0) return;

        this.criticalIndex = (this.criticalIndex + 1) % criticals.length;
        const item = criticals[this.criticalIndex];
        this.jumpTo(item);
    }

    setupCamera() {
        // Fixed canvas size: 600px height
        const container = document.getElementById('canvas-container');
        const width = container.clientWidth;
        const height = 600;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000);
        this.camera.position.set(20, 10, 20);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        // Set renderer to fixed canvas size
        const container = document.getElementById('canvas-container');
        const width = container.clientWidth;
        const height = 600;
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(20, 50, 20);
        this.scene.add(pointLight);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
    }

    async init() {
        await this.loadData();
        this.createPipeline();
        this.createAnomalies();
        this.createReferences();
        this.populateCriticalZones();
    }

    populateCriticalZones() {
        const list = document.getElementById('critical-list');
        const criticals = this.anomalyData
            .filter(a => a.status === 'Critical')
            .sort((a, b) => b.annual_growth_rate - a.annual_growth_rate);

        document.getElementById('critical-count').innerText = criticals.length;

        if (criticals.length === 0) {
            list.innerHTML = '<p class="text-xs text-slate-500 italic">No critical zones detected</p>';
            return;
        }

        list.innerHTML = '';
        criticals.forEach((a, index) => {
            const item = document.createElement('div');
            item.className = 'p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 cursor-pointer transition-all hover:scale-[1.02]';
            
            // Determine why it's critical
            let reason = '';
            if (a.depth_22 >= 80) {
                reason = 'Severe depth (≥80%)';
            } else if (a.annual_growth_rate >= 5) {
                reason = 'Rapid growth rate';
            } else if (a.depth_22 >= 60 && a.annual_growth_rate >= 2) {
                reason = 'High depth + growth';
            } else {
                reason = 'Multiple risk factors';
            }
            
            // Validation badge
            let validationIcon = '';
            if (a.is_match && a.is_validated !== undefined) {
                if (a.is_validated) {
                    validationIcon = '<span class="text-green-400 text-[10px]" title="Validated Match">✓</span>';
                } else {
                    validationIcon = '<span class="text-orange-400 text-[10px]" title="Validation Warning">⚠</span>';
                }
            }
            
            item.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-1">
                        <span class="text-xs font-mono text-red-400 font-bold">#${index + 1}</span>
                        ${validationIcon}
                    </div>
                    <span class="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full font-mono">${a.annual_growth_rate ? a.annual_growth_rate.toFixed(1) + '%/yr' : 'N/A'}</span>
                </div>
                <div class="flex justify-between text-xs mb-1">
                    <span class="text-slate-400">Distance:</span>
                    <span class="text-white font-mono">${a.dist_22_aligned ? a.dist_22_aligned.toFixed(0) : 0} ft</span>
                </div>
                <div class="flex justify-between text-xs mb-2">
                    <span class="text-slate-400">Depth:</span>
                    <span class="text-red-400 font-bold">${a.depth_22 ? a.depth_22.toFixed(1) : 0}%</span>
                </div>
                <div class="text-[10px] text-red-300/80 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                    ⚠️ ${reason}
                </div>
            `;
            item.onclick = () => this.jumpTo(a);
            list.appendChild(item);
        });
    }

    populateSidebar() {
        // Removed - sidebar is now part of the main layout
    }

    jumpTo(item) {
        const z = item.dist_22_aligned || item.dist; // Use dist for joints
        const theta = (item.orient_22 * Math.PI) / 180 || 0; // Default to 0 for joints
        const radius = 2;
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);

        // Position camera slightly offset
        this.camera.position.set(x + 10, y + 5, z - 10);
        this.controls.target.set(x, y, z);
        this.controls.update();
        if (item.type === 'Segment') {
            this.showJointInfo(item);
        } else {
            this.showAnomalyInfo(item);
        }
    }

    async loadData() {
        try {
            console.log('Fetching data...');
            const [anomsRes, refsRes] = await Promise.all([
                fetch('/data/ui_payload.json'),
                fetch('/data/reference_payload.json')
            ]);

            if (!anomsRes.ok) throw new Error(`Failed to load ui_payload.json: ${anomsRes.status} ${anomsRes.statusText}`);
            if (!refsRes.ok) throw new Error(`Failed to load reference_payload.json: ${refsRes.status} ${refsRes.statusText}`);

            this.anomalyData = await anomsRes.json();
            this.referenceData = await refsRes.json();
            console.log(`Data loaded successfully. Anomalies: ${this.anomalyData.length}, References: ${this.referenceData.length}`);
        } catch (error) {
            console.error('CRITICAL: Error loading data:', error);
            // Show error in UI
            const btn = document.getElementById('btn-apply-range');
            if (btn) btn.innerText = 'Data Load Error';
        }
    }

    createPipeline() {
        // Sort reference data by distance
        const sortedRefs = [...this.referenceData].sort((a, b) => a.dist_22 - b.dist_22);

        const radius = 2;

        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff, // Whitish
            metalness: 0.6,
            roughness: 0.3,
            side: THREE.DoubleSide
        });

        // Draw segments between consecutive Girth Welds or reference points
        for (let i = 0; i < sortedRefs.length - 1; i++) {
            const r1 = sortedRefs[i];
            const r2 = sortedRefs[i + 1];
            const start = r1.dist_22;
            const end = r2.dist_22;
            const segmentLength = end - start;

            if (segmentLength <= 0) continue;

            const geometry = new THREE.CylinderGeometry(radius, radius, segmentLength, 32, 1, true);
            const segment = new THREE.Mesh(geometry, material.clone());

            // Position at the midpoint of the segment
            segment.rotation.x = Math.PI / 2;
            segment.position.z = start + segmentLength / 2;

            // Tag segment with joint data
            segment.userData = {
                type: 'Segment',
                joint: r1.joint,
                nextJoint: r2.joint,
                dist: start,
                length: segmentLength
            };

            this.scene.add(segment);
            this.pipeSegments.push(segment);
            this.jointMap.set(Number(r1.joint), segment);

            // Add a "Weld Seam" at the joint
            const seamGeo = new THREE.TorusGeometry(radius, 0.05, 16, 32);
            const seamMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 1 });
            const seam = new THREE.Mesh(seamGeo, seamMat);
            seam.position.z = start;
            seam.userData = { type: 'WeldSeam', joint: r1.joint };
            this.scene.add(seam);
        }

        // Store sorted joints for index-based filtering
        this.sortedJoints = Array.from(this.jointMap.keys()).sort((a, b) => a - b);

        // Add grid for reference
        const totalLength = 60000;
        const grid = new THREE.GridHelper(totalLength, 100, 0x475569, 0x1e293b);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = totalLength / 2;
        grid.position.y = -5; // Lower the grid
        this.scene.add(grid);
    }

    createAnomalies() {
        const radius = 2;
        this.anomalyData.forEach(item => {
            const z = item.dist_22_aligned;
            const theta = (item.orient_22 * Math.PI) / 180;

            const x = radius * Math.cos(theta);
            const y = radius * Math.sin(theta);

            let color = 0x22c55e; // green-500
            if (item.status === 'Critical') color = 0xef4444; // red-500
            else if (item.confidence_label === 'Review Required') color = 0xf97316; // orange-500

            // Size anomalies by depth
            const size = Math.max(0.2, item.depth_22 / 50);
            const geo = new THREE.SphereGeometry(size, 16, 16);
            const mat = new THREE.MeshPhongMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.3
            });
            const mesh = new THREE.Mesh(geo, mat);

            mesh.position.set(x, y, z);
            mesh.userData = item;
            this.scene.add(mesh);
            this.anomalies.push(mesh);
        });
    }

    createReferences() {
        const radius = 2; // pipe radius

        this.referenceData.forEach(item => {
            let marker = null;
            if (item.type === 'Tap' || item.type === 'Tee') {
                const color = item.type === 'Tap' ? 0x22c55e : 0x06b6d4; // Green for Tap, Cyan for Tee
                const thickness = item.type === 'Tap' ? 0.3 : 0.6;
                const geo = new THREE.TorusGeometry(radius + 0.1, thickness, 16, 32);
                const mat = new THREE.MeshStandardMaterial({
                    color,
                    emissive: color,
                    emissiveIntensity: 0.5,
                    metalness: 0.8
                });
                const mesh = new THREE.Mesh(geo, mat);

                mesh.position.set(0, 0, item.dist_22);
                mesh.rotation.x = Math.PI / 2; // Face along the pipe
                marker = mesh;
            } else if (item.type === 'Girth Weld') {
                return;
            } else if (item.type === 'Valve') {
                const color = 0xef4444; // Red for Valve
                const geo = new THREE.CylinderGeometry(radius + 0.5, radius + 0.5, 2, 8);
                const mat = new THREE.MeshStandardMaterial({ color, metalness: 1 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, 0, item.dist_22);
                mesh.rotation.x = Math.PI / 2;
                marker = mesh;
            }

            if (marker) {
                marker.userData = { ...item, type: 'FeatureMarker' };
                this.scene.add(marker);
                this.featureMarkers.push(marker);
            }
        });
    }

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        const width = container.clientWidth;
        const height = 600;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    onClick(event) {
        // Get canvas container bounds for accurate mouse coordinates
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();
        
        // Check if click is within canvas bounds
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) {
            return;
        }
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check anomalies first
        const intersectsAnom = this.raycaster.intersectObjects(this.anomalies);
        if (intersectsAnom.length > 0) {
            const item = intersectsAnom[0].object.userData;
            this.showAnomalyInfo(item);
            this.controls.target.copy(intersectsAnom[0].object.position);
            return;
        }

        // Check pipe segments
        const intersectsPipe = this.raycaster.intersectObjects(this.pipeSegments);
        if (intersectsPipe.length > 0) {
            const segment = intersectsPipe[0].object;
            this.showJointInfo(segment.userData);
            this.highlightSegment(segment);
        }
    }

    highlightSegment(segment) {
        // Reset others
        this.pipeSegments.forEach(s => s.material.emissive.setHex(0x000000));
        // Highlight current
        segment.material.emissive.setHex(0x334455);
    }

    applyRangeFilter() {
        const startInput = document.getElementById('range-start').value.trim();
        const endInput = document.getElementById('range-end').value.trim().toLowerCase();

        const start = Number(startInput) || 0;
        const end = (endInput === 'max' || endInput === '' || endInput === 'end') ? Infinity : Number(endInput);

        console.log(`Filtering joints from ${start} to ${end}`);

        let visibleCount = 0;
        this.pipeSegments.forEach(segment => {
            const joint = Number(segment.userData.joint);
            const nextJoint = Number(segment.userData.nextJoint) || joint;

            // Overlap logic: segment is visible if its range intersects [start, end]
            segment.visible = (joint <= end && nextJoint >= start);
            if (segment.visible) visibleCount++;
        });

        // Also filter anomalies
        this.anomalies.forEach(anomaly => {
            const joint = Number(anomaly.userData.joint);
            anomaly.visible = (joint >= start && joint <= end);
            if (anomaly.selectionRing) anomaly.selectionRing.visible = anomaly.visible;
        });

        // Hide weld seams
        this.scene.children.forEach(child => {
            if (child.userData.type === 'WeldSeam') {
                const joint = Number(child.userData.joint);
                child.visible = (joint >= start && joint <= end);
            }
        });

        // Filter Feature Markers (Taps, Tees)
        this.featureMarkers.forEach(marker => {
            const joint = Number(marker.userData.joint);
            marker.visible = (joint >= start && joint <= end);
        });

        const btn = document.getElementById('btn-apply-range');

        // Fallback: If nothing is visible, find the nearest joint to 'start'
        if (visibleCount === 0 && start !== Infinity) {
            console.log('No exact matches found. Finding nearest joint fallback...');
            const targetJoint = start;
            let nearestJoint = this.sortedJoints[0];
            let minDiff = Math.abs(this.sortedJoints[0] - targetJoint);

            for (const j of this.sortedJoints) {
                const diff = Math.abs(j - targetJoint);
                if (diff < minDiff) {
                    minDiff = diff;
                    nearestJoint = j;
                }
            }

            // Show the nearest joint and its segment
            const nearestSegment = this.jointMap.get(nearestJoint);
            if (nearestSegment) {
                nearestSegment.visible = true;
                visibleCount = 1;
                console.log(`Fallback: showing joint ${nearestJoint} instead.`);
                btn.innerText = `Nearest: ${nearestJoint}`;
            }
        }

        console.log(`Filter applied. Visible segments: ${visibleCount}`);

        if (visibleCount > 0) {
            if (btn.innerText === 'Apply') { // Don't overwrite if fallback already set text
                btn.innerText = `Applied (${visibleCount})`;
            }
            btn.classList.add('bg-green-600/20', 'border-green-500/30', 'text-green-400');
            btn.classList.remove('bg-blue-600/20', 'border-blue-500/30', 'text-blue-400');

            // Jump to the first visible segment or nearest
            const firstVisible = this.pipeSegments.find(s => s.visible);
            if (firstVisible) {
                this.jumpTo(firstVisible.userData);
                this.highlightSegment(firstVisible);
            }
        } else {
            btn.innerText = 'No matches';
            btn.classList.add('bg-red-600/20', 'border-red-500/30', 'text-red-400');
            btn.classList.remove('bg-blue-600/20', 'border-blue-500/30', 'text-blue-400');
        }

        // Update labels if they're visible
        if (this.showLabels) {
            this.createJointLabels();
        }

        setTimeout(() => {
            btn.innerText = 'Apply';
            btn.classList.remove('bg-green-600/20', 'border-green-500/30', 'text-green-400', 'bg-red-600/20', 'border-red-500/30', 'text-red-400');
            btn.classList.add('bg-blue-600/20', 'border-blue-500/30', 'text-blue-400');
        }, 2000);
    }

    resetRangeFilter() {
        document.getElementById('range-start').value = '';
        document.getElementById('range-end').value = '';

        this.pipeSegments.forEach(segment => segment.visible = true);
        this.anomalies.forEach(anomaly => {
            anomaly.visible = true;
            if (anomaly.selectionRing) anomaly.selectionRing.visible = true;
        });

        this.scene.children.forEach(child => {
            if (child.userData.type === 'WeldSeam') child.visible = true;
        });

        this.featureMarkers.forEach(marker => marker.visible = true);

        // Update labels if they're visible
        if (this.showLabels) {
            this.createJointLabels();
        }

        console.log('Range filter reset');
    }


    applyNeighborhoodFilter() {
        const centerStr = document.getElementById('neighbor-center').value;
        const center = Number(centerStr.replace(/[^0-9.]/g, ''));
        const radius = parseInt(document.getElementById('neighbor-radius').value) || 5;

        if (isNaN(center)) return;

        console.log(`Neighborhood filter: target ${center}, radius ${radius} joints`);

        // Find index of nearest joint (preferring the one >= center if not exact)
        let targetIndex = this.sortedJoints.findIndex(j => j >= center);

        // If all joints are smaller than center, take the last one
        if (targetIndex === -1) targetIndex = this.sortedJoints.length - 1;
        // If center is closer to the previous joint, or if it's a neighborhood search, 
        // maybe absolute nearest is better? But user asked for "after 1000".

        const minIdx = Math.max(0, targetIndex - radius);
        const maxIdx = Math.min(this.sortedJoints.length - 1, targetIndex + radius);

        const visibleJoints = new Set(this.sortedJoints.slice(minIdx, maxIdx + 1));

        let visibleCount = 0;
        this.pipeSegments.forEach(segment => {
            const joint = Number(segment.userData.joint);
            segment.visible = visibleJoints.has(joint);
            if (segment.visible) visibleCount++;
        });

        this.anomalies.forEach(anomaly => {
            const joint = Number(anomaly.userData.joint);
            anomaly.visible = visibleJoints.has(joint);
            if (anomaly.selectionRing) anomaly.selectionRing.visible = anomaly.visible;
        });

        this.scene.children.forEach(child => {
            if (child.userData.type === 'WeldSeam') {
                const joint = Number(child.userData.joint);
                child.visible = visibleJoints.has(joint);
            }
        });

        this.featureMarkers.forEach(marker => {
            const joint = Number(marker.userData.joint);
            marker.visible = visibleJoints.has(joint);
        });

        const btn = document.getElementById('btn-apply-neighbor');
        btn.innerText = `Range ${this.sortedJoints[minIdx]}-${this.sortedJoints[maxIdx]} (${visibleCount})`;
        btn.classList.add('bg-purple-600/40', 'border-purple-500/60');

        // Update labels if they're visible
        if (this.showLabels) {
            this.createJointLabels();
        }

        setTimeout(() => {
            btn.innerText = 'Apply';
            btn.classList.remove('bg-purple-600/40', 'border-purple-500/60');
        }, 3000);

        const actualCenterJoint = this.sortedJoints[targetIndex];
        const nearest = this.jointMap.get(actualCenterJoint);
        if (nearest) {
            this.jumpTo(nearest.userData);
            this.highlightSegment(nearest);
        }
    }

    findNearestJoint(val) {
        if (this.jointMap.has(val)) return this.jointMap.get(val);

        const keys = Array.from(this.jointMap.keys()).sort((a, b) => a - b);
        if (keys.length === 0) return null;

        let nearestKey = keys[0];
        let minDiff = Math.abs(val - nearestKey);

        for (const key of keys) {
            const diff = Math.abs(val - key);
            if (diff < minDiff) {
                minDiff = diff;
                nearestKey = key;
            }
        }
        return this.jointMap.get(nearestKey);
    }


    showJointInfo(data) {
        document.getElementById('anomaly-info').innerHTML = `
            <div class="bg-slate-800/50 p-3 rounded-lg border border-blue-500/20">
                <div class="stat-row">
                    <span class="stat-label">Type</span>
                    <span class="stat-value font-bold text-blue-400">Pipe Joint</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Joint No.</span>
                    <span class="stat-value text-xl font-bold text-white">${data.joint}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Distance</span>
                    <span class="stat-value">${data.dist.toFixed(2)} ft</span>
                </div>
                <div class="stat-row border-0">
                    <span class="stat-label">Length</span>
                    <span class="stat-value">${data.length.toFixed(2)} ft</span>
                </div>
                <p class="text-[10px] text-slate-500 mt-2 italic">→ Connects to Joint ${data.nextJoint}</p>
            </div>
        `;
    }

    showAnomalyInfo(item) {
        const container = document.getElementById('anomaly-info');
        const statusColor = item.status === 'Critical' ? 'red' : item.status === 'Review Required' ? 'orange' : 'green';
        const confidenceColor = item.confidence_label === 'Confident' ? 'blue' : 'orange';
        
        // Anomaly type badge
        const anomalyType = item.anomaly_type || 'metal loss';
        const typeDisplay = anomalyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Confidence level color
        const confLevel = item.confidence_level || 'Unknown';
        let confColor = 'slate';
        if (confLevel === 'Very High') confColor = 'green';
        else if (confLevel === 'High') confColor = 'blue';
        else if (confLevel === 'Medium') confColor = 'yellow';
        else if (confLevel === 'Low') confColor = 'orange';
        
        // Validation badge
        let validationBadge = '';
        if (item.is_match && item.is_validated !== undefined) {
            if (item.is_validated) {
                validationBadge = `
                    <div class="bg-green-900/20 p-3 rounded-lg border border-green-500/30 mb-3">
                        <div class="flex items-center gap-2 mb-2">
                            <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span class="font-bold text-green-400 text-xs uppercase">Validated Match</span>
                            <span class="ml-auto text-green-300 font-mono text-xs">${item.validation_confidence ? item.validation_confidence.toFixed(0) : 0}%</span>
                        </div>
                        <div class="text-[10px] text-green-300/80 space-y-1">
                            <div class="flex justify-between">
                                <span>Distance Δ:</span>
                                <span class="font-mono">${item.dist_diff_ft ? item.dist_diff_ft.toFixed(2) : 0} ft ${item.dist_within_tolerance ? '✓' : '✗'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Orientation Δ:</span>
                                <span class="font-mono">${item.orient_diff_deg ? item.orient_diff_deg.toFixed(1) : 0}° ${item.orient_within_tolerance ? '✓' : '✗'}</span>
                            </div>
                            <div class="text-[9px] text-green-400/60 mt-1 italic">
                                Tolerances: ±5ft, ±60° (vendor data verified)
                            </div>
                        </div>
                    </div>
                `;
            } else {
                const failReason = !item.dist_within_tolerance ? 'Distance exceeds 5 ft tolerance' : 'Orientation exceeds 60° tolerance';
                validationBadge = `
                    <div class="bg-orange-900/20 p-3 rounded-lg border border-orange-500/30 mb-3">
                        <div class="flex items-center gap-2 mb-2">
                            <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <span class="font-bold text-orange-400 text-xs uppercase">Validation Warning</span>
                        </div>
                        <div class="text-[10px] text-orange-300/80 space-y-1">
                            <div class="flex justify-between">
                                <span>Distance Δ:</span>
                                <span class="font-mono ${!item.dist_within_tolerance ? 'text-orange-400 font-bold' : ''}">${item.dist_diff_ft ? item.dist_diff_ft.toFixed(2) : 0} ft ${item.dist_within_tolerance ? '✓' : '✗'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Orientation Δ:</span>
                                <span class="font-mono ${!item.orient_within_tolerance ? 'text-orange-400 font-bold' : ''}">${item.orient_diff_deg ? item.orient_diff_deg.toFixed(1) : 0}° ${item.orient_within_tolerance ? '✓' : '✗'}</span>
                            </div>
                            <div class="text-[9px] text-orange-400 mt-2 font-semibold">
                                ⚠️ ${failReason}
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        // Anomaly confidence badge
        const anomalyConf = item.anomaly_confidence || 0;
        const severityScore = item.severity_score || 0;
        const severityLevel = item.severity_level || 'Low';
        const yearsToFailure = item.years_to_failure || 999;
        
        let confidenceBadge = '';
        if (item.is_match) {
            confidenceBadge = `
                <div class="bg-${confColor}-900/20 p-3 rounded-lg border border-${confColor}-500/30 mb-3">
                    <div class="flex items-center gap-2 mb-2">
                        <svg class="w-4 h-4 text-${confColor}-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                        <span class="font-bold text-${confColor}-400 text-xs uppercase">Anomaly Confidence</span>
                        <span class="ml-auto text-${confColor}-300 font-mono text-sm font-bold">${anomalyConf.toFixed(0)}%</span>
                    </div>
                    <div class="text-[10px] text-${confColor}-300/80">
                        <div class="flex justify-between mb-1">
                            <span>Confidence Level:</span>
                            <span class="font-bold text-${confColor}-400">${confLevel}</span>
                        </div>
                        <div class="text-[9px] text-${confColor}-400/60 mt-2 italic">
                            Based on: spatial validation (40%), match quality (30%), depth consistency (20%), type consistency (10%)
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Severity badge
        let severityBadge = '';
        if (item.is_match && severityScore > 0) {
            const sevColor = severityScore >= 70 ? 'red' : severityScore >= 50 ? 'orange' : severityScore >= 30 ? 'yellow' : 'green';
            severityBadge = `
                <div class="bg-${sevColor}-900/20 p-3 rounded-lg border border-${sevColor}-500/30 mb-3">
                    <div class="flex items-center gap-2 mb-2">
                        <svg class="w-4 h-4 text-${sevColor}-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <span class="font-bold text-${sevColor}-400 text-xs uppercase">Severity Assessment</span>
                        <span class="ml-auto text-${sevColor}-300 font-mono text-sm font-bold">${severityScore.toFixed(0)}/100</span>
                    </div>
                    <div class="text-[10px] text-${sevColor}-300/80 space-y-1">
                        <div class="flex justify-between">
                            <span>Severity Level:</span>
                            <span class="font-bold text-${sevColor}-400">${severityLevel}</span>
                        </div>
                        ${yearsToFailure < 100 ? `
                        <div class="flex justify-between">
                            <span>Est. Time to Failure:</span>
                            <span class="font-bold text-${sevColor}-400">${yearsToFailure.toFixed(1)} years</span>
                        </div>
                        ` : ''}
                        <div class="text-[9px] text-${sevColor}-400/60 mt-2 italic">
                            Based on: current depth (40%), growth rate (30%), total growth (20%), time to failure (10%)
                        </div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = `
            ${validationBadge}
            ${confidenceBadge}
            ${severityBadge}
            
            <div class="bg-${statusColor}-900/20 p-4 rounded-lg border border-${statusColor}-500/30">
                <div class="flex items-center gap-2 mb-3">
                    <span class="w-3 h-3 rounded-full bg-${statusColor}-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span>
                    <span class="font-bold text-${statusColor}-400 uppercase text-sm">Anomaly Detected</span>
                </div>
                
                <div class="stat-row">
                    <span class="stat-label">Type</span>
                    <span class="stat-value font-bold text-purple-400">${typeDisplay}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Status</span>
                    <span class="stat-value font-bold text-${statusColor}-400">${item.status}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Match Confidence</span>
                    <span class="stat-value text-${confidenceColor}-400">${item.confidence_label}</span>
                </div>
                ${item.confidence_label === 'Review Required' && item.review_reasons ? `
                <div class="bg-orange-900/20 p-2 rounded border border-orange-500/30 mb-2">
                    <div class="text-[10px] text-orange-300 font-semibold mb-1">Review Reasons:</div>
                    <div class="text-[9px] text-orange-400/80">${item.review_reasons}</div>
                </div>
                ` : ''}
                <div class="stat-row">
                    <span class="stat-label">Joint No.</span>
                    <span class="stat-value font-bold text-yellow-400">${item.joint_22 || item.joint || 'N/A'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Distance</span>
                    <span class="stat-value">${item.dist_22_aligned ? item.dist_22_aligned.toFixed(2) : 0} ft</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Orientation</span>
                    <span class="stat-value">${item.orient_22 ? item.orient_22.toFixed(1) : 0}° <span class="text-slate-500">(${this.degToOclock(item.orient_22 || 0)})</span></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Depth (2022)</span>
                    <span class="stat-value font-bold text-${statusColor}-400">${item.depth_22 ? item.depth_22.toFixed(1) : 0}%</span>
                </div>
                ${item.depth_15 ? `
                <div class="stat-row">
                    <span class="stat-label">Depth (2015)</span>
                    <span class="stat-value text-slate-400">${item.depth_15.toFixed(1)}%</span>
                </div>
                ` : ''}
                <div class="stat-row border-0">
                    <span class="stat-label">Growth Rate</span>
                    <span class="stat-value font-bold text-${statusColor}-400">${item.annual_growth_rate ? item.annual_growth_rate.toFixed(2) + '%/yr' : 'N/A'}</span>
                </div>
            </div>
        `;
    }

    degToOclock(deg) {
        let hour = Math.round(deg / 30);
        if (hour === 0) hour = 12;
        return `${hour}:00`;
    }

    onSliderInput(e) {
        const val = Number(e.target.value);
        this.camera.position.z = val + 20;
        this.controls.target.z = val;
        this.controls.update();
        this.updateDistDisplay(val);
    }

    updateDistDisplay(val) {
        document.getElementById('dist-display').innerText = `${Math.round(val).toLocaleString()} / 60,000 ft`;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();

        // Sync slider with camera
        const currentZ = this.controls.target.z;
        const slider = document.getElementById('dist-slider');
        if (slider && Math.abs(slider.value - currentZ) > 1) {
            slider.value = currentZ;
            this.updateDistDisplay(currentZ);
        }

        const pitch = Math.round(this.controls.getPolarAngle() * (180 / Math.PI));
        const yaw = Math.round(this.controls.getAzimuthalAngle() * (180 / Math.PI));
        document.getElementById('pitch-val').innerText = `${pitch}°`;
        document.getElementById('yaw-val').innerText = `${yaw}°`;

        this.renderer.render(this.scene, this.camera);
    }
}

new PipelineViewer();
