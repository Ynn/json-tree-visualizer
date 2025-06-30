/**
 * JSON Tree Visualizer - Interactive Playground
 * Clean, production-ready demo functions
 */

// Global state
let currentWidget = null;
let currentData = null;

// Sample datasets
const SAMPLE_DATA = {
    person: {
        "first_name": "Alice",
        "last_name": "Johnson",
        "age": 28,
        "email": "alice.johnson@email.com",
        "is_active": true,
        "address": {
            "street": "123 Main Street",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94102",
            "coordinates": {
                "lat": 37.7749,
                "lng": -122.4194
            }
        },
        "phone_numbers": [
            { "type": "home", "number": "+1-555-0123" },
            { "type": "work", "number": "+1-555-0456" },
            { "type": "mobile", "number": "+1-555-0789" }
        ],
        "skills": ["JavaScript", "Python", "React", "Node.js", "SQL"],
        "education": {
            "degree": "Computer Science",
            "university": "Stanford University",
            "graduation_year": 2018,
            "gpa": 3.8
        }
    },

    company: {
        "company_name": "Tech Innovations Inc.",
        "founded": 2015,
        "headquarters": {
            "address": "456 Innovation Drive",
            "city": "Palo Alto",
            "state": "CA",
            "country": "USA"
        },
        "employees": [
            { "name": "John Smith", "role": "CEO", "department": "Executive" },
            { "name": "Sarah Wilson", "role": "CTO", "department": "Technology" },
            { "name": "Mike Brown", "role": "Lead Developer", "department": "Engineering" }
        ],
        "products": [
            { "name": "CloudSync Pro", "version": "2.1.0", "price": 29.99, "active": true },
            { "name": "DataViz Suite", "version": "1.5.2", "price": 49.99, "active": true }
        ],
        "financial": {
            "revenue": 2500000,
            "profit": 450000,
            "expenses": {
                "salaries": 1200000,
                "office": 180000,
                "marketing": 320000,
                "other": 350000
            }
        }
    },

    complex: {
        "api_response": {
            "status": "success",
            "timestamp": "2024-01-15T10:30:00Z",
            "data": {
                "users": [
                    {
                        "id": 1,
                        "profile": {
                            "personal": {
                                "name": "Emma Davis",
                                "age": 32,
                                "preferences": {
                                    "theme": "dark",
                                    "language": "en",
                                    "notifications": {
                                        "email": true,
                                        "push": false,
                                        "sms": true
                                    }
                                }
                            },
                            "professional": {
                                "title": "Data Scientist",
                                "skills": ["Python", "R", "Machine Learning", "Statistics"],
                                "certifications": [
                                    {
                                        "name": "AWS Certified",
                                        "level": "Professional",
                                        "expiry": "2025-06-30"
                                    }
                                ]
                            }
                        }
                    }
                ],
                "metadata": {
                    "total_users": 1,
                    "page": 1,
                    "per_page": 10,
                    "has_more": false
                }
            }
        }
    }
};

// Initialize application
function initializeApp() {
    try {
        if (!window.JSONTreeVisualizer) {
            showStatus('❌ JSONTreeVisualizer library not loaded', 'error');
            return;
        }

        currentWidget = JSONTreeVisualizer.createWidget('json-visualizer', {
            showInput: true,
            showControls: true,
            initialJSON: SAMPLE_DATA.person,
            colorScheme: 'default',
            maxDepth: 10,
            maxArrayItems: 5
        });
        
        currentData = SAMPLE_DATA.person;
        showStatus('🚀 Playground initialized successfully!', 'success');
        
    } catch (error) {
        showStatus(`❌ Initialization failed: ${error.message}`, 'error');
    }
}

// Data loading functions
function loadPersonData() {
    loadData(SAMPLE_DATA.person, '👤 Person profile loaded');
}

function loadCompanyData() {
    loadData(SAMPLE_DATA.company, '🏢 Company data loaded');
}

function loadComplexData() {
    loadData(SAMPLE_DATA.complex, '🔗 Complex nested data loaded');
}

function loadData(data, message) {
    try {
        if (!currentWidget) {
            showStatus('❌ Widget not initialized', 'error');
            return;
        }
        
        currentWidget.loadJSON(data);
        currentData = data;
        showStatus(message, 'success');
        
    } catch (error) {
        showStatus(`❌ Failed to load data: ${error.message}`, 'error');
    }
}

// Option updates
function updateColorScheme() {
    const colorScheme = document.getElementById('colorScheme').value;
    recreateWidget({ colorScheme });
}

function updateOptions() {
    const maxDepth = parseInt(document.getElementById('maxDepth').value);
    const maxArrayItems = parseInt(document.getElementById('maxArrayItems').value);
    recreateWidget({ maxDepth, maxArrayItems });
}

function recreateWidget(newOptions = {}) {
    if (!currentData) return;

    try {
        document.getElementById('json-visualizer').innerHTML = '';
        
        currentWidget = JSONTreeVisualizer.createWidget('json-visualizer', {
            showInput: true,
            showControls: true,
            initialJSON: currentData,
            colorScheme: 'default',
            maxDepth: 10,
            maxArrayItems: 5,
            ...newOptions
        });
        
        showStatus('🎨 Visualization updated', 'success');
        
    } catch (error) {
        showStatus(`❌ Failed to update: ${error.message}`, 'error');
    }
}

// Utility functions
function validateCurrentJSON() {
    if (!currentData) {
        showStatus('❌ No data to validate', 'error');
        return;
    }

    try {
        const jsonString = JSON.stringify(currentData);
        const validation = JSONTreeVisualizer.validateJSON(jsonString);
        
        if (validation.valid) {
            const rootKeys = Object.keys(validation.data).length;
            showStatus(`✅ JSON is valid! Found ${rootKeys} root properties`, 'success');
        } else {
            showStatus(`❌ JSON validation failed: ${validation.error}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ Validation error: ${error.message}`, 'error');
    }
}

function exportDOT() {
    if (!currentData) {
        showStatus('❌ No data to export', 'error');
        return;
    }

    try {
        const dotString = JSONTreeVisualizer.convertToDot(currentData, {
            colorScheme: document.getElementById('colorScheme').value,
            maxDepth: parseInt(document.getElementById('maxDepth').value),
            maxArrayItems: parseInt(document.getElementById('maxArrayItems').value)
        });

        const blob = new Blob([dotString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'json-tree.dot';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showStatus('💾 DOT file exported successfully!', 'success');
        
    } catch (error) {
        showStatus(`❌ Export failed: ${error.message}`, 'error');
    }
}

function downloadLibrary() {
    const link = document.createElement('a');
    link.href = 'json-tree-visualizer.js';
    link.download = 'json-tree-visualizer.js';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showStatus('📥 Library download started!', 'success');
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
        setTimeout(() => statusDiv.innerHTML = '', 5000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeApp, 100);
});