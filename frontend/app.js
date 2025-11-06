// --- Configuration ---
const API_BASE_URL = 'http://127.0.0.1:5000/api'; 

// --- State ---
let clients = [];
let agents = [];
let contracts = [];

// --- DOM Elements ---
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');
const toastContainer = document.getElementById('toast-container');
// Auth
const authScreen = document.getElementById('auth-screen');
const loginForm = document.getElementById('form-login');
const registerForm = document.getElementById('form-register');
const showLoginLink = document.getElementById('show-login');
const showRegisterLink = document.getElementById('show-register');
// App
const dashboardApp = document.getElementById('dashboard-app');
const logoutButton = document.getElementById('logout-button');
const profileInitial = document.getElementById('profile-initial');
// 🔹 NEW: Modal Elements
const confirmModal = document.getElementById('confirm-modal');
const confirmModalTitle = document.getElementById('confirm-modal-title');
const confirmModalText = document.getElementById('confirm-modal-text');
const confirmModalCancel = document.getElementById('confirm-modal-cancel');
const confirmModalConfirm = document.getElementById('confirm-modal-confirm');

// --- Utility Functions ---

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease-out forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
    
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeOut { to { opacity: 0; transform: translateX(100%); } }`;
    document.head.appendChild(style);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
}

// 🔹 NEW: Reusable Confirmation Modal
let modalConfirmCallback = null;
function showConfirmModal(title, text, onConfirm) {
    confirmModalTitle.textContent = title;
    confirmModalText.textContent = text;
    modalConfirmCallback = onConfirm; // Store the callback
    confirmModal.classList.remove('hidden');
}

confirmModalCancel.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    modalConfirmCallback = null;
});

confirmModalConfirm.addEventListener('click', () => {
    if (modalConfirmCallback) {
        modalConfirmCallback(); // Execute the stored callback
    }
    confirmModal.classList.add('hidden');
    modalConfirmCallback = null;
});


function showPage(pageId) {
    pages.forEach(page => {
        page.id === `page-${pageId}` ? page.classList.remove('hidden') : page.classList.add('hidden');
    });
    navLinks.forEach(link => {
        link.dataset.page === pageId ? link.classList.add('active') : link.classList.remove('active');
    });
    
    // 🔹 UPDATED: Load dropdowns on page switch
    switch(pageId) {
        case 'dashboard': 
            loadDashboardStats(); 
            break;
        case 'add-client': 
            // We now load clients into the *delete* dropdown
            populateSelect('delete-client-select', clients, 'ClientID', ['Fname', 'Lname'], 'Select a client to delete');
            break;
        case 'add-contract': 
            populateSelect('contract-client-id', clients, 'ClientID', ['Fname', 'Lname'], 'Select a client');
            populateSelect('delete-contract-select', contracts, 'ContractID', ['ContractID', 'ClientName'], 'Select a contract to delete');
            break;
        case 'add-payment': 
            populateSelect('payment-contract-id', contracts, 'ContractID', ['ContractID', 'ClientName'], 'Select a contract');
            break;
        case 'agent-earnings': 
            populateSelect('agent-select', agents, 'AgentID', ['Fname', 'Lname'], 'Select an agent');
            break;
        case 'total-payments': 
            populateSelect('total-payment-contract-select', contracts, 'ContractID', ['ContractID', 'ClientName'], 'Select a contract');
            break;
        // 🔹 NEW: Case for Nested Query page
        case 'high-value-clients':
            loadHighValueClients();
            break;
    }
}

function populateSelect(selectId, data, valueKey, textKeys, placeholder) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentValue = select.value; // Preserve current selection if possible
    select.innerHTML = `<option value="">${placeholder}</option>`;
    data.forEach(item => {
        const text = textKeys.map(key => item[key]).join(' - ');
        select.innerHTML += `<option value="${item[valueKey]}">${text}</option>`;
    });
    select.value = currentValue; // Re-apply selection
}

// ============================================================
//  AUTHENTICATION & API FUNCTIONS
// ============================================================

function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function apiFetch(url, options = {}) {
    const res = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: getAuthHeaders(),
    });

    if (res.status === 401) {
        logout();
        throw new Error('Session expired. Please login again.');
    }
    return res;
}

function logout() {
    localStorage.removeItem('access_token');
    dashboardApp.classList.add('hidden');
    authScreen.classList.remove('hidden');
    loginForm.reset();
    registerForm.reset();
    showToast('You have been logged out.', 'success');
}

function setProfileInitial(username) {
    if (username) {
        profileInitial.textContent = username.charAt(0).toUpperCase();
        profileInitial.title = `Logged in as: ${username}`;
    }
}

// --- API Fetching Functions ---

async function fetchInitialData() {
    try {
        const [clientsRes, agentsRes, contractsRes] = await Promise.all([
            apiFetch('/clients'),
            apiFetch('/agents'),
            apiFetch('/contracts')
        ]);
        
        if (!clientsRes.ok || !agentsRes.ok || !contractsRes.ok) {
            throw new Error('Failed to load initial data from API.');
        }
        
        clients = await clientsRes.json();
        agents = await agentsRes.json();
        contracts = await contractsRes.json();
        
        // After fetching, re-populate any dropdowns that might be visible
        // This makes sure our delete dropdowns are fresh
        showPage(document.querySelector('.nav-link.active').dataset.page);
        
    } catch (error) {
        if (!error.message.includes('Session expired')) {
             showToast('Failed to load initial data. Check if backend is running.', 'error');
        }
    }
}

async function loadDashboardStats() {
    const container = document.getElementById('stats-container');
    try {
        const res = await apiFetch('/stats');
        if (!res.ok) throw new Error('Failed to fetch stats.');
        
        const stats = await res.json();
        
        container.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-xl shadow-lg"><h4 class="text-sm font-medium text-gray-400">Total Clients</h4><p class="text-4xl font-bold mt-2">${stats.clients}</p></div>
            <div class="bg-gray-800 p-6 rounded-xl shadow-lg"><h4 class="text-sm font-medium text-gray-400">Total Contracts</h4><p class="text-4xl font-bold mt-2">${stats.contracts}</p></div>
            <div class="bg-gray-800 p-6 rounded-xl shadow-lg"><h4 class="text-sm font-medium text-gray-400">Total Agents</h4><p class="text-4xl font-bold mt-2">${stats.agents}</p></div>
            <div class="bg-gray-800 p-6 rounded-xl shadow-lg"><h4 class="text-sm font-medium text-gray-400">Total Paid</h4><p class="text-4xl font-bold mt-2">${formatCurrency(stats.totalPaid)}</p></div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="col-span-4 text-red-400">Failed to load dashboard stats.</div>`;
        showToast(error.message, 'error');
    }
}

// 🔹 NEW: Function for Nested Query page
async function loadHighValueClients() {
    const tableBody = document.getElementById('high-value-clients-table-body');
    const container = document.getElementById('high-value-clients-container');
    const loading = document.getElementById('high-value-clients-loading');
    
    loading.classList.remove('hidden');
    container.classList.add('hidden');
    tableBody.innerHTML = '';
    
    try {
        const res = await apiFetch('/clients/high_value');
        if (!res.ok) throw new Error('Failed to fetch high-value clients.');
        
        const data = await res.json();
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-500">No clients found with above-average contracts.</td></tr>`;
        } else {
            tableBody.innerHTML = data.map(row => `
                <tr class="border-b border-gray-700 hover:bg-gray-700/50">
                    <td class="p-4">${row.Fname} ${row.Lname} (ID: ${row.ClientID})</td>
                    <td class="p-4">${row.ContractID}</td>
                    <td class="p-4 text-right">${formatCurrency(row.Amount)}</td>
                </tr>`).join('');
        }
        container.classList.remove('hidden');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        loading.classList.add('hidden');
    }
}


// --- Event Listeners ---

// Toggle between Login and Register forms
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Register Form Listener
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(registerForm).entries());
    if (!data.username || !data.password) {
        showToast('Username and password are required.', 'error');
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to register');
        showToast(result.message, 'success');
        registerForm.reset();
        showLoginLink.click();
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// Login Form Listener
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm).entries());
    if (!data.username || !data.password) {
        showToast('Username and password are required.', 'error');
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to login');
        
        localStorage.setItem('access_token', result.access_token);
        showToast('Login Successful! Welcome.', 'success');
        authScreen.classList.add('hidden');
        dashboardApp.classList.remove('hidden');
        setProfileInitial(data.username);
        init();
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// Logout Button Listener
logoutButton.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
});


// Navigation
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = e.target.closest('.nav-link').dataset.page;
        showPage(pageId);
    });
});

// Form: Add Client
document.getElementById('form-add-client').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
        const res = await apiFetch('/add_client', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to add client');
        showToast(result.message, 'success');
        form.reset();
        fetchInitialData(); // 🔹 Refresh all data
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// 🔹 NEW: Delete Client Button
document.getElementById('btn-delete-client').addEventListener('click', async () => {
    const clientId = document.getElementById('delete-client-select').value;
    if (!clientId) {
        showToast('Please select a client to delete.', 'error');
        return;
    }
    
    const clientName = clients.find(c => c.ClientID == clientId)?.Fname || 'this client';
    
    showConfirmModal(
        'Delete Client?',
        `This will permanently delete ${clientName} and all of their contracts and payments. This cannot be undone.`,
        async () => {
            try {
                const res = await apiFetch(`/client/${clientId}`, { method: 'DELETE' });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);
                
                showToast(result.message, 'success');
                fetchInitialData(); // Refresh all data
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    );
});


// Form: Add Contract
const contractForm = document.getElementById('form-add-contract');
const startDateInput = document.getElementById('contract-start-date');
const endDateInput = document.getElementById('contract-end-date');
const dateError = document.getElementById('date-validation-error');
const contractSubmitBtn = document.getElementById('submit-add-contract');

function validateContractDates() {
    if (startDateInput.value && endDateInput.value && endDateInput.value <= startDateInput.value) {
        dateError.classList.remove('hidden');
        contractSubmitBtn.disabled = true;
        contractSubmitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        dateError.classList.add('hidden');
        contractSubmitBtn.disabled = false;
        contractSubmitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}
startDateInput.addEventListener('change', validateContractDates);
endDateInput.addEventListener('change', validateContractDates);

contractForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
        const res = await apiFetch('/add_contract', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to add contract');
        showToast(result.message, 'success');
        form.reset();
        fetchInitialData(); // 🔹 Refresh all data
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// 🔹 NEW: Delete Contract Button
document.getElementById('btn-delete-contract').addEventListener('click', async () => {
    const contractId = document.getElementById('delete-contract-select').value;
    if (!contractId) {
        showToast('Please select a contract to delete.', 'error');
        return;
    }
    
    showConfirmModal(
        'Delete Contract?',
        `This will permanently delete Contract #${contractId} and all of its payments. This cannot be undone.`,
        async () => {
            try {
                const res = await apiFetch(`/contract/${contractId}`, { method: 'DELETE' });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);
                
                showToast(result.message, 'success');
                fetchInitialData(); // Refresh all data
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    );
});


// Page: Agent Earnings - Dropdown Change
document.getElementById('agent-select').addEventListener('change', async (e) => {
    const agentId = e.target.value;
    const tableBody = document.getElementById('agent-earnings-table-body');
    const container = document.getElementById('agent-earnings-container');
    const loading = document.getElementById('agent-earnings-loading');
    
    if (!agentId) {
        container.classList.add('hidden');
        tableBody.innerHTML = '';
        return;
    }
    
    loading.classList.remove('hidden');
    container.classList.add('hidden');
    
    try {
        const res = await apiFetch(`/agent_earnings/${agentId}`);
        if (!res.ok) throw new Error('Failed to fetch earnings.');
        
        const earnings = await res.json();
        if (earnings.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">No earnings found.</td></tr>`;
        } else {
            tableBody.innerHTML = earnings.map(row => `
                <tr class="border-b border-gray-700 hover:bg-gray-700/50">
                    <td class="p-4">${row.ContractID}</td>
                    <td class="p-4">${row.CommissionID}</td>
                    <td class="p-4 text-right">${formatCurrency(row.ContractAmount)}</td>
                    <td class="p-4 text-right">${row.Percentage}%</td>
                    <td class="p-4 text-right">${formatCurrency(row.PotentialEarning)}</td>
                    <td class="p-4 text-right font-medium text-white">${formatCurrency(row.ActualEarnedAmount)}</td>
                </tr>`).join('');
        }
        container.classList.remove('hidden');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        loading.classList.add('hidden');
    }
});

// Page: Total Payments - Dropdown Change
document.getElementById('total-payment-contract-select').addEventListener('change', async (e) => {
    const contractId = e.target.value;
    const resultDiv = document.getElementById('total-payment-result');
    const amountP = document.getElementById('total-payment-amount');
    const loading = document.getElementById('total-payment-loading');
    
    if (!contractId) {
        resultDiv.classList.add('hidden');
        return;
    }
    
    loading.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    
    try {
        const res = await apiFetch(`/total_payment/${contractId}`);
        if (!res.ok) throw new Error('Failed to fetch total.');
        
        const result = await res.json();
        amountP.textContent = formatCurrency(result.total);
        resultDiv.classList.remove('hidden');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        loading.classList.add('hidden');
    }
});

// Page: Add Payment - Dropdown Change (to load payment history)
document.getElementById('payment-contract-id').addEventListener('change', async (e) => {
    const contractId = e.target.value;
    const tableBody = document.getElementById('payment-history-table-body');
    const loading = document.getElementById('payment-history-loading');
    
    document.getElementById('payment-commission-report').classList.add('hidden');
    if (!contractId) {
        tableBody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-500">Select a contract.</td></tr>`;
        return;
    }
    
    loading.classList.remove('hidden');
    tableBody.innerHTML = '';
    
    try {
        const res = await apiFetch(`/payments/${contractId}`);
        if (!res.ok) throw new Error('Failed to fetch payments.');
        
        const payments = await res.json();
        if (payments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-500">No payments found.</td></tr>`;
        } else {
            tableBody.innerHTML = payments.map(p => `
                <tr class="border-b border-gray-700">
                    <td class="p-3">${p.PaymentNo}</td>
                    <td class="p-3">${formatDate(p.PaymentDate)}</td>
                    <td class="p-3 text-right">${formatCurrency(p.Amount)}</td>
                </tr>`).join('');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        loading.classList.add('hidden');
    }
});

// Form: Add Payment
document.getElementById('form-add-payment').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    
    const reportContainer = document.getElementById('payment-commission-report');
    const reportContent = document.getElementById('commission-report-content');
    
    if (!data.contract_id || !data.amount) {
        showToast('Please select a contract and enter an amount.', 'error');
        return;
    }

    try {
        const res = await apiFetch('/add_payment', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (!res.ok) throw new Error(result.error || 'Failed to add payment');
        
        showToast(result.message, 'success');
        form.reset();
        
        const report = result.commissionReport;
        reportContent.innerHTML = `
            <p>Commission ID: <span class="font-medium text-white">${report.CommissionID}</span></p>
            <p>Amount Before: <span class="font-medium text-white">${formatCurrency(report.PreAmount)}</span></p>
            <p>Amount After: <span class="font-medium text-green-400">${formatCurrency(report.PostAmount)}</span></p>
            <p>Change: <span class="font-medium text-green-400">+${formatCurrency(report.PostAmount - report.PreAmount)}</span></p>
        `;
        reportContainer.classList.remove('hidden');
        
        // Refresh payment list for this contract
        document.getElementById('payment-contract-id').dispatchEvent(new Event('change'));
        
    } catch (error) {
        showToast(error.message, 'error');
    }
});


// --- Initial Load ---
function init() {
    // Set default page
    showPage('dashboard');
    // Fetch all data needed for dropdowns
    fetchInitialData();
}

// --- Check for existing token on page load ---
function checkAuthOnLoad() {
    const token = localStorage.getItem('access_token');
    if (token) {
        // We have a token, so we're "logged in"
        // Try to parse token to get username (simple way, not validating signature)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // 'sub' is the identity (username) set in Flask
            setProfileInitial(payload.sub); 
        } catch (e) {
            // Token is invalid or malformed
            console.error("Invalid token:", e);
            logout(); // Clear the bad token
            return;
        }
        
        authScreen.classList.add('hidden');
        dashboardApp.classList.remove('hidden');
        init(); // Load all the app data
    } else {
        // No token, show login screen
        authScreen.classList.remove('hidden');
        dashboardApp.classList.add('hidden');
    }
}

// Run the auth check as soon as the script loads
checkAuthOnLoad();