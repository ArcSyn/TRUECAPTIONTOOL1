# CapEdify Stable Components Registry

## ✅ Locked & Stable Components

### Core UI Components (Do Not Modify)
```
src/components/ui/
├── button.tsx ✅ STABLE
├── card.tsx ✅ STABLE  
├── tabs.tsx ✅ STABLE
├── badge.tsx ✅ STABLE
├── checkbox.tsx ✅ STABLE
├── progress.tsx ✅ STABLE
├── select.tsx ✅ STABLE
└── input.tsx ✅ STABLE
```

### Backend Services (Locked)
```
server/services/
├── multiFormatExportService.js ✅ STABLE
├── exportCleanupService.js ✅ STABLE
├── batchCoordinatorAgent.js ✅ STABLE
├── queueWorkerAgent.js ✅ STABLE
└── statusReporterAgent.js ✅ STABLE
```

### API Routes (Locked)
```
server/routes/
├── customExportRoutes.js ✅ STABLE
├── batchRoutes.js ✅ STABLE
├── exportRoutes.js ✅ STABLE
└── pipelineRoutes.js ✅ STABLE
```

### Core Types (Locked)
```
client/src/types/index.ts ✅ STABLE
- VideoFile interface
- Caption interface  
- Theme interfaces
- TranscriptionProgress interface
```

## 🔒 Component Locking Rules

### 1. UI Components
- Never modify shadcn/ui components directly
- Use className props for customization only
- All UI components are considered stable

### 2. Export System
- MultiFormatExportService is production-ready
- Export cleanup service handles file lifecycle
- Custom export routes support all formats (SRT, VTT, TXT, JSON, CSV)

### 3. Backend Architecture
- Agent-based system is stable and scalable
- Batch coordinator handles concurrency properly
- Status reporting provides real-time updates

## 🚧 Components Under Development

### Frontend Components (Can be modified)
```
src/components/
├── BatchProcessingDemo.tsx 🚧 DEVELOPMENT
├── BatchProcessingProgress.tsx 🚧 DEVELOPMENT
├── VideoUpload.tsx ✅ STABLE (core functionality)
├── PipelineProgress.tsx ✅ STABLE
└── ExportOptionsTab.tsx ✅ STABLE
```

## 🔧 Safe Modification Guidelines

### For Stable Components:
1. **Only add new features via props/configuration**
2. **Never change existing APIs or interfaces** 
3. **Extend functionality through composition, not modification**
4. **All changes require thorough testing**

### For Development Components:
1. Use error boundaries to prevent crashes
2. Gradual feature addition with fallbacks
3. Test extensively before promoting to stable

## 📋 Promotion Criteria (Development → Stable)

### Requirements:
- [ ] No console errors for 48+ hours
- [ ] Handles edge cases gracefully  
- [ ] Has proper error boundaries
- [ ] TypeScript strict mode compliant
- [ ] Performance tested under load
- [ ] User acceptance testing passed

## 🚨 Emergency Protocols

### If Stable Component Breaks:
1. **Immediately revert to last known good version**
2. **Create hotfix branch for critical fixes only**
3. **Document incident and root cause**
4. **Implement additional safeguards**

### Component Isolation Strategy:
```typescript
// Example: Isolate risky components
const SafeComponent = ({ children, fallback }) => {
  try {
    return children;
  } catch (error) {
    console.error('Component error:', error);
    return fallback || <div>Component temporarily unavailable</div>;
  }
};
```

## 📊 System Health Monitoring

### Key Metrics to Track:
- Component render success rate
- HMR reload failures
- API endpoint response times
- Export job completion rates
- File cleanup efficiency

**Last Updated:** $(date)
**System Status:** All stable components operational ✅