/* =========================================
   DATA & STATE MANAGEMENT
   ========================================= */
const STATUS_STAGES = ["Pending", "Dispatched", "In Transit", "Out for Delivery", "Delivered"];

function initData() {
    // Init Users
    if (!localStorage.getItem('users')) {
        const users = [
            { username: 'admin', password: 'password', role: 'admin' }
        ];
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    // Init Parcels
    if (!localStorage.getItem('parcels')) {
        const dummyData = [
            { id: 'SC-982431', sender: 'Amazon Inc.', destination: '123 Tech Avenue, NY', status: 'In Transit', date: new Date().toISOString() }
        ];
        localStorage.setItem('parcels', JSON.stringify(dummyData));
    }
}

function getParcels() { return JSON.parse(localStorage.getItem('parcels')) || []; }
function saveParcels(parcels) { localStorage.setItem('parcels', JSON.stringify(parcels)); }
function getParcelById(id) { return getParcels().find(p => p.id === id); }

function getUsers() { return JSON.parse(localStorage.getItem('users')) || []; }
function saveUsers(users) { localStorage.setItem('users', JSON.stringify(users)); }

// Login State
let currentUser = null;

/* =========================================
   DOM ELEMENTS
   ========================================= */
// Nav Links
const linkHome = document.getElementById('link-home');
const linkTracking = document.getElementById('link-tracking');
const linkSend = document.getElementById('link-send');
const linkLogin = document.getElementById('link-login');
const linkAdmin = document.getElementById('link-admin');
const linkLogout = document.getElementById('link-logout');
const navUserDisplay = document.getElementById('nav-user-display');

// Views
const viewHome = document.getElementById('view-home');
const viewTracking = document.getElementById('view-tracking');
const viewSend = document.getElementById('view-send');
const viewLogin = document.getElementById('view-login');
const viewAdminLogin = document.getElementById('view-admin-login');
const viewAdmin = document.getElementById('view-admin');

// Home Commands
const btnHeroTrack = document.getElementById('btn-hero-track');
const btnHeroLogin = document.getElementById('btn-hero-login');

// User Auth Elements
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const formLogin = document.getElementById('form-login');
const loginUser = document.getElementById('login-user');
const loginPass = document.getElementById('login-pass');
const toggleRegister = document.getElementById('toggle-register');
const formRegister = document.getElementById('form-register');
const regUser = document.getElementById('reg-user');
const regPass = document.getElementById('reg-pass');
const toggleLogin = document.getElementById('toggle-login');
const linkGotoAdmin = document.getElementById('link-goto-admin');

// Admin Auth Elements
const formAdminLogin = document.getElementById('form-admin-login');
const adminLoginUser = document.getElementById('admin-login-user');
const adminLoginPass = document.getElementById('admin-login-pass');
const linkBackUserLogin = document.getElementById('link-back-user-login');

// Send Courier Elements
const formUserSend = document.getElementById('form-user-send');
const sendReceiver = document.getElementById('send-receiver');
const sendAddress = document.getElementById('send-address');

// Tracking Elements
const trackingInput = document.getElementById('tracking-input');
const btnTrack = document.getElementById('btn-track');
const trackingResult = document.getElementById('tracking-result');
const displayId = document.getElementById('display-id');
const displayDest = document.getElementById('display-destination');
const displayStatusBadge = document.getElementById('display-status-badge');
const timelineList = document.getElementById('timeline-list');

// Admin Dashboard Elements
const formNewParcel = document.getElementById('form-new-parcel');
const newSender = document.getElementById('new-sender');
const newDestination = document.getElementById('new-destination');
const tableBody = document.getElementById('table-body');
const updateSelectId = document.getElementById('update-select-id');
const updateSelectStatus = document.getElementById('update-select-status');
const formUpdateStatus = document.getElementById('form-update-status');
const btnUpdateStatus = document.getElementById('btn-update-status');

/* =========================================
   MAP LOGIC (Leaflet)
   ========================================= */
let map;
let marker;

function initMap() {
    // Chennai default coords
    const chennaiCoords = [13.0827, 80.2707];
    
    map = L.map('map').setView(chennaiCoords, 12);
    
    // Add open source dark tile layer if preferred, or standard osm
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', async function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        if (marker) {
            map.removeLayer(marker);
        }
        // Marker styling hooks into Leaflets CSS naturally
        marker = L.marker([lat, lng]).addTo(map);

        sendAddress.value = "Fetching address from map...";

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            // Assign beautiful readable address from OpenStreetMap Reverse Geocoding
            sendAddress.value = data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        } catch (err) {
            sendAddress.value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        }
    });
}

/* =========================================
   NAVIGATION LOGIC
   ========================================= */
const allViews = [viewHome, viewTracking, viewLogin, viewAdminLogin, viewAdmin, viewSend];
const allLinks = [linkHome, linkTracking, linkLogin, linkAdmin, linkSend];

function switchView(viewName) {
    allViews.forEach(view => {
        view.classList.remove('active-view');
        view.classList.add('hidden-view');
    });
    allLinks.forEach(link => link.classList.remove('active'));

    trackingResult.classList.add('hidden'); // Reset tracking UI

    if (viewName === 'home') {
        viewHome.classList.add('active-view');
        viewHome.classList.remove('hidden-view');
        linkHome.classList.add('active');
    } else if (viewName === 'tracking') {
        viewTracking.classList.add('active-view');
        viewTracking.classList.remove('hidden-view');
        linkTracking.classList.add('active');
    } else if (viewName === 'send') {
        if (!currentUser || currentUser.role === 'admin') {
            alert('To send a courier, please log in as a standard user first!');
            switchView('login');
            return;
        }
        viewSend.classList.add('active-view');
        viewSend.classList.remove('hidden-view');
        linkSend.classList.add('active');

        // Map container sizing bug workaround after display: none; -> block;
        if(map) {
            setTimeout(() => { map.invalidateSize(); }, 200);
        }

    } else if (viewName === 'login') {
        if (currentUser) {
            alert("You are already logged in!");
            switchView(currentUser.role === 'admin' ? 'admin' : 'home');
            return;
        }
        viewLogin.classList.add('active-view');
        viewLogin.classList.remove('hidden-view');
        linkLogin.classList.add('active');
    } else if (viewName === 'admin-login') {
        if (currentUser && currentUser.role === 'admin') {
            switchView('admin');
            return;
        }
        viewAdminLogin.classList.add('active-view');
        viewAdminLogin.classList.remove('hidden-view');
    } else if (viewName === 'admin') {
        if (!currentUser || currentUser.role !== 'admin') {
            alert('Access Denied. You must be logged in as an admin to view the dashboard.');
            switchView('admin-login');
            return;
        }
        viewAdmin.classList.add('active-view');
        viewAdmin.classList.remove('hidden-view');
        linkAdmin.classList.add('active');
        
        renderAdminTable();
        populateUpdateDropdown();
    }
}

linkHome.addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });
linkTracking.addEventListener('click', (e) => { e.preventDefault(); switchView('tracking'); });
linkSend.addEventListener('click', (e) => { e.preventDefault(); switchView('send'); });
linkLogin.addEventListener('click', (e) => { e.preventDefault(); switchView('login'); });
linkAdmin.addEventListener('click', (e) => { e.preventDefault(); switchView('admin'); });
btnHeroTrack.addEventListener('click', () => switchView('tracking'));
btnHeroLogin.addEventListener('click', () => switchView(currentUser ? 'tracking' : 'login'));
linkGotoAdmin.addEventListener('click', (e) => { e.preventDefault(); switchView('admin-login'); });
linkBackUserLogin.addEventListener('click', (e) => { e.preventDefault(); switchView('login'); });


/* =========================================
   USER AUTH LOGIC
   ========================================= */
toggleRegister.addEventListener('click', (e) => {
    e.preventDefault();
    formLogin.classList.add('hidden');
    formRegister.classList.remove('hidden');
    authTitle.innerHTML = 'Create <span class="text-primary">Account</span>';
    authSubtitle.textContent = 'Register to sync and manage your parcels easily.';
});

toggleLogin.addEventListener('click', (e) => {
    e.preventDefault();
    formRegister.classList.add('hidden');
    formLogin.classList.remove('hidden');
    authTitle.innerHTML = 'Welcome <span class="text-primary">Back</span>';
    authSubtitle.textContent = 'Login to manage your user account.';
});

formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = loginUser.value.trim();
    const pass = loginPass.value.trim();
    
    const users = getUsers();
    const validUser = users.find(u => u.username === user && u.password === pass);

    if (validUser) {
        if (validUser.role === 'admin') {
            alert('This account is an Administrator. Please use the Admin Portal internally.');
            return;
        }
        
        currentUser = validUser;
        linkLogin.classList.add('hidden');
        linkLogout.classList.remove('hidden');
        linkSend.classList.remove('hidden'); // UNLOCK Send feature
        
        navUserDisplay.textContent = `(${validUser.username})`;
        btnHeroLogin.textContent = 'Send a Parcel';
        
        alert(`Welcome back, ${validUser.username}!`);
        switchView('send'); // Route right to sending screen
        formLogin.reset();
    } else {
        alert('Invalid user credentials.');
    }
});

formRegister.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = regUser.value.trim();
    const pass = regPass.value.trim();
    
    if (user.length < 3) { alert("Username must be at least 3 characters."); return; }
    if (pass.length < 5) { alert("Password must be at least 5 characters."); return; }
    
    const users = getUsers();
    if (users.find(u => u.username.toLowerCase() === user.toLowerCase())) {
        alert("Username is already taken."); return;
    }
    
    users.push({ username: user, password: pass, role: 'user' });
    saveUsers(users);
    alert('Account created successfully! You can now log in.');
    
    formRegister.reset();
    toggleLogin.click();
});

/* =========================================
   ADMIN AUTH LOGIC
   ========================================= */
formAdminLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = adminLoginUser.value.trim();
    const pass = adminLoginPass.value.trim();
    
    const users = getUsers();
    const validUser = users.find(u => u.username === user && u.password === pass);

    if (validUser && validUser.role === 'admin') {
        currentUser = validUser;
        linkLogin.classList.add('hidden');
        linkLogout.classList.remove('hidden');
        navUserDisplay.textContent = `(Admin)`;
        btnHeroLogin.textContent = 'Dashboard';
        
        linkAdmin.classList.remove('hidden');
        switchView('admin');
        formAdminLogin.reset();
    } else {
        alert('Invalid Admin credentials.');
    }
});

/* =========================================
   GLOBAL LOGOUT
   ========================================= */
linkLogout.addEventListener('click', (e) => {
    e.preventDefault();
    currentUser = null;
    linkAdmin.classList.add('hidden');
    linkLogin.classList.remove('hidden');
    linkSend.classList.add('hidden'); // Re-hide Send courier
    linkLogout.classList.add('hidden');
    navUserDisplay.textContent = '';
    btnHeroLogin.textContent = 'Log In or Register';
    
    alert("You have been logged out.");
    switchView('home');
});


/* =========================================
   SEND COURIER LOGIC (USER)
   ========================================= */
formUserSend.addEventListener('submit', (e) => {
    e.preventDefault();
    const receiver = sendReceiver.value.trim();
    const dest = sendAddress.value.trim();
    
    if (receiver && dest && dest !== "Fetching address from map...") {
        const newId = 'SC-' + Math.floor(100000 + Math.random() * 900000);
        const parcels = getParcels();
        parcels.push({ 
            id: newId, 
            sender: currentUser.username, 
            destination: `${receiver} - ${dest}`, 
            status: 'Pending', 
            date: new Date().toISOString() 
        });
        saveParcels(parcels);
        
        formUserSend.reset();
        if (marker) map.removeLayer(marker);

        alert(`Your Courier has been successfully booked!\n\nYour Tracking ID: ${newId}`);
        
        // Auto-navigate user to Tracking to watch their new parcel!
        switchView('tracking');
        trackingInput.value = newId;
        btnTrack.click();
    } else {
        alert("Please drop a pin on the map to set a valid destination.");
    }
});


/* =========================================
   TRACKING LOGIC
   ========================================= */
function getStatusClassHelper(status) { return 'status-' + status.replace(/\s+/g, '-'); }

function renderTimeline(currentStatus) {
    timelineList.innerHTML = '';
    const currentIndex = STATUS_STAGES.indexOf(currentStatus);

    STATUS_STAGES.forEach((stage, index) => {
        const li = document.createElement('li');
        li.className = 'timeline-item';
        
        if (index < currentIndex) li.classList.add('completed');
        else if (index === currentIndex) {
            li.classList.add('active');
            if (stage === 'Delivered') li.classList.add('completed');
        }

        li.innerHTML = `
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <h4>${stage}</h4>
                <p>${index <= currentIndex ? 'Status updated successfully' : 'Pending update'}</p>
            </div>
        `;
        timelineList.appendChild(li);
    });
}

btnTrack.addEventListener('click', () => {
    const id = trackingInput.value.trim().toUpperCase();
    if (!id) return;

    const parcel = getParcelById(id);
    if (parcel) {
        displayId.textContent = parcel.id;
        displayDest.textContent = parcel.destination;
        displayStatusBadge.textContent = parcel.status;
        displayStatusBadge.className = `status-badge badge ${getStatusClassHelper(parcel.status)}`;
        renderTimeline(parcel.status);
        trackingResult.classList.remove('hidden');
    } else {
        alert('Tracking ID not found. Please try again.');
        trackingResult.classList.add('hidden');
    }
});

trackingInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); btnTrack.click(); }
});

/* =========================================
   ADMIN DOMAIN LOGIC
   ========================================= */
function renderAdminTable() {
    const parcels = getParcels();
    parcels.sort((a, b) => new Date(b.date) - new Date(a.date));
    tableBody.innerHTML = '';
    parcels.forEach(p => {
        const tr = document.createElement('tr');
        const dateObj = new Date(p.date);
        tr.innerHTML = `
            <td><strong>${p.id}</strong></td>
            <td>${p.sender}</td>
            <td>
                <div style="max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.destination}">
                    ${p.destination}
                </div>
            </td>
            <td><span class="badge ${getStatusClassHelper(p.status)}">${p.status}</span></td>
            <td>${dateObj.toLocaleDateString()}</td>
        `;
        tableBody.appendChild(tr);
    });
}

function populateUpdateDropdown() {
    const parcels = getParcels();
    updateSelectId.innerHTML = '<option value="" disabled selected>-- Select Tracking ID --</option>';
    parcels.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.id} (${p.status})`;
        updateSelectId.appendChild(option);
    });
    updateSelectStatus.disabled = true;
    btnUpdateStatus.disabled = true;
}

formNewParcel.addEventListener('submit', (e) => {
    e.preventDefault();
    const sender = newSender.value.trim();
    const dest = newDestination.value.trim();
    
    if (sender && dest) {
        const newId = 'SC-' + Math.floor(100000 + Math.random() * 900000);
        const parcels = getParcels();
        parcels.push({ id: newId, sender: sender, destination: dest, status: 'Pending', date: new Date().toISOString() });
        saveParcels(parcels);
        
        formNewParcel.reset();
        renderAdminTable();
        populateUpdateDropdown();
        alert(`New shipment created successfully!\nTracking ID: ${newId}`);
    }
});

updateSelectId.addEventListener('change', () => {
    const id = updateSelectId.value;
    if (id) {
        const parcel = getParcelById(id);
        updateSelectStatus.value = parcel.status;
        updateSelectStatus.disabled = false;
        btnUpdateStatus.disabled = false;
    }
});

formUpdateStatus.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = updateSelectId.value;
    const newStatus = updateSelectStatus.value;
    
    if (id && newStatus) {
        const parcels = getParcels();
        const index = parcels.findIndex(p => p.id === id);
        
        if (index > -1) {
            parcels[index].status = newStatus;
            saveParcels(parcels);
            renderAdminTable();
            populateUpdateDropdown();
            alert(`Status for ${id} updated to ${newStatus}.`);
        }
    }
});

/* =========================================
   INITIALIZATION
   ========================================= */
initData();
switchView('home');
// We initialize map globally once the DOM is ready so it has the DOM context.
document.addEventListener('DOMContentLoaded', initMap);
