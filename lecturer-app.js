import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDVqMmPMCDX5JFb85kTlfm6fCk8cNKciH4",
    authDomain: "ait-attendance-20bb6.firebaseapp.com",
    projectId: "ait-attendance-20bb6",
    storageBucket: "ait-attendance-20bb6.firebasestorage.app",
    messagingSenderId: "262056210376",
    appId: "1:262056210376:web:c8a7260a8491f932a69afd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentLecturer = null;
let myCourses = [];
let unsubscribeAttendance = null; 

// --- Initial Routing ---
const hash = window.location.hash.replace('#', '');
const initialView = document.getElementById(hash) ? hash : 'dashboard';

setupNavigation();
navigateTo(initialView, false);
history.replaceState({ view: initialView }, '', '#' + initialView);

initPWA();

// --- Navigation Logic ---
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.getAttribute('data-target'), true);
        });
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        const targetId = e.state && e.state.view ? e.state.view : (window.location.hash.replace('#', '') || 'dashboard');
        navigateTo(targetId, false);
    });
}

function navigateTo(targetId, updateHistory = true) {
    const targetView = document.getElementById(targetId);
    if (!targetView) return;

    if (updateHistory) history.pushState({ view: targetId }, '', '#' + targetId);

    // Update active state on sidebar links
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('bg-blue-800', 'text-yellow-400', 'active');
        l.classList.add('text-white');
        if (l.getAttribute('data-target') === targetId) l.classList.add('bg-blue-800', 'text-yellow-400', 'active');
    });

    // Strictly hide inactive sections and show active section
    document.querySelectorAll('.view-section').forEach(view => {
        view.classList.remove('active');
        view.style.display = 'none'; // Hard JS fallback to prevent stacking
        if (view.id === targetId) {
            view.classList.add('active');
            view.style.display = 'block';
        }
    });

    // Auto-close mobile sidebar if open
    if(window.innerWidth < 1024 && !document.getElementById('sidebar').classList.contains('-translate-x-full')) {
        window.toggleSidebar(); 
    }
}

function initPWA() {
    let deferredPrompt;
    const installButtons = document.querySelectorAll('.pwa-install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButtons.forEach(btn => btn.classList.remove('hidden'));
    });

    installButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            installButtons.forEach(b => b.classList.add('hidden'));
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt = null;
            }
        });
    });

    window.addEventListener('appinstalled', () => installButtons.forEach(btn => btn.classList.add('hidden')));

    if ('serviceWorker' in navigator) {
        let isRefreshing = false;
        
        // CRITICAL: This is what forces the device to automatically reload the page 
        // the second the new update finishes downloading in the background.
        navigator.serviceWorker.addEventListener('controllerchange', () => { 
            if (!isRefreshing) { 
                isRefreshing = true; 
                window.location.reload(); 
            } 
        });

        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                
                // Check for Vercel updates on load
                registration.update();
                
                // Check for Vercel updates every time the user brings the app to the foreground
                document.addEventListener('visibilitychange', () => { 
                    if (document.visibilityState === 'visible') registration.update(); 
                });
                
                // Check for Vercel updates every 15 minutes if they leave the app open all day
                setInterval(() => registration.update(), 15 * 60 * 1000);
                
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing; 
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => { 
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Tell the new update to take over instantly
                            newWorker.postMessage({ type: 'SKIP_WAITING' }); 
                        }
                    });
                });
            } catch (err) { console.error('SW error:', err); }
        });
    }
}
// --- Login & Logout ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.toLowerCase().trim();
    const btn = e.target.querySelector('button'); 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

    try {
        const q = query(collection(db, "lecturers"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) { 
            window.showMessage("Email not found. Please contact an Administrator.", "error"); 
            btn.innerHTML = 'Access Portal <i class="fa-solid fa-arrow-right"></i>'; 
            return; 
        }

        querySnapshot.forEach((doc) => { currentLecturer = { id: doc.id, ...doc.data() }; });
        
        document.getElementById('user-name').innerText = window.toTitleCase(currentLecturer.name);
        document.getElementById('user-dept').innerText = window.toTitleCase(currentLecturer.dept);
        document.getElementById('welcome-name').innerText = window.toTitleCase(currentLecturer.name);
        document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentLecturer.name)}&background=facc15&color=1e3a8a`;
        
        await loadMyCourses(); 
        startStudentAttendanceListener(); 
        
        const loginView = document.getElementById('login-view'); 
        loginView.classList.add('opacity-0'); 
        setTimeout(() => loginView.style.display = 'none', 300);

    } catch (error) { 
        window.showMessage("Database error: " + error.message, "error"); 
        btn.innerHTML = 'Access Portal <i class="fa-solid fa-arrow-right"></i>'; 
    }
});

const logout = () => {
    currentLecturer = null; 
    myCourses = [];
    if (unsubscribeAttendance) { unsubscribeAttendance(); unsubscribeAttendance = null; }
    
    const loginView = document.getElementById('login-view'); 
    loginView.style.display = 'flex'; 
    setTimeout(() => loginView.classList.remove('opacity-0'), 10);
    
    document.getElementById('login-email').value = ''; 
    document.querySelector('#login-form button').innerHTML = 'Access Portal <i class="fa-solid fa-arrow-right"></i>';
    
    window.resetClockInState(); 
    document.getElementById('clock-in-course').value = "";
    
    // Return to dashboard on logout to prevent state confusion
    navigateTo('dashboard', false);
};

// --- Course Data Loading ---
async function loadMyCourses() {
    const q = query(collection(db, "courses"), where("lecturerId", "==", currentLecturer.id));
    const querySnapshot = await getDocs(q);
    myCourses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    document.getElementById('stat-my-courses').innerText = myCourses.length;
    
    const tbody = document.getElementById('my-courses-tbody');
    const clockInSelect = document.getElementById('clock-in-course'); 
    
    tbody.innerHTML = ''; 
    clockInSelect.innerHTML = '<option value="" disabled selected>Select Course...</option>';

    if (myCourses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="px-6 py-4 text-center text-slate-500">No courses assigned yet.</td></tr>`;
        clockInSelect.innerHTML = '<option value="" disabled selected>No courses assigned</option>';
    } else {
        myCourses.forEach(c => {
            tbody.insertAdjacentHTML('beforeend', `<tr><td class="px-6 py-4 font-medium text-slate-800">${c.code.toUpperCase()}</td><td class="px-6 py-4 text-slate-600">${window.toTitleCase(c.name)}</td></tr>`);
            clockInSelect.innerHTML += `<option value="${c.code}|${c.name}">${c.code.toUpperCase()} - ${window.toTitleCase(c.name)}</option>`;
        });
        clockInSelect.innerHTML += `<option value="N/A|General Duty">General Duty / Office Hours</option>`;
    }
}

// --- Real-Time Roster Listener ---
function startStudentAttendanceListener() {
    if (unsubscribeAttendance) unsubscribeAttendance();
    
    const dateInput = document.getElementById('roster-date-filter');
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    
    const qAtt = query(collection(db, "student_attendance"), where("date", "==", selectedDate));
    
    unsubscribeAttendance = onSnapshot(qAtt, (snapshot) => {
        const allForDate = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const myCourseCodes = myCourses.map(c => c.code.toLowerCase());
        const myStudents = allForDate.filter(s => myCourseCodes.includes(s.courseCode.toLowerCase()));
        
        if (selectedDate === new Date().toISOString().split('T')[0]) {
            document.getElementById('stat-students-today').innerText = myStudents.length;
        }
        
        renderLecturerStudentsTable(myStudents);
    });
}

document.getElementById('roster-date-filter').addEventListener('change', startStudentAttendanceListener);

function renderLecturerStudentsTable(studentsData) {
    const tbody = document.getElementById('lecturer-students-tbody'); 
    tbody.innerHTML = '';
    
    studentsData.sort((a, b) => b.time.localeCompare(a.time));
    
    if (studentsData.length === 0) { 
        return tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-500 bg-white"><i class="fa-solid fa-clipboard-list text-3xl mb-3 text-slate-300 block"></i>No students have been logged in your courses on this date.</td></tr>`; 
    }
    
    studentsData.forEach(student => {
        tbody.insertAdjacentHTML('beforeend', `<tr><td class="px-6 py-3 font-medium text-slate-800">${student.studentId}</td><td class="px-6 py-3 text-slate-600">${window.toTitleCase(student.name)}</td><td class="px-6 py-3 text-slate-600 font-medium">${student.courseCode.toUpperCase()}</td><td class="px-6 py-3 text-slate-600">${student.stream || '-'}</td><td class="px-6 py-3 text-slate-500 font-mono text-xs">${student.time}</td><td class="px-6 py-3 text-center">${window.getStatusBadge(student.status)}</td></tr>`);
    });
}

// --- Lecturer GPS Clock-In ---
const clockInLecturer = () => {
    if (!currentLecturer) return;
    const selectedValue = document.getElementById('clock-in-course').value;
    if (!selectedValue) return window.showMessage("Please select a course before clocking in.", "error");
    
    const btn = document.getElementById('clock-in-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Locating...'; 
    btn.disabled = true;

    if (!navigator.geolocation) return finalizeClockIn("GPS not supported by browser", selectedValue);
    
    navigator.geolocation.getCurrentPosition(
        (pos) => finalizeClockIn(`${pos.coords.latitude}, ${pos.coords.longitude}`, selectedValue), 
        () => finalizeClockIn("Location Access Denied", selectedValue)
    );
};

async function finalizeClockIn(gpsData, selectedCourseValue) {
    const btn = document.getElementById('clock-in-btn');
    const statusText = document.getElementById('clock-in-status');
    const now = new Date();
    const [courseCode, courseName] = selectedCourseValue.split('|');

    try {
        await addDoc(collection(db, "lecturer_attendance"), { 
            lecturerId: currentLecturer.id, 
            name: window.toTitleCase(currentLecturer.name), 
            date: now.toISOString().split('T')[0], 
            time: now.toTimeString().split(' ')[0].substring(0, 5), 
            gps: gpsData, 
            status: 'present', 
            courseCode: courseCode, 
            courseName: window.toTitleCase(courseName) 
        });
        
        btn.classList.replace('bg-yellow-400', 'bg-emerald-500'); 
        btn.classList.replace('text-blue-900', 'text-white'); 
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Clocked In';
        
        statusText.classList.remove('hidden'); 
        statusText.classList.add('text-emerald-300'); 
        statusText.innerText = `Recorded for ${window.toTitleCase(courseName)} at ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        
        window.showMessage("Your attendance has been recorded.");
    } catch (err) { 
        window.showMessage("Failed to clock in: " + err.message, "error"); 
        btn.innerHTML = '<i class="fa-solid fa-location-dot"></i> Clock In Now'; 
        btn.disabled = false; 
    }
}

// Expose logic methods to the global scope
window.logout = logout; 
window.clockInLecturer = clockInLecturer;