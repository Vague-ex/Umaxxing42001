// Initialize Supabase Client
const supabaseUrl = 'https://guceyenzaktklmpbcjph.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1Y2V5ZW56YWt0a2xtcGJjanBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MzkwNjEsImV4cCI6MjA3NTIxNTA2MX0.XrSUj3Fp4FnhSJRKJesIM5x_YFT14m-pOaCfAOEiNBI';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

// Global variables
let characterBanners = [];
let supportCardBanners = [];
let currentBanners = [];

// Parse date from DD/MM/YYYY format
function parseDate(dateString) {
    if (!dateString) return null;
    const parts = dateString.split('/');
    if (parts.length === 3) {
        // DD/MM/YYYY format
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
    }
    // Try standard date format as fallback
    return new Date(dateString);
}

// Calculate days until banner start date
function calculateDaysUntil(dateString) {
    const bannerDate = parseDate(dateString);
    if (!bannerDate || isNaN(bannerDate.getTime())) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    bannerDate.setHours(0, 0, 0, 0);
    
    const diffTime = bannerDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

// Fetch Character Banners from Supabase
async function fetchCharacterBanners() {
    try {
        const { data, error } = await supabaseClient
            .from('Character Banners')
            .select('*')
            .order('start_date', { ascending: true });
        
        if (error) {
            // Try alternative table name
            const { data: altData, error: altError } = await supabaseClient
                .from('character_banners')
                .select('*')
                .order('start_date', { ascending: true });
            
            if (altError) throw altError;
            return altData || [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error fetching character banners:', error);
        return [];
    }
}

// Fetch Support Card Banners from Supabase
async function fetchSupportCardBanners() {
    try {
        const { data, error } = await supabaseClient
            .from('Support Cards Banners')
            .select('*')
            .order('start_date', { ascending: true });
        
        if (error) {
            // Try alternative table name
            const { data: altData, error: altError } = await supabaseClient
                .from('support_cards_banners')
                .select('*')
                .order('start_date', { ascending: true });
            
            if (altError) throw altError;
            return altData || [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error fetching support card banners:', error);
        return [];
    }
}

// Load banners when banner type is selected
async function loadBanners(bannerType) {
    const bannerList = document.getElementById('bannerList');
    const loadingBanners = document.getElementById('loadingBanners');
    
    bannerList.disabled = true;
    bannerList.innerHTML = '<option value="">Loading...</option>';
    loadingBanners.style.display = 'block';
    document.getElementById('bannerInfo').style.display = 'none';
    
    try {
        if (bannerType === 'character') {
            if (characterBanners.length === 0) {
                characterBanners = await fetchCharacterBanners();
            }
            currentBanners = characterBanners;
        } else if (bannerType === 'support') {
            if (supportCardBanners.length === 0) {
                supportCardBanners = await fetchSupportCardBanners();
            }
            currentBanners = supportCardBanners;
        }
        
        // Populate dropdown
        bannerList.innerHTML = '<option value="">Select a banner...</option>';
        currentBanners.forEach(banner => {
            const option = document.createElement('option');
            option.value = banner.id;
            option.textContent = banner.name;
            bannerList.appendChild(option);
        });
        
        bannerList.disabled = false;
    } catch (error) {
        console.error('Error loading banners:', error);
        bannerList.innerHTML = '<option value="">Error loading banners</option>';
    } finally {
        loadingBanners.style.display = 'none';
    }
}

// Update banner info display
function updateBannerInfo() {
    const bannerList = document.getElementById('bannerList');
    const bannerId = parseInt(bannerList.value);
    
    if (!bannerId || currentBanners.length === 0) {
        document.getElementById('bannerInfo').style.display = 'none';
        return;
    }
    
    const banner = currentBanners.find(b => b.id === bannerId);
    if (!banner) return;
    
    // Calculate days until start date
    const daysUntil = calculateDaysUntil(banner.start_date);
    
    // Display banner name
    document.getElementById('bannerName').textContent = banner.name;
    
    // Display banner image
    const bannerImage = document.getElementById('bannerImage');
    const bannerImagePlaceholder = document.getElementById('bannerImagePlaceholder');
    
    if (banner.banner_image && banner.banner_image.trim() !== '') {
        bannerImage.src = banner.banner_image;
        bannerImage.style.display = 'block';
        bannerImagePlaceholder.style.display = 'none';
        bannerImage.onerror = function() {
            bannerImage.style.display = 'none';
            bannerImagePlaceholder.style.display = 'flex';
        };
    } else {
        bannerImage.style.display = 'none';
        bannerImagePlaceholder.style.display = 'flex';
    }
    
    // Display banner details
    const bannerDetails = document.getElementById('bannerDetails');
    let detailsHTML = '';
    
    if (banner.rarity) {
        detailsHTML += `<span class="badge bg-primary me-2">${banner.rarity}</span>`;
    }
    
    if (banner.version) {
        detailsHTML += `<span class="badge bg-secondary me-2">Version: ${banner.version}</span>`;
    }
    
    if (banner.type) {
        detailsHTML += `<span class="badge bg-info me-2">Type: ${banner.type}</span>`;
    }
    
    if (banner.rate) {
        detailsHTML += `<span class="badge bg-success me-2">Rate: ${(banner.rate * 100).toFixed(2)}%</span>`;
    }
    
    if (banner.is_limited === true || banner.is_limited === 'TRUE') {
        detailsHTML += `<span class="badge bg-warning me-2">Limited</span>`;
    }
    
    if (banner.is_rerun === true || banner.is_rerun === 'TRUE') {
        detailsHTML += `<span class="badge bg-dark me-2">Rerun</span>`;
    }
    
    if (banner.start_date) {
        detailsHTML += `<div class="mt-2"><small class="text-muted">Start: ${banner.start_date}</small></div>`;
    }
    
    if (banner.end_date) {
        detailsHTML += `<div><small class="text-muted">End: ${banner.end_date}</small></div>`;
    }
    
    bannerDetails.innerHTML = detailsHTML;
    
    // Display days until
    if (daysUntil !== null) {
        if (daysUntil < 0) {
            document.getElementById('bannerDays').textContent = Math.abs(daysUntil);
            document.getElementById('bannerDays').parentElement.innerHTML = 
                `<span class="text-danger">This banner started <span class="highlight">${Math.abs(daysUntil)}</span> days ago.</span>`;
        } else if (daysUntil === 0) {
            document.getElementById('bannerDays').parentElement.innerHTML = 
                `<span class="text-success highlight">This banner starts today!</span>`;
        } else {
            document.getElementById('bannerDays').textContent = daysUntil;
            document.getElementById('bannerDays').parentElement.innerHTML = 
                `<span class="mb-2"><span id="bannerDays" class="highlight">${daysUntil}</span> days from now.</span>`;
        }
    } else {
        document.getElementById('bannerDays').parentElement.innerHTML = 
            `<span class="text-muted">Unable to calculate countdown</span>`;
    }
    
    document.getElementById('bannerInfo').style.display = 'block';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Changelog link
    document.getElementById('changelogLink').addEventListener('click', function(e) {
        e.preventDefault();
        var changelogModal = new bootstrap.Modal(document.getElementById('changelogModal'));
        changelogModal.show();
    });
    
    // Show Changelog Modal on page load
    var changelogModal = new bootstrap.Modal(document.getElementById('changelogModal'));
    changelogModal.show();
    
    // Banner type change
    document.getElementById('bannerType').addEventListener('change', function(e) {
        const bannerType = e.target.value;
        if (bannerType) {
            loadBanners(bannerType);
        } else {
            document.getElementById('bannerList').disabled = true;
            document.getElementById('bannerList').innerHTML = '<option value="">Please select a banner type first</option>';
            document.getElementById('bannerInfo').style.display = 'none';
        }
    });
    
    // Banner selection change
    document.getElementById('bannerList').addEventListener('change', updateBannerInfo);
    
    // Test Supabase connection
    console.log('Supabase client initialized successfully');
});