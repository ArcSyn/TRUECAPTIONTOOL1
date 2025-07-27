import axios from 'axios';

async function checkHealth() {
  console.log('🔍 Checking TRUECAPTIONTOOL system health...\n');
  
  let backendOk = false;
  let frontendOk = false;
  let jsxExportOk = false;

  // Check Backend
  try {
    const backend = await axios.get('http://localhost:4000/health', { timeout: 5000 });
    console.log('✅ Backend OK:', backend.data.status);
    console.log('   Port:', backend.data.port);
    console.log('   Node Version:', backend.data.environment.node_version);
    console.log('   Supabase Configured:', backend.data.environment.supabase_configured);
    console.log('   Available endpoints:', Object.keys(backend.data.endpoints).join(', '));
    backendOk = true;
  } catch (error) {
    console.error('❌ Backend not responding on port 4000');
    console.error('   Error:', error.code || error.message);
    console.error('   💡 Try: cd CapEdify/server && node server.js');
  }

  console.log(''); // Empty line

  // Check Frontend
  try {
    const frontend = await axios.get('http://localhost:5173', { timeout: 5000 });
    console.log('✅ Frontend OK - Vite dev server responding');
    console.log('   Status:', frontend.status);
    frontendOk = true;
  } catch (error) {
    console.error('❌ Frontend not responding on port 5173');
    console.error('   Error:', error.code || error.message);
    console.error('   💡 Try: cd CapEdify/client && npm run dev');
  }

  console.log(''); // Empty line

  // Check JSX Export API (only if backend is working)
  if (backendOk) {
    try {
      const exportApi = await axios.get('http://localhost:4000/api/export/jsx/enhanced?test=true', { timeout: 5000 });
      console.log('✅ JSX Export API OK');
      console.log('   Response length:', exportApi.data.length || 'No data');
      jsxExportOk = true;
    } catch (error) {
      console.error('❌ JSX Export API not responding');
      console.error('   Error:', error.response?.status || error.code || error.message);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 SYSTEM HEALTH SUMMARY');
  console.log('='.repeat(50));
  console.log(`Backend (port 4000):     ${backendOk ? '✅ UP' : '❌ DOWN'}`);
  console.log(`Frontend (port 5173):    ${frontendOk ? '✅ UP' : '❌ DOWN'}`);
  console.log(`JSX Export API:          ${jsxExportOk ? '✅ UP' : '❌ DOWN'}`);
  
  const overallStatus = backendOk && frontendOk && jsxExportOk;
  console.log(`Overall Status:          ${overallStatus ? '✅ ALL SYSTEMS GO' : '❌ ISSUES DETECTED'}`);
  
  if (overallStatus) {
    console.log('\n🎉 Ready to test JSX export functionality!');
    console.log('   🌐 Frontend: http://localhost:5173/');
    console.log('   🔧 Backend:  http://localhost:4000/health');
  } else {
    console.log('\n🚨 Action Required:');
    if (!backendOk) console.log('   1. Start backend: cd CapEdify/server && node server.js');
    if (!frontendOk) console.log('   2. Start frontend: cd CapEdify/client && npm run dev');
  }
}

checkHealth().then(() => {
  console.log('\n🏁 Health check complete');
}).catch(err => {
  console.error('❌ Health check failed:', err);
  process.exit(1);
});
