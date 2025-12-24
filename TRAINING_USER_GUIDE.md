# Training Dashboard User Guide

## Overview

The Training Dashboard is a comprehensive interface for managing machine learning model training in ArbiMind. This guide will help you understand and use all features effectively.

---

## Getting Started

### Accessing the Training Dashboard

1. Navigate to the **Training** section from the main navigation
2. You'll see the Training Dashboard with multiple panels

### Layout Overview

The dashboard is organized into several sections:

- **Left Panel**: Controls, status cards, and quick actions
- **Center Panel**: Training jobs table
- **Right Panel**: Queue status and statistics
- **Bottom Panel**: Metrics and charts

---

## Starting a Training Job

### Step 1: Open Start Training Modal

Click the **"Start Training"** button in either:
- The Quick Actions card (left panel)
- The Training Jobs table header

### Step 2: Configure Training Parameters

1. **Symbol** (Optional):
   - Enter a trading pair (e.g., `BTC/USDT` or `BTCUSDT`)
   - If left empty, training will run for all available symbols
   - The system will automatically check filter status for the symbol

2. **Model Type** (Required):
   - Select from available models:
     - LightGBM
     - LSTM
     - Transformer
     - Enhanced LSTM
     - Enhanced Transformer
     - TFT (Temporal Fusion Transformer)
     - Jump Detection
     - Hybrid Jump
     - All Models

3. **Horizon** (Required):
   - Select prediction horizon:
     - 10 Minutes
     - 30 Minutes
     - 1 Hour
     - 4 Hours
     - 1 Day

4. **Interval** (Auto-determined):
   - Automatically set based on horizon selection
   - Not editable

5. **Skip Filters** (Admin only):
   - Check this box to bypass volatility and data freshness checks
   - ⚠️ **Warning**: Only use if you understand the implications

### Step 3: Review Filter Status

If you entered a symbol, the system will automatically check:
- **Volatility Filter**: Ensures the market has enough movement to predict
- **Data Freshness**: Ensures data is recent and complete

**Status Indicators**:
- ✅ **Green**: Filter passed - safe to train
- ❌ **Red**: Filter failed - training not recommended
- ⚠️ **Yellow**: Warning - proceed with caution

### Step 4: Start Training

1. Review all parameters
2. Click **"Start Training"**
3. A success message will appear with the Job ID
4. The job will appear in the Training Jobs table

---

## Monitoring Training Jobs

### Training Jobs Table

The main table displays all training jobs with the following information:

- **Job ID**: Unique identifier (first 8 characters shown)
- **Symbol**: Trading pair being trained
- **Model**: Model type
- **Horizon**: Prediction horizon
- **Status**: Current job status
- **Started**: Start timestamp
- **Duration**: Elapsed time (for running jobs) or total duration (for completed jobs)
- **Actions**: View Logs, Cancel (for running jobs)

### Filtering Jobs

Use the filter controls above the table:

1. **Status Filter**: Filter by job status
   - All Status
   - Running
   - Completed
   - Failed
   - Rejected

2. **Symbol Filter**: Search by symbol name

3. **Model Filter**: Filter by model type

### Auto-Refresh

Enable **"Auto-refresh"** checkbox to automatically update the jobs table every 5 seconds.

### Viewing Job Logs

1. Click on a job row or the **"View Logs"** button
2. The Job Logs modal will open showing:
   - Real-time log output
   - Error highlighting
   - Search functionality
   - Download option
   - Auto-scroll toggle

3. For running jobs, logs update automatically every 3 seconds

### Canceling a Job

1. Click **"Cancel"** button on a running job
2. Confirm the cancellation in the dialog
3. The job status will update to "cancelled"

---

## Understanding Filter Status

### Check Filter Status

1. Click **"Check Filter"** in the Quick Actions panel
2. Or use the Filter Status panel (left side, below Quick Actions)

### Filter Status Panel

1. Enter a symbol (e.g., `BTC/USDT`)
2. Select an interval (`1h`, `4h`, or `1d`)
3. Click **"Check"**
4. View detailed results:

**Volatility Check**:
- Price volatility score
- Daily range average
- Volume volatility
- Movement frequency
- Overall pass/fail status

**Data Freshness Check**:
- Last candle timestamp
- Data age (hours)
- Completeness percentage
- Gap detection
- Overall pass/fail status

### Understanding Filter Results

**Can Train/Predict**: Overall status
- ✅ **Yes**: Both filters passed
- ❌ **No**: One or both filters failed

**Why Filters Matter**:
- **Volatility**: Markets with low volatility are hard to predict accurately
- **Data Freshness**: Stale or incomplete data leads to poor model performance

---

## Periodic Retraining

### Overview

Periodic retraining automatically retrains priority models at regular intervals (default: every 6 hours).

### Status Card

The Periodic Retraining card shows:
- **Status**: Active/Inactive
- **Last Run**: Timestamp of last retraining session
- **Next Run**: Scheduled time for next retraining
- **Success Rate**: Percentage of successful retrains (7-day average)

### Trigger Manual Retraining

Click **"Trigger Now"** to immediately start a periodic retraining session.

---

## Training Queue

### Queue Status

The Training Queue panel shows:
- **Pending**: Number of jobs waiting to start
- **Running**: Number of currently running jobs
- **Max Concurrent**: Maximum simultaneous jobs (default: 3)
- **Available Slots**: How many more jobs can start

### Next Jobs List

Shows the next 5 jobs in the queue with:
- Symbol
- Model type
- Horizon
- Priority (Tier 1, Tier 2, Tier 3)

### Running Jobs List

Shows currently running jobs with the same information.

### Process Queue

Click **"Process Queue"** to manually process pending jobs (usually automatic).

---

## Training Settings

### Accessing Settings

Click **"Settings"** in the Quick Actions panel.

### Filter Configuration

#### Volatility Filter Settings

- **Min Volatility**: Minimum price volatility threshold
- **Min Price Range**: Minimum daily price range
- **Min Volume Volatility**: Minimum volume volatility
- **Min Movement Frequency**: Minimum movement frequency
- **Window Days**: Number of days to analyze

#### Data Freshness Filter Settings

- **Max Data Age Hours**: Maximum age of last candle
- **Min Completeness**: Minimum data completeness percentage
- **Max Gap Candles**: Maximum number of missing candles
- **Check Window Days**: Number of days to check for gaps

#### Filter Behavior

- **Enable Volatility Filter**: Toggle volatility checking
- **Enable Data Freshness Filter**: Toggle data freshness checking
- **Block on Failure**: Prevent training/prediction if filters fail

### Retraining Configuration

- **Periodic Interval**: How often to retrain (1, 3, 6, 12, or 24 hours)
- **Cooldown Period**: Minimum time between retrains for same symbol
- **Max Concurrent Jobs**: Maximum simultaneous training jobs

### Priority Configuration

- **Tier 1 Symbols**: Top priority symbols (e.g., BTC, ETH)
- **Tier 2 Symbols**: Secondary priority symbols

### Saving Settings

1. Configure all settings
2. Click **"Save Settings"**
3. Wait for confirmation message
4. Settings take effect immediately

---

## Metrics and Charts

### Training Metrics Panel

The bottom panel displays:

1. **Periodic Retraining Sessions Chart**:
   - Shows last 10 sessions
   - Displays models trained, successful, and failed

2. **Success Rate Trend Chart**:
   - Shows success rate over time
   - Helps identify performance trends

3. **Filter Reasons Pie Chart**:
   - Shows why symbols were filtered
   - Volatility vs. Data Freshness breakdown

### Exporting Metrics

Click the **"Export"** button to download metrics as JSON.

---

## Quick Stats

The Quick Stats card (right panel) shows:
- **Total Jobs (7d)**: Total jobs in last 7 days
- **Success Rate**: Percentage of successful jobs
- **Avg Duration**: Average training duration

---

## Troubleshooting

### Job Stuck in "Running" Status

1. Check job logs for errors
2. Verify the training process is actually running
3. Try canceling and restarting the job

### Filter Check Fails

**Volatility Too Low**:
- The market may not have enough price movement
- Consider using a different symbol or interval

**Data Too Stale**:
- Last candle is too old
- Check data collection status
- Wait for new data to arrive

**Data Incomplete**:
- Missing candles detected
- Check data collection logs
- May need to backfill data

### Training Job Fails

1. Check job logs for error messages
2. Verify symbol has sufficient historical data
3. Check system resources (memory, disk space)
4. Review filter status before retrying

### WebSocket Connection Issues

- The system automatically falls back to polling
- Check browser console for connection errors
- Refresh the page if updates stop

---

## Best Practices

1. **Check Filter Status First**: Always verify a symbol passes filters before training
2. **Monitor Job Logs**: Keep an eye on logs for early error detection
3. **Use Appropriate Horizons**: Match horizon to your trading strategy
4. **Don't Overload Queue**: Be mindful of concurrent job limits
5. **Review Metrics Regularly**: Use charts to identify trends and issues
6. **Save Settings Carefully**: Changes affect all future training jobs

---

## Keyboard Shortcuts

- **Enter**: Submit forms (in modals)
- **Escape**: Close modals
- **Tab**: Navigate between form fields
- **Enter** (in symbol input): Trigger filter check

---

## Support

For issues or questions:
1. Check job logs for error details
2. Review filter status for symbol issues
3. Check system metrics for resource constraints
4. Contact system administrator if problems persist

