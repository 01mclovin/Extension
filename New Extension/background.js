let collectedData = [];
let autoSaveInterval;

// Initialize settings
chrome.storage.local.get(['saveFrequency', 'eventThreshold'], function(data) {
  const saveFrequency = data.saveFrequency || 60;
  setupAutoSave(saveFrequency);
});

function setupAutoSave(minutes) {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }
  autoSaveInterval = setInterval(exportToCSV, minutes * 60 * 1000);
}

function updateAllPopups() {
  chrome.runtime.sendMessage({
    type: 'COUNT_UPDATED',
    count: collectedData.length
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SAVE_EVENT':
      collectedData.push(message.data);
      updateAllPopups();
      chrome.storage.local.get('eventThreshold', function(data) {
        if (collectedData.length >= (data.eventThreshold || 100)) {
          exportToCSV();
        }
      });
      break;
    
    case 'MANUAL_EXPORT':
      exportToCSV(true);
      break;
    
    case 'CLEAR_DATA':
      collectedData = [];
      updateAllPopups();
      break;
    
    case 'UPDATE_SETTINGS':
      chrome.storage.local.get('saveFrequency', function(data) {
        setupAutoSave(data.saveFrequency || 60);
      });
      break;

    case 'GET_COUNT':
      sendResponse({ count: collectedData.length });
      break;
  }
  return true; // Keep message channel open for async responses
});

function exportToCSV(manualExport = false) {
  if (collectedData.length === 0) {
    if (manualExport) {
      alert('No data to export');
    }
    return;
  }

  const headers = Object.keys(collectedData[0]).join(',');
  const rows = collectedData.map(data => 
    Object.values(data).map(value => 
      `"${String(value).replace(/"/g, '""')}"`
    ).join(',')
  );
  
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  chrome.downloads.download({
    url: url,
    filename: `ecommerce_data_${timestamp}.csv`,
    saveAs: true
  });

  // Clear the collected data after export
  collectedData = [];
  updateAllPopups();
}