const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');

class ExportCleanupService {
  constructor(exportsDir, maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    this.exportsDir = exportsDir;
    this.maxAge = maxAge;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🧹 Export cleanup service started');
    
    // Run cleanup every hour
    this.cronJob = cron.schedule('0 * * * *', () => {
      this.cleanupExpiredFiles();
    });
    
    // Run initial cleanup
    await this.cleanupExpiredFiles();
  }

  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.cronJob) {
      this.cronJob.destroy();
    }
    console.log('🧹 Export cleanup service stopped');
  }

  async cleanupExpiredFiles() {
    try {
      const files = await fs.readdir(this.exportsDir);
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.exportsDir, file);
        
        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtime.getTime();
          
          if (age > this.maxAge) {
            await fs.unlink(filePath);
            cleanedCount++;
            console.log(`🗑️ Cleaned up expired export: ${file}`);
          }
        } catch (error) {
          console.error(`❌ Error checking file ${file}:`, error.message);
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleanup complete: removed ${cleanedCount} expired files`);
      }
    } catch (error) {
      console.error('❌ Export cleanup failed:', error.message);
    }
  }

  async getExportStats() {
    try {
      const files = await fs.readdir(this.exportsDir);
      const now = Date.now();
      let totalSize = 0;
      let expiredCount = 0;
      let activeCount = 0;

      for (const file of files) {
        const filePath = path.join(this.exportsDir, file);
        
        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtime.getTime();
          
          if (age > this.maxAge) {
            expiredCount++;
          } else {
            activeCount++;
          }
          
          totalSize += stats.size;
        } catch (error) {
          // Skip files that can't be accessed
        }
      }

      return {
        totalFiles: files.length,
        activeFiles: activeCount,
        expiredFiles: expiredCount,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        maxAgeHours: this.maxAge / (60 * 60 * 1000)
      };
    } catch (error) {
      console.error('❌ Failed to get export stats:', error.message);
      return null;
    }
  }
}

module.exports = ExportCleanupService;