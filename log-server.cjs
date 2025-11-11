const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3003;
const LOG_FILE = path.join(__dirname, 'game-logs.txt');
const MAX_LOG_LINES = 10000; // Keep last 10k lines

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/logs', async (req, res) => {
  try {
    const { logs } = req.body;
    
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: 'Invalid logs format' });
    }

    // Format logs for file
    const logLines = logs.map(entry => {
      const entityStr = entry.entity ? `][${entry.entity}` : '';
      const tagStr = `[${entry.tag}${entityStr}]`;
      const timeStr = entry.timestamp.split('T')[1].split('.')[0];
      const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
      return `${timeStr} ${tagStr} ${entry.message}${dataStr}`;
    });

    // Read existing logs
    let existingLines = [];
    try {
      const existingContent = await fs.readFile(LOG_FILE, 'utf8');
      existingLines = existingContent.split('\n').filter(line => line.trim());
    } catch (error) {
      // File doesn't exist yet, that's fine
    }

    // Append new logs
    const allLines = [...existingLines, ...logLines];

    // Trim to max size
    const trimmedLines = allLines.slice(-MAX_LOG_LINES);

    // Write back to file
    await fs.writeFile(LOG_FILE, trimmedLines.join('\n') + '\n');

    res.json({ 
      success: true, 
      logsReceived: logs.length,
      totalLines: trimmedLines.length 
    });

  } catch (error) {
    console.error('Error processing logs:', error);
    res.status(500).json({ error: 'Failed to process logs' });
  }
});

// Endpoint to retrieve logs with filtering
app.get('/api/logs', async (req, res) => {
  try {
    const { tag, entity, lines = 100 } = req.query;
    
    const content = await fs.readFile(LOG_FILE, 'utf8');
    let logLines = content.split('\n').filter(line => line.trim());

    // Apply filters
    if (tag) {
      logLines = logLines.filter(line => line.includes(`[${tag}`));
    }
    if (entity) {
      logLines = logLines.filter(line => line.includes(`][${entity}]`));
    }

    // Return last N lines
    const recentLines = logLines.slice(-parseInt(lines));
    
    res.json({ 
      logs: recentLines,
      total: logLines.length 
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

app.listen(PORT, () => {
  console.log(`Log server running on http://localhost:${PORT}`);
  console.log(`Logs will be written to: ${LOG_FILE}`);
  console.log(`Filter logs: GET /api/logs?tag=AI&entity=Guide&lines=50`);
});