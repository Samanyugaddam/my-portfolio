/**
 * Enhanced Portfolio JavaScript
 * Advanced 3D Space-themed Portfolio with Interactive Features
 * Author: Samanyu Gaddam
 */

// ================================================
// Global Variables & Configuration
// ================================================

// Three.js Scene Objects
let scene, camera, renderer, stars, satellites, earth, nebula;
let mouse = { x: 0, y: 0 };
let mouseTarget = { x: 0, y: 0 };
let windowHalf = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

// Animation Control
let animationId;
let isLoaded = false;
let isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Scroll Control
let lastScrollY = 0;
let scrollDirection = 'down';
let isScrolling = false;

// Performance Monitoring
let frameCount = 0;
let lastTime = performance.now();
let fps = 60;

// Interactive Elements
const interactiveElements = new Map();
const animatedElements = new Set();

// Configuration
const CONFIG = {
    // Three.js Settings
    scene: {
        starCount: 5000,
        satelliteCount: 8,
        nebulaParticles: 2000,
        cameraSpeed: 0.02,
        rotationSpeed: 0.001
    },
    
    // Animation Settings
    animation: {
        duration: 800,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        staggerDelay: 100
    },
    
    // Performance Settings
    performance: {
        minFPS: 30,
        adaptiveQuality: true,
        throttleDelay: 16
    },
    
    // Map Settings
    map: {
        lat: 30.3165,
        lng: 78.0322,
        zoom: 12,
        style: 'dark'
    }
};

// ================================================
// Utility Functions
// ================================================

/**
 * Debounce function to limit function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function for performance optimization
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Linear interpolation
 */
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

/**
 * Map value from one range to another
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/**
 * Random number generator with seed
 */
function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

/**
 * Check if element is in viewport
 */
function isInViewport(element, threshold = 0.1) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    return (
        rect.top <= windowHeight * (1 - threshold) &&
        rect.bottom >= windowHeight * threshold
    );
}

/**
 * Smooth scroll to element
 */
function scrollToSection(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const targetPosition = target.offsetTop - 80;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = Math.min(Math.abs(distance) * 0.5, 1200);
    let start = null;

    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const percentage = Math.min(progress / duration, 1);
        
        // Easing function
        const ease = percentage < 0.5
            ? 4 * percentage * percentage * percentage
            : (percentage - 1) * (2 * percentage - 2) * (2 * percentage - 2) + 1;
        
        window.scrollTo(0, startPosition + distance * ease);
        
        if (progress < duration) {
            requestAnimationFrame(step);
        }
    }
    
    requestAnimationFrame(step);
}

/**
 * Generate random color from space palette
 */
function getSpaceColor() {
    const colors = [
        '#00d4ff', '#0099cc', '#4ecdc4', '#ff6b6b', 
        '#a8e6cf', '#ffd93d', '#6bcf7e', '#4a90e2'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ================================================
// Preloader & Initial Setup
// ================================================

/**
 * Initialize preloader with advanced animations
 */
function initPreloader() {
    const preloader = document.getElementById('preloader');
    const progressBar = document.querySelector('.loading-progress');
    const percentage = document.querySelector('.loading-percentage');
    const satellite = document.querySelector('.satellite-container');
    
    let progress = 0;
    const totalAssets = 10; // Simulated asset count
    let loadedAssets = 0;
    
    // Simulate asset loading
    const loadInterval = setInterval(() => {
        loadedAssets += Math.random() * 2;
        progress = Math.min((loadedAssets / totalAssets) * 100, 100);
        
        progressBar.style.width = progress + '%';
        percentage.textContent = Math.floor(progress) + '%';
        
        // Add some dynamic effects
        if (satellite) {
            satellite.style.transform = `translate(-50%, -50%) rotate(${progress * 3.6}deg)`;
        }
        
        if (progress >= 100) {
            clearInterval(loadInterval);
            setTimeout(hidePreloader, 500);
        }
    }, 100);
    
    // Add keyboard skip option
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            clearInterval(loadInterval);
            hidePreloader();
        }
    });
}

/**
 * Hide preloader with smooth transition
 */
function hidePreloader() {
    const preloader = document.getElementById('preloader');
    
    preloader.style.opacity = '0';
    preloader.style.transform = 'scale(1.1)';
    
    setTimeout(() => {
        preloader.style.display = 'none';
        isLoaded = true;
        initializeApp();
    }, 500);
}

// ================================================
// Three.js 3D Scene Setup
// ================================================

/**
 * Initialize Three.js scene with space environment
 */
function initThreeJS() {
    if (isReducedMotion) {
        createStaticBackground();
        return;
    }
    
    // Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0a, 50, 1000);
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        2000
    );
    camera.position.set(0, 0, 50);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('three-canvas'),
        antialias: !isMobile(),
        alpha: true,
        powerPreference: "high-performance"
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0a, 1);
    
    // Enable extensions for better performance
    if (renderer.capabilities.isWebGL2) {
        renderer.capabilities.precision = 'highp';
    }
    
    // Create scene elements
    createStarField();
    createSatellites();
    createEarth();
    createNebula();
    createAsteroidBelt();
    
    // Start animation loop
    animate();
    
    // Add event listeners
    addThreeJSEventListeners();
}

/**
 * Create animated star field
 */
function createStarField() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });
    
    const starVertices = [];
    const starColors = [];
    const starSizes = [];
    
    for (let i = 0; i < CONFIG.scene.starCount; i++) {
        // Position
        const radius = Math.random() * 1000 + 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        starVertices.push(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi)
        );
        
        // Color variation
        const color = new THREE.Color();
        const colorVariants = [0xffffff, 0x00d4ff, 0xff6b6b, 0x4ecdc4];
        color.setHex(colorVariants[Math.floor(Math.random() * colorVariants.length)]);
        starColors.push(color.r, color.g, color.b);
        
        // Size variation
        starSizes.push(Math.random() * 3 + 1);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    
    starMaterial.vertexColors = true;
    
    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

/**
 * Create animated satellites
 */
function createSatellites() {
    satellites = new THREE.Group();
    
    for (let i = 0; i < CONFIG.scene.satelliteCount; i++) {
        const satelliteGroup = new THREE.Group();
        
        // Main body
        const bodyGeometry = new THREE.BoxGeometry(3, 1.5, 1.5);
        const bodyMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Solar panels
        const panelGeometry = new THREE.PlaneGeometry(6, 2);
        const panelMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x4169e1,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const panel1 = new THREE.Mesh(panelGeometry, panelMaterial);
        const panel2 = new THREE.Mesh(panelGeometry, panelMaterial);
        
        panel1.position.set(-4, 0, 0);
        panel2.position.set(4, 0, 0);
        
        // Antenna
        const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
        const antennaMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(0, 2, 0);
        
        // Communication dish
        const dishGeometry = new THREE.ConeGeometry(1, 0.5, 8);
        const dishMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
        const dish = new THREE.Mesh(dishGeometry, dishMaterial);
        dish.position.set(2, 1, 0);
        dish.rotation.z = Math.PI;
        
        satelliteGroup.add(body, panel1, panel2, antenna, dish);
        
        // Random position in orbit
        const distance = 80 + Math.random() * 100;
        const angle = (i / CONFIG.scene.satelliteCount) * Math.PI * 2;
        satelliteGroup.position.set(
            Math.cos(angle) * distance,
            (Math.random() - 0.5) * 50,
            Math.sin(angle) * distance
        );
        
        // Store animation data
        satelliteGroup.userData = {
            orbitSpeed: 0.001 + Math.random() * 0.002,
            rotationSpeed: 0.01 + Math.random() * 0.02,
            orbitRadius: distance,
            orbitAngle: angle,
            bobSpeed: 0.5 + Math.random() * 0.5,
            bobAmplitude: 2 + Math.random() * 3
        };
        
        satellites.add(satelliteGroup);
    }
    
    scene.add(satellites);
}

/**
 * Create Earth with atmosphere
 */
function createEarth() {
    const earthGroup = new THREE.Group();
    
    // Earth sphere
    const earthGeometry = new THREE.SphereGeometry(20, 64, 64);
    const earthMaterial = new THREE.MeshBasicMaterial({
        color: 0x1e40af,
        transparent: true,
        opacity: 0.4,
        wireframe: true
    });
    
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    
    // Atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(22, 32, 32);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x4ecdc4,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });
    
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    
    earthGroup.add(earthMesh, atmosphere);
    earthGroup.position.set(-150, -80, -200);
    
    earth = earthGroup;
    scene.add(earth);
}

/**
 * Create nebula particle system
 */
function createNebula() {
    const nebulaGeometry = new THREE.BufferGeometry();
    const nebulaMaterial = new THREE.PointsMaterial({
        color: 0xff6b6b,
        size: 5,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    
    const nebulaVertices = [];
    const nebulaColors = [];
    
    for (let i = 0; i < CONFIG.scene.nebulaParticles; i++) {
        nebulaVertices.push(
            (Math.random() - 0.5) * 500,
            (Math.random() - 0.5) * 200,
            (Math.random() - 0.5) * 500
        );
        
        const color = new THREE.Color();
        color.setHSL(Math.random() * 0.3 + 0.8, 0.7, 0.5);
        nebulaColors.push(color.r, color.g, color.b);
    }
    
    nebulaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nebulaVertices, 3));
    nebulaGeometry.setAttribute('color', new THREE.Float32BufferAttribute(nebulaColors, 3));
    
    nebulaMaterial.vertexColors = true;
    
    nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
    nebula.position.set(200, 100, -300);
    scene.add(nebula);
}

/**
 * Create asteroid belt
 */
function createAsteroidBelt() {
    const asteroidGroup = new THREE.Group();
    
    for (let i = 0; i < 50; i++) {
        const size = Math.random() * 2 + 0.5;
        const asteroidGeometry = new THREE.DodecahedronGeometry(size);
        const asteroidMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.1, 0.3, 0.3),
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });
        
        const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        
        const distance = 200 + Math.random() * 100;
        const angle = Math.random() * Math.PI * 2;
        
        asteroid.position.set(
            Math.cos(angle) * distance,
            (Math.random() - 0.5) * 20,
            Math.sin(angle) * distance
        );
        
        asteroid.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        asteroid.userData = {
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            orbitSpeed: 0.0005 + Math.random() * 0.001
        };
        
        asteroidGroup.add(asteroid);
    }
    
    scene.add(asteroidGroup);
    asteroidGroup.name = 'asteroidBelt';
}

/**
 * Three.js animation loop
 */
function animate() {
    if (!isLoaded || isReducedMotion) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    
    // FPS monitoring
    frameCount++;
    if (deltaTime >= 1000) {
        fps = Math.round((frameCount * 1000) / deltaTime);
        frameCount = 0;
        lastTime = currentTime;
        
        // Adaptive quality based on performance
        if (CONFIG.performance.adaptiveQuality) {
            adaptRenderQuality();
        }
    }
    
    updateScene();
    
    animationId = requestAnimationFrame(animate);
}

/**
 * Update all scene elements
 */
function updateScene() {
    const time = Date.now() * 0.001;
    
    // Update camera position based on mouse
    if (camera) {
        mouseTarget.x = lerp(mouseTarget.x, mouse.x, 0.05);
        mouseTarget.y = lerp(mouseTarget.y, mouse.y, 0.05);
        
        camera.position.x += (mouseTarget.x * 10 - camera.position.x) * CONFIG.scene.cameraSpeed;
        camera.position.y += (-mouseTarget.y * 10 - camera.position.y) * CONFIG.scene.cameraSpeed;
        camera.lookAt(scene.position);
    }
    
    // Rotate star field
    if (stars) {
        stars.rotation.y += CONFIG.scene.rotationSpeed;
        stars.rotation.x += CONFIG.scene.rotationSpeed * 0.5;
    }
    
    // Animate satellites
    if (satellites) {
        satellites.children.forEach((satellite, index) => {
            const userData = satellite.userData;
            
            // Orbital motion
            userData.orbitAngle += userData.orbitSpeed;
            satellite.position.x = Math.cos(userData.orbitAngle) * userData.orbitRadius;
            satellite.position.z = Math.sin(userData.orbitAngle) * userData.orbitRadius;
            
            // Bobbing motion
            satellite.position.y = Math.sin(time * userData.bobSpeed) * userData.bobAmplitude;
            
            // Rotation
            satellite.rotation.x += userData.rotationSpeed;
            satellite.rotation.y += userData.rotationSpeed * 0.7;
            satellite.rotation.z += userData.rotationSpeed * 0.3;
        });
    }
    
    // Rotate Earth
    if (earth) {
        earth.rotation.y += 0.002;
        earth.rotation.x += 0.001;
    }
    
    // Animate nebula
    if (nebula) {
        nebula.rotation.y += 0.0005;
        nebula.material.opacity = 0.3 + Math.sin(time * 0.5) * 0.1;
    }
    
    // Animate asteroids
    const asteroidBelt = scene.getObjectByName('asteroidBelt');
    if (asteroidBelt) {
        asteroidBelt.children.forEach(asteroid => {
            asteroid.rotation.x += asteroid.userData.rotationSpeed;
            asteroid.rotation.y += asteroid.userData.rotationSpeed * 0.7;
            asteroid.rotation.z += asteroid.userData.rotationSpeed * 0.5;
        });
        asteroidBelt.rotation.y += 0.0002;
    }
    
    // Render the scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

/**
 * Adapt render quality based on performance
 */
function adaptRenderQuality() {
    if (!renderer) return;
    
    if (fps < CONFIG.performance.minFPS) {
        // Reduce quality
        renderer.setPixelRatio(Math.max(renderer.getPixelRatio() * 0.8, 0.5));
        
        // Reduce particle count
        if (stars && stars.geometry.attributes.position.count > 1000) {
            const positions = stars.geometry.attributes.position.array;
            const newPositions = positions.slice(0, positions.length * 0.8);
            stars.geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
        }
    } else if (fps > CONFIG.performance.minFPS + 10) {
        // Increase quality
        renderer.setPixelRatio(Math.min(renderer.getPixelRatio() * 1.1, window.devicePixelRatio));
    }
}

/**
 * Create static background for reduced motion preference
 */
function createStaticBackground() {
    const canvas = document.getElementById('three-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add static stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 2;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Add Three.js event listeners
 */
function addThreeJSEventListeners() {
    // Mouse movement
    document.addEventListener('mousemove', onMouseMove, false);
    
    // Window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Visibility change
    document.addEventListener('visibilitychange', onVisibilityChange, false);
}

/**
 * Handle mouse movement for camera control
 */
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

/**
 * Handle window resize
 */
function onWindowResize() {
    if (!camera || !renderer) return;
    
    windowHalf.x = window.innerWidth / 2;
    windowHalf.y = window.innerHeight / 2;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update static background if using reduced motion
    if (isReducedMotion) {
        createStaticBackground();
    }
}

/**
 * Handle visibility change for performance
 */
function onVisibilityChange() {
    if (document.hidden) {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    } else if (isLoaded && !isReducedMotion) {
        animate();
    }
}

// ================================================
// Cursor Trailer Effect
// ================================================

/**
 * Initialize custom cursor trailer
 */
function initCursorTrailer() {
    if (isMobile() || isReducedMotion) return;
    
    const trailer = document.getElementById('cursor-trailer');
    let mouseX = 0, mouseY = 0;
    let trailerX = 0, trailerY = 0;
    
    function updateTrailer() {
        trailerX += (mouseX - trailerX) * 0.1;
        trailerY += (mouseY - trailerY) * 0.1;
        
        trailer.style.left = trailerX + 'px';
        trailer.style.top = trailerY + 'px';
        
        requestAnimationFrame(updateTrailer);
    }
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    updateTrailer();
    
    // Enhanced interactions
    const interactiveElements = document.querySelectorAll('a, button, .project-card, .skill-item');
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            trailer.style.transform = 'scale(2)';
            trailer.style.background = 'radial-gradient(circle, rgba(0, 212, 255, 0.6) 0%, transparent 70%)';
        });
        
        element.addEventListener('mouseleave', () => {
            trailer.style.transform = 'scale(1)';
            trailer.style.background = 'radial-gradient(circle, rgba(0, 212, 255, 0.4) 0%, transparent 70%)';
        });
    });
}

// ================================================
// Navigation System
// ================================================

/**
 * Initialize navigation with advanced features
 */
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Mobile menu toggle
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
        document.body.classList.toggle('nav-open');
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target) && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            document.body.classList.remove('nav-open');
        }
    });
    
    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            scrollToSection(targetId);
            
            // Close mobile menu
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            document.body.classList.remove('nav-open');
            
            // Update active state
            updateActiveNavLink(link);
        });
    });
    
    // Scroll-based navigation updates
    window.addEventListener('scroll', throttle(() => {
        updateNavbarOnScroll();
        updateActiveNavLinkOnScroll();
    }, CONFIG.performance.throttleDelay));
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            document.body.classList.remove('nav-open');
        }
    });
}

/**
 * Update navbar appearance on scroll
 */
function updateNavbarOnScroll() {
    const navbar = document.getElementById('navbar');
    const currentScrollY = window.scrollY;
    
    // Add/remove scrolled class
    if (currentScrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    // Detect scroll direction
    if (currentScrollY > lastScrollY && currentScrollY > 200) {
        navbar.style.transform = 'translateY(-100%)';
    } else {
        navbar.style.transform = 'translateY(0)';
    }
    
    lastScrollY = currentScrollY;
}

/**
 * Update active navigation link based on scroll position
 */
function updateActiveNavLinkOnScroll() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let currentSection = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.offsetHeight;
        
        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + currentSection) {
            link.classList.add('active');
        }
    });
}

/**
 * Update active navigation link manually
 */
function updateActiveNavLink(activeLink) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');
}

// ================================================
// Hero Section Animations
// ================================================

/**
 * Initialize hero section with typing animation
 */
function initHeroAnimations() {
    initTypingAnimation();
    initStatsCounter();
    initParallaxEffect();
    initHeroInteractions();
}

/**
 * Typing animation for hero title
 */
function initTypingAnimation() {
    const typingElement = document.getElementById('typing-text');
    if (!typingElement) return;
    
    const phrases = [
        'GIS Professional',
        'GIS Developer/Engineer',
        'Geoinformatics Enthusiast',
        'Remote Sensing Expert',
        'Spatial (GIS & RS) Analyst',
        'WebGIS-CloudGIS Developer',
        'ML for GIS Engineer'
    ];
    
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;
    
    function typeEffect() {
        const currentPhrase = phrases[phraseIndex];
        
        if (isDeleting) {
            typingElement.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 50;
        } else {
            typingElement.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 100;
        }
        
        if (!isDeleting && charIndex === currentPhrase.length) {
            isDeleting = true;
            typingSpeed = 2000; // Pause before deleting
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typingSpeed = 500; // Pause before typing next phrase
        }
        
        setTimeout(typeEffect, typingSpeed);
    }
    
    // Start the animation after a short delay
    setTimeout(typeEffect, 1000);
}

/**
 * Animated statistics counter
 */
function initStatsCounter() {
    const statNumbers = document.querySelectorAll('.stat-number');
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    statNumbers.forEach(stat => observer.observe(stat));
}

/**
 * Animate individual counter
 */
function animateCounter(element) {
    const target = parseFloat(element.getAttribute('data-target'));
    const duration = 2000;
    const startTime = performance.now();
    const isDecimal = target % 1 !== 0;
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = target * easeOut;
        
        if (isDecimal) {
            element.textContent = current.toFixed(2);
        } else {
            element.textContent = Math.floor(current);
        }
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = isDecimal ? target.toFixed(2) : target;
            
            // Add completion animation
            element.style.transform = 'scale(1.1)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 200);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

/**
 * Parallax effect for hero section
 */
function initParallaxEffect() {
    if (isReducedMotion) return;
    
    const heroSection = document.getElementById('home');
    const heroBackground = document.querySelector('.hero-background');
    
    window.addEventListener('scroll', throttle(() => {
        const scrolled = window.pageYOffset;
        const parallax = scrolled * 0.5;
        
        if (heroBackground) {
            heroBackground.style.transform = `translateY(${parallax}px)`;
        }
        
        // Fade out hero content on scroll
        if (heroSection) {
            const opacity = Math.max(1 - scrolled / window.innerHeight, 0);
            heroSection.style.opacity = opacity;
        }
    }, CONFIG.performance.throttleDelay));
}

/**
 * Hero section interactions
 */
function initHeroInteractions() {
    const ctaButtons = document.querySelectorAll('.cta-button');
    
    ctaButtons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            createButtonParticles(button);
        });
        
        button.addEventListener('click', (e) => {
            createClickRipple(e, button);
        });
    });
}

/**
 * Create particle effect for buttons
 */
function createButtonParticles(button) {
    if (isReducedMotion) return;
    
    const particleContainer = button.querySelector('.btn-particles');
    if (!particleContainer) return;
    
    for (let i = 0; i < 10; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            pointer-events: none;
            animation: particle-float 1s ease-out forwards;
        `;
        
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        
        particleContainer.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1000);
    }
    
    // Add particle animation CSS if not exists
    if (!document.querySelector('#particle-styles')) {
        const style = document.createElement('style');
        style.id = 'particle-styles';
        style.textContent = `
            @keyframes particle-float {
                0% {
                    transform: translate(0, 0) scale(0);
                    opacity: 1;
                }
                100% {
                    transform: translate(${(Math.random() - 0.5) * 100}px, ${-50 - Math.random() * 50}px) scale(1);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Create click ripple effect
 */
function createClickRipple(event, button) {
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('div');
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple-effect 0.6s ease-out;
        pointer-events: none;
    `;
    
    button.style.position = 'relative';
    button.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
    
    // Add ripple animation CSS if not exists
    if (!document.querySelector('#ripple-styles')) {
        const style = document.createElement('style');
        style.id = 'ripple-styles';
        style.textContent = `
            @keyframes ripple-effect {
                to {
                    transform: scale(2);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ================================================
// Skills Section
// ================================================

/**
 * Initialize skills section with filtering and animations
 */
function initSkillsSection() {
    initSkillsFilter();
    initSkillsAnimations();
    initSkillBars();
}

/**
 * Skills category filtering
 */
function initSkillsFilter() {
    const filterButtons = document.querySelectorAll('.skill-nav-btn');
    const skillCategories = document.querySelectorAll('.skill-category');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetCategory = button.getAttribute('data-category');
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filter categories
            skillCategories.forEach(category => {
                const categoryType = category.getAttribute('data-category');
                
                if (targetCategory === 'all' || categoryType === targetCategory) {
                    category.style.display = 'block';
                    category.classList.add('active');
                    
                    // Animate skill bars
                    setTimeout(() => animateSkillBars(category), 200);
                } else {
                    category.style.display = 'none';
                    category.classList.remove('active');
                }
            });
        });
    });
}

/**
 * Animate skill category cards
 */
function initSkillsAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    animateSkillBars(entry.target);
                }, index * CONFIG.animation.staggerDelay);
                
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    
    document.querySelectorAll('.skill-category').forEach(category => {
        category.style.opacity = '0';
        category.style.transform = 'translateY(30px)';
        category.style.transition = `all ${CONFIG.animation.duration}ms ${CONFIG.animation.easing}`;
        observer.observe(category);
    });
}

/**
 * Animate skill progress bars
 */
function animateSkillBars(container) {
    const skillItems = container.querySelectorAll('.skill-item');
    
    skillItems.forEach((item, index) => {
        const progressBar = item.querySelector('.skill-progress');
        const level = item.getAttribute('data-level') || 85;
        
        setTimeout(() => {
            if (progressBar) {
                progressBar.style.width = level + '%';
                
                // Add shimmer effect
                progressBar.style.position = 'relative';
                progressBar.style.overflow = 'hidden';
                
                const shimmer = document.createElement('div');
                shimmer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                    animation: shimmer 2s ease-in-out;
                `;
                
                progressBar.appendChild(shimmer);
                setTimeout(() => shimmer.remove(), 2000);
            }
        }, index * 100);
    });
    
    // Add shimmer animation CSS if not exists
    if (!document.querySelector('#shimmer-styles')) {
        const style = document.createElement('style');
        style.id = 'shimmer-styles';
        style.textContent = `
            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Initialize interactive skill bars
 */
function initSkillBars() {
    const skillItems = document.querySelectorAll('.skill-item');
    
    skillItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateX(10px)';
            
            // Show skill details
            const skillName = item.querySelector('.skill-name');
            const skillLevel = item.querySelector('.skill-level');
            
            if (skillName && skillLevel) {
                showSkillTooltip(item, skillName.textContent, skillLevel.textContent);
            }
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateX(0)';
            hideSkillTooltip();
        });
    });
}

/**
 * Show skill tooltip
 */
function showSkillTooltip(element, name, level) {
    const tooltip = document.createElement('div');
    tooltip.id = 'skill-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(10, 10, 10, 0.9);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 0.9rem;
        pointer-events: none;
        z-index: 1000;
        border: 1px solid rgba(0, 212, 255, 0.3);
        backdrop-filter: blur(10px);
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    tooltip.innerHTML = `<strong>${name}</strong><br>Proficiency: ${level}`;
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.right + 10 + 'px';
    tooltip.style.top = rect.top + rect.height / 2 - tooltip.offsetHeight / 2 + 'px';
    
    setTimeout(() => tooltip.style.opacity = '1', 10);
}

/**
 * Hide skill tooltip
 */
function hideSkillTooltip() {
    const tooltip = document.getElementById('skill-tooltip');
    if (tooltip) {
        tooltip.style.opacity = '0';
        setTimeout(() => tooltip.remove(), 300);
    }
}

// ================================================
// Timeline & Experience Section
// ================================================

/**
 * Initialize timeline animations
 */
function initTimelineAnimations() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                
                // Add staggered animation to timeline details
                const details = entry.target.querySelectorAll('.detail-item');
                details.forEach((detail, index) => {
                    setTimeout(() => {
                        detail.style.opacity = '1';
                        detail.style.transform = 'translateX(0)';
                    }, index * 100);
                });
                
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    
    timelineItems.forEach(item => {
        observer.observe(item);
        
        // Prepare detail items for animation
        const details = item.querySelectorAll('.detail-item');
        details.forEach(detail => {
            detail.style.opacity = '0';
            detail.style.transform = 'translateX(-20px)';
            detail.style.transition = 'all 0.5s ease';
        });
    });
    
    // Add hover effects
    initTimelineInteractions();
}

/**
 * Initialize timeline interactions
 */
function initTimelineInteractions() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    timelineItems.forEach(item => {
        const content = item.querySelector('.timeline-content');
        
        item.addEventListener('mouseenter', () => {
            content.style.transform = 'scale(1.02)';
            content.style.zIndex = '10';
            
            // Highlight timeline marker
            const marker = item.querySelector('.timeline-marker');
            if (marker) {
                marker.style.transform = 'scale(1.2)';
                marker.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.6)';
            }
        });
        
        item.addEventListener('mouseleave', () => {
            content.style.transform = 'scale(1)';
            content.style.zIndex = '1';
            
            const marker = item.querySelector('.timeline-marker');
            if (marker) {
                marker.style.transform = 'scale(1)';
                marker.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.3)';
            }
        });
    });
}

// ================================================
// Projects Section
// ================================================

/**
 * Initialize projects section with filtering and animations
 */
function initProjectsSection() {
    initProjectsFilter();
    initProjectsAnimations();
    initProjectInteractions();
}

/**
 * Projects filtering system
 */
function initProjectsFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.getAttribute('data-filter');
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filter projects
            projectCards.forEach((card, index) => {
                const categories = card.getAttribute('data-category') || '';
                
                if (filter === 'all' || categories.includes(filter)) {
                    card.style.display = 'block';
                    
                    // Animate in
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, index * 100);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
}

/**
 * Animate project cards on scroll
 */
function initProjectsAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * CONFIG.animation.staggerDelay);
                
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.project-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(50px)';
        card.style.transition = `all ${CONFIG.animation.duration}ms ${CONFIG.animation.easing}`;
        observer.observe(card);
    });
}

/**
 * Project card interactions
 */
function initProjectInteractions() {
    const projectCards = document.querySelectorAll('.project-card');
    
    projectCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-15px)';
            
            // Animate tech tags
            const techTags = card.querySelectorAll('.tech-tag');
            techTags.forEach((tag, index) => {
                setTimeout(() => {
                    tag.style.transform = 'scale(1.1)';
                }, index * 50);
            });
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            
            const techTags = card.querySelectorAll('.tech-tag');
            techTags.forEach(tag => {
                tag.style.transform = 'scale(1)';
            });
        });
        
        // Add click effect
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('a')) {
                card.style.transform = 'translateY(-15px) scale(1.02)';
                setTimeout(() => {
                    card.style.transform = 'translateY(-15px) scale(1)';
                }, 150);
            }
        });
    });
}

// ================================================
// Interactive Map
// ================================================

/**
 * Initialize interactive map with Leaflet
 */
function initInteractiveMap() {
    const mapContainer = document.getElementById('interactive-map');
    if (!mapContainer) return;
    
    // Initialize map
    const map = L.map('interactive-map', {
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        dragging: !isMobile()
    }).setView([CONFIG.map.lat, CONFIG.map.lng], CONFIG.map.zoom);
    
    // Current tile layer
    let currentTileLayer;
    
    // Tile layers
    const tileLayers = {
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }),
        terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
        }),
        streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
    };
    
    // Add default layer
    currentTileLayer = tileLayers.dark.addTo(map);
    
    // Custom marker
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: '<i class="fas fa-map-marker-alt"></i>',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });
    
    // Add main marker
    const marker = L.marker([CONFIG.map.lat, CONFIG.map.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
            <div class="map-popup">
                <h4>📍 Current Location</h4>
                <p><strong>Dehradun, Uttarakhand</strong></p>
                <p>Indian Institute of Remote Sensing (IIRS-ISRO)</p>
                <p class="coordinates">${CONFIG.map.lat}°N, ${CONFIG.map.lng}°E</p>
            </div>
        `)
        .openPopup();
    
    // Add nearby places
    const nearbyPlaces = [
        { name: 'IIRS-ISRO Campus', lat: 30.3200, lng: 78.0350, icon: 'fa-university', distance: '2.5 km' },
        { name: 'Forest Research Institute', lat: 30.3350, lng: 78.0300, icon: 'fa-leaf', distance: '5 km' },
        { name: 'Jolly Grant Airport', lat: 30.1897, lng: 78.1804, icon: 'fa-plane', distance: '25 km' },
        { name: 'Mussoorie Hills', lat: 30.4598, lng: 78.0644, icon: 'fa-mountain', distance: '35 km' }
    ];
    
    nearbyPlaces.forEach(place => {
        const placeIcon = L.divIcon({
            className: 'place-marker',
            html: `<i class="fas ${place.icon}"></i>`,
            iconSize: [20, 20],
            iconAnchor: [10, 20]
        });
        
        L.marker([place.lat, place.lng], { icon: placeIcon })
            .addTo(map)
            .bindPopup(`
                <div class="map-popup">
                    <h5>${place.name}</h5>
                    <p>Distance: ${place.distance}</p>
                </div>
            `);
    });
    
    // Map control buttons
    const mapButtons = document.querySelectorAll('.map-btn');
    mapButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewType = button.id.replace('-view', '');
            
            // Update active button
            mapButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Change tile layer
            if (currentTileLayer) {
                map.removeLayer(currentTileLayer);
            }
            
            currentTileLayer = tileLayers[viewType].addTo(map);
        });
    });
    
    // Add custom zoom controls
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);
    
    // Add scale
    L.control.scale({
        position: 'bottomleft'
    }).addTo(map);
    
    // Custom popup styles
    const popupStyles = document.createElement('style');
    popupStyles.textContent = `
        .map-popup {
            text-align: center;
            font-family: inherit;
            color: #333;
        }
        .map-popup h4, .map-popup h5 {
            margin: 0 0 0.5rem 0;
            color: #00d4ff;
        }
        .map-popup p {
            margin: 0.25rem 0;
            font-size: 0.9rem;
        }
        .coordinates {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem !important;
            color: #666;
        }
        .custom-marker i, .place-marker i {
            color: #00d4ff;
            font-size: 1.5rem;
            text-shadow: 0 2px 10px rgba(0, 212, 255, 0.5);
            animation: marker-pulse 2s ease-in-out infinite;
        }
        .place-marker i {
            font-size: 1rem;
            color: #ff6b6b;
        }
        @keyframes marker-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    `;
    document.head.appendChild(popupStyles);
    
    // Store map reference for potential future use
    window.portfolioMap = map;
}

// ================================================
// Contact Form
// ================================================

/**
 * Initialize contact form with validation and submission
 */
function initContactForm() {
    const form = document.getElementById('contact-form');
    const inputs = form.querySelectorAll('input, select, textarea');
    const submitBtn = form.querySelector('.submit-btn');
    
    // Form validation
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });
    
    // Form submission
    form.addEventListener('submit', handleFormSubmission);
    
    // Enhanced input interactions
    initFormEnhancements();
}

/**
 * Validate individual form field
 */
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';
    
    // Remove existing error
    clearFieldError(field);
    
    // Required field validation
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    
    // Email validation
    if (fieldName === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
    }
    
    // Phone validation
    if (fieldName === 'phone' && value) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number';
        }
    }
    
    // Message length validation
    if (fieldName === 'message' && value && value.length < 10) {
        isValid = false;
        errorMessage = 'Message must be at least 10 characters long';
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    }
    
    return isValid;
}

/**
 * Show field error
 */
function showFieldError(field, message) {
    field.classList.add('error');
    
    let errorElement = field.parentNode.querySelector('.field-error');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        field.parentNode.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.style.cssText = `
        color: #ff6b6b;
        font-size: 0.8rem;
        margin-top: 0.25rem;
        animation: error-slide-in 0.3s ease;
    `;
    
    // Add error animation CSS if not exists
    if (!document.querySelector('#error-styles')) {
        const style = document.createElement('style');
        style.id = 'error-styles';
        style.textContent = `
            @keyframes error-slide-in {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .form-group input.error,
            .form-group select.error,
            .form-group textarea.error {
                border-color: #ff6b6b !important;
                box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1) !important;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Clear field error
 */
function clearFieldError(field) {
    field.classList.remove('error');
    
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('.submit-btn');
    
    // Validate all fields
    const inputs = form.querySelectorAll('input, select, textarea');
    let isFormValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isFormValid = false;
        }
    });
    
    if (!isFormValid) {
        showNotification('Please fix the errors before submitting', 'error');
        return;
    }
    
    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    try {
        // Simulate form submission (replace with actual endpoint)
        await simulateFormSubmission(formData);
        
        // Show success message
        showFormSuccess();
        form.reset();
        
        // Track form submission (analytics)
        trackEvent('form_submission', {
            form_name: 'contact_form',
            project_type: formData.get('projectType'),
            budget_range: formData.get('budget')
        });
        
    } catch (error) {
        console.error('Form submission error:', error);
        showNotification('Something went wrong. Please try again later.', 'error');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

/**
 * Simulate form submission (replace with actual implementation)
 */
function simulateFormSubmission(formData) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate random success/failure for demo
            if (Math.random() > 0.1) {
                resolve({ success: true });
            } else {
                reject(new Error('Network error'));
            }
        }, 2000);
    });
}

/**
 * Show form success message
 */
function showFormSuccess() {
    const form = document.getElementById('contact-form');
    const successElement = document.getElementById('form-success');
    
    successElement.classList.add('show');
    form.style.opacity = '0.3';
    
    setTimeout(() => {
        successElement.classList.remove('show');
        form.style.opacity = '1';
    }, 5000);
    
    showNotification('Message sent successfully! I\'ll get back to you soon.', 'success');
}

/**
 * Enhanced form interactions
 */
function initFormEnhancements() {
    const formGroups = document.querySelectorAll('.form-group');
    
    formGroups.forEach(group => {
        const input = group.querySelector('input, select, textarea');
        const label = group.querySelector('label');
        
        if (!input || !label) return;
        
        // Floating label effect
        input.addEventListener('focus', () => {
            group.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
            if (!input.value) {
                group.classList.remove('focused');
            }
        });
        
        // Check initial state
        if (input.value) {
            group.classList.add('focused');
        }
    });
    
    // Character counter for textarea
    const messageField = document.getElementById('message');
    if (messageField) {
        const counter = document.createElement('div');
        counter.className = 'char-counter';
        counter.style.cssText = `
            text-align: right;
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
        `;
        
        messageField.parentNode.appendChild(counter);
        
        messageField.addEventListener('input', () => {
            const length = messageField.value.length;
            const maxLength = 1000;
            counter.textContent = `${length}/${maxLength}`;
            
            if (length > maxLength * 0.9) {
                counter.style.color = '#ff6b6b';
            } else {
                counter.style.color = 'var(--text-muted)';
            }
        });
    }
}

// ================================================
// Notification System
// ================================================

/**
 * Show notification message
 */
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas ${iconMap[type] || iconMap.info}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add close button styles
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 0.25rem;
        margin-left: auto;
        opacity: 0.7;
        transition: opacity 0.3s ease;
    `;
    
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.7');
    
    container.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'notification-slide-out 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
    
    // Add slide out animation CSS if not exists
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes notification-slide-out {
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ================================================
// Scroll Animations & Effects
// ================================================

/**
 * Initialize scroll-based animations
 */
function initScrollAnimations() {
    initIntersectionObserver();
    initParallaxElements();
    initScrollProgress();
    initBackToTopButton();
}

/**
 * Intersection Observer for scroll animations
 */
function initIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                
                // Add staggered animation for child elements
                const children = entry.target.querySelectorAll('.animate-child');
                children.forEach((child, index) => {
                    setTimeout(() => {
                        child.classList.add('animate');
                    }, index * CONFIG.animation.staggerDelay);
                });
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements with animation classes
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

/**
 * Parallax effects for various elements
 */
function initParallaxElements() {
    if (isReducedMotion) return;
    
    const parallaxElements = document.querySelectorAll('.parallax-element');
    
    window.addEventListener('scroll', throttle(() => {
        const scrolled = window.pageYOffset;
        
        parallaxElements.forEach(element => {
            const speed = element.dataset.speed || 0.5;
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    }, CONFIG.performance.throttleDelay));
}

/**
 * Scroll progress indicator
 */
function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 3px;
        background: linear-gradient(90deg, #00d4ff, #0099cc);
        z-index: 9999;
        transition: width 0.1s ease;
    `;
    
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', throttle(() => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        
        progressBar.style.width = scrollPercent + '%';
    }, CONFIG.performance.throttleDelay));
}

/**
 * Back to top button
 */
function initBackToTopButton() {
    const backToTop = document.getElementById('back-to-top');
    
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    window.addEventListener('scroll', throttle(() => {
        if (window.pageYOffset > 500) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    }, CONFIG.performance.throttleDelay));
}

// ================================================
// Utility Functions
// ================================================

/**
 * Detect mobile device
 */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
}

/**
 * Track events for analytics
 */
function trackEvent(eventName, properties = {}) {
    // Implement your analytics tracking here
    console.log('Event tracked:', eventName, properties);
    
    // Example for Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, properties);
    }
}

/**
 * Debounced resize handler
 */
const handleResize = debounce(() => {
    // Update Three.js renderer
    onWindowResize();
    
    // Update other responsive elements
    updateResponsiveElements();
}, 250);

/**
 * Update responsive elements
 */
function updateResponsiveElements() {
    const isMobileView = window.innerWidth < 768;
    
    // Update navigation
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu && !isMobileView) {
        navMenu.classList.remove('active');
        document.body.classList.remove('nav-open');
    }
    
    // Update map
    if (window.portfolioMap) {
        window.portfolioMap.invalidateSize();
    }
}

/**
 * Initialize performance monitoring
 */
function initPerformanceMonitoring() {
    // Monitor FPS
    let frames = 0;
    let lastTime = performance.now();
    
    function countFrames() {
        frames++;
        const currentTime = performance.now();
        
        if (currentTime >= lastTime + 1000) {
            fps = Math.round((frames * 1000) / (currentTime - lastTime));
            frames = 0;
            lastTime = currentTime;
            
            // Log performance issues
            if (fps < 30) {
                console.warn('Low FPS detected:', fps);
            }
        }
        
        requestAnimationFrame(countFrames);
    }
    
    countFrames();
    
    // Monitor memory usage
    if (performance.memory) {
        setInterval(() => {
            const memoryUsage = performance.memory.usedJSHeapSize / 1048576; // MB
            if (memoryUsage > 100) {
                console.warn('High memory usage:', memoryUsage.toFixed(2) + 'MB');
            }
        }, 10000);
    }
}

// ================================================
// Error Handling
// ================================================

/**
 * Global error handler
 */
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    
    // Show user-friendly error message for critical errors
    if (e.error && e.error.stack && e.error.stack.includes('THREE')) {
        showNotification('3D graphics error detected. Some visual effects may be disabled.', 'warning');
    }
});

/**
 * Unhandled promise rejection handler
 */
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault(); // Prevent default browser error handling
});

// ================================================
// Main Initialization
// ================================================

/**
 * Initialize the entire application
 */
function initializeApp() {
    console.log('🚀 Initializing Portfolio Application...');
    
    try {
        // Core systems
        initThreeJS();
        initCursorTrailer();
        initNavigation();
        
        // Section-specific features
        initHeroAnimations();
        initSkillsSection();
        initTimelineAnimations();
        initProjectsSection();
        initInteractiveMap();
        initContactForm();
        
        // Global features
        initScrollAnimations();
        initPerformanceMonitoring();
        
        // Add event listeners
        window.addEventListener('resize', handleResize);
        
        console.log('✅ Portfolio application initialized successfully!');
        console.log('📊 Performance monitoring active');
        console.log('🎨 3D environment loaded');
        console.log('📱 Responsive design active');
        
    } catch (error) {
        console.error('❌ Error initializing application:', error);
        showNotification('Some features may not work properly. Please refresh the page.', 'error');
    }
}

// ================================================
// Application Start
// ================================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreloader);
} else {
    initPreloader();
}

// Expose global functions for HTML onclick handlers
window.scrollToSection = scrollToSection;
window.showNotification = showNotification;