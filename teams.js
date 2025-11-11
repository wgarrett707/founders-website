// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());
        
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        data.push(obj);
    }
    
    return data;
}

// Load and display team members from CSV
async function loadTeamMembers() {
    try {
        const response = await fetch('team-members.csv');
        if (!response.ok) {
            throw new Error('Failed to load team members CSV');
        }
        
        const csvText = await response.text();
        const members = parseCSV(csvText);

        // Build a lookup for team -> group photo from CSV
        buildTeamGroupPhotoMap(members);
        
        const grid = document.getElementById('teams-grid');
        
        if (!grid) {
            console.error('Teams grid not found');
            return;
        }
        
        // Clear existing content
        grid.innerHTML = '';
        
        // Create team member cards (filter out any rows that are just for group photo config)
        members.forEach((member, index) => {
            // Skip if this is not a valid team member (no name or team)
            if (!member.name || !member.team || member.name.trim() === '' || member.team.trim() === '') {
                return;
            }
            
            const memberCard = document.createElement('div');
            memberCard.className = 'team-member fade-in';
            memberCard.setAttribute('data-team', member.team);
            
            // Add staggered delay classes
            if (index % 4 === 1) memberCard.classList.add('fade-in-delay');
            if (index % 4 === 2) memberCard.classList.add('fade-in-delay-2');
            if (index % 4 === 3) memberCard.classList.add('fade-in-delay-3');
            
            const image = document.createElement('div');
            image.className = 'team-member-image';
            
            // Create img element for the photo
            const img = document.createElement('img');
            img.src = member.photo;
            img.alt = member.name;
            img.onerror = function() {
                // If image fails to load, show placeholder
                this.style.display = 'none';
                image.style.backgroundImage = 'url(\'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFhMWExYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5QaG90bzwvdGV4dD48L3N2Zz4=\')';
            };
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '4px';
            
            image.appendChild(img);
            
            const name = document.createElement('div');
            name.className = 'team-member-name';
            name.textContent = member.name;
            
            const role = document.createElement('div');
            role.className = 'team-member-role';
            role.textContent = member.role || 'Member';
            
            memberCard.appendChild(image);
            memberCard.appendChild(name);
            memberCard.appendChild(role);
            
            grid.appendChild(memberCard);
        });
        
        // Initialize filters after members are loaded
        initializeFilters();
        
        // Filter to show only EXEC team by default
        filterTeamMembers('exec');
        
        // Re-initialize scroll animations for newly added team members
        setTimeout(() => {
            initScrollAnimations();
        }, 100);
    } catch (error) {
        console.error('Error loading team members:', error);
        // Show error message in grid
        const grid = document.getElementById('teams-grid');
        if (grid) {
            grid.innerHTML = '<div style="color: #888; padding: 40px; text-align: center;">Failed to load team members. Please check the CSV file.</div>';
        }
    }
}

// Map of team -> group photo path
const teamGroupPhotos = {};

function buildTeamGroupPhotoMap(members) {
    // Populate map with first non-empty group_photo per team
    members.forEach(member => {
        const team = (member.team || '').trim();
        const groupPhoto = (member.group_photo || '').trim();
        if (!team) return;
        if (groupPhoto && !teamGroupPhotos[team]) {
            teamGroupPhotos[team] = groupPhoto;
        }
    });
}

function updateGroupPhotoForTeam(team) {
    const groupPhotoContainer = document.querySelector('.group-photo-placeholder');
    if (!groupPhotoContainer) return;

    const path = (team && teamGroupPhotos[team]) ? teamGroupPhotos[team] : '';

    // Clear existing content
    groupPhotoContainer.innerHTML = '';

    if (path) {
        const groupImg = document.createElement('img');
        groupImg.src = path;
        groupImg.alt = 'Team Group Photo';
        groupImg.style.width = '100%';
        groupImg.style.height = '100%';
        groupImg.style.objectFit = 'cover';
        groupImg.style.borderRadius = '4px';
        groupImg.onerror = function() {
            // Fallback to placeholder text if image fails
            this.style.display = 'none';
            groupPhotoContainer.innerHTML = '<span>Group Photo</span>';
            groupPhotoContainer.style.display = 'flex';
            groupPhotoContainer.style.alignItems = 'center';
            groupPhotoContainer.style.justifyContent = 'center';
        };
        groupPhotoContainer.appendChild(groupImg);
        groupPhotoContainer.style.display = 'block';
    } else {
        // No image available; show placeholder
        groupPhotoContainer.innerHTML = '<span>Group Photo</span>';
        groupPhotoContainer.style.display = 'flex';
        groupPhotoContainer.style.alignItems = 'center';
        groupPhotoContainer.style.justifyContent = 'center';
    }
}

// Team descriptions
const teamDescriptions = {
    'exec': 'The Executive Team leads Founders and oversees all strategic initiatives, operations, and organizational direction. They set the vision, manage key partnerships, and ensure the organization runs smoothly.',
    'events': 'The Events Team organizes workshops, networking sessions, and entrepreneurial events throughout the year. They create opportunities for students to connect, learn, and grow their entrepreneurial skills.',
    'exploration': 'The Exploration Team helps students discover and explore entrepreneurial opportunities. They organize ideation sessions, mentorship programs, and resources to help students develop their startup ideas.',
    'community': 'The Community Team builds and maintains the Founders community. They foster connections between members, organize social events, and create a supportive environment for student entrepreneurs.',
    'rd': 'The Research & Development Team focuses on innovation and staying ahead of entrepreneurial trends. They research new opportunities, develop resources, and explore cutting-edge approaches to entrepreneurship.'
};

// Filter team members by team
function filterTeamMembers(selectedTeam) {
    // Remove active class from all filters
    document.querySelectorAll('.team-filter').forEach(f => f.classList.remove('active'));
    
    // Add active class to selected filter
    const selectedFilter = document.querySelector(`.team-filter[data-team="${selectedTeam}"]`);
    if (selectedFilter) {
        selectedFilter.classList.add('active');
    }
    
    // Update team blurb
    const teamBlurb = document.getElementById('team-blurb');
    if (teamBlurb && teamDescriptions[selectedTeam]) {
        teamBlurb.innerHTML = `<p>${teamDescriptions[selectedTeam]}</p>`;
        // Add fade-in animation to blurb
        teamBlurb.classList.remove('visible');
        setTimeout(() => {
            teamBlurb.classList.add('visible');
        }, 50);
    }

    // Update group photo to match selected team
    updateGroupPhotoForTeam(selectedTeam);
    
    // Filter team members and reset animations
    document.querySelectorAll('.team-member').forEach(member => {
        const memberTeam = member.getAttribute('data-team');
        
        if (memberTeam === selectedTeam) {
            // Remove hidden class and reset animation state
            member.classList.remove('hidden');
            // Remove visible class to allow re-animation
            member.classList.remove('visible');
            
            // Trigger re-animation by checking if element is in viewport
            setTimeout(() => {
                const rect = member.getBoundingClientRect();
                const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
                if (isInViewport) {
                    // Use requestAnimationFrame to ensure DOM is updated
                    requestAnimationFrame(() => {
                        member.classList.add('visible');
                    });
                }
            }, 50);
        } else {
            member.classList.add('hidden');
            // Keep visible class removed when hidden so it can animate again if shown
            member.classList.remove('visible');
        }
    });
    
    // Re-initialize scroll animations to catch any newly visible elements
    setTimeout(() => {
        reinitializeScrollAnimations();
    }, 100);
}

// Teams page filter functionality
function initializeFilters() {
    const filters = document.querySelectorAll('.team-filter');
    let activeFilter = 'exec'; // Default to EXEC
    
    filters.forEach(filter => {
        // Remove existing listeners by cloning
        const newFilter = filter.cloneNode(true);
        filter.parentNode.replaceChild(newFilter, filter);
        
        newFilter.addEventListener('click', function(e) {
            e.preventDefault();
            
            const selectedTeam = this.getAttribute('data-team');
            
            // If clicking the same filter, show all teams
            if (activeFilter === selectedTeam) {
                // Remove active class from all filters
                document.querySelectorAll('.team-filter').forEach(f => f.classList.remove('active'));
                activeFilter = null;
                
                // Show all team members
                document.querySelectorAll('.team-member').forEach(member => {
                    member.classList.remove('hidden');
                });
            } else {
                activeFilter = selectedTeam;
                filterTeamMembers(selectedTeam);
            }
        });
    });
    
    // Initialize with EXEC selected if no active filter clicked yet
    const activeFilterElement = document.querySelector('.team-filter.active');
    if (activeFilterElement && activeFilter === null) {
        activeFilter = activeFilterElement.getAttribute('data-team');
    }
}

// Store the observer globally so we can reuse it
let scrollObserver = null;

// Create intersection observer
function createScrollObserver() {
    if (scrollObserver) {
        return scrollObserver;
    }
    
    scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('hidden')) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    return scrollObserver;
}

// Reinitialize scroll animations (useful after filtering)
function reinitializeScrollAnimations() {
    const observer = createScrollObserver();
    
    // Unobserve all team members first to reset
    document.querySelectorAll('.team-member').forEach(member => {
        observer.unobserve(member);
    });
    
    // Observe all visible team members
    const teamMembers = document.querySelectorAll('.team-member:not(.hidden)');
    teamMembers.forEach((member, index) => {
        // Reset animation state
        member.classList.remove('visible');
        
        // Re-add animation classes if needed
        if (!member.classList.contains('fade-in')) {
            member.classList.add('fade-in');
        }
        
        // Re-add delay classes based on position
        member.classList.remove('fade-in-delay', 'fade-in-delay-2', 'fade-in-delay-3');
        if (index % 4 === 1) member.classList.add('fade-in-delay');
        if (index % 4 === 2) member.classList.add('fade-in-delay-2');
        if (index % 4 === 3) member.classList.add('fade-in-delay-3');
        
        // Observe the member
        observer.observe(member);
        
        // If already in viewport, trigger animation with a small delay for smooth transition
        const rect = member.getBoundingClientRect();
        const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
        if (isInViewport) {
            // Small delay to ensure CSS transition works properly
            setTimeout(() => {
                requestAnimationFrame(() => {
                    member.classList.add('visible');
                });
            }, 50 + (index % 4) * 100);
        }
    });
}

// Intersection Observer for scroll animations
function initScrollAnimations() {
    const observer = createScrollObserver();
    
    // Observe elements with animation classes
    const animatedElements = document.querySelectorAll('.fade-in, .fade-in-up');
    animatedElements.forEach(el => {
        observer.observe(el);
    });
    
    // Observe team members individually for staggered effect
    const teamMembers = document.querySelectorAll('.team-member');
    teamMembers.forEach((member, index) => {
        // Ensure animation classes are present
        if (!member.classList.contains('fade-in')) {
            member.classList.add('fade-in');
        }
        if (index % 4 === 1 && !member.classList.contains('fade-in-delay')) {
            member.classList.add('fade-in-delay');
        }
        if (index % 4 === 2 && !member.classList.contains('fade-in-delay-2')) {
            member.classList.add('fade-in-delay-2');
        }
        if (index % 4 === 3 && !member.classList.contains('fade-in-delay-3')) {
            member.classList.add('fade-in-delay-3');
        }
        
        // Only observe visible members
        if (!member.classList.contains('hidden')) {
            observer.observe(member);
        }
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Add animation classes to static elements
    const breadcrumb = document.querySelector('.teams-breadcrumb');
    const heading = document.querySelector('.teams-heading');
    const filters = document.querySelector('.teams-filters');
    const groupPhoto = document.querySelector('.teams-group-photo');
    const teamBlurb = document.getElementById('team-blurb');
    
    if (breadcrumb) breadcrumb.classList.add('fade-in-up');
    if (heading) heading.classList.add('fade-in-up', 'fade-in-delay');
    if (filters) filters.classList.add('fade-in-up', 'fade-in-delay-2');
    if (groupPhoto) groupPhoto.classList.add('fade-in-up', 'fade-in-delay-3');
    if (teamBlurb) {
        teamBlurb.classList.add('fade-in');
        // Make it visible initially since it's already in viewport
        setTimeout(() => {
            teamBlurb.classList.add('visible');
        }, 300);
    }
    
    // Trigger initial animations for elements already in view
    setTimeout(() => {
        initScrollAnimations();
        // Make visible elements that are already in viewport
        const elements = document.querySelectorAll('.fade-in, .fade-in-up');
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                el.classList.add('visible');
            }
        });
    }, 100);
    
    // Load team members from CSV
    loadTeamMembers();
    
    // Initialize scroll progress
    const progressBar = document.getElementById('vertical-line-progress');
    if (progressBar) {
        function updateScrollProgress() {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrolled = window.scrollY;
            const progress = Math.max(0, Math.min(1, 1 - (scrolled / scrollHeight)));
            
            progressBar.style.transform = `scaleY(${progress})`;
        }
        
        window.addEventListener('scroll', updateScrollProgress);
        updateScrollProgress(); // Initial update
    }
});

