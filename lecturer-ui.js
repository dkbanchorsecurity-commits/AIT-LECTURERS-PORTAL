// --- Sidebar Toggle ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    sidebar.classList.toggle('-translate-x-full');
    if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('opacity-100'), 10);
    } else {
        overlay.classList.remove('opacity-100');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

// --- Toast Notifications ---
function showMessage(msg, type = "success") {
    const box = document.getElementById('message-box');
    const icon = box.querySelector('i');
    document.getElementById('message-text').innerText = msg;
    
    if (type === "error") {
        icon.className = "fa-solid fa-circle-exclamation text-red-400 flex-shrink-0";
        box.classList.replace('bg-slate-800', 'bg-red-900');
    } else {
        icon.className = "fa-solid fa-circle-check text-green-400 flex-shrink-0";
        box.classList.replace('bg-red-900', 'bg-slate-800');
    }

    box.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => box.classList.add('translate-y-24', 'opacity-0'), 3000);
}

// --- Formatting Helpers ---
function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getStatusBadge(status) {
    const baseClass = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold";
    if (status === 'present') return `<span class="${baseClass} bg-emerald-100 text-emerald-700">Present</span>`;
    if (status === 'late') return `<span class="${baseClass} bg-amber-100 text-amber-700">Late</span>`;
    return `<span class="${baseClass} bg-red-100 text-red-700">Absent</span>`;
}

// --- Roster Date Initialization ---
function initializeDatePicker() {
    const dateInput = document.getElementById('roster-date-filter');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

// --- Reset Clock-In UI ---
function resetClockInState() {
    const btn = document.getElementById('clock-in-btn');
    const statusText = document.getElementById('clock-in-status');
    
    if (btn) {
        btn.classList.remove('bg-emerald-500', 'text-white');
        btn.classList.add('bg-yellow-400', 'text-blue-900');
        btn.innerHTML = '<i class="fa-solid fa-location-dot"></i> Clock In Now';
        btn.disabled = false;
    }
    
    if (statusText) {
        statusText.classList.add('hidden');
        statusText.innerText = '';
    }
}

// Run immediately
initializeDatePicker();

// Expose functions to global scope for HTML attributes
window.toggleSidebar = toggleSidebar;
window.showMessage = showMessage;
window.toTitleCase = toTitleCase;
window.getStatusBadge = getStatusBadge;
window.resetClockInState = resetClockInState;