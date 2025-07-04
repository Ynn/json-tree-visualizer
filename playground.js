// --- Génération du lien de partage ---
function shareCurrentJSON() {
  if (!currentWidget || typeof currentWidget.getJSON !== 'function') {
    showStatus('Widget not ready', 'error');
    return;
  }
  const dataToShare = currentWidget.getJSON();
  if (!dataToShare) {
    showStatus('No data to share', 'error');
    return;
  }
  if (typeof pako === 'undefined') {
    showStatus('pako (gzip) not loaded', 'error');
    return;
  }
  try {
    const jsonStr = JSON.stringify(dataToShare);
    console.log('[share] JSON to share:', jsonStr);
    const compressed = pako.gzip(jsonStr);
    let binary = '';
    for (let i = 0; i < compressed.length; i++) binary += String.fromCharCode(compressed[i]);
    const base64 = btoa(binary);
    const url = new URL(window.location.href);
    url.searchParams.set('tree', base64);
    navigator.clipboard.writeText(url.toString()).then(() => {
      showStatus('Share link copied!', 'success');
    }, () => {
      window.prompt('Share link:', url.toString());
      showStatus('Link generated', 'success');
    });
  } catch (e) {
    showStatus('Error while sharing: ' + e.message, 'error');
  }
}

// --- State ---
let currentWidget = null;
let currentData = null;

const SAMPLE_DATA = {
  person: {
    first_name: "Alice",
    last_name: "Johnson",
    age: 28,
    email: "alice.johnson@email.com",
    is_active: true,
    address: {
      street: "123 Main Street",
      city: "San Francisco",
      state: "CA",
      zip_code: "94102",
      coordinates: { lat: 37.7749, lng: -122.4194 }
    },
    phone_numbers: [
      { type: "home", number: "+1-555-0123" },
      { type: "work", number: "+1-555-0456" },
      { type: "mobile", number: "+1-555-0789" }
    ],
    skills: ["JavaScript", "Python", "React", "Node.js", "SQL"],
    education: {
      degree: "Computer Science",
      university: "Stanford University",
      graduation_year: 2018,
      gpa: 3.8
    }
  },
  company: {
    company_name: "Tech Innovations Inc.",
    founded: 2015,
    headquarters: {
      address: "456 Innovation Drive",
      city: "Palo Alto",
      state: "CA",
      country: "USA"
    },
    employees: [
      { name: "John Smith", role: "CEO", department: "Executive" },
      { name: "Sarah Wilson", role: "CTO", department: "Technology" },
      { name: "Mike Brown", role: "Lead Developer", department: "Engineering" }
    ],
    products: [
      { name: "CloudSync Pro", version: "2.1.0", price: 29.99, active: true },
      { name: "DataViz Suite", version: "1.5.2", price: 49.99, active: true }
    ],
    financial: {
      revenue: 2500000,
      profit: 450000,
      expenses: {
        salaries: 1200000,
        office: 180000,
        marketing: 320000,
        other: 350000
      }
    }
  },
  complex: {
    api_response: {
      status: "success",
      timestamp: "2024-01-15T10:30:00Z",
      data: {
        users: [
          {
            id: 1,
            profile: {
              personal: {
                name: "Emma Davis",
                age: 32,
                preferences: {
                  theme: "dark",
                  language: "en",
                  notifications: { email: true, push: false, sms: true }
                }
              },
              professional: {
                title: "Data Scientist",
                skills: ["Python", "R", "Machine Learning", "Statistics"],
                certifications: [
                  { name: "AWS Certified", level: "Professional", expiry: "2025-06-30" }
                ]
              }
            }
          }
        ],
        metadata: {
          total_users: 1,
          page: 1,
          per_page: 10,
          has_more: false
        }
      }
    }
  }
};

function initializeApp() {
  try {
    if (!window.JSONTreeVisualizer) {
      showStatus('Library not loaded', 'error');
      return;
    }
    createWidgetWithOptions({ initialJSON: SAMPLE_DATA.person });
    currentData = SAMPLE_DATA.person;
    showStatus('Playground initialized!', 'success');
  } catch (error) {
    showStatus(`Initialization failed: ${error.message}`, 'error');
  }
}

function createWidgetWithOptions(opts = {}) {
  const colorScheme = document.getElementById('colorScheme')?.value || 'default';
  const maxDepth = parseInt(document.getElementById('maxDepth')?.value) || 1000;
  const maxArrayItems = parseInt(document.getElementById('maxArrayItems')?.value) || 1000;
  console.log('[playground] Options utilisées:', { colorScheme, maxDepth, maxArrayItems, opts });
  // Remplacement du container pour éviter le bug Shadow DOM
  const container = document.getElementById('json-visualizer');
  const newContainer = container.cloneNode(false);
  container.parentNode.replaceChild(newContainer, container);
  currentWidget = JSONTreeVisualizer.createWidget('json-visualizer', {
    showInput: true,
    showControls: true,
    colorScheme,
    maxDepth,
    maxArrayItems,
    ...opts
  });
}

function loadPersonData() {
  loadData(SAMPLE_DATA.person, 'Person profile loaded');
}
function loadCompanyData() {
  loadData(SAMPLE_DATA.company, 'Company data loaded');
}
function loadComplexData() {
  loadData(SAMPLE_DATA.complex, 'Complex nested data loaded');
}

function loadData(data, message) {
  try {
    if (!currentWidget) {
      showStatus('Widget not initialized', 'error');
      return;
    }
    currentWidget.loadJSON(data);
    currentData = data;
    showStatus(message, 'success');
  } catch (error) {
    showStatus(`Failed to load data: ${error.message}`, 'error');
  }
}

function handleFileInput(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const json = JSON.parse(e.target.result);
      currentData = json;
      createWidgetWithOptions({ initialJSON: json });
      showStatus('JSON file loaded successfully!', 'success');
    } catch (err) {
      showStatus('Invalid JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

function updateColorScheme() {
  console.log('[playground] Changement colorScheme:', document.getElementById('colorScheme')?.value);
  recreateWidget();
}
function updateOptions() {
  console.log('[playground] Changement options:', {
    maxDepth: document.getElementById('maxDepth')?.value,
    maxArrayItems: document.getElementById('maxArrayItems')?.value
  });
  recreateWidget();
}
function recreateWidget() {
  if (!currentData) return;
  createWidgetWithOptions({ initialJSON: currentData });
  showStatus('Visualization updated', 'success');
}

function validateCurrentJSON() {
  if (!currentData) {
    showStatus('No data to validate', 'error');
    return;
  }
  try {
    const jsonString = JSON.stringify(currentData);
    const validation = JSONTreeVisualizer.validateJSON(jsonString);
    if (validation.valid) {
      showStatus('JSON is valid', 'success');
    } else {
      showStatus('Invalid JSON: ' + validation.error, 'error');
    }
  } catch (error) {
    showStatus('Invalid JSON: ' + error.message, 'error');
  }
}

function exportDOT() {
  if (!currentData) {
    showStatus('No data to export', 'error');
    return;
  }
  try {
    const dot = JSONTreeVisualizer.convertToDot
      ? JSONTreeVisualizer.convertToDot(currentData, {
          colorScheme: document.getElementById('colorScheme')?.value || 'default',
          maxDepth: parseInt(document.getElementById('maxDepth')?.value) || 1000,
          maxArrayItems: parseInt(document.getElementById('maxArrayItems')?.value) || 1000
        })
      : JSONTreeVisualizer.toDOT(currentData);
    const blob = new Blob([dot], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tree.dot';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showStatus('DOT file exported!', 'success');
  } catch (error) {
    showStatus('Failed to export DOT: ' + error.message, 'error');
  }
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + (type || '');
  setTimeout(() => {
    if (statusDiv.textContent === message) statusDiv.textContent = '';
  }, 4000);
}

// --- Décodage tree depuis l'URL ---
function getURLParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function base64ToUint8Array(base64) {
  let b64 = decodeURIComponent(base64.replace(/\s/g, ''));
  b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function tryLoadTreeFromURL() {
  const treeParam = getURLParam('tree');
  console.log('[tree] Paramètre brut:', treeParam);
  if (!treeParam) return false;
  if (typeof pako === 'undefined') {
    showStatus('pako (gzip) non chargé', 'error');
    return false;
  }
  try {
    const compressed = base64ToUint8Array(treeParam);
    console.log('[tree] Après base64ToUint8Array, taille:', compressed.length, compressed);
    const jsonStr = new TextDecoder('utf-8').decode(pako.ungzip(compressed));
    console.log('[tree] Après ungzip:', jsonStr);
    const json = JSON.parse(jsonStr);
    console.log('[tree] Après JSON.parse:', json);
    createWidgetWithOptions({ initialJSON: json });
    currentData = json;
    showStatus('JSON chargé depuis l’URL !', 'success');
    return true;
  } catch (e) {
    console.error('[tree] Erreur décodage paramètre tree:', e);
    showStatus('Erreur décodage paramètre tree: ' + e.message, 'error');
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (!tryLoadTreeFromURL()) {
      initializeApp();
    }
  }, 50);
  const fileInput = document.getElementById('fileInput');
  if (fileInput) fileInput.addEventListener('change', handleFileInput);
});