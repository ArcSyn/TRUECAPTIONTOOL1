// Backend status checker for debugging
export async function checkBackendStatus() {
  try {
    const response = await fetch('http://localhost:4000/health');
    const status = {
      reachable: true,
      status: response.status,
      statusText: response.statusText
    };
    
    // Update debug panel
    const statusElement = document.getElementById('backend-status');
    if (statusElement) {
      statusElement.innerHTML = `✅ Running (${response.status})`;
      statusElement.className = 'text-green-600';
    }
    
    return status;
  } catch (error: any) {
    const status = {
      reachable: false,
      error: error?.message || 'Unknown error'
    };
    
    // Update debug panel
    const statusElement = document.getElementById('backend-status');
    if (statusElement) {
      statusElement.innerHTML = `❌ Not running`;
      statusElement.className = 'text-red-600';
    }
    
    return status;
  }
}

// Auto-check backend status every 5 seconds
if (typeof window !== 'undefined') {
  setInterval(checkBackendStatus, 5000);
  // Initial check
  setTimeout(checkBackendStatus, 1000);
}
