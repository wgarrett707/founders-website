console.log('Script started');

// Dynamically load Cannon.js and verify it loads
function loadCannon() {
    return new Promise((resolve, reject) => {
        // Try cdnjs.cloudflare.com first (often more reliable)
        tryLoadCannon('https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.20.0/cannon.min.js', 1)
            .then(resolve)
            .catch(() => {
                // Try jsdelivr
                console.log('Trying Cannon.js from jsdelivr...');
                tryLoadCannon('https://cdn.jsdelivr.net/npm/cannon@0.20.0/build/cannon.min.js', 2)
                    .then(resolve)
                    .catch(() => {
                        // Try unpkg
                        console.log('Trying Cannon.js from unpkg...');
                        tryLoadCannon('https://unpkg.com/cannon@0.20.0/build/cannon.min.js', 3)
                            .then(resolve)
                            .catch(() => {
                                // Try older version from cdnjs
                                console.log('Trying older Cannon.js version...');
                                tryLoadCannon('https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.17.1/cannon.min.js', 4)
                                    .then(resolve)
                                    .catch(() => {
                                        reject(new Error('Failed to load Cannon.js from all CDNs - will use simple physics'));
                                    });
                            });
                    });
            });
    });
}

function tryLoadCannon(url, attemptNum) {
    return new Promise((resolve, reject) => {
        console.log(`Attempt ${attemptNum}: Loading Cannon.js from ${url}`);
        const script = document.createElement('script');
        script.src = url;
        script.onload = function() {
            console.log(`Cannon.js script tag loaded from attempt ${attemptNum}`);
            // Wait a moment and check multiple times
            let checks = 0;
            const checkInterval = setInterval(() => {
                checks++;
                // Check all possible ways Cannon.js might expose itself
                let CANNON = window.CANNON || window.cannon || window.CANNONJS;
                
                // Also check if it's in window but named differently
                if (!CANNON) {
                    for (let key in window) {
                        if (window[key] && typeof window[key] === 'object' && window[key].World) {
                            CANNON = window[key];
                            console.log(`Found Cannon.js as window.${key}`);
                            break;
                        }
                    }
                }
                
                if (CANNON) {
                    clearInterval(checkInterval);
                    console.log(`Cannon.js found on attempt ${attemptNum}, checks: ${checks}`);
                    console.log('CANNON object:', CANNON);
                    console.log('CANNON.World:', typeof CANNON.World);
                    resolve(CANNON);
                } else if (checks > 20) {
                    clearInterval(checkInterval);
                    console.error(`Cannon.js not found after ${checks} checks`);
                    reject(new Error(`Cannon.js not found after loading from ${url}`));
                }
            }, 50);
        };
        script.onerror = function() {
            console.error(`Failed to load Cannon.js from ${url}`);
            reject(new Error(`Failed to load from ${url}`));
        };
        document.head.appendChild(script);
    });
}

// Wait for libraries to load
let animationInitialized = false;
let CANNON_LIB = null;

// Load Cannon.js dynamically
loadCannon().then(function(cannonLib) {
    console.log('Cannon.js successfully loaded:', cannonLib);
    CANNON_LIB = cannonLib;
    // Try to initialize once libraries are ready
    if (typeof THREE !== 'undefined' && CANNON_LIB) {
        console.log('All libraries ready, initializing with Cannon.js...');
        setTimeout(initAnimation, 100);
    }
}).catch(function(error) {
    console.warn('Failed to load Cannon.js:', error);
    console.log('Using simple physics simulation instead...');
    CANNON_LIB = 'simple'; // Mark that we'll use simple physics
    // Initialize with simple physics
    if (typeof THREE !== 'undefined') {
        console.log('Initializing with simple physics...');
        setTimeout(initAnimation, 100);
    }
});

function initSimplePhysics() {
    if (animationInitialized) {
        return;
    }
    
    animationInitialized = true;
    
    try {
        const container = document.getElementById('animation-container');
        if (!container) {
            console.error('Animation container not found');
            return;
        }

        setTimeout(function() {
            const rect = container.getBoundingClientRect();
            const width = Math.max(rect.width, 800);
            // Use viewport height to match CSS (container is exactly viewport height minus header)
            const height = window.innerHeight - 80;

            if (width === 0 || height === 0) {
                console.error('Container has zero size');
                return;
            }

            const scene = new THREE.Scene();
            scene.background = null;

            const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
            camera.position.set(5, 5, 12); // Positioned to see the rain falling
            camera.lookAt(0, 0, 0); // Look at center of falling area

            const renderer = new THREE.WebGLRenderer({ 
                alpha: true, 
                antialias: true,
                powerPreference: "high-performance"
            });
            
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.appendChild(renderer.domElement);
            
            console.log('Simple physics animation initialized');

            // Create raining cubes
            const cubes = [];
            const cubeSize = 0.6; // Bigger cubes
            const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
            const cubeMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xff6600,
                flatShading: false
            });

            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
            directionalLight.position.set(5, 10, 5);
            scene.add(directionalLight);

            // Spawning parameters
            const spawnHeight = 15; // Spawn cubes at the top
            const despawnHeight = -15; // Despawn cubes below this
            const maxCubes = 75; // Maximum number of cubes on screen (1.5x increase)
            const spawnRate = 0.167; // Spawn interval in seconds (1.5x faster spawn rate)
            let lastSpawnTime = performance.now() - spawnRate * 1000; // Start spawning immediately
            const spawnAreaX = 12; // Horizontal spawn area
            const spawnAreaZ = 12; // Depth spawn area

            // Function to create a new cube
            function createCube() {
                // Create individual material for each cube so we can adjust opacity
                const material = new THREE.MeshLambertMaterial({ 
                    color: 0xff6600,
                    flatShading: false,
                    transparent: true,
                    opacity: 1.0
                });
                
                const mesh = new THREE.Mesh(cubeGeometry, material);
                mesh.castShadow = false;
                mesh.receiveShadow = false;
                
                // Random rotation for variety
                mesh.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                
                scene.add(mesh);

                // Physics properties
                const cube = {
                    mesh: mesh,
                    material: material,
                    position: new THREE.Vector3(
                        (Math.random() - 0.5) * spawnAreaX,
                        spawnHeight + Math.random() * 2,
                        (Math.random() - 0.5) * spawnAreaZ
                    ),
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.5, // Small horizontal drift
                        -0.5 - Math.random() * 0.3, // Falling speed
                        (Math.random() - 0.5) * 0.5
                    ),
                    angularVelocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 2,
                        (Math.random() - 0.5) * 2,
                        (Math.random() - 0.5) * 2
                    ),
                    size: cubeSize,
                    mass: 1
                };
                
                mesh.position.copy(cube.position);
                cubes.push(cube);
            }

            // No initial cubes - they will spawn continuously from the start

            // Simple physics constants - slower motion
            const timeScale = 0.5; // Slow down overall motion
            const baseGravity = -9.82 * timeScale;
            let currentGravity = baseGravity;
            const damping = 0.998; // Minimal air resistance

            // Mouse interaction variables
            let mouseX = null;
            let mouseY = null;
            let isMouseOver = false;
            const minGravityMultiplier = 1.0; // Normal speed
            const maxGravityMultiplier = 3.0; // 3x faster when mouse is directly over

            // Mouse event handlers
            container.addEventListener('mouseenter', function() {
                isMouseOver = true;
            });

            container.addEventListener('mouseleave', function() {
                isMouseOver = false;
                mouseX = null;
                mouseY = null;
                currentGravity = baseGravity;
            });

            container.addEventListener('mousemove', function(event) {
                if (isMouseOver) {
                    const rect = container.getBoundingClientRect();
                    mouseX = event.clientX - rect.left;
                    mouseY = event.clientY - rect.top;
                    
                    // Calculate animation center and max distance based on current container width
                    const animationCenterX = rect.width / 2;
                    const maxDistance = rect.width;
                    
                    // Calculate horizontal distance from mouse to animation center
                    const horizontalDistance = Math.abs(mouseX - animationCenterX);
                    
                    // Normalize distance (0 to 1, where 0 is at center, 1 is at edge)
                    const normalizedDistance = Math.min(horizontalDistance / (maxDistance / 2), 1);
                    
                    // Calculate gravity multiplier based on distance
                    // Closer to center = faster fall, farther = slower (but still faster than base)
                    // Inverse relationship: closer mouse = higher multiplier
                    const gravityMultiplier = maxGravityMultiplier - (normalizedDistance * (maxGravityMultiplier - minGravityMultiplier));
                    
                    // Apply the gravity multiplier
                    currentGravity = baseGravity * gravityMultiplier;
                }
            });

            // Animation loop
            let lastTime = performance.now();
            function animate() {
                requestAnimationFrame(animate);

                const time = performance.now();
                const delta = Math.min((time - lastTime) / 1000, 0.1);
                lastTime = time;

                // Gradually return to base gravity if mouse leaves
                if (!isMouseOver && currentGravity !== baseGravity) {
                    currentGravity += (baseGravity - currentGravity) * 0.1;
                }

                // Spawn new cubes
                if (time - lastSpawnTime > spawnRate * 1000 && cubes.length < maxCubes) {
                    createCube();
                    lastSpawnTime = time;
                }

                // Update physics for each cube and remove ones that fell too far
                for (let i = cubes.length - 1; i >= 0; i--) {
                    const cube = cubes[i];
                    
                    // Apply gravity (affected by mouse position)
                    cube.velocity.y += currentGravity * delta;
                    
                    // Apply minimal damping
                    cube.velocity.multiplyScalar(damping);
                    
                    // Update position
                    const slowDelta = delta * timeScale;
                    cube.position.add(cube.velocity.clone().multiplyScalar(slowDelta));
                    
                    // Update rotation
                    cube.mesh.rotation.x += cube.angularVelocity.x * delta;
                    cube.mesh.rotation.y += cube.angularVelocity.y * delta;
                    cube.mesh.rotation.z += cube.angularVelocity.z * delta;
                    
                    // Fade out cubes as they approach despawn area
                    const fadeStartHeight = -8; // Start fading at this Y position
                    const fadeEndHeight = despawnHeight; // Fully transparent at despawn
                    const fadeRange = fadeStartHeight - fadeEndHeight;
                    
                    if (cube.position.y < fadeStartHeight) {
                        // Calculate opacity based on distance from fade start
                        const distanceFromFadeStart = fadeStartHeight - cube.position.y;
                        const opacity = Math.max(0, 1 - (distanceFromFadeStart / fadeRange));
                        cube.material.opacity = opacity;
                    } else {
                        // Ensure full opacity when above fade area
                        cube.material.opacity = 1.0;
                    }
                    
                    // Despawn cubes that have fallen past the page
                    if (cube.position.y < despawnHeight) {
                        scene.remove(cube.mesh);
                        cube.mesh.geometry.dispose();
                        cube.material.dispose();
                        cubes.splice(i, 1);
                        continue;
                    }
                    
                    // Cube-to-cube collisions (simple, keep cubes from overlapping too much)
                    for (let j = i + 1; j < cubes.length; j++) {
                        const other = cubes[j];
                        const dx = other.position.x - cube.position.x;
                        const dy = other.position.y - cube.position.y;
                        const dz = other.position.z - cube.position.z;
                        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        const minDistance = cube.size * 1.5; // Slightly larger than cube diagonal
                        
                        if (distance < minDistance && distance > 0.001) {
                            // Simple collision - push cubes apart
                            const invDistance = 1 / distance;
                            const nx = dx * invDistance;
                            const ny = dy * invDistance;
                            const nz = dz * invDistance;
                            
                            const overlap = minDistance - distance;
                            const separation = overlap * 0.3;
                            cube.position.x -= nx * separation;
                            cube.position.y -= ny * separation;
                            cube.position.z -= nz * separation;
                            other.position.x += nx * separation;
                            other.position.y += ny * separation;
                            other.position.z += nz * separation;
                            
                            // Slight velocity adjustment on collision
                            const dvx = other.velocity.x - cube.velocity.x;
                            const dvy = other.velocity.y - cube.velocity.y;
                            const dvz = other.velocity.z - cube.velocity.z;
                            const relativeSpeed = dvx * nx + dvy * ny + dvz * nz;
                            
                            if (relativeSpeed > 0) {
                                const impulse = relativeSpeed * 0.3;
                                cube.velocity.x += impulse * nx;
                                cube.velocity.y += impulse * ny;
                                cube.velocity.z += impulse * nz;
                                other.velocity.x -= impulse * nx;
                                other.velocity.y -= impulse * ny;
                                other.velocity.z -= impulse * nz;
                            }
                        }
                    }
                    
                    // Update mesh position and rotation
                    cube.mesh.position.copy(cube.position);
                }

                renderer.render(scene, camera);
            }

            // Handle window resize
            function handleResize() {
                const rect = container.getBoundingClientRect();
                const width = Math.max(rect.width, 800);
                // Use viewport height to match CSS
                const height = window.innerHeight - 80;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            }
            window.addEventListener('resize', handleResize);

            // Start animation
            animate();
        }, 200);
    } catch (error) {
        console.error('Error initializing simple physics:', error);
        animationInitialized = false;
    }
}

function initAnimation() {
    if (animationInitialized) {
        console.log('Animation already initialized');
        return;
    }
    
    // Check if libraries loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not available');
        return;
    }
    
    // Check if we should use simple physics
    const useSimplePhysics = !CANNON_LIB || CANNON_LIB === 'simple';
    
    if (useSimplePhysics) {
        console.log('Initializing with simple physics simulation');
        initSimplePhysics();
        return;
    }
    
    console.log('Initializing animation with Cannon.js:', CANNON_LIB);

    try {
        const container = document.getElementById('animation-container');
        if (!container) {
            console.error('Animation container not found');
            animationInitialized = false;
            return;
        }

        // Wait for container to be properly sized
        setTimeout(function() {
            animationInitialized = true;
            const rect = container.getBoundingClientRect();
            const width = Math.max(rect.width, 400);
            // Use viewport height to match CSS (container is exactly viewport height minus header)
            const height = window.innerHeight - 80;

            if (width === 0 || height === 0) {
                console.error('Container has zero size', width, height);
                return;
            }

            const scene = new THREE.Scene();
            scene.background = null;

            // Camera positioned to see the falling balls
            const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
            camera.position.set(5, 5, 12); // Positioned to see the rain falling
            camera.lookAt(0, 0, 0); // Look at center of falling area

            const renderer = new THREE.WebGLRenderer({ 
                alpha: true, 
                antialias: true,
                powerPreference: "high-performance"
            });
            
            if (!renderer.domElement) {
                console.error('Failed to create WebGL renderer');
                return;
            }
            
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.appendChild(renderer.domElement);
            
            console.log('Animation initialized', { width, height, container: container.offsetWidth, containerHeight: container.offsetHeight });

            // Initialize Cannon.js physics world - slower motion
            const world = new CANNON_LIB.World();
            const timeScale = 0.5; // Slow down motion
            const baseGravity = -9.82 * timeScale;
            world.gravity.set(0, baseGravity, 0);
            world.broadphase = new CANNON_LIB.NaiveBroadphase();
            world.solver.iterations = 10;

            // Mouse interaction variables
            let mouseX = null;
            let mouseY = null;
            let isMouseOver = false;
            const minGravityMultiplier = 1.0; // Normal speed
            const maxGravityMultiplier = 3.0; // 3x faster when mouse is directly over

            // Mouse event handlers
            container.addEventListener('mouseenter', function() {
                isMouseOver = true;
            });

            container.addEventListener('mouseleave', function() {
                isMouseOver = false;
                mouseX = null;
                mouseY = null;
                world.gravity.set(0, baseGravity, 0);
            });

            container.addEventListener('mousemove', function(event) {
                if (isMouseOver) {
                    const rect = container.getBoundingClientRect();
                    mouseX = event.clientX - rect.left;
                    mouseY = event.clientY - rect.top;
                    
                    // Calculate animation center and max distance based on current container width
                    const animationCenterX = rect.width / 2;
                    const maxDistance = rect.width;
                    
                    // Calculate horizontal distance from mouse to animation center
                    const horizontalDistance = Math.abs(mouseX - animationCenterX);
                    
                    // Normalize distance (0 to 1, where 0 is at center, 1 is at edge)
                    const normalizedDistance = Math.min(horizontalDistance / (maxDistance / 2), 1);
                    
                    // Calculate gravity multiplier based on distance
                    // Closer to center = faster fall, farther = slower (but still faster than base)
                    // Inverse relationship: closer mouse = higher multiplier
                    const gravityMultiplier = maxGravityMultiplier - (normalizedDistance * (maxGravityMultiplier - minGravityMultiplier));
                    
                    // Apply the gravity multiplier
                    world.gravity.set(0, baseGravity * gravityMultiplier, 0);
                }
            });

            // Create cube material (shared)
            const cubePhysicsMaterial = new CANNON_LIB.Material('cube');
            cubePhysicsMaterial.restitution = 0.6; // Moderate bounciness for cube collisions
            cubePhysicsMaterial.friction = 0.2; // Less friction

            // No ground - cubes fall indefinitely

            // Create raining cubes
            const cubes = [];
            const cubeSize = 0.6; // Bigger cubes
            const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
            directionalLight.position.set(5, 10, 5);
            scene.add(directionalLight);

            // Spawning parameters
            const spawnHeight = 15;
            const despawnHeight = -15;
            const maxCubes = 75; // Maximum number of cubes on screen (1.5x increase)
            const spawnRate = 0.167; // Spawn interval in seconds (1.5x faster spawn rate)
            let lastSpawnTime = performance.now() - spawnRate * 1000; // Start spawning immediately
            const spawnAreaX = 12;
            const spawnAreaZ = 12;

            // Function to create a new cube
            function createCube() {
                // Create individual material for each cube so we can adjust opacity
                const material = new THREE.MeshLambertMaterial({ 
                    color: 0xff6600,
                    flatShading: false,
                    transparent: true,
                    opacity: 1.0
                });
                
                const mesh = new THREE.Mesh(cubeGeometry, material);
                mesh.castShadow = false;
                mesh.receiveShadow = false;
                
                // Random initial rotation
                mesh.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                
                scene.add(mesh);

                const shape = new CANNON_LIB.Box(new CANNON_LIB.Vec3(cubeSize / 2, cubeSize / 2, cubeSize / 2));
                const body = new CANNON_LIB.Body({ mass: 1 });
                body.addShape(shape);
                body.material = cubePhysicsMaterial;
                
                // Spawn at top with random position
                body.position.set(
                    (Math.random() - 0.5) * spawnAreaX,
                    spawnHeight + Math.random() * 2,
                    (Math.random() - 0.5) * spawnAreaZ
                );
                
                // Falling velocity
                body.velocity.set(
                    (Math.random() - 0.5) * 0.5,
                    -0.5 - Math.random() * 0.3,
                    (Math.random() - 0.5) * 0.5
                );
                
                // Random angular velocity
                body.angularVelocity.set(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                );

                world.add(body);
                cubes.push({ mesh, body, material: material });
            }

            // No initial cubes - they will spawn continuously from the start

            // Animation loop
            let lastTime = performance.now();
            function animate() {
                requestAnimationFrame(animate);

                const time = performance.now();
                const delta = Math.min((time - lastTime) / 1000, 0.1);
                lastTime = time;

                // Gradually return to base gravity if mouse leaves
                if (!isMouseOver) {
                    const currentGravityY = world.gravity.y;
                    if (Math.abs(currentGravityY - baseGravity) > 0.01) {
                        world.gravity.y += (baseGravity - currentGravityY) * 0.1;
                    }
                }

                // Spawn new cubes
                if (time - lastSpawnTime > spawnRate * 1000 && cubes.length < maxCubes) {
                    createCube();
                    lastSpawnTime = time;
                }

                // Slow down physics simulation
                world.step(delta * timeScale);

                // Update cubes and despawn ones that fell too far
                for (let i = cubes.length - 1; i >= 0; i--) {
                    const cube = cubes[i];
                    const pos = cube.body.position;
                    
                    // Fade out cubes as they approach despawn area
                    const fadeStartHeight = -8; // Start fading at this Y position
                    const fadeEndHeight = despawnHeight; // Fully transparent at despawn
                    const fadeRange = fadeStartHeight - fadeEndHeight;
                    
                    if (pos.y < fadeStartHeight) {
                        // Calculate opacity based on distance from fade start
                        const distanceFromFadeStart = fadeStartHeight - pos.y;
                        const opacity = Math.max(0, 1 - (distanceFromFadeStart / fadeRange));
                        cube.material.opacity = opacity;
                    } else {
                        // Ensure full opacity when above fade area
                        cube.material.opacity = 1.0;
                    }
                    
                    // Despawn cubes that have fallen past the page
                    if (pos.y < despawnHeight) {
                        scene.remove(cube.mesh);
                        world.remove(cube.body);
                        cube.mesh.geometry.dispose();
                        cube.material.dispose();
                        cubes.splice(i, 1);
                        continue;
                    }
                    
                    // Update mesh to match physics body
                    cube.mesh.position.copy(cube.body.position);
                    cube.mesh.quaternion.copy(cube.body.quaternion);
                }

                renderer.render(scene, camera);
            }

            // Handle window resize
            function handleResize() {
                const rect = container.getBoundingClientRect();
                const width = Math.max(rect.width, 800);
                // Use viewport height to match CSS
                const height = window.innerHeight - 80;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            }
            window.addEventListener('resize', handleResize);

            // Start animation
            animate();
        }, 200);
    } catch (error) {
        console.error('Error initializing animation:', error);
        animationInitialized = false;
    }
}

// Wait for DOM to be ready, then check if we can initialize
function checkAndInit() {
    if (typeof THREE !== 'undefined' && CANNON_LIB && !animationInitialized) {
        console.log('All libraries ready, initializing animation');
        setTimeout(initAnimation, 100);
    }
}

// Initialize Word Sphere (Google Sphere style)
let sphereInitialized = false;
function initWordSphere() {
    if (sphereInitialized) {
        return;
    }
    
    const container = document.getElementById('sphere-container');
    if (!container || typeof THREE === 'undefined') {
        console.log('Sphere container not found or THREE.js not loaded');
        return;
    }

    // Wait for Montserrat font to load before rendering text on canvas
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            sphereInitialized = true;
            console.log('Fonts loaded, initializing word sphere');
            createWordSphere();
        });
    } else {
        // Fallback if fonts API not available
        setTimeout(() => {
            sphereInitialized = true;
            console.log('Initializing word sphere (font loading fallback)');
            createWordSphere();
        }, 500);
    }
}

function createWordSphere() {
    const container = document.getElementById('sphere-container');
    if (!container) {
        return;
    }

    // Majors represented in Founders - showing diversity
    const words = [
        // Computer Science variations
        'COMPUTER SCIENCE', 'CS + MATH', 'CS + STATS', 
        'CS + LINGUISTICS', 'CS + BIOENG', 
        'CS + ADVERTISING', 'CS + ECONOMICS',
        
        // Engineering
        'COMPUTER ENG', 'CHEMICAL ENG', 'MATERIALS ENG',
        'INDUSTRIAL ENG', 'SYSTEMS ENG', 'ENVIRONMENTAL ENG',
        'AEROSPACE ENG', 'MECHANICAL ENG', 'BIOENGINEERING',
        
        // Business & Finance
        'FINANCE', 'FINANCE + DS', 'FINANCE + MARKETING', 'FINANCE + SCM',
        'MARKETING', 'SUPPLY CHAIN MGMT', 'OPERATIONS MGMT', 'ACCOUNTANCY',
        'STRATEGIC BUSINESS', 'ENTREPRENEURSHIP', 'BUSINESS + DS',
        'CONSUMER ECON + FIN',
        
        // Sciences
        'STATISTICS', 'STATS + CS', 'MATHEMATICS', 'PHYSICS', 'ASTROPHYSICS',
        'ASTRO + DS', 'PSYCHOLOGY', 'PSYCH + ECON', 'BRAIN & COG SCI',
        
        // Information Sciences
        'INFORMATION SCIENCES', 'IS + DS', 'INFORMATION SYSTEMS',
        
        // Design & Arts
        'GRAPHIC DESIGN', 'INDUSTRIAL DESIGN', 'COMMUNICATION',
        'ADVERTISING', 'GEOGRAPHY & GIS',
        
        // Other
        'ANIMAL BIOLOGY + CS', 'UNDECLARED', 'ECONOMICS'
    ];

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000);
    // Position camera further back to see the full sphere (radius 280, so need more distance)
    camera.position.z = 600;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Create a group to hold all sprites for easier rotation
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);

    const objects = [];
    const radius = 280; // Increased from 200 to make sphere bigger

    words.forEach((word, i) => {
        // Create canvas for this word
        const wordCanvas = document.createElement('canvas');
        const wordContext = wordCanvas.getContext('2d');
        
        // Dynamic canvas size based on text width
        const fontSize = 32;
        // Use Montserrat font for sphere text
        wordContext.font = `bold ${fontSize}px Montserrat, Arial, sans-serif`;
        const textWidth = wordContext.measureText(word).width;
        wordCanvas.width = Math.max(textWidth + 40, 256);
        wordCanvas.height = 64;

        // Redraw text with proper sizing and Montserrat font
        wordContext.fillStyle = '#ffffff';
        wordContext.font = `bold ${fontSize}px Montserrat, Arial, sans-serif`;
        wordContext.textAlign = 'center';
        wordContext.textBaseline = 'middle';
        wordContext.fillText(word, wordCanvas.width / 2, wordCanvas.height / 2);

        // Create texture and sprite
        const texture = new THREE.CanvasTexture(wordCanvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        // Scale based on canvas size - much smaller words
        const scale = 40;
        sprite.scale.set(scale * (wordCanvas.width / wordCanvas.height), scale, 1);

        // Better distribution using Fibonacci sphere algorithm
        const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle
        const theta = goldenAngle * i;
        const y = 1 - (2 * i) / (words.length - 1);
        const radiusAtY = Math.sqrt(1 - y * y);
        
        const x = Math.cos(theta) * radiusAtY;
        const z = Math.sin(theta) * radiusAtY;

        sprite.position.set(x * radius, y * radius, z * radius);

        // Make sprite face outward from center
        sprite.lookAt(
            sprite.position.x * 2,
            sprite.position.y * 2,
            sprite.position.z * 2
        );

        sphereGroup.add(sprite);
        objects.push(sprite);
    });

    // Mouse interaction
    let targetRotationX = 0;
    let targetRotationY = 0;
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    container.addEventListener('mousedown', (event) => {
        isMouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        container.style.cursor = 'grabbing';
    });

    container.addEventListener('mousemove', (event) => {
        if (isMouseDown) {
            const deltaX = event.clientX - lastMouseX;
            const deltaY = event.clientY - lastMouseY;
            targetRotationY += deltaX * 0.02; // Faster rotation when dragging
            targetRotationX -= deltaY * 0.02;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
        }
    });

    container.addEventListener('mouseup', () => {
        isMouseDown = false;
        container.style.cursor = 'grab';
    });

    container.addEventListener('mouseleave', () => {
        isMouseDown = false;
        container.style.cursor = 'grab';
    });

    // Touch support
    let lastTouchX = 0;
    let lastTouchY = 0;
    container.addEventListener('touchstart', (event) => {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        }
    });

    container.addEventListener('touchmove', (event) => {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const deltaX = touch.clientX - lastTouchX;
            const deltaY = touch.clientY - lastTouchY;
            targetRotationY += deltaX * 0.02; // Faster rotation when dragging
            targetRotationX -= deltaY * 0.02;
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        }
    });

    // Animation variables
    let rotationX = 0;
    let rotationY = 0;
    const autoRotateSpeed = 0.008; // Much faster auto-rotation

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Auto-rotate when not interacting
        if (!isMouseDown) {
            targetRotationY += autoRotateSpeed;
        }

        // Smooth rotation interpolation
        rotationX += (targetRotationX - rotationX) * 0.1;
        rotationY += (targetRotationY - rotationY) * 0.1;

        // Reset target rotation when not dragging
        if (!isMouseDown) {
            targetRotationX *= 0.95;
        }

        // Rotate the entire group
        sphereGroup.rotation.y = rotationY;
        sphereGroup.rotation.x = rotationX;

        // Make each sprite face the camera
        objects.forEach((sprite) => {
            sprite.lookAt(camera.position);
        });

        renderer.render(scene, camera);
    }

    // Handle resize
    function handleResize() {
        const newRect = container.getBoundingClientRect();
        const newWidth = newRect.width;
        const newHeight = newRect.height;
        
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    }

    window.addEventListener('resize', handleResize);
    animate();
}

// Load Montserrat font for canvas rendering
function loadMontserratFont() {
    const font = new FontFace('Montserrat', 'url(public/fonts/Montserrat-VariableFont_wght.ttf)');
    return font.load().then(() => {
        document.fonts.add(font);
        console.log('Montserrat font loaded');
    }).catch(err => {
        console.warn('Failed to load Montserrat font:', err);
    });
}

// Initialize sphere when Three.js is ready and font is loaded
if (typeof THREE !== 'undefined') {
    loadMontserratFont().then(() => {
        setTimeout(initWordSphere, 100);
    });
} else {
    window.addEventListener('load', () => {
        loadMontserratFont().then(() => {
            setTimeout(initWordSphere, 100);
        });
    });
}

console.log('Document ready state:', document.readyState);

// Check periodically if libraries become available
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOMContentLoaded fired');
        checkAndInit();
    });
} else {
    checkAndInit();
}

// Also check on window load
window.addEventListener('load', function() {
    console.log('Window load fired');
    checkAndInit();
});

// Periodic check as fallback
setInterval(checkAndInit, 500);

// Initialize sponsors scroller for seamless loop
function initSponsorsScroller() {
    const track = document.getElementById('sponsors-track');
    if (!track) {
        return;
    }

    // Clone all sponsor logos to create seamless loop
    const logos = track.querySelectorAll('.sponsor-logo');
    logos.forEach(logo => {
        const clone = logo.cloneNode(true);
        track.appendChild(clone);
    });
}

// Scroll indicator functionality
function initScrollIndicator() {
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', function() {
            const sphereSection = document.querySelector('.sphere-section');
            if (sphereSection) {
                sphereSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
}

// Vertical line scroll progress
function initScrollProgress() {
    const progressBar = document.getElementById('vertical-line-progress');
    if (!progressBar) {
        return;
    }
    
    function updateScrollProgress() {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = window.scrollY;
        const progress = Math.max(0, Math.min(1, 1 - (scrolled / scrollHeight)));
        
        progressBar.style.transform = `scaleY(${progress})`;
    }
    
    window.addEventListener('scroll', updateScrollProgress);
    updateScrollProgress(); // Initial update
}

// Initialize sponsors scroller when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initSponsorsScroller();
        initScrollIndicator();
        initScrollProgress();
    });
} else {
    initSponsorsScroller();
    initScrollIndicator();
    initScrollProgress();
}

