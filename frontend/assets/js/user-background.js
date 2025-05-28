// Updated Dynamic Floating Background Images
class UserBackground {
    constructor() {
        this.isActive = false;
        this.memoryImages = [];
        this.intervals = [];
        this.activeImages = [];
        this.maxActiveImages = 12;
        
        this.loadAvailableImages();
    }

    // Automatically load all images from the MCA folder
    async loadAvailableImages() {
        // Default images that should work if you put ANY photos in /assets/images/mca/
        const possibleImages = [
            // You can put ANY photo names here, or I'll auto-detect them
            'photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg', 'photo5.jpg',
            'image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg', 'image5.jpg',
            'mca1.jpg', 'mca2.jpg', 'mca3.jpg', 'mca4.jpg', 'mca5.jpg',
            'award1.jpg', 'award2.jpg', 'award3.jpg', 'award4.jpg', 'award5.jpg',
            'ceremony1.jpg', 'ceremony2.jpg', 'ceremony3.jpg', 'team1.jpg', 'team2.jpg',
            'winner1.jpg', 'winner2.jpg', 'celebration1.jpg', 'celebration2.jpg',
            // Add more generic names or specific ones if you know them
            '2024.jpg', '2023.jpg', '2022.jpg', '2021.jpg', '2020.jpg',
            'group.jpg', 'trophy.jpg', 'winners.jpg', 'ceremony.jpg', 'awards.jpg'
        ];

        // Test which images actually exist
        this.memoryImages = [];
        
        for (let imageName of possibleImages) {
            const imagePath = `/assets/images/mca/${imageName}`;
            
            // Test if image exists
            if (await this.imageExists(imagePath)) {
                this.memoryImages.push(imagePath);
            }
        }

        // If no images found, use placeholder
        if (this.memoryImages.length === 0) {
            console.log('🎨 No MCA photos found, using placeholders');
            this.memoryImages = [this.createPlaceholderImage()];
        } else {
            console.log(`🎨 Found ${this.memoryImages.length} MCA photos:`, this.memoryImages);
        }

        // Start animations after loading images
        this.init();
    }

    // Check if image exists
    imageExists(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
        });
    }

    // Create placeholder if no photos available
    createPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEzMyIgdmlld0JveD0iMCAwIDIwMCAxMzMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTMzIiBmaWxsPSIjNjM2NmYxIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0Ij5NQ0EgTWVtb3J5PC90ZXh0Pgo8L3N2Zz4K';
    }

    init() {
        this.createBackgroundContainer();
        this.startFloatingImages();
        this.startParticles();
        this.setupVisibilityControl();
    }

    createBackgroundContainer() {
        const existing = document.getElementById('floatingMemoriesBackground');
        if (existing) existing.remove();

        const backgroundDiv = document.createElement('div');
        backgroundDiv.id = 'floatingMemoriesBackground';
        backgroundDiv.className = 'floating-memories-background';
        
        const particlesDiv = document.createElement('div');
        particlesDiv.id = 'memoryParticles';
        particlesDiv.className = 'memory-particles';
        
        const userContainer = document.querySelector('.user-container');
        if (userContainer) {
            userContainer.appendChild(backgroundDiv);
            userContainer.appendChild(particlesDiv);
        }
    }

    startFloatingImages() {
        this.isActive = true;
        
        // Create 5 images immediately for better visual effect
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createFloatingImage();
            }, i * 500); // Stagger them by 500ms each
        }
        
        // Then continue creating new ones
        const imageInterval = setInterval(() => {
            if (this.isActive && this.activeImages.length < this.maxActiveImages) {
                this.createFloatingImage();
            }
        }, 1500); // Reduced from 2000ms to 1500ms for more frequent creation
        
        this.intervals.push(imageInterval);
    }

    createFloatingImage() {
        const container = document.getElementById('floatingMemoriesBackground');
        if (!container || this.memoryImages.length === 0) return;

        const imageSrc = this.memoryImages[Math.floor(Math.random() * this.memoryImages.length)];
        
        const imageDiv = document.createElement('div');
        const img = document.createElement('img');
        
        // Increased chances for larger sizes for better visibility
        const sizes = ['size-medium', 'size-large', 'size-xl', 'size-xxl', 'size-large']; // Removed small, added more large
        const animations = ['anim-float-up', 'anim-diagonal', 'anim-sideways', 'anim-pulse', 'anim-drift'];
        const delays = ['delay-0', 'delay-1', 'delay-2', 'delay-3', 'delay-4'];
        
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        const animation = animations[Math.floor(Math.random() * animations.length)];
        const delay = delays[Math.floor(Math.random() * delays.length)];
        
        imageDiv.className = `floating-memory-image ${size} ${animation} ${delay}`;
        
        // Adjust starting position based on image size
        let maxWidth = 280; // default for medium (increased from 200)
        if (size === 'size-large') maxWidth = 360;
        else if (size === 'size-xl') maxWidth = 450;
        else if (size === 'size-xxl') maxWidth = 540;
        
        const startX = Math.random() * (window.innerWidth - maxWidth);
        const startY = window.innerHeight + 100;
        
        imageDiv.style.left = startX + 'px';
        imageDiv.style.top = startY + 'px';
        
        img.src = imageSrc;
        img.alt = 'MCA Memory';
        img.loading = 'lazy';
        
        img.onload = () => {
            imageDiv.style.opacity = '1';
        };
        
        img.onerror = () => {
            img.src = this.createPlaceholderImage();
            imageDiv.style.opacity = '1';
        };
        
        imageDiv.appendChild(img);
        container.appendChild(imageDiv);
        
        this.activeImages.push(imageDiv);
        
        // Increased duration for longer visibility
        const animationDuration = this.getAnimationDuration(animation) + 10000; // Add 10 seconds
        setTimeout(() => {
            if (imageDiv.parentNode) {
                imageDiv.parentNode.removeChild(imageDiv);
                const index = this.activeImages.indexOf(imageDiv);
                if (index > -1) {
                    this.activeImages.splice(index, 1);
                }
            }
        }, animationDuration);
    }

    getAnimationDuration(animation) {
        const durations = {
            'anim-float-up': 20000,
            'anim-diagonal': 25000,
            'anim-sideways': 18000,
            'anim-pulse': 30000,
            'anim-drift': 35000
        };
        return durations[animation] || 20000;
    }

    startParticles() {
        const particleInterval = setInterval(() => {
            if (this.isActive) {
                this.createParticle();
            }
        }, 800);
        
        this.intervals.push(particleInterval);
    }

    createParticle() {
        const container = document.getElementById('memoryParticles');
        if (!container) return;

        const particle = document.createElement('div');
        const isGolden = Math.random() < 0.25;
        
        particle.className = isGolden ? 'memory-particle golden-particle' : 'memory-particle';
        
        const startX = Math.random() * window.innerWidth;
        particle.style.left = startX + 'px';
        particle.style.animationDelay = Math.random() * 3 + 's';
        
        container.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, isGolden ? 12000 : 15000);
    }

    setupVisibilityControl() {
        const voteButtons = document.querySelectorAll('.nominee-card, .btn');
        
        voteButtons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                this.reduceActivity();
            });
            
            button.addEventListener('mouseleave', () => {
                this.restoreActivity();
            });
        });
    }

    reduceActivity() {
        const container = document.getElementById('floatingMemoriesBackground');
        if (container) {
            container.style.opacity = '0.2';
        }
    }

    restoreActivity() {
        const container = document.getElementById('floatingMemoriesBackground');
        if (container) {
            container.style.opacity = '0.6';
        }
    }

    celebrateVote() {
        const container = document.getElementById('memoryParticles');
        if (!container) return;

        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'memory-particle golden-particle';
                particle.style.left = (Math.random() * window.innerWidth) + 'px';
                particle.style.animationDelay = (Math.random() * 1) + 's';
                container.appendChild(particle);
                
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 12000);
            }, i * 80);
        }
    }

    pause() {
        this.isActive = false;
        const container = document.getElementById('floatingMemoriesBackground');
        if (container) {
            container.style.animationPlayState = 'paused';
        }
    }

    resume() {
        this.isActive = true;
        const container = document.getElementById('floatingMemoriesBackground');
        if (container) {
            container.style.animationPlayState = 'running';
        }
    }

    stop() {
        this.isActive = false;
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        
        const bg = document.getElementById('floatingMemoriesBackground');
        const particles = document.getElementById('memoryParticles');
        if (bg) bg.remove();
        if (particles) particles.remove();
    }
}

// Auto-initialize
function initUserBackground() {
    const userDashboard = document.getElementById('user-dashboard');
    if (userDashboard && !userDashboard.classList.contains('hidden')) {
        if (!window.userBackground) {
            window.userBackground = new UserBackground();
            console.log('🎨 Dynamic floating memories background initialized!');
        }
    }
}

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const userDashboard = document.getElementById('user-dashboard');
            if (userDashboard && !userDashboard.classList.contains('hidden')) {
                initUserBackground();
            } else if (window.userBackground) {
                window.userBackground.stop();
                window.userBackground = null;
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const userDashboard = document.getElementById('user-dashboard');
    if (userDashboard) {
        observer.observe(userDashboard, { attributes: true });
        
        if (!userDashboard.classList.contains('hidden')) {
            initUserBackground();
        }
    }
}); 