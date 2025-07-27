# Network Tab Debugging Checklist

## 1. Open Chrome DevTools
- Press F12
- Go to **Network** tab
- Check "Preserve log" to keep requests after navigation

## 2. Attempt Video Upload
- Clear the network log (🚫 button)
- Try uploading a video
- Watch for new entries

## 3. Analyze the Upload Request

### ✅ **Success Indicators:**
- Entry appears: `POST /api/video/upload`
- Status: `200` (green)
- Response: JSON with success data
- Time: Shows actual milliseconds

### ❌ **Failure Indicators:**

#### **No Network Entry:**
- JavaScript error before fetch()
- Check Console tab for errors

#### **Status: (failed)**
- Server not running on port 4000
- Run: `start-backend-only.bat`

#### **Status: (cancelled)**
- Request was aborted
- Often happens during page navigation

#### **Provisional Headers Warning:**
- CORS blocking the request
- Server not reachable
- Check if backend is actually running

## 4. Backend Connection Test
```bash
# In terminal:
curl http://localhost:4000/health

# Should return:
{"status":"ok","timestamp":"..."}
```

## 5. Common Solutions

### **Backend Not Running:**
```bash
cd CapEdify/server
node server.js
```

### **Port Conflict:**
```bash
netstat -ano | findstr :4000
# Kill any conflicting process
```

### **CORS Issues:**
- Check server.js has: `app.use(cors({ origin: 'http://localhost:5173' }))`
- Frontend must be on exactly port 5173

### **Wrong URL:**
- Frontend calls: `http://localhost:4000/api/video/upload`
- Backend route: `POST /api/video/upload`
- Make sure paths match exactly
