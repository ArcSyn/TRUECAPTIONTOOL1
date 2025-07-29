// Simple test to check server connectivity
const testServer = async () => {
  try {
    console.log('Testing server connection...');
    
    const response = await fetch('http://localhost:4000/health');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Server is reachable!');
    console.log('Health data:', JSON.stringify(data, null, 2));
    
    // Test pipeline endpoint
    console.log('\nTesting pipeline endpoint...');
    const pipelineResponse = await fetch('http://localhost:4000/api/pipeline/jobs');
    
    if (pipelineResponse.ok) {
      const pipelineData = await pipelineResponse.json();
      console.log('✅ Pipeline endpoint working!');
      console.log('Jobs:', pipelineData.totalCount);
    }
    
  } catch (error) {
    console.error('❌ Server connection failed:', error.message);
  }
};

testServer();