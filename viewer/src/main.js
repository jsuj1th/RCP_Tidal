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
        this.jointAnomalyMap = new Map();

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredSegment = null;
        this.criticalIndex = -1;
        this.showLabels = false;
        this.labelSprites = []; // Store label sprites
        this.selectedAnomaly = null; // Track selected anomaly for AI context

        // Selection Highlight Mesh
        const selGeo = new THREE.SphereGeometry(1, 16, 16);
        const selMat = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true, transparent: true, opacity: 0.8 });
        this.selectionMesh = new THREE.Mesh(selGeo, selMat);
        this.selectionMesh.visible = false;
        this.scene.add(this.selectionMesh);

        // Measurement Guides Group
        this.guidesGroup = new THREE.Group();
        this.scene.add(this.guidesGroup);

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

        // Prediction functionality
        document.getElementById('btn-predict').onclick = () => this.predictFuture();
        document.getElementById('btn-prev-prediction').onclick = () => this.navigatePrediction(-1);
        document.getElementById('btn-next-prediction').onclick = () => this.navigatePrediction(1);

        // File upload functionality
        this.setupFileUpload();

        const demoBtn = document.getElementById('btn-load-demo');
        if (demoBtn) demoBtn.onclick = () => this.loadDemoData();

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

        // Check Anomalies
        const visibleAnomalies = this.anomalies.filter(a => a.visible);
        const intersectAnom = this.raycaster.intersectObjects(visibleAnomalies);

        if (intersectAnom.length > 0) {
            // Clear pipe highlight if any
            if (this.hoveredSegment) {
                this.hoveredSegment.material.emissive.setHex(0x000000);
                this.hoveredSegment = null;
            }

            const data = intersectAnom[0].object.userData;
            if (!this.isGuideLocked) this.drawMeasurementGuides(data);

            this.tooltip.style.left = `${event.clientX + 15}px`;
            this.tooltip.style.top = `${event.clientY + 15}px`;
            let distText = '0.00 ft';
            // Try to calculate distance from joint start
            const jointNum = Number(data.joint_number || data.joint_22 || data.joint);
            const segment = this.jointMap.get(jointNum);
            if (segment && data.dist_22_aligned) {
                distText = Math.abs(data.dist_22_aligned - segment.userData.dist).toFixed(2) + ' ft';
            }

            this.tooltip.innerHTML = `
                <div class="flex flex-col gap-1 min-w-[160px]">
                    <div class="font-bold text-slate-200 text-xs border-b border-white/10 pb-1 mb-1">${data.event_type || 'Anomaly'}</div>
                    <div class="flex justify-between text-[10px] text-slate-400">
                        <span>Run Year:</span> <span class="text-purple-400 font-bold">${data.year || '2022'}</span>
                    </div>
                    <div class="flex justify-between text-[10px] text-slate-400">
                        <span>Depth:</span> <span class="text-slate-200">${data.depth_22 ? data.depth_22.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div class="flex justify-between text-[10px] text-slate-400">
                        <span>Distance:</span> <span class="text-cyan-400 font-bold">${distText}</span>
                    </div>
                     <div class="flex justify-between text-[10px] text-slate-400">
                        <span>Angle:</span> <span class="text-purple-400 font-bold">${data.orient_22 ? data.orient_22.toFixed(1) : 0}°</span>
                    </div>
                    ${data.is_match ? `<div class="flex justify-between text-[10px] text-green-400 border-t border-white/10 pt-1 mt-1">
                        <span>Matched:</span> <span class="font-bold">Growth ${data.annual_growth_rate ? data.annual_growth_rate.toFixed(1) : 0}%/yr</span>
                    </div>` : '<div class="text-[10px] text-orange-400 border-t border-white/10 pt-1 mt-1">New anomaly (unmatched)</div>'}
                    ${data.status === 'Critical' ? '<div class="text-[10px] text-red-400 font-bold mt-1">CRITICAL</div>' : ''}
                </div>
            `;
            this.tooltip.classList.remove('hidden');
            return;
        } else {
            if (!this.isGuideLocked) this.clearMeasurementGuides();
        }

        const visibleSegments = this.pipeSegments.filter(s => s.visible);
        const intersects = this.raycaster.intersectObjects(visibleSegments);

        if (intersects.length > 0) {
            const data = intersects[0].object.userData;
            this.tooltip.style.left = `${event.clientX + 15}px`;
            this.tooltip.style.top = `${event.clientY + 15}px`;

            // Look up anomalies for this joint
            const jointNum = Number(data.joint);
            const anomalies = this.jointAnomalyMap.get(jointNum) || [];

            // Critical anomalies count
            const criticalCount = anomalies.filter(a => a.status === 'Critical').length;
            const reviewCount = anomalies.filter(a => a.confidence_label === 'Review Required').length;

            let anomalyHtml = '';
            if (anomalies.length > 0) {
                anomalyHtml = `
                    <div class="mt-2 pt-2 border-t border-white/20">
                        <div class="font-bold text-slate-300 mb-1">Anomalies (${anomalies.length}):</div>
                        ${anomalies.slice(0, 5).map(a => `
                            <div class="flex justify-between text-[10px] items-center mb-0.5">
                                <span class="${a.status === 'Critical' ? 'text-red-400' : 'text-slate-400'}">${a.event_type || 'Anomaly'}</span>
                                <span class="font-mono text-slate-500">${a.dist_22_aligned ? a.dist_22_aligned.toFixed(0) : 0}ft</span>
                            </div>
                        `).join('')}
                        ${anomalies.length > 5 ? `<div class="text-[9px] text-slate-500 italic">+${anomalies.length - 5} more...</div>` : ''}
                    </div>
                `;
            } else {
                anomalyHtml = `<div class="mt-2 text-[10px] text-green-400/80 italic">No anomalies detected</div>`;
            }

            this.tooltip.innerHTML = `
                <div class="flex flex-col gap-0.5 min-w-[140px]">
                    <div class="font-bold text-cyan-400 text-sm mb-1">Joint ${data.joint}</div>
                    <div class="flex justify-between text-xs text-slate-300">
                        <span>Distance:</span>
                        <span class="font-mono ml-3">${Math.round(data.dist)} ft</span>
                    </div>
                    <div class="flex justify-between text-xs text-slate-300">
                        <span>Length:</span>
                        <span class="font-mono ml-3">${Math.round(data.length)} ft</span>
                    </div>
                    ${criticalCount > 0 ? `<div class="text-xs text-red-400 font-bold mt-1">⚠️ ${criticalCount} Critical</div>` : ''}
                    ${anomalyHtml}
                </div>
            `;
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
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000);
        this.camera.position.set(20, 10, 20);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Alpha for transparency if needed
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Set renderer to container size
        const container = document.getElementById('canvas-container');
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
    }

    setupLights() {
        // Warm Sunset Atmosphere
        this.scene.background = new THREE.Color(0xffcd9f); // Sunset Sky
        this.scene.fog = new THREE.FogExp2(0xffcd9f, 0.008); // Dense Horizon Fog

        // 1. Hemisphere Light (Sky vs Ground)
        const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 0.6); // Warm sky, dark ground
        this.scene.add(hemiLight);

        // 2. Directional Sun (Casting Shadows)
        const dirLight = new THREE.DirectionalLight(0xffaa00, 1.5);
        dirLight.position.set(50, 30, 20); // Low angle sunset
        dirLight.castShadow = true;

        // Optimize Shadow Map
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        const d = 100;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0001;

        this.scene.add(dirLight);

        // 3. Ambient Fill
        const ambLight = new THREE.AmbientLight(0x404040, 0.5); // Soft fill
        this.scene.add(ambLight);
    }

    createEnvironment() {
        // Desert Ground Plane
        const planeGeo = new THREE.PlaneGeometry(10000, 10000);
        const planeMat = new THREE.MeshStandardMaterial({
            color: 0xd2b48c, // Tan
            roughness: 1,
            metalness: 0
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -2.5; // Below pipe
        plane.receiveShadow = true;
        this.scene.add(plane);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
    }

    async init() {
        console.log('Initializing viewer...');
        await this.loadData();
        this.createEnvironment(); // Added Environment
        this.createPipeline();
        this.createAnomalies();
        this.createReferences();
        this.populateCriticalZones();
        this.populateJointList();

        // Do NOT auto-select - user will select from list
        // Pipe and anomalies are hidden by default for list-first workflow
        console.log('Viewer initialized. Select a joint from the list to view the pipe.');

        await this.setupChat();
    }

    async setupChat() {
        // UI Elements
        this.chatWidget = document.getElementById('chat-widget'); // Parent container
        this.chatWindow = document.getElementById('chat-window');
        this.toggleBtn = document.getElementById('btn-ask-ai'); // NEW BUTTON ID
        this.closeBtn = document.getElementById('close-chat');
        this.sendBtn = document.getElementById('send-chat');
        this.chatInput = document.getElementById('chat-input');
        this.msgsContainer = document.getElementById('chat-messages');
        this.apiKeyPanel = document.getElementById('api-key-panel');
        this.apiKeyInput = document.getElementById('api-key-input');
        this.saveKeyBtn = document.getElementById('save-api-key');
        this.clearChatBtn = document.getElementById('clear-chat');

        // State
        this.chatOpen = false;

        // Load API Key from config or local storage
        try {
            const res = await fetch('/config.json');
            if (res.ok) {
                const config = await res.json();
                if (config.featherless_api_key && config.featherless_api_key.length > 5 && !config.featherless_api_key.includes('Paste-Your-Key')) {
                    this.apiKey = config.featherless_api_key;
                    console.log('API Key loaded from config.json');
                }
            }
        } catch (e) {
            console.warn('Could not load config.json', e);
        }

        if (!this.apiKey) {
            this.apiKey = localStorage.getItem('featherless_api_key');
        }

        // Event Listeners
        if (this.toggleBtn) this.toggleBtn.onclick = () => this.toggleChat();
        if (this.closeBtn) this.closeBtn.onclick = () => this.toggleChat();
        if (this.saveKeyBtn) this.saveKeyBtn.onclick = () => this.saveApiKey();
        if (this.sendBtn) this.sendBtn.onclick = () => this.handleChatSubmit();
        if (this.chatInput) {
            this.chatInput.onkeypress = (e) => {
                if (e.key === 'Enter') this.handleChatSubmit();
            };
        }
        if (this.clearChatBtn) this.clearChatBtn.onclick = () => this.clearChat();

        // Check Key state
        if (!this.apiKey) {
            this.apiKeyPanel.classList.remove('hidden');
        } else {
            this.apiKeyPanel.classList.add('hidden');
        }
    }

    toggleChat() {
        this.chatOpen = !this.chatOpen;
        if (this.chatOpen) {
            this.chatWindow.classList.remove('hidden');
            // Small delay to allow display:block to apply before opacity transition
            setTimeout(() => {
                this.chatWindow.classList.remove('opacity-0', 'scale-95', 'translate-y-4');
                this.chatInput.focus();
            }, 10);

            // Check key again
            if (!this.apiKey) this.apiKeyPanel.classList.remove('hidden');
        } else {
            this.chatWindow.classList.add('opacity-0', 'scale-95', 'translate-y-4');
            setTimeout(() => {
                this.chatWindow.classList.add('hidden');
            }, 300);
        }
    }

    saveApiKey() {
        const key = this.apiKeyInput.value.trim();
        if (key.length > 10) {
            this.apiKey = key;
            localStorage.setItem('featherless_api_key', key);
            this.apiKeyPanel.classList.add('hidden');
            this.addMessage('system', 'API Key saved! You can now ask me about the pipeline.');
        } else {
            alert('Please enter a valid API Key.');
        }
    }

    clearChat() {
        this.msgsContainer.innerHTML = '';
        this.addMessage('system', 'Chat history cleared.');
    }

    async handleChatSubmit() {
        const text = this.chatInput.value.trim();
        if (!text) return;

        if (!this.apiKey) {
            this.addMessage('system', 'Please enter your API Key first.');
            this.apiKeyPanel.classList.remove('hidden');
            return;
        }

        this.addMessage('user', text);
        this.chatInput.value = '';

        // Contextual analysis
        const context = this.getPipelineContext(text);

        // Show typing indicator
        const typingId = this.addMessage('system', '<span class="animate-pulse">Thinking...</span>');

        try {
            const response = await this.callFeatherlessAPI(text, context);
            // Remove typing indicator
            const typingEl = document.getElementById(`msg-${typingId}`);
            if (typingEl) typingEl.remove();

            this.addMessage('ai', response);
        } catch (error) {
            const typingEl = document.getElementById(`msg-${typingId}`);
            if (typingEl) typingEl.remove();
            this.addMessage('system', `Error: ${error.message}`);
        }
    }

    addMessage(role, text) {
        const id = Date.now();
        const div = document.createElement('div');
        div.id = `msg-${id}`;
        div.className = 'flex gap-3 mb-4 animate-fadeIn'; // fade-in animation

        let avatar = '';
        let bubbleClass = '';

        if (role === 'user') {
            avatar = `<div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-white/10"><svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>`;
            bubbleClass = 'bg-slate-800 border border-white/5 text-slate-300';
            div.classList.add('flex-row-reverse'); // User on right? No, design shows left with icon. Let's keep standard left alignment for now but distinct style.
            // Actually, usually user is right. Let's make user right.
            div.className = 'flex gap-3 mb-4 justify-end';
            avatar = ''; // No avatar for user to save space/cleaner look? Or use one on right.
            avatar = `<div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-white/10"><svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>`;
        } else if (role === 'ai') {
            avatar = `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 text-white font-bold text-xs">AI</div>`;
            bubbleClass = 'bg-slate-800/80 border border-indigo-500/20 text-slate-200 shadow-sm';
        } else { // System
            div.className = 'flex gap-2 mb-4 justify-center opacity-75';
            div.innerHTML = `<div class="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full border border-white/5">${text}</div>`;
            this.msgsContainer.appendChild(div);
            this.msgsContainer.scrollTop = this.msgsContainer.scrollHeight;
            return id;
        }

        div.innerHTML = `
            ${role === 'ai' ? avatar : ''}
            <div class="${bubbleClass} rounded-2xl p-3 text-xs leading-relaxed shadow-sm max-w-[85%] ${role === 'user' ? 'rounded-tr-none bg-cyan-900/20 border-cyan-500/20 text-cyan-100' : 'rounded-tl-none'}">
                ${text}
            </div>
            ${role === 'user' ? avatar : ''}
        `;

        this.msgsContainer.appendChild(div);
        this.msgsContainer.scrollTop = this.msgsContainer.scrollHeight;
        return id;
    }

    getPipelineContext(query) {
        // 1. Global Stats
        const totalJoints = this.jointMap.size;
        const totalAnomalies = this.anomalyData.length;
        const criticalCount = this.anomalyData.filter(a => a.status === 'Critical').length;

        let context = `Current Pipeline Status:\n- Total Joints: ${totalJoints}\n- Total Anomalies: ${totalAnomalies}\n- Critical Anomalies: ${criticalCount}\n`;

        // 2. Focused Context (Selected Joint/Anomaly)
        // Note: We need to track selected item. I'll add 'this.selectedItem' tracking in selectJoint/showAnomalyInfo later.
        // For now, let's infer from query or view state.

        // 3. Query Analysis
        // "between joint X and Y"
        const rangeMatch = query.match(/between joint (\d+) and (\d+)/i);
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1]);
            const end = parseInt(rangeMatch[2]);
            const subset = this.anomalyData.filter(a => {
                const j = Number(a.joint_number || a.joint_22 || a.joint);
                return j >= start && j <= end;
            });
            context += `\nAnalysis for Joints ${start} to ${end}:\n- Found ${subset.length} anomalies.\n`;
            if (subset.length > 0 && subset.length < 50) {
                context += `- Anomalies: ${JSON.stringify(subset.map(a => ({
                    id: a.id, joint: a.joint_number, type: a.anomaly_type, depth: a.depth_22, status: a.status
                })))}\n`;
            } else if (subset.length >= 50) {
                context += `- Too many anomalies to list individually. Summary: ${subset.filter(a => a.status === 'Critical').length} Critical.\n`;
            }
        }

        // "this point" or "selected joint"
        // Check if we have a selected joint in 'this.lastSelectedJoint' (I might need to add this property)
        if (query.toLowerCase().includes('this') || query.toLowerCase().includes('selected') || this.selectedAnomaly) {
            // Retrieve currently visible/highlighted stuff? 
            // Best effort: top visible anomaly

            if (this.selectedAnomaly) {
                const a = this.selectedAnomaly;

                // Calculate Reason (Same logic as populateCriticalZones)
                let reason = 'Standard risk factors';
                if (a.depth_22 >= 80) reason = 'Severe wall loss (>80% depth)';
                else if (a.annual_growth_rate >= 5) reason = 'Rapid corrosion growth (>5%/yr)';
                else if (a.depth_22 >= 60 && a.annual_growth_rate >= 2) reason = 'High depth (>60%) combined with active growth';
                else if (a.status === 'Critical') reason = `Combined factors: Depth ${a.depth_22.toFixed(0)}%, Growth ${a.annual_growth_rate.toFixed(1)}%/yr`;

                context += `\n[SELECTED ANOMALY FOCUS]
- Anomaly ID: ${a.id || 'Unknown'} at Distance ${a.dist_22_aligned ? a.dist_22_aligned.toFixed(1) : 0} ft
- Type: ${a.anomaly_type || 'Corrosion'}
- Orientation: ${a.orient_22 ? a.orient_22.toFixed(1) : 0}° (Clock Position: ${a.orient_22 ? (a.orient_22 / 30).toFixed(1) : 0}h)
- Dimensions: Depth ${a.depth_22 ? a.depth_22.toFixed(1) : 0}%, Length ${a.length ? a.length.toFixed(2) : 0} in
- Status: ${a.status}
- Computed Severity Reason: ${reason}
- Note to AI: Explain status/severity. If user asks "Why", explain the metrics.
`;
            }
        }

        return context;
    }

    async callFeatherlessAPI(message, context) {
        const systemPrompt = `You are a Pipeline Integrity AI Assistant. Analyze MFL/UT inspection data accurately.
        
        CONTEXT:
        ${context}
        
        CRITICAL TERMINOLOGY:
        - DEPTH (%): Wall thickness loss due to corrosion. NOT distance along pipeline.
          Example: 36% depth = 36% of pipe wall thickness has been lost to corrosion.
          100% = hole through wall, 50% = half wall thickness gone.
        - ORIENTATION (degrees): Angular position around pipe circumference (0-360°).
          Measured from top of pipe (90° or 12 o'clock) clockwise.
        - DISTANCE (ft): Location along the pipeline length from start point.
        - GROWTH RATE (%/yr): Annual increase in depth percentage.
        
        SEVERITY FACTORS:
        - Critical if: depth ≥80%, OR growth ≥5%/yr, OR (depth ≥60% AND growth ≥2%/yr)
        - High depth + active growth = urgent concern for pipe integrity
        
        RESPONSE RULES:
        1. Default: BRIEF (1-2 sentences). "Anomaly at [distance]ft. Depth: [X]% wall loss, Orient: [Y]°."
        2. If asked "Why/What/How": EXPLAIN accurately using correct terminology.
        3. NEVER say depth is "relative to pipeline length" - it's wall thickness loss.
        4. Be precise and data-driven. No filler phrases.
        
        User Query: ${message}`;

        const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: "mistralai/Mistral-7B-Instruct-v0.1",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    populateJointList() {
        const list = document.getElementById('risk-joint-list');
        if (!list) {
            console.error('CRITICAL: #risk-joint-list element not found in DOM');
            return;
        }

        console.log(`Populating joint list. Total joints mapped: ${this.jointMap.size}, Anomalies mapped: ${this.jointAnomalyMap.size} `);
        console.log('Risk Joint List Element:', list);

        // Sort all joints by anomaly count
        const jointRisks = [];
        this.jointMap.forEach((segment, jointNum) => {
            const anomalies = this.jointAnomalyMap.get(jointNum) || [];
            if (anomalies.length > 0) {
                const criticalCount = anomalies.filter(a => a.status === 'Critical').length;
                jointRisks.push({
                    joint: jointNum,
                    count: anomalies.length,
                    critical: criticalCount,
                    segment: segment
                });
            }
        });

        // Sort by Critical count desc, then Total count desc
        jointRisks.sort((a, b) => {
            if (b.critical !== a.critical) return b.critical - a.critical;
            return b.count - a.count;
        });

        this.sortedJointsByRisk = jointRisks.map(j => j.joint);

        if (jointRisks.length === 0) {
            console.warn('No joints with anomalies found.');
            list.innerHTML = '<div class="text-xs text-slate-500 italic p-4 text-center">No anomalies found.</div>';
            return;
        }

        list.innerHTML = '';
        jointRisks.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'bg-slate-800/50 hover:bg-slate-700/80 p-3 rounded-xl border border-white/5 cursor-pointer transition-all group flex items-center justify-between';
            el.innerHTML = `
    <div>
                    <div class="text-xs font-bold text-slate-300 group-hover:text-cyan-400 mb-0.5">Joint ${item.joint}</div>
                    <div class="text-[10px] text-slate-500">${Math.round(item.segment.userData.dist)} ft</div>
                </div>
    <div class="flex flex-col items-end">
        ${item.critical > 0 ? `<div class="text-[10px] font-bold text-red-400 bg-red-900/20 px-1.5 rounded mb-1">${item.critical} Critical</div>` : ''}
        <div class="text-[10px] text-slate-400">${item.count} Anomalies</div>
    </div>
`;
            el.onclick = () => {
                // Route to Neighborhood Filter for consistency
                const centerInput = document.getElementById('neighbor-center');
                const radiusInput = document.getElementById('neighbor-radius');

                if (centerInput && radiusInput) {
                    centerInput.value = item.joint;
                    radiusInput.value = 5;
                    this.applyNeighborhoodFilter();
                }
            };
            list.appendChild(el);
        });
        console.log(`Populated list with ${jointRisks.length} joints.`);
    }

    selectJoint(jointNum) {
        console.log(`Selecting joint ${jointNum} `);
        // ISOLATE MODE: Hide all, show only selected joint
        // This creates a focused view for list-first workflow
        // Skip hiding if already visible (comparison mode)
        const alreadyVisible = this.anomalies.some(a => a.visible);
        if (!alreadyVisible) {
            this.pipeSegments.forEach(s => s.visible = false);
            this.anomalies.forEach(a => a.visible = false);
        } else {
            // In comparison mode, just hide other joints
            this.pipeSegments.forEach(s => {
                const segJoint = Number(s.userData.joint);
                if (segJoint !== jointNum) s.visible = false;
            });
            this.anomalies.forEach(a => {
                const meshJoint = Number(a.userData.joint_number || a.userData.joint_22 || a.userData.joint);
                if (meshJoint !== jointNum) a.visible = false;
            });
        }
        this.scene.children.forEach(c => {
            if (c.userData.type === 'WeldSeam') c.visible = false;
        });

        // Show selected segment
        const segment = this.jointMap.get(jointNum);
        if (segment) {
            segment.visible = true;
            this.highlightSegment(segment);

            // Show associated seam (joint itself)
            this.scene.children.forEach(c => {
                if (c.userData.type === 'WeldSeam' && Number(c.userData.joint) === jointNum) {
                    c.visible = true;
                }
            });

            // Camera Jump
            this.jumpTo(segment.userData);
        } else {
            console.warn(`Segment for joint ${jointNum} not found in map.`);
        }

        // Show anomalies for this joint using robust check
        let visibleAnomalies = 0;
        this.anomalies.forEach(mesh => {
            const data = mesh.userData;
            const meshJoint = Number(data.joint_number || data.joint_22 || data.joint);
            if (meshJoint === jointNum) {
                mesh.visible = true;
                visibleAnomalies++;
            }
        });
        console.log(`Visible anomalies for joint ${jointNum}: ${visibleAnomalies} `);
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
                </div >
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
            item.onclick = () => {
                // Route to Neighborhood Filter as requested
                const joint = Number(a.joint_number || a.joint_22 || a.joint);

                const centerInput = document.getElementById('neighbor-center');
                const radiusInput = document.getElementById('neighbor-radius');

                if (centerInput && radiusInput) {
                    centerInput.value = joint;
                    radiusInput.value = 5;
                    this.applyNeighborhoodFilter();
                }
            };
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
                // Try to load from root /data first, fallback to relative if needed (though usually /data works in Vite)
                fetch('/data/ui_payload.json').catch(e => fetch('./data/ui_payload.json')),
                fetch('/data/reference_payload.json').catch(e => fetch('./data/reference_payload.json'))
            ]);

            if (!anomsRes.ok) throw new Error(`Failed to load ui_payload.json: ${anomsRes.status} ${anomsRes.statusText} `);
            if (!refsRes.ok) throw new Error(`Failed to load reference_payload.json: ${refsRes.status} ${refsRes.statusText} `);

            this.anomalyData = await anomsRes.json();
            this.referenceData = await refsRes.json();

            // Fix Alignment: Shift original references back 20ft to center pipe on anomalies
            // This matches the fix applied to Uploaded Data
            this.referenceData.forEach(r => {
                if (r.dist_22) r.dist_22 -= 20;
                if (r.dist) r.dist -= 20;
            });

            console.log(`Data loaded successfully. Anomalies: ${this.anomalyData.length}, References: ${this.referenceData.length}`);
        } catch (error) {
            console.error('CRITICAL: Error loading data:', error);
            // Show error in UI
            const btn = document.getElementById('btn-apply-range');
            if (btn) btn.innerText = 'Data Load Error';
        }
    }

    createPipeline() {
        console.log(`Creating Pipeline. Reference Data: ${this.referenceData ? this.referenceData.length : 0} items`);
        // Sort reference data by distance
        const sortedRefs = [...this.referenceData].sort((a, b) => a.dist_22 - b.dist_22);

        const radius = 2;

        const material = new THREE.MeshStandardMaterial({
            color: 0xeaeaea, // Coated Off-White/Beige
            metalness: 0.3,  // Low metalness (coated)
            roughness: 0.6,  // Matte/Rough finish
            side: THREE.DoubleSide
        });

        // Draw segments between Girth Welds
        // Loop through ALL references including the last one
        for (let i = 0; i < sortedRefs.length; i++) {
            const r1 = sortedRefs[i];
            const start = r1.dist_22;
            let end;
            let nextJoint;

            if (i < sortedRefs.length - 1) {
                const r2 = sortedRefs[i + 1];
                end = r2.dist_22;
                nextJoint = r2.joint;
            } else {
                // For the last segment, assume 40ft length or extend slightly
                end = start + 40;
                nextJoint = Number(r1.joint) + 1;
            }

            let segmentLength = end - start;
            if (segmentLength <= 0) segmentLength = 40; // Fallback

            const geometry = new THREE.CylinderGeometry(radius, radius, segmentLength, 32, 1, true);
            const segment = new THREE.Mesh(geometry, material.clone());

            // Position at the midpoint of the segment
            segment.rotation.x = Math.PI / 2;
            segment.position.z = start + segmentLength / 2;

            // Tag segment with joint data
            segment.userData = {
                type: 'Segment',
                joint: r1.joint,
                nextJoint: nextJoint,
                dist: start,
                length: segmentLength
            };

            segment.visible = true; // Visible pipeline
            segment.castShadow = true; // Cast shadow on desert
            segment.receiveShadow = true; // Self shadow
            this.scene.add(segment);
            this.pipeSegments.push(segment);
            this.jointMap.set(Number(r1.joint), segment);

            // Add a "Weld Seam" at the joint
            const seamGeo = new THREE.TorusGeometry(radius, 0.05, 16, 32);
            const seamMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 1 });
            const seam = new THREE.Mesh(seamGeo, seamMat);
            seam.position.z = start;
            seam.userData = { type: 'WeldSeam', joint: r1.joint };
            seam.visible = false; // Hidden by default
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
        console.log('Creating anomalies...', this.anomalyData.length);
        if (this.anomalyData.length > 0) console.log('First anomaly:', this.anomalyData[0]);

        // Pipe radius - patches sit slightly above surface to avoid z-fighting
        const pipeRadius = 2.0;
        const patchRadius = 2.05; // Slightly above pipe surface

        this.anomalyData.forEach(item => {
            const z = item.dist_22_aligned;
            const theta = (item.orient_22 * Math.PI) / 180;

            const x = patchRadius * Math.cos(theta);
            const y = patchRadius * Math.sin(theta);

            // Color based on severity
            let color = 0x22c55e; // green-500 (Normal)
            if (item.status === 'Critical') color = 0xC40D3C; // Brand Red
            else if (item.confidence_label === 'Review Required') color = 0xf97316; // orange-500

            // Size patches by depth percentage (larger depth = larger patch)
            // Scale from 0.3 to 1.5 based on depth
            const depthScale = Math.max(0.3, Math.min(1.5, item.depth_22 / 40));
            const patchSize = depthScale;

            // Create 3D sphere using SphereGeometry
            // depthScale controls radius
            const geo = new THREE.SphereGeometry(patchSize * 0.8, 16, 16); // Slightly adjust scale for 3D volume
            const mat = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.3,
                metalness: 0.2,
                transparent: true,
                opacity: 0.9,
            });
            const mesh = new THREE.Mesh(geo, mat);

            // Position on pipe surface (radius + sphere radius so it sits ON top)
            // Adjust position to be slightly embedded or right on surface
            const surfaceRadius = 2.0; // Pipe radius
            const sphereRadius = patchSize * 0.8;

            // Re-calculate position to be ON the surface
            // x,y are currently at radius 2.05 (patchRadius). 
            // We want center of sphere to be at (Radius + sphereRadius)
            const displayRadius = surfaceRadius + sphereRadius * 0.5; // Embedded halfway looks best?
            // Actually, user wants "spheres" centered on the wall (half in, half out)
            const bubbleRadius = surfaceRadius;

            const x3d = bubbleRadius * Math.cos(theta);
            const y3d = bubbleRadius * Math.sin(theta);

            mesh.position.set(x3d, y3d, z);

            // No need to lookAt for spheres

            mesh.userData = item;

            mesh.userData = item;
            mesh.visible = false; // Hidden by default
            this.scene.add(mesh);
            this.anomalies.push(mesh);

            // Populate joint map
            const jointNum = Number(item.joint_number || item.joint_22 || item.joint);
            if (!this.jointAnomalyMap.has(jointNum)) {
                this.jointAnomalyMap.set(jointNum, []);
            }
            this.jointAnomalyMap.get(jointNum).push(item);
        });
    }

    createReferences() {
        console.log('Creating references...', this.referenceData.length);
        const radius = 2; // pipe radius

        this.referenceData.forEach(item => {
            // Updated to handle logic correctly or skip as needed. 
            // Previous code skipped taps, valves, tees and girth welds.
            if (item.type === 'Tap' || item.type === 'Valve' || item.type === 'Tee') return;
            if (item.type === 'Girth Weld') return;

            // If we have other types and a marker was supposed to be created:
            // For now, leaving this safe as robust joint visualization is priority
        });
    }

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
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

        // Check anomalies first (visible only)
        const visibleAnomalies = this.anomalies.filter(a => a.visible);
        const intersectsAnom = this.raycaster.intersectObjects(visibleAnomalies);

        if (intersectsAnom.length > 0) {
            const item = intersectsAnom[0].object.userData;
            this.selectedAnomaly = item; // Track for AI Context

            // Lock Guide
            this.isGuideLocked = true;
            this.drawMeasurementGuides(item);

            // Show Selection Highlight (ring around the patch)
            this.selectionMesh.position.copy(intersectsAnom[0].object.position);
            // CircleGeometry uses 'radius' parameter instead of sphere's 'radius'
            const patchRadius = intersectsAnom[0].object.geometry.parameters.radius || 0.5;
            const size = patchRadius * 1.4;
            this.selectionMesh.scale.set(size, size, size);
            this.selectionMesh.visible = true;

            // Show Info
            if (this.showAnomalyInfo) this.showAnomalyInfo(item);

            // Focus Camera
            this.controls.target.copy(intersectsAnom[0].object.position);
            return;
        }

        // Unlock guides if clicking background/pipe
        this.isGuideLocked = false;
        this.selectedAnomaly = null; // Clear context
        this.selectionMesh.visible = false; // Hide highlight
        this.clearMeasurementGuides();

        // Check pipe segments (visible only)
        const visibleSegments = this.pipeSegments.filter(s => s.visible);
        const intersectsPipe = this.raycaster.intersectObjects(visibleSegments);
        if (intersectsPipe.length > 0) {
            const segment = intersectsPipe[0].object;
            this.selectedAnomaly = null; // Ensure cleared when selecting whole joint
            this.selectionMesh.visible = false;
            this.showJointInfo(segment.userData);
            this.highlightSegment(segment);
            // Don't call selectJoint() here - it uses ISOLATE MODE which hides everything else
            // Just highlight and show info to preserve neighborhood filter context
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

        console.log(`Filtering joints from ${start} to ${end} `);

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
            const data = anomaly.userData;
            const joint = Number(data.joint_number || data.joint_22 || data.joint);
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
                btn.innerText = `Nearest: ${nearestJoint} `;
            }
        }

        console.log(`Filter applied.Visible segments: ${visibleCount} `);

        if (visibleCount > 0) {
            if (btn.innerText === 'Apply') { // Don't overwrite if fallback already set text
                btn.innerText = `Applied(${visibleCount})`;
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

        if (isNaN(center)) {
            console.error('Invalid center joint:', centerStr);
            return;
        }

        console.log(`Neighborhood filter: target ${center}, radius ${radius} joints`);
        console.log(`Total sorted joints: ${this.sortedJoints.length}`);

        // Find index of nearest joint (preferring the one >= center if not exact)
        let targetIndex = this.sortedJoints.findIndex(j => j >= center);
        console.log(`Target Index found: ${targetIndex} for joint ${center}`);

        // If all joints are smaller than center, take the last one
        if (targetIndex === -1) targetIndex = this.sortedJoints.length - 1;

        const minIdx = Math.max(0, targetIndex - radius);
        const maxIdx = Math.min(this.sortedJoints.length - 1, targetIndex + radius);

        console.log(`Filtering range indices: [${minIdx}, ${maxIdx}]`);

        const visibleJoints = new Set(this.sortedJoints.slice(minIdx, maxIdx + 1));
        console.log(`Visible joints count: ${visibleJoints.size}`);

        let visibleCount = 0;
        this.pipeSegments.forEach(segment => {
            const joint = Number(segment.userData.joint);
            segment.visible = visibleJoints.has(joint);
            if (segment.visible) visibleCount++;
        });

        this.anomalies.forEach(anomaly => {
            const data = anomaly.userData;
            const joint = Number(data.joint_number || data.joint_22 || data.joint);
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
        btn.innerText = `Range ${this.sortedJoints[minIdx]} -${this.sortedJoints[maxIdx]} (${visibleCount})`;
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

        // Determine status display based on source and match
        let statusColor = 'green';
        let statusText = 'Existing Anomaly';

        if (item.is_uploaded) {
            if (item.is_match) {
                statusColor = 'purple';
                statusText = 'Matched (Recaptured)';
            } else {
                statusColor = 'cyan';
                statusText = 'New (Uploaded)';
            }
        } else {
            // Existing data might have severity
            statusColor = item.status === 'Critical' ? 'red' : item.status === 'Review Required' ? 'orange' : 'green';
        }

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
        <span class="stat-value font-bold text-yellow-400">${item.joint_number || item.joint_22 || item.joint || 'N/A'}</span>
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

    drawMeasurementGuides(data) {
        this.clearMeasurementGuides();
        if (!this.guidesGroup) return;

        const radius = 2.5; // Increased visibility (was 2.2)
        const zAnom = data.dist_22_aligned;

        // Robustly find segment by Distance (ignoring potentially bad joint_number)
        let zStart = zAnom;
        const foundSegment = this.pipeSegments.find(s => {
            const start = s.userData.dist;
            const end = start + s.userData.length;
            return zAnom >= start && zAnom <= end;
        });

        if (foundSegment) {
            zStart = foundSegment.userData.dist;
        } else {
            // Fallback to joint number if spatial lookup fails
            const jointNum = Number(data.joint_number || data.joint_22 || data.joint);
            const segment = this.jointMap.get(jointNum);
            if (segment) zStart = segment.userData.dist;
        }

        // 1. Distance Guide (Thin Cylinder)
        const distLen = Math.abs(zAnom - zStart);
        if (distLen > 0.1) {
            // Use Cylinder for thickness
            const cylGeo = new THREE.CylinderGeometry(0.08, 0.08, distLen, 8);
            const cylMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black
            const distCyl = new THREE.Mesh(cylGeo, cylMat);

            // Align with Z axis (Cylinder is Y-up default)
            distCyl.rotation.x = Math.PI / 2;

            // Position at midpoint
            const zMid = (zStart + zAnom) / 2;
            distCyl.position.set(0, radius, zMid);

            this.guidesGroup.add(distCyl);
        }

        // Distance Label (midpoint)
        const zMid = (zStart + zAnom) / 2;
        const distVal = Math.abs(zAnom - zStart).toFixed(1) + 'ft';
        const distLabel = this.createLabelSprite(distVal, 0x22d3ee);
        distLabel.position.set(0, radius + 0.5, zMid);
        this.guidesGroup.add(distLabel);

        // 2. Angle Guide (Arc from Top to Anomaly)
        let targetAngleDeg = data.orient_22 || 0;
        // In this coordinate system:
        // x = r * cos(theta), y = r * sin(theta)
        // Top (y=Max) corresponds to PI/2 (90 deg).
        // Let's assume standard math conventions: 0 is Right (x=Max), 90 is Top (y=Max).
        // The data likely uses Clock positions or Degrees.
        // If 0 is Top (12 o'clock), then we need offset.
        // Assuming data 'orient_22' is standard degrees (0-360).
        // Let's assume 0 is Top for pipeline data usually.
        // But the previous createAnomalies used: const theta = (item.orient_22 * Math.PI) / 180;
        // const x = radius * Math.cos(theta);
        // If orient=0, x=r, y=0 (Right).
        // If orient=90, x=0, y=r (Top).
        // So 90 is Top.
        // We calculate distance from Top (90).

        const startTheta = Math.PI / 2; // 90 deg (Top)
        const targetTheta = (targetAngleDeg * Math.PI) / 180;

        // Create Arc using TubeGeometry for consistent thickness
        const angleRadius = 4.5; // Push angle guide far out to avoid sphere overlap
        const arcPoints = [];
        const segments = 20;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const theta = startTheta + t * (targetTheta - startTheta);
            const x = angleRadius * Math.cos(theta);
            const y = angleRadius * Math.sin(theta);
            arcPoints.push(new THREE.Vector3(x, y, zAnom));
        }

        const arcCurve = new THREE.CatmullRomCurve3(arcPoints);
        const tubeGeo = new THREE.TubeGeometry(arcCurve, segments, 0.08, 8, false);
        const tubeMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black to match distance line
        const arcTube = new THREE.Mesh(tubeGeo, tubeMat);
        this.guidesGroup.add(arcTube);

        // Add markers to show angle measurement points
        // Start marker (top of pipe - 90 degrees)
        const startX = angleRadius * Math.cos(startTheta);
        const startY = angleRadius * Math.sin(startTheta);
        const startMarkerGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const startMarkerMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee }); // Cyan for start
        const startMarker = new THREE.Mesh(startMarkerGeo, startMarkerMat);
        startMarker.position.set(startX, startY, zAnom);
        this.guidesGroup.add(startMarker);

        // End marker (anomaly position)
        const endX = angleRadius * Math.cos(targetTheta);
        const endY = angleRadius * Math.sin(targetTheta);
        const endMarkerGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const endMarkerMat = new THREE.MeshBasicMaterial({ color: 0xc084fc }); // Purple for end
        const endMarker = new THREE.Mesh(endMarkerGeo, endMarkerMat);
        endMarker.position.set(endX, endY, zAnom);
        this.guidesGroup.add(endMarker);

        // Angle Label (at anomaly position, slightly out)
        const angleVal = targetAngleDeg.toFixed(0) + '°';
        const angleLabel = this.createLabelSprite(angleVal, 0xc084fc);
        const xAnom = angleRadius * Math.cos(targetTheta);
        const yAnom = angleRadius * Math.sin(targetTheta);
        // Push label even further (1.1x the expanded radius)
        angleLabel.position.set(xAnom * 1.1, yAnom * 1.1, zAnom);
        this.guidesGroup.add(angleLabel);
    }

    clearMeasurementGuides() {
        if (!this.guidesGroup) return;
        // Dispose meshes
        while (this.guidesGroup.children.length > 0) {
            const child = this.guidesGroup.children[0];
            this.guidesGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        }
    }

    createLabelSprite(text, colorHex) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256; // Increased for better quality
        canvas.height = 96;

        // Draw dark background with border for contrast
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.roundRect(8, 8, 240, 80, 8);
        ctx.fill();

        // Draw colored border
        ctx.strokeStyle = '#' + new THREE.Color(colorHex).getHexString();
        ctx.lineWidth = 3;
        ctx.roundRect(8, 8, 240, 80, 8);
        ctx.stroke();

        // Draw bright white text for maximum visibility
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 48);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(2.0, 1.0, 1); // Slightly larger for better readability
        return sprite;
    }

    // ==================== FILE UPLOAD FUNCTIONALITY ====================

    setupFileUpload() {
        // API endpoint configuration
        this.uploadApiUrl = 'http://localhost:5000/api';
        this.uploadedData = null;

        // Get DOM elements
        this.fileInput = document.getElementById('file-input');
        this.uploadBox = document.getElementById('upload-box');
        this.uploadStatus = document.getElementById('upload-status');
        this.statusIcon = document.getElementById('status-icon');
        this.statusMessage = document.getElementById('status-message');
        this.statusDetails = document.getElementById('status-details');
        this.uploadProgress = document.getElementById('upload-progress');
        this.progressBar = document.getElementById('progress-bar');
        this.processBtn = document.getElementById('btn-process-upload');

        // Click to browse
        this.uploadBox.addEventListener('click', () => {
            this.fileInput.click();
        });

        // File selection
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Drag and drop
        this.uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadBox.classList.add('border-cyan-500', 'bg-cyan-500/10');
        });

        this.uploadBox.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadBox.classList.remove('border-cyan-500', 'bg-cyan-500/10');
        });

        this.uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadBox.classList.remove('border-cyan-500', 'bg-cyan-500/10');

            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        // Process button
        this.processBtn.addEventListener('click', () => {
            if (this.uploadedData) {
                this.processUploadedData(this.uploadedData);
            }
        });
    }

    async handleFileSelect(file) {
        console.log('File selected:', file.name, file.size, 'bytes');

        // Validate file size (50MB limit)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showUploadStatus('error', 'File too large', `Maximum file size is 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
            return;
        }

        // Validate file type
        const allowedExtensions = ['xlsx', 'xls', 'csv', 'json', 'tsv', 'txt'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            this.showUploadStatus('error', 'Invalid file type', `Supported formats: ${allowedExtensions.join(', ')}`);
            return;
        }

        // Upload file
        await this.uploadFile(file);
    }

    async uploadFile(file) {
        this.showUploadStatus('uploading', 'Uploading file...', file.name);
        this.uploadProgress.classList.remove('hidden');
        this.progressBar.style.width = '0%';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('filter_references', 'true');

        try {
            // Simulate progress (since we can't track actual upload progress easily)
            this.progressBar.style.width = '30%';

            const response = await fetch(`${this.uploadApiUrl}/upload`, {
                method: 'POST',
                body: formData
            });

            this.progressBar.style.width = '70%';

            const result = await response.json();

            this.progressBar.style.width = '100%';

            if (result.success) {
                this.uploadedData = result;
                this.showUploadStatus('success', 'File processed successfully!',
                    `${result.stats.total_rows} rows loaded. Click "Process & Visualize" to view.`);

                // Show process button
                this.processBtn.classList.remove('hidden');

                // Log column mapping
                console.log('Column Mapping:', result.column_mapping);
                if (result.warnings && result.warnings.length > 0) {
                    console.warn('Warnings:', result.warnings);
                }
            } else {
                this.showUploadStatus('error', 'Processing failed', result.error);
                this.uploadedData = null;
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.showUploadStatus('error', 'Upload failed', error.message);
            this.uploadedData = null;
        } finally {
            setTimeout(() => {
                this.uploadProgress.classList.add('hidden');
            }, 1000);
        }
    }

    showUploadStatus(type, message, details = '') {
        this.uploadStatus.classList.remove('hidden');
        this.statusMessage.textContent = message;
        this.statusDetails.textContent = details;

        // Reset classes
        this.uploadStatus.className = 'mb-4 p-4 rounded-xl border';

        // Set icon and colors based on type
        if (type === 'uploading') {
            this.uploadStatus.classList.add('bg-cyan-500/10', 'border-cyan-500/30');
            this.statusMessage.classList.add('text-cyan-400');
            this.statusIcon.innerHTML = `
                <svg class="w-5 h-5 text-cyan-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
            `;
        } else if (type === 'success') {
            this.uploadStatus.classList.add('bg-green-500/10', 'border-green-500/30');
            this.statusMessage.classList.add('text-green-400');
            this.statusIcon.innerHTML = `
                <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            `;
        } else if (type === 'error') {
            this.uploadStatus.classList.add('bg-red-500/10', 'border-red-500/30');
            this.statusMessage.classList.add('text-red-400');
            this.statusIcon.innerHTML = `
                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            `;
        }
    }

    processUploadedData(uploadResult) {
        console.log('Processing uploaded data...', uploadResult.stats);

        // Reset range filters to ensure new data is visible
        const rangeStart = document.getElementById('range-start');
        const rangeEnd = document.getElementById('range-end');
        if (rangeStart) rangeStart.value = '0';
        if (rangeEnd) rangeEnd.value = 'max';

        // Store original data before clearing
        const originalAnomalyData = this.anomalyData ? [...this.anomalyData] : [];
        this.originalAnomalyData = originalAnomalyData; // Persist for comparison

        // Clear existing visualization
        this.clearVisualization();

        // Transform uploaded data
        const AXIAL_TOLERANCE = 5.0; // 5.0 ft tolerance (from matching.py)
        const DEG_TO_FT = 1.0 / 30.0; // 30 degrees approx 1 ft cost

        // 1. First Pass: Identify Matches
        const initialMatches = uploadResult.data.map(row => {
            // Support both 'distance' and 'distance_aligned'
            const distance = row.distance !== undefined ? row.distance : (row.distance_aligned !== undefined ? row.distance_aligned : 0);

            let alignedDist = distance; // Use the determined distance for initial alignment
            let isMatch = false;
            let matchId = null;
            let bestMatch = null;

            // Try to align with existing data
            let jointNum = Number(row.joint_number) || Math.floor(distance / 40); // Use the determined distance for joint number



            // Find candidates in same joint
            const candidates = originalAnomalyData.filter(orig => {
                const origJoint = Number(orig.joint_number || orig.joint_22 || orig.joint);
                return origJoint === jointNum;
            });

            // Find closest candidate using combined cost (Distance + Orientation)
            let minCost = Infinity;
            const rowOrient = row.orientation || 0;

            candidates.forEach(cand => {
                // Axial distance check (Hard Constraint)
                const distDiff = Math.abs(cand.dist_22_aligned - row.distance);
                if (distDiff > AXIAL_TOLERANCE) return;

                // Orientation difference (handling 0-360 wrap)
                const candOrient = cand.orient_22 || 0;
                let orientDiff = Math.abs(candOrient - rowOrient);
                if (orientDiff > 180) orientDiff = 360 - orientDiff;

                // Combined Cost (Euclidean)
                const orientCost = orientDiff * DEG_TO_FT;
                const totalCost = Math.sqrt(distDiff * distDiff + orientCost * orientCost);

                if (totalCost < minCost) {
                    minCost = totalCost;
                    bestMatch = cand;
                }
            });

            if (bestMatch) {
                // ALIGNMENT: Snap to existing position
                alignedDist = bestMatch.dist_22_aligned;
                isMatch = true;
                matchId = bestMatch.id;
            }

            return {
                row,
                isMatch,
                matchId,
                alignedDist,
                bestMatch,
                originalDist: row.distance
            };
        });

        // 2. Calculate Linear Regression for Global Alignment (Scaling + Offset)
        // Model: Existing = m * Uploaded + c
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        let n = 0;

        initialMatches.forEach(item => {
            if (item.isMatch) {
                const x = item.originalDist;
                const y = item.alignedDist; // This is the 'existing' distance we want to match

                sumX += x;
                sumY += y;
                sumXY += x * y;
                sumX2 += x * x;
                n++;
            }
        });

        let m = 1; // Slope (Scaling factor)
        let c = 0; // Intercept (Offset)

        if (n >= 2) {
            // Least squares method
            m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            c = (sumY - m * sumX) / n;
            console.log(`Linear Regression Alignment: y = ${m.toFixed(6)}x + ${c.toFixed(2)} (based on ${n} matches)`);
        } else if (n === 1) {
            // Fallback to simple offset if only one match
            m = 1;
            c = (sumY / n) - (sumX / n);
            console.log(`Single Point Alignment: Offset = ${c.toFixed(2)} ft`);
        } else {
            console.log('No matches found for alignment. Using original distances.');
        }

        // 3. Final Transformation applying Data and Offset
        const transformedData = initialMatches.map(item => {
            const row = item.row;
            // Handle both 'distance' and 'distance_aligned' keys depending on source
            const distVal = row.distance_aligned !== undefined ? row.distance_aligned : (row.distance !== undefined ? row.distance : 0);
            const jointNum = Number(row.joint_number) || Math.floor(distVal / 40);

            // If NOT matched, apply linear regression model
            let finalDist = item.alignedDist;
            if (!item.isMatch) {
                // Apply y = mx + c
                // Use original dist for conversion
                const originalDistVal = row.distance !== undefined ? row.distance : (row.distance_aligned !== undefined ? row.distance_aligned : 0);

                finalDist = (originalDistVal * m) + c;
            }

            // Calculate status using matched data if available, otherwise simplified logic
            let status = 'Normal';
            let growthRate = 0;
            let confidenceLabel = 'Normal';
            let confidenceScore = 0;
            let severityScore = 0;

            if (item.isMatch && item.bestMatch) {
                // Inherit historical data and risk assessment
                growthRate = item.bestMatch.annual_growth_rate || 0;
                status = item.bestMatch.status || this.calculateStatus(row.depth, growthRate);
                confidenceLabel = item.bestMatch.confidence_label || 'Normal';
                confidenceScore = item.bestMatch.confidence_score || 0;
                severityScore = item.bestMatch.severity_score || 0;
            } else {
                // New anomaly - use simplified logic based on depth only
                status = this.calculateStatus(row.depth, 0);
            }

            return {
                // Map to the format expected by createAnomalies()
                dist_22_aligned: finalDist, // Use snapped OR offset distance
                original_distance: row.distance, // Keep original for reference
                orient_22: row.orientation || 0,
                depth_22: row.depth || 0,
                event_type: row.event_type || 'Unknown',
                joint_number: jointNum,
                joint_22: jointNum,
                length: row.length || 0,
                width: row.width || 0,
                year: row.year || new Date().getFullYear(),
                comments: row.comments || '',
                status: status,
                confidence_label: confidenceLabel,
                confidence_score: confidenceScore,
                severity_score: severityScore,
                is_match: item.isMatch,
                matched_with: item.matchId,
                annual_growth_rate: growthRate,
                is_uploaded: true,
                global_offset_applied: c
            };


        });

        // Update anomaly data
        this.anomalyData = transformedData;
        this.uploadedAnomalyData = transformedData; // Store for comparison
        this.originalAnomalyData = originalAnomalyData; // Store original for comparison

        // Generate reference data (joints) from the uploaded data
        this.generateReferenceData();

        // Recreate visualization
        this.createPipeline();
        this.createAnomalies();
        this.populateJointList();
        this.populateCriticalZones();

        // Create joint comparison UI
        console.log('Creating Joint Comparison UI...');
        this.createJointComparison(originalAnomalyData, transformedData);

        // Hide process button, show success message
        this.processBtn.classList.add('hidden');

        // Show Predict Button
        const predictBtn = document.getElementById('btn-predict');
        if (predictBtn) predictBtn.classList.remove('hidden');

        this.showUploadStatus('success', 'Data visualized!',
            `Showing ${transformedData.length} anomalies across the pipeline.`);

        console.log('✓ Uploaded data processed and visualized');
    }

    createJointComparison(originalData, uploadedData) {
        // Use the transformed data that has correct field names (dist_22_aligned, orient_22)
        const uploadedTransformed = this.uploadedAnomalyData || uploadedData;
        const originalTransformed = this.originalAnomalyData || originalData;

        // Get unique joints from both datasets
        const uploadedJoints = new Set(uploadedTransformed.map(a => a.joint_number || a.joint_22));
        const originalJoints = new Set(originalTransformed.map(a => a.joint_number || a.joint_22 || a.joint));

        // Combine all joints
        const allJoints = new Set([...uploadedJoints, ...originalJoints]);
        const sortedJoints = Array.from(allJoints).sort((a, b) => a - b);

        if (sortedJoints.length === 0) {
            console.log('No joints to compare');
            return;
        }

        // Show comparison panel
        const comparisonPanel = document.getElementById('joint-comparison');
        const jointButtonsContainer = document.getElementById('joint-buttons');

        comparisonPanel.classList.remove('hidden');
        console.log('Comparison Panel unhidden. Container:', jointButtonsContainer);
        jointButtonsContainer.innerHTML = '';

        // Create button for each joint
        sortedJoints.forEach(jointNum => {
            const uploadedCount = uploadedData.filter(a =>
                (a.joint_number || a.joint_22) === jointNum
            ).length;

            const originalCount = originalData.filter(a =>
                (a.joint_number || a.joint_22 || a.joint) === jointNum
            ).length;

            const button = document.createElement('button');
            button.className = 'bg-slate-700/50 hover:bg-slate-600/70 p-3 rounded-lg border border-white/10 transition-all text-left group';

            button.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-bold text-cyan-400 group-hover:text-cyan-300">Joint ${jointNum}</span>
                    ${uploadedCount > 0 && originalCount > 0 ? '<span class="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">BOTH</span>' : ''}
                </div>
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-[10px]">
                        <span class="text-slate-400">Uploaded:</span>
                        <span class="font-mono font-bold ${uploadedCount > 0 ? 'text-cyan-400' : 'text-slate-600'}">${uploadedCount}</span>
                    </div>
                    <div class="flex items-center justify-between text-[10px]">
                        <span class="text-slate-400">Existing:</span>
                        <span class="font-mono font-bold ${originalCount > 0 ? 'text-green-400' : 'text-slate-600'}">${originalCount}</span>
                    </div>
                </div>
            `;

            button.onclick = () => this.showJointComparison(jointNum, originalTransformed, uploadedTransformed);
            jointButtonsContainer.appendChild(button);
        });

        console.log(`Created comparison for ${sortedJoints.length} joints`);
    }

    showJointComparison(jointNum, originalData, uploadedData) {
        console.log(`Showing comparison for joint ${jointNum}`);

        // Create explicit neighborhood range
        const range = 2; // +/- 2 joints (Total 5 joints)
        const minJoint = jointNum - range;
        const maxJoint = jointNum + range;

        console.log(`Showing neighborhood for joint ${jointNum} (Range: ${minJoint}-${maxJoint})`);

        // Get anomalies for this neighborhood
        const uploadedAnomalies = uploadedData.filter(a => {
            const j = a.joint_number || a.joint_22;
            return j >= minJoint && j <= maxJoint;
        });

        const originalAnomalies = originalData.filter(a => {
            const j = a.joint_number || a.joint_22 || a.joint;
            return j >= minJoint && j <= maxJoint;
        });

        // Combine both datasets for visualization
        const combinedData = [
            ...originalAnomalies.map(a => ({ ...a, is_uploaded: false })),
            ...uploadedAnomalies.map(a => ({ ...a, is_uploaded: true }))
        ];

        // Update visualization to show both
        this.anomalyData = combinedData;

        console.log(`Joint ${jointNum} comparison:`, {
            uploaded: uploadedAnomalies.length,
            existing: originalAnomalies.length,
            total: combinedData.length
        });

        // Clear visualization
        this.clearVisualization();

        // MANUALLY GENERATE REFERENCE DATA (PIPE JOINTS)
        // This ensures the pipe exists even if there are no anomalies on neighbors
        // Find the distance of our center joint to anchor the neighborhood
        let centerDist = 0;

        // Try to find center distance from any available data
        const centerAnomaly = [...originalData, ...uploadedData].find(a =>
            (a.joint_number || a.joint_22 || a.joint) === jointNum
        );

        if (centerAnomaly) {
            centerDist = centerAnomaly.dist_22_aligned || centerAnomaly.distance || centerAnomaly.dist_22 || 0;
        }

        // Generate joints
        const neigborJoints = [];
        for (let j = minJoint; j <= maxJoint; j++) {
            // Estimate distance: centerDist + (diff * 40)
            const diff = j - jointNum;
            const dist = centerDist + (diff * 40);

            neigborJoints.push({
                joint: j,
                dist_22: dist - 20, // Center pipe
                dist: dist - 20,
                type: 'Girth Weld'
            });
        }

        this.referenceData = neigborJoints;
        console.log('Manually generated reference joints for neighborhood:', this.referenceData);

        // Recreate Pipeline using our manual references
        // Important: Skip generateReferenceData() call since we just did it manually
        console.log('Creating pipeline for comparison...');
        this.createPipeline();
        console.log(`Pipeline created: ${this.pipeSegments.length} segments`);

        this.createAnomaliesWithComparison();
        console.log(`Anomalies created: ${this.anomalies.length} anomalies`);

        // Make everything visible
        this.anomalies.forEach(mesh => mesh.visible = true);
        this.pipeSegments.forEach(seg => seg.visible = true);
        this.scene.children.forEach(c => {
            if (c.userData.type === 'WeldSeam') c.visible = true;
        });

        // Focus on the center joint
        // Find the object corresponding to the center joint in our new segments
        const centerSegment = this.pipeSegments.find(s => s.userData.joint === jointNum);
        if (centerSegment) {
            this.jumpTo(centerSegment.userData);
            this.highlightSegment(centerSegment);
        }

        // Show info panel
        this.showJointComparisonInfo(jointNum, originalAnomalies, uploadedAnomalies);
    }

    createAnomaliesWithComparison() {
        console.log('Creating anomalies with comparison colors...', this.anomalyData.length);

        const pipeRadius = 2.0;
        const patchRadius = 2.05;

        this.anomalyData.forEach(item => {
            // Handle both uploaded and existing data formats
            const z = item.dist_22_aligned || item.distance || item.dist_22 || 0;
            const orientation = item.orient_22 || item.orientation || 0;
            const theta = (orientation * Math.PI) / 180;

            const x = patchRadius * Math.cos(theta);
            const y = patchRadius * Math.sin(theta);

            // Color based on source and match status:
            // - Cyan: New/Unmatched uploaded data
            // - Purple: Matched/Recaptured uploaded data
            // - Green: Existing data
            let color = 0x22c55e; // green (existing)
            if (item.is_uploaded) {
                if (item.is_match) {
                    color = 0xa855f7; // purple (matched/recaptured)
                } else {
                    color = 0x22d3ee; // cyan (new/unmatched)
                }
            }

            const depthScale = Math.max(0.3, Math.min(1.5, item.depth_22 / 40));
            const patchSize = depthScale;
            // Create 3D sphere using SphereGeometry
            // depthScale controls radius
            const geo = new THREE.SphereGeometry(patchSize * 0.8, 16, 16); // Slightly adjust scale for 3D volume
            const mat = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.3,
                metalness: 0.2,
                transparent: true,
                opacity: 0.9,
            });
            const mesh = new THREE.Mesh(geo, mat);

            // Position on pipe surface (radius + sphere radius so it sits ON top)
            const surfaceRadius = 2.0; // Pipe radius
            const sphereRadius = patchSize * 0.8;

            // Re-calculate position to be ON the surface
            const bubbleRadius = surfaceRadius;

            const x3d = bubbleRadius * Math.cos(theta);
            const y3d = bubbleRadius * Math.sin(theta);

            mesh.position.set(x3d, y3d, z);

            // No need to lookAt for spheres

            mesh.userData = item;
            mesh.visible = true; // Start visible in comparison mode
            this.scene.add(mesh);
            this.anomalies.push(mesh);

            // Populate joint map
            const jointNum = Number(item.joint_number || item.joint_22 || item.joint);
            if (!this.jointAnomalyMap.has(jointNum)) {
                this.jointAnomalyMap.set(jointNum, []);
            }
            this.jointAnomalyMap.get(jointNum).push(item);
        });
    }

    showJointComparisonInfo(jointNum, originalAnomalies, uploadedAnomalies) {
        const infoPanel = document.getElementById('anomaly-info');
        if (!infoPanel) return;

        const totalOriginal = originalAnomalies.length;
        const totalUploaded = uploadedAnomalies.length;

        infoPanel.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 class="text-sm font-bold text-cyan-400">Joint ${jointNum} Comparison</h3>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                        <div class="text-[10px] text-cyan-400 uppercase mb-1">Uploaded</div>
                        <div class="text-2xl font-bold text-cyan-300">${totalUploaded}</div>
                        <div class="text-[9px] text-slate-400 mt-1">New anomalies</div>
                    </div>
                    
                    <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <div class="text-[10px] text-green-400 uppercase mb-1">Existing</div>
                        <div class="text-2xl font-bold text-green-300">${totalOriginal}</div>
                        <div class="text-[9px] text-slate-400 mt-1">From database</div>
                    </div>
                </div>

                <div class="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                    <div class="text-[10px] text-slate-400 uppercase mb-2">Legend</div>
                    <div class="space-y-1.5">
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded-full bg-purple-500"></div>
                            <span class="text-xs text-slate-300">Matched (Recaptured)</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded-full bg-cyan-400"></div>
                            <span class="text-xs text-slate-300">New (Uploaded Only)</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded-full bg-green-500"></div>
                            <span class="text-xs text-slate-300">Existing Data</span>
                        </div>
                    </div>
                </div>

                ${totalUploaded > 0 && totalOriginal > 0 ? `
                    <div class="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 text-center">
                        <div class="text-[10px] text-purple-400">
                            ✓ ${uploadedData.filter(d => d.is_match).length} Matched Anomalies
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }


    calculateStatus(depth, growthRate) {
        // Determine status based on depth and growth rate
        if (depth >= 80 || growthRate >= 5 || (depth >= 60 && growthRate >= 2)) {
            return 'Critical';
        } else if (depth >= 40 || growthRate >= 2) {
            return 'Review Required';
        }
        return 'Normal';
    }

    generateReferenceData() {
        // Generate reference points (joints) - works for BOTH original and uploaded data
        if (!this.anomalyData || this.anomalyData.length === 0) {
            this.referenceData = [];
            return;
        }

        // Detect if we should use actual joint numbers or calculate from distance
        // Original data: joint ≈ distance/40 (e.g., joint 12230 at distance 489200ft)
        // Uploaded data: joint is identifier (e.g., joint 75 at distance 125ft)
        const sample = this.anomalyData.find(a => {
            const joint = a.joint_number || a.joint_22 || a.joint;
            const dist = a.dist_22_aligned || a.distance || a.dist_22;
            return joint != null && dist != null;
        });

        let useActualJoints = false;
        if (sample) {
            const joint = sample.joint_number || sample.joint_22 || sample.joint;
            const dist = sample.dist_22_aligned || sample.distance || sample.dist_22;
            const calculatedJoint = Math.floor(dist / 40);
            // If joint number differs significantly from dist/40, use actual joint numbers
            useActualJoints = Math.abs(joint - calculatedJoint) > 10;
        }

        if (useActualJoints) {
            console.log('Mode: Using ACTUAL joint numbers from upload');
            // UPLOADED DATA MODE: Use actual joint numbers
            const jointDistances = new Map();

            this.anomalyData.forEach(a => {
                const jointNum = a.joint_number || a.joint_22 || a.joint;
                const dist = a.dist_22_aligned || a.distance || a.dist_22;

                if (jointNum != null && dist != null) {
                    if (!jointDistances.has(jointNum)) {
                        jointDistances.set(jointNum, []);
                    }


                    jointDistances.get(jointNum).push(dist);
                }
            });

            const joints = [];
            jointDistances.forEach((distances, jointNum) => {
                const avgDist = distances.reduce((sum, d) => sum + d, 0) / distances.length;
                joints.push({
                    type: 'Girth Weld',
                    dist_22: avgDist - 20, // Center the pipe on the anomalies
                    dist: avgDist - 20,
                    joint: jointNum
                });
            });

            joints.sort((a, b) => a.dist_22 - b.dist_22);
            this.referenceData = joints;
            console.log(`✓ Generated ${joints.length} joints from ACTUAL joint numbers (uploaded data)`);

        } else {
            // ORIGINAL DATA MODE: Calculate joints at 40ft intervals
            const distances = this.anomalyData.map(a => a.dist_22_aligned || a.distance || a.dist_22).filter(d => d != null);
            const minDist = Math.min(...distances);
            const maxDist = Math.max(...distances);

            const jointLength = 40;
            const joints = [];

            for (let dist = Math.floor(minDist / jointLength) * jointLength; dist <= maxDist; dist += jointLength) {
                joints.push({
                    type: 'Girth Weld',
                    dist_22: dist - 20, // Shift back 20ft to center on anomalies
                    dist: dist - 20,
                    joint: Math.floor(dist / jointLength)
                });
            }

            this.referenceData = joints;
            console.log(`✓ Generated ${joints.length} joints at 40ft intervals (original data)`);
        }
    }

    clearVisualization() {
        // Clear existing 3D objects
        this.anomalies.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        });
        this.anomalies = [];

        this.pipeSegments.forEach(segment => {
            this.scene.remove(segment);
            if (segment.geometry) segment.geometry.dispose();
            if (segment.material) segment.material.dispose();
        });
        this.pipeSegments = [];

        this.featureMarkers.forEach(marker => {
            this.scene.remove(marker);
            if (marker.geometry) marker.geometry.dispose();
            if (marker.material) marker.material.dispose();
        });
        this.featureMarkers = [];

        // Clear maps
        this.jointMap.clear();
        this.jointAnomalyMap.clear();

        // Remove labels
        this.removeJointLabels();

        console.log('Visualization cleared');
    }

    async loadDemoData() {
        if (this.isUploading) return;
        this.isUploading = true;

        this.showUploadStatus('loading', 'Loading Demo Data...', 'This will simulate a fresh upload.');
        this.processBtn.classList.add('hidden');
        document.getElementById('upload-progress').classList.remove('hidden');
        document.getElementById('progress-bar').style.width = '50%';

        try {
            const response = await fetch('http://localhost:5000/api/load_demo', {
                method: 'POST'
            });

            const result = await response.json();

            document.getElementById('progress-bar').style.width = '100%';

            if (result.success) {
                // Success!
                this.uploadedData = result; // Store for processing step
                this.showUploadStatus('success', 'Demo Loaded!', `Found ${result.stats.total_rows} rows.`);
                this.processBtn.classList.remove('hidden');
            } else {
                throw new Error(result.error || 'Failed to load demo data');
            }

        } catch (error) {
            console.error('Demo load error:', error);
            this.showUploadStatus('error', 'Load Failed', error.message);
        } finally {
            this.isUploading = false;
        }
    }

    async predictFuture() {
        if (this.isPredicting) return;
        this.isPredicting = true;

        const btn = document.getElementById('btn-predict');
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Running AI Prediction...
        `;

        try {
            console.log("Requesting prediction for 7 years ahead...");
            const response = await fetch('http://localhost:5000/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ years: 7 })
            });

            if (!response.ok) throw new Error("Prediction API failed");

            const predictions = await response.json();
            console.log(`Received ${predictions.length} predictions`);

            // Visualize predictions
            this.visualizePredictions(predictions);

            this.addMessage('system', 'Global AI Prediction complete. Showing projected anomalies for 2029 (Purple).');

        } catch (e) {
            console.error(e);
            alert('Prediction failed: ' + e.message);
        } finally {
            this.isPredicting = false;
            btn.innerHTML = originalText;
            btn.disabled = true; // Disable after run to avoid double press
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            btn.innerHTML = 'Predicted (2029)';
        }
    }

    visualizePredictions(predictions) {
        // Create new group for predictions
        if (!this.predictionsGroup) {
            this.predictionsGroup = new THREE.Group();
            this.scene.add(this.predictionsGroup);
        } else {
            this.predictionsGroup.clear();
        }

        // HIDE ORIGINAL ANOMALIES to make predictions stand out
        this.anomalies.forEach(mesh => {
            if (mesh.userData.type !== 'prediction') {
                mesh.visible = false;
            }
        });

        // Make prediction spheres LARGER and more prominent
        const geometry = new THREE.SphereGeometry(2.0, 32, 32); // Increased from 1.2 to 2.0, higher quality

        // Materials based on severity - brighter and more emissive
        const matNormal = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            emissive: 0x3b82f6,
            emissiveIntensity: 0.5,
            roughness: 0.2,
            metalness: 0.8
        }); // Blue
        const matHigh = new THREE.MeshStandardMaterial({
            color: 0x60a5fa,
            emissive: 0x60a5fa,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.8
        }); // Light Blue
        const matCritical = new THREE.MeshStandardMaterial({
            color: 0x93c5fd,
            emissive: 0x93c5fd,
            emissiveIntensity: 0.7,
            roughness: 0.2,
            metalness: 0.8
        }); // Lighter Blue

        let firstPrediction = null;

        predictions.forEach((p, index) => {
            let material = matNormal;
            if (p.status === 'High Risk') material = matHigh;
            if (p.status === 'Critical') material = matCritical;

            const mesh = new THREE.Mesh(geometry, material);

            const z = p.dist_22_aligned;
            const orientation = p.orient_22 || 0;
            const theta = (orientation * Math.PI) / 180;

            const pipeRadius = 2.0; // Pipe radius
            const bubbleRadius = 2.3; // Further from surface for visibility

            const x = bubbleRadius * Math.cos(theta);
            const y = bubbleRadius * Math.sin(theta);

            mesh.position.set(x, y, z);

            // User Data
            mesh.userData = {
                ...p,
                type: 'prediction',
                year: 2029
            };

            this.predictionsGroup.add(mesh);
            this.anomalies.push(mesh);

            // Store first prediction for camera focus
            if (index === 0) {
                firstPrediction = mesh;
            }
        });

        console.log(`Rendered ${predictions.length} predictions in 3D`);

        // AUTO-FOCUS on first prediction
        if (firstPrediction) {
            this.jumpTo(firstPrediction.userData);
            console.log('Camera focused on first prediction');
        }

        // Store predictions for navigation
        this.predictions = predictions;
        this.currentPredictionIndex = 0;

        // Show navigation controls
        const navPanel = document.getElementById('prediction-nav');
        if (navPanel) navPanel.classList.remove('hidden');

        // Update counter
        this.updatePredictionCounter();

        // Update info panel to show prediction count
        this.showPredictionInfo(predictions);
    }

    navigatePrediction(direction) {
        if (!this.predictions || this.predictions.length === 0) return;

        // Update index with wrapping
        this.currentPredictionIndex += direction;
        if (this.currentPredictionIndex < 0) {
            this.currentPredictionIndex = this.predictions.length - 1;
        } else if (this.currentPredictionIndex >= this.predictions.length) {
            this.currentPredictionIndex = 0;
        }

        // Update counter display
        this.updatePredictionCounter();

        // Focus on current prediction
        const currentPrediction = this.predictions[this.currentPredictionIndex];
        this.jumpTo(currentPrediction);

        // Update info panel with current prediction details
        this.showCurrentPredictionInfo(currentPrediction);
    }

    updatePredictionCounter() {
        const counter = document.getElementById('prediction-counter');
        if (counter && this.predictions) {
            counter.textContent = `${this.currentPredictionIndex + 1} / ${this.predictions.length}`;
        }
    }

    showCurrentPredictionInfo(prediction) {
        const infoPanel = document.getElementById('anomaly-info');
        if (!infoPanel) return;

        const depth = prediction.depth_22 || prediction.predicted_depth || 0;
        const originalDepth = prediction.original_depth || 0;
        const growthRate = prediction.predicted_growth_rate || 0;
        const status = prediction.status || 'Active';

        // Color based on status
        let statusColor = 'blue-400';
        let statusBg = 'blue-500/10';
        let statusBorder = 'blue-500/30';
        if (status === 'High Risk') {
            statusColor = 'blue-300';
            statusBg = 'blue-400/10';
            statusBorder = 'blue-400/30';
        } else if (status === 'Critical') {
            statusColor = 'blue-200';
            statusBg = 'blue-300/10';
            statusBorder = 'blue-300/30';
        }

        infoPanel.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 class="text-sm font-bold text-blue-400">Prediction #${this.currentPredictionIndex + 1}</h3>
                    <span class="text-xs px-2 py-1 rounded bg-${statusBg} border border-${statusBorder} text-${statusColor}">${status}</span>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-slate-800/50 rounded-lg p-2">
                        <div class="text-[9px] text-slate-400 uppercase mb-1">Current (2022)</div>
                        <div class="text-lg font-bold text-slate-300">${originalDepth.toFixed(1)}%</div>
                    </div>
                    
                    <div class="bg-blue-500/10 rounded-lg p-2">
                        <div class="text-[9px] text-blue-400 uppercase mb-1">Predicted (2029)</div>
                        <div class="text-lg font-bold text-blue-300">${depth.toFixed(1)}%</div>
                    </div>
                </div>

                <div class="bg-slate-800/50 rounded-lg p-3">
                    <div class="text-[10px] text-slate-400 uppercase mb-2">Details</div>
                    <div class="space-y-1.5 text-xs">
                        <div class="flex justify-between">
                            <span class="text-slate-400">Growth Rate:</span>
                            <span class="text-blue-300 font-mono">${growthRate.toFixed(2)}% / year</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">Distance:</span>
                            <span class="text-slate-300 font-mono">${(prediction.dist_22_aligned || 0).toFixed(1)} ft</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">Orientation:</span>
                            <span class="text-slate-300 font-mono">${(prediction.orient_22 || 0).toFixed(0)}°</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">Joint:</span>
                            <span class="text-slate-300 font-mono">#${prediction.joint_number || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showPredictionInfo(predictions) {
        const infoPanel = document.getElementById('anomaly-info');
        if (!infoPanel) return;

        // Count by severity
        const normalCount = predictions.filter(p => p.status === 'Active').length;
        const highRiskCount = predictions.filter(p => p.status === 'High Risk').length;
        const criticalCount = predictions.filter(p => p.status === 'Critical').length;

        infoPanel.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 class="text-sm font-bold text-blue-400">2029 Predictions</h3>
                    <span class="text-xs text-slate-400">${predictions.length} total</span>
                </div>
                
                <div class="grid grid-cols-3 gap-2">
                    <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                        <div class="text-[9px] text-blue-400 uppercase mb-1">Normal</div>
                        <div class="text-xl font-bold text-blue-300">${normalCount}</div>
                    </div>
                    
                    <div class="bg-blue-400/10 border border-blue-400/30 rounded-lg p-2">
                        <div class="text-[9px] text-blue-300 uppercase mb-1">High Risk</div>
                        <div class="text-xl font-bold text-blue-200">${highRiskCount}</div>
                    </div>
                    
                    <div class="bg-blue-300/10 border border-blue-300/30 rounded-lg p-2">
                        <div class="text-[9px] text-blue-200 uppercase mb-1">Critical</div>
                        <div class="text-xl font-bold text-blue-100">${criticalCount}</div>
                    </div>
                </div>

                <div class="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                    <div class="text-[10px] text-slate-400 uppercase mb-2">Legend</div>
                    <div class="space-y-1.5">
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span class="text-xs text-slate-300">Normal Growth</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded-full bg-blue-400"></div>
                            <span class="text-xs text-slate-300">High Risk (50-80%)</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded-full bg-blue-300"></div>
                            <span class="text-xs text-slate-300">Critical (≥80%)</span>
                        </div>
                    </div>
                </div>

                <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-center">
                    <div class="text-[10px] text-blue-400">
                        ℹ️ Original anomalies hidden for clarity
                    </div>
                </div>
            </div>
        `;
    }
}


new PipelineViewer();
