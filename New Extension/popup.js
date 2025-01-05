document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    chrome.storage.local.get(['saveFrequency', 'eventThreshold'], function(data) {
      document.getElementById('saveFrequency').value = data.saveFrequency || 60;
      document.getElementById('eventThreshold').value = data.eventThreshold || 100;
      document.getElementById('eventTarget').textContent = data.eventThreshold || 100;
    });
  
    // Get current event count
    chrome.runtime.sendMessage({ type: 'GET_COUNT' }, function(response) {
      document.getElementById('eventCount').textContent = response.count || 0;
    });
  
    // Save settings when changed
    document.getElementById('saveFrequency').addEventListener('change', function(e) {
      chrome.storage.local.set({ saveFrequency: parseInt(e.target.value) });
      chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS' });
    });
  
    document.getElementById('eventThreshold').addEventListener('change', function(e) {
      const newThreshold = parseInt(e.target.value);
      chrome.storage.local.set({ eventThreshold: newThreshold });
      document.getElementById('eventTarget').textContent = newThreshold;
    });
  
    // Download button handler
    document.getElementById('downloadNow').addEventListener('click', function() {
      chrome.runtime.sendMessage({ type: 'MANUAL_EXPORT' });
    });
  
    // Clear data button handler
    document.getElementById('clearData').addEventListener('click', function() {
      if (confirm('Are you sure you want to clear all collected data?')) {
        chrome.runtime.sendMessage({ type: 'CLEAR_DATA' });
        document.getElementById('eventCount').textContent = '0';
      }
    });
  
    // Listen for count updates
    chrome.runtime.onMessage.addListener(function(message) {
      if (message.type === 'COUNT_UPDATED') {
        document.getElementById('eventCount').textContent = message.count;
      }
    });
  });