// Authentication check
const token = localStorage.getItem('siemToken');
const user = JSON.parse(localStorage.getItem('siemUser') || '{}');

if (!token) {
  window.location.href = '/login.html';
}

// Socket.IO connection
const socket = io();

// State
let currentPage = 'dashboard';
let alertsChart = null;
let eventsChart = null;

// Initialize app
function initApp() {
  document.getElementById('userName').textContent = user.username || 'User';
  document.getElementById('userRole').textContent = user.role || 'analyst';

  // Show/hide admin pages based on role
  const adminPages = document.querySelectorAll('#rulesNav, #adminNav');
  if (user.role === 'admin') {
    adminPages.forEach(page => page.style.display = 'block');
  }

  // Add event listeners
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const page = e.currentTarget.getAttribute('data-page');
      if (page === 'logout') {
        logout();
      } else {
        navigateTo(page);
      }
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Load initial data
  loadDashboard();
}

// Navigation
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  document.getElementById(page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  // Update title
  const titles = {
    dashboard: 'Dashboard',
    events: 'Security Events',
    alerts: 'Alerts',
    incidents: 'Incidents',
    rules: 'Detection Rules',
    admin: 'Admin Panel'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  currentPage = page;

  // Load page data
  switch (page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'events':
      loadEvents();
      break;
    case 'alerts':
      loadAlerts();
      break;
    case 'incidents':
      loadIncidents();
      break;
    case 'rules':
      loadRules();
      break;
    case 'admin':
      loadAdminStats();
      break;
  }
}

// Dashboard
async function loadDashboard() {
  try {
    const [dashboard, events, alerts, analytics] = await Promise.all([
      fetch('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/events', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/alerts', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/analytics/overview', { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const dashData = await dashboard.json();
    const eventsData = await events.json();
    const alertsData = await alerts.json();
    const analyticsData = await analytics.json();

    // Update summary cards
    document.getElementById('totalEvents').textContent = dashData.data.totalEvents;
    document.getElementById('criticalAlerts').textContent = dashData.data.criticalAlerts;
    document.getElementById('openIncidents').textContent = dashData.data.openIncidents;
    document.getElementById('resolvedToday').textContent = dashData.data.resolvedToday;

    // Render events table
    const eventsTable = document.getElementById('dashboardEventsTable');
    eventsTable.innerHTML = '';
    (eventsData.data || []).slice(0, 5).forEach(event => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${event.source}</td>
        <td>${event.eventType}</td>
        <td><span class="badge ${event.severity}">${event.severity}</span></td>
        <td>${event.message}</td>
      `;
      eventsTable.appendChild(tr);
    });

    // Render alerts table
    const alertsTable = document.getElementById('dashboardAlertsTable');
    alertsTable.innerHTML = '';
    (alertsData.data || []).slice(0, 5).forEach(alert => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${alert.title}</td>
        <td><span class="badge ${alert.severity}">${alert.severity}</span></td>
        <td><span class="badge ${alert.status}">${alert.status}</span></td>
      `;
      alertsTable.appendChild(tr);
    });

    // Render charts
    renderCharts(analyticsData.data);
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

// Events
async function loadEvents() {
  try {
    const response = await fetch('/api/events', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();

    const table = document.getElementById('eventsTable');
    table.innerHTML = '';

    (data.data || []).forEach(event => {
      const tr = document.createElement('tr');
      const timestamp = new Date(event.timestamp).toLocaleString();
      tr.innerHTML = `
        <td>${event.source}</td>
        <td>${event.eventType}</td>
        <td><span class="badge ${event.severity}">${event.severity}</span></td>
        <td>${event.message}</td>
        <td>${timestamp}</td>
      `;
      table.appendChild(tr);
    });
  } catch (error) {
    console.error('Failed to load events:', error);
  }
}

async function searchEvents() {
  const q = document.getElementById('eventSearch').value.trim();
  const url = q ? `/api/search?q=${encodeURIComponent(q)}` : '/api/events';

  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();

    const table = document.getElementById('eventsTable');
    table.innerHTML = '';

    (data.data || []).forEach(event => {
      const tr = document.createElement('tr');
      const timestamp = new Date(event.timestamp).toLocaleString();
      tr.innerHTML = `
        <td>${event.source}</td>
        <td>${event.eventType}</td>
        <td><span class="badge ${event.severity}">${event.severity}</span></td>
        <td>${event.message}</td>
        <td>${timestamp}</td>
      `;
      table.appendChild(tr);
    });
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// Alerts
async function loadAlerts() {
  try {
    const response = await fetch('/api/alerts', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();

    const table = document.getElementById('alertsTable');
    table.innerHTML = '';

    (data.data || []).forEach(alert => {
      const tr = document.createElement('tr');
      const created = new Date(alert.createdAt).toLocaleString();
      tr.innerHTML = `
        <td>${alert.title}</td>
        <td><span class="badge ${alert.severity}">${alert.severity}</span></td>
        <td><span class="badge ${alert.status}">${alert.status}</span></td>
        <td>${alert.source}</td>
        <td>${created}</td>
        <td><button onclick="viewAlert('${alert._id}')">View</button></td>
      `;
      table.appendChild(tr);
    });
  } catch (error) {
    console.error('Failed to load alerts:', error);
  }
}

function viewAlert(alertId) {
  alert('Alert ID: ' + alertId);
}

// Incidents
async function loadIncidents() {
  try {
    const response = await fetch('/api/incidents', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();

    const table = document.getElementById('incidentsTable');
    table.innerHTML = '';

    (data.data || []).forEach(incident => {
      const tr = document.createElement('tr');
      const created = new Date(incident.createdAt).toLocaleDateString();
      tr.innerHTML = `
        <td>${incident.title}</td>
        <td><span class="badge ${incident.severity}">${incident.severity}</span></td>
        <td><span class="badge ${incident.status}">${incident.status}</span></td>
        <td>${incident.assignedTo}</td>
        <td>${created}</td>
        <td><button onclick="viewIncident('${incident._id}')">View</button></td>
      `;
      table.appendChild(tr);
    });
  } catch (error) {
    console.error('Failed to load incidents:', error);
  }
}

function showIncidentForm() {
  document.getElementById('incidentFormModal').style.display = 'block';
}

function hideIncidentForm() {
  document.getElementById('incidentFormModal').style.display = 'none';
}

async function createIncident() {
  const title = document.getElementById('incidentTitle').value.trim();
  const description = document.getElementById('incidentDescription').value.trim();
  const severity = document.getElementById('incidentSeverity').value;
  const assignedTo = document.getElementById('incidentAssignedTo').value.trim();

  if (!title) {
    alert('Please enter a title');
    return;
  }

  try {
    const response = await fetch('/api/incidents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, severity, assignedTo })
    });

    const result = await response.json();
    if (result.success) {
      hideIncidentForm();
      loadIncidents();
      alert('Incident created successfully');
    } else {
      alert(result.message || 'Failed to create incident');
    }
  } catch (error) {
    console.error('Failed to create incident:', error);
    alert('Failed to create incident');
  }
}

function viewIncident(incidentId) {
  alert('Incident ID: ' + incidentId);
}

// Rules (Admin only)
async function loadRules() {
  try {
    const response = await fetch('/api/rules', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();

    const table = document.getElementById('rulesTable');
    table.innerHTML = '';

    (data.data || []).forEach(rule => {
      const tr = document.createElement('tr');
      const created = new Date(rule.createdAt).toLocaleDateString();
      tr.innerHTML = `
        <td>${rule.name}</td>
        <td>${rule.eventType}</td>
        <td><span class="badge ${rule.severity}">${rule.severity}</span></td>
        <td>${rule.threshold}</td>
        <td><span class="badge ${rule.enabled ? 'enabled' : 'disabled'}">${rule.enabled ? 'Enabled' : 'Disabled'}</span></td>
        <td><button onclick="editRule('${rule._id}')">Edit</button></td>
      `;
      table.appendChild(tr);
    });
  } catch (error) {
    console.error('Failed to load rules:', error);
  }
}

function showRuleForm() {
  document.getElementById('ruleFormModal').style.display = 'block';
}

function hideRuleForm() {
  document.getElementById('ruleFormModal').style.display = 'none';
}

async function createRule() {
  const name = document.getElementById('ruleName').value.trim();
  const eventType = document.getElementById('ruleEventType').value.trim();
  const severity = document.getElementById('ruleSeverity').value;
  const threshold = Number(document.getElementById('ruleThreshold').value);

  if (!name || !eventType) {
    alert('Please fill in all fields');
    return;
  }

  try {
    const response = await fetch('/api/rules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, eventType, severity, threshold })
    });

    const result = await response.json();
    if (result.success) {
      hideRuleForm();
      loadRules();
      alert('Rule created successfully');
    } else {
      alert(result.message || 'Failed to create rule');
    }
  } catch (error) {
    console.error('Failed to create rule:', error);
    alert('Failed to create rule');
  }
}

function editRule(ruleId) {
  alert('Edit rule: ' + ruleId);
}

// Admin
async function loadAdminStats() {
  try {
    const response = await fetch('/api/reports/summary', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();

    const table = document.getElementById('adminStatsTable');
    table.innerHTML = '';

    if (data.success) {
      const stats = data.data;
      const rows = [
        ['Total Alerts', stats.totalAlerts],
        ['Total Incidents', stats.totalIncidents],
        ['Total Events', stats.totalEvents],
        ['Critical Alerts', stats.criticalAlerts],
        ['Resolved Incidents', stats.resolvedIncidents]
      ];

      rows.forEach(([label, value]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${label}</td><td>${value}</td>`;
        table.appendChild(tr);
      });
    }
  } catch (error) {
    console.error('Failed to load admin stats:', error);
  }
}

// Charts
function renderCharts(analyticsData) {
  const labels = analyticsData.alertTrend.map((entry) => entry.label);

  if (alertsChart) alertsChart.destroy();
  alertsChart = new Chart(document.getElementById('alertsChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Critical',
          data: analyticsData.alertTrend.map((entry) => entry.critical),
          backgroundColor: '#ef4444'
        },
        {
          label: 'High',
          data: analyticsData.alertTrend.map((entry) => entry.high),
          backgroundColor: '#f97316'
        },
        {
          label: 'Medium',
          data: analyticsData.alertTrend.map((entry) => entry.medium),
          backgroundColor: '#facc15'
        },
        {
          label: 'Low',
          data: analyticsData.alertTrend.map((entry) => entry.low),
          backgroundColor: '#22c55e'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { color: '#e2e8f0' }, grid: { color: 'rgba(255,255,255,0.07)' } },
        x: { ticks: { color: '#e2e8f0' }, grid: { display: false } }
      },
      plugins: { legend: { labels: { color: '#e2e8f0' } } }
    }
  });

  if (eventsChart) eventsChart.destroy();
  eventsChart = new Chart(document.getElementById('eventsChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Event Volume',
          data: analyticsData.eventTrend.map((entry) => entry.total),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.2)',
          fill: true,
          tension: 0.25
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { color: '#e2e8f0' }, grid: { color: 'rgba(255,255,255,0.07)' } },
        x: { ticks: { color: '#e2e8f0' }, grid: { display: false } }
      },
      plugins: { legend: { labels: { color: '#e2e8f0' } } }
    }
  });
}

// Logout
function logout() {
  localStorage.removeItem('siemToken');
  localStorage.removeItem('siemUser');
  window.location.href = '/login.html';
}

// Socket.IO events
socket.on('new-event', () => {
  if (currentPage === 'dashboard' || currentPage === 'events') {
    loadDashboard();
    loadEvents();
  }
});

socket.on('new-alert', () => {
  if (currentPage === 'dashboard' || currentPage === 'alerts') {
    loadDashboard();
    loadAlerts();
  }
});

socket.on('incident-created', () => {
  if (currentPage === 'incidents') {
    loadIncidents();
  }
});

socket.on('incident-updated', () => {
  if (currentPage === 'incidents') {
    loadIncidents();
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
