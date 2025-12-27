# طراحی UI صفحه Trading Bot

این سند شامل طراحی کامل UI/UX برای صفحه Trading Bot است که بر اساس قوانین و الگوهای Market Page طراحی شده است.

## 📋 فهرست مطالب

1. [اصول طراحی (Design Principles)](#اصول-طراحی-design-principles)
2. [ساختار Layout](#ساختار-layout)
3. [کامپوننت‌های اصلی](#کامپوننت‌های-اصلی)
4. [صفحه اصلی Bot Management](#صفحه-اصلی-bot-management)
5. [صفحه ایجاد Bot جدید](#صفحه-ایجاد-bot-جدید)
6. [صفحه جزئیات Bot](#صفحه-جزئیات-bot)
7. [Real-time Updates](#real-time-updates)
8. [Responsive Design](#responsive-design)
9. [API Integration](#api-integration)

---

## اصول طراحی (Design Principles)

### 1. هماهنگی با Market Page
- ✅ **Exact same styling** به Market Page
- ✅ **Inline styles** (مشابه Market Page)
- ✅ **Panel-based layout** (Left, Center, Right)
- ✅ **Dark theme** با رنگ‌های یکسان
- ✅ **Component structure** مشابه Market components

### 2. رنگ‌ها (Colors)
```typescript
const colors = {
  background: "#1a1a1a",
  panelBackground: "#2a2a2a",
  border: "rgba(255, 174, 0, 0.2)",
  primary: "#FFAE00",
  text: "#ededed",
  secondaryText: "#888",
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
};
```

### 3. Layout Pattern
```typescript
const layoutStyle = {
  padding: "24px",
  maxWidth: "1600px",
  margin: "0 auto",
  color: "#ededed",
  display: "flex",
  gap: "0.5rem",
  alignItems: "flex-start",
  height: "calc(100vh - 200px)",
  minHeight: "600px",
};
```

### 4. Panel Style
```typescript
const panelStyle = {
  backgroundColor: "#2a2a2a",
  border: "1px solid rgba(255, 174, 0, 0.2)",
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};
```

---

## ساختار Layout

### صفحه اصلی Bot Management

```
┌─────────────────────────────────────────────────────────────┐
│  Bot Management Dashboard                                    │
│  (Header با title و action buttons)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────────────────────┐  ┌──────────┐   │
│  │  Left   │  │      Main Content        │  │  Right  │   │
│  │  Panel  │  │                          │  │  Panel  │   │
│  │         │  │  - Bot List Table         │  │         │   │
│  │ - Filter│  │  - Bot Status Cards      │  │ - Stats │   │
│  │ - Stats │  │  - Performance Charts    │  │ - Quick │   │
│  │         │  │                          │  │  Actions│   │
│  └──────────┘  └──────────────────────────┘  └──────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Bottom Panel                                        │   │
│  │  - Performance Metrics                              │   │
│  │  - Recent Trades                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## کامپوننت‌های اصلی

### 1. BotListPanel (Left Panel)

**موقعیت**: Left Panel  
**عرض**: `320px` (flex-shrink: 0)

#### Features:
- ✅ فیلتر Bot‌ها (Status, Strategy, Symbol)
- ✅ جستجو در Bot‌ها
- ✅ Quick Stats (Total Bots, Active, Stopped, Error)
- ✅ Create Bot Button

#### Component Structure:
```tsx
<div style={{
  width: "320px",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: "12px"
}}>
  <BotFiltersPanel />
  <BotStatsPanel />
  <CreateBotButton />
</div>
```

#### BotFiltersPanel:
```tsx
<div style={panelStyle}>
  <h3 style={{ color: "#FFAE00", marginBottom: "12px" }}>Filters</h3>
  
  {/* Status Filter */}
  <div>
    <label style={{ color: "#888", fontSize: "12px" }}>Status</label>
    <select style={{
      width: "100%",
      padding: "8px",
      backgroundColor: "#1a1a1a",
      border: "1px solid rgba(255, 174, 0, 0.2)",
      borderRadius: "8px",
      color: "#ededed"
    }}>
      <option value="all">All</option>
      <option value="active">Active</option>
      <option value="stopped">Stopped</option>
      <option value="error">Error</option>
    </select>
  </div>
  
  {/* Strategy Filter */}
  <div>
    <label style={{ color: "#888", fontSize: "12px" }}>Strategy</label>
    <select style={selectStyle}>
      <option value="all">All</option>
      <option value="prediction_based">Prediction Based</option>
      <option value="confidence_weighted">Confidence Weighted</option>
      <option value="multi_model_voting">Multi-Model Voting</option>
      <option value="jump_enhanced">Jump Enhanced</option>
    </select>
  </div>
  
  {/* Symbol Filter */}
  <div>
    <label style={{ color: "#888", fontSize: "12px" }}>Symbol</label>
    <input
      type="text"
      placeholder="BTC/USDT, ETH/USDT..."
      style={inputStyle}
    />
  </div>
  
  {/* Search */}
  <div>
    <label style={{ color: "#888", fontSize: "12px" }}>Search</label>
    <input
      type="text"
      placeholder="Search by name..."
      style={inputStyle}
    />
  </div>
</div>
```

#### BotStatsPanel:
```tsx
<div style={panelStyle}>
  <h3 style={{ color: "#FFAE00", marginBottom: "12px" }}>Quick Stats</h3>
  
  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
    <StatItem label="Total Bots" value={totalBots} color="#FFAE00" />
    <StatItem label="Active" value={activeBots} color="#22c55e" />
    <StatItem label="Stopped" value={stoppedBots} color="#888" />
    <StatItem label="Error" value={errorBots} color="#ef4444" />
  </div>
  
  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255, 174, 0, 0.1)" }}>
    <StatItem label="Total P&L" value={`$${totalPnl.toFixed(2)}`} color={totalPnl >= 0 ? "#22c55e" : "#ef4444"} />
    <StatItem label="Win Rate" value={`${winRate.toFixed(1)}%`} color="#FFAE00" />
  </div>
</div>
```

---

### 2. BotListTable (Main Content)

**موقعیت**: Center (flex: 1)  
**Features**:
- ✅ جدول لیست Bot‌ها
- ✅ Sortable columns
- ✅ Real-time status updates
- ✅ Quick actions (Start/Stop/Edit/Delete)
- ✅ Performance metrics inline

#### Component Structure:
```tsx
<div style={{
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "12px"
}}>
  <div style={panelStyle}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
      <h2 style={{ color: "#FFAE00" }}>Trading Bots</h2>
      <button style={primaryButtonStyle}>
        <MdAdd /> Create Bot
      </button>
    </div>
    
    <BotListTable
      bots={filteredBots}
      onStart={handleStart}
      onStop={handleStop}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  </div>
</div>
```

#### BotListTable:
```tsx
<table style={{ width: "100%", borderCollapse: "collapse" }}>
  <thead>
    <tr style={{ borderBottom: "1px solid rgba(255, 174, 0, 0.2)" }}>
      <th style={{ padding: "12px", textAlign: "left", color: "#888" }}>Name</th>
      <th style={{ padding: "12px", textAlign: "left", color: "#888" }}>Status</th>
      <th style={{ padding: "12px", textAlign: "left", color: "#888" }}>Strategy</th>
      <th style={{ padding: "12px", textAlign: "left", color: "#888" }}>Symbols</th>
      <th style={{ padding: "12px", textAlign: "right", color: "#888" }}>Capital</th>
      <th style={{ padding: "12px", textAlign: "right", color: "#888" }}>P&L</th>
      <th style={{ padding: "12px", textAlign: "center", color: "#888" }}>Win Rate</th>
      <th style={{ padding: "12px", textAlign: "center", color: "#888" }}>Trades</th>
      <th style={{ padding: "12px", textAlign: "center", color: "#888" }}>Actions</th>
    </tr>
  </thead>
  <tbody>
    {bots.map(bot => (
      <BotTableRow key={bot.id} bot={bot} />
    ))}
  </tbody>
</table>
```

#### BotTableRow:
```tsx
<tr style={{
  borderBottom: "1px solid rgba(255, 174, 0, 0.1)",
  cursor: "pointer",
  transition: "background-color 0.2s"
}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2a2a2a"} 
   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
  <td style={{ padding: "12px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <StatusIndicator status={bot.status} />
      <span style={{ color: "#ededed", fontWeight: "500" }}>{bot.name}</span>
    </div>
  </td>
  <td style={{ padding: "12px" }}>
    <StatusBadge status={bot.status} />
  </td>
  <td style={{ padding: "12px", color: "#888" }}>{bot.strategy_type}</td>
  <td style={{ padding: "12px" }}>
    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
      {bot.symbols.slice(0, 3).map(symbol => (
        <span key={symbol} style={symbolBadgeStyle}>{symbol}</span>
      ))}
      {bot.symbols.length > 3 && (
        <span style={symbolBadgeStyle}>+{bot.symbols.length - 3}</span>
      )}
    </div>
  </td>
  <td style={{ padding: "12px", textAlign: "right", color: "#ededed" }}>
    ${bot.capital.toFixed(2)}
  </td>
  <td style={{ 
    padding: "12px", 
    textAlign: "right",
    color: bot.total_pnl >= 0 ? "#22c55e" : "#ef4444"
  }}>
    ${bot.total_pnl.toFixed(2)}
  </td>
  <td style={{ padding: "12px", textAlign: "center", color: "#FFAE00" }}>
    {bot.win_rate.toFixed(1)}%
  </td>
  <td style={{ padding: "12px", textAlign: "center", color: "#888" }}>
    {bot.total_trades}
  </td>
  <td style={{ padding: "12px", textAlign: "center" }}>
    <BotActions bot={bot} />
  </td>
</tr>
```

---

### 3. BotDetailsPanel (Right Panel)

**موقعیت**: Right Panel (optional - در صفحه جزئیات)  
**عرض**: `320px`

#### Features:
- ✅ Real-time performance metrics
- ✅ Current positions
- ✅ Recent trades
- ✅ Quick actions

#### Component Structure:
```tsx
<div style={{
  width: "320px",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: "12px"
}}>
  <BotPerformancePanel bot={selectedBot} />
  <BotPositionsPanel bot={selectedBot} />
  <BotRecentTradesPanel bot={selectedBot} />
</div>
```

---

### 4. CreateBotForm (Modal/Dialog)

**موقعیت**: Modal overlay  
**Features**:
- ✅ فرم ایجاد Bot جدید
- ✅ Validation
- ✅ Real-time preview
- ✅ Strategy selection
- ✅ Risk management settings

#### Component Structure:
```tsx
<div style={{
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000
}}>
  <div style={{
    backgroundColor: "#2a2a2a",
    border: "1px solid rgba(255, 174, 0, 0.2)",
    borderRadius: "12px",
    padding: "24px",
    maxWidth: "600px",
    width: "90%",
    maxHeight: "90vh",
    overflowY: "auto"
  }}>
    <CreateBotForm onClose={handleClose} onSubmit={handleSubmit} />
  </div>
</div>
```

#### CreateBotForm Sections:

##### 1. Basic Info:
```tsx
<div style={{ marginBottom: "24px" }}>
  <h2 style={{ color: "#FFAE00", marginBottom: "16px" }}>Create Trading Bot</h2>
  
  <div style={{ marginBottom: "16px" }}>
    <label style={{ color: "#ededed", display: "block", marginBottom: "8px" }}>
      Bot Name *
    </label>
    <input
      type="text"
      placeholder="My Trading Bot"
      style={inputStyle}
      value={name}
      onChange={(e) => setName(e.target.value)}
    />
  </div>
  
  <div style={{ marginBottom: "16px" }}>
    <label style={{ color: "#ededed", display: "block", marginBottom: "8px" }}>
      Exchange Account *
    </label>
    <select style={selectStyle} value={exchangeAccountId} onChange={(e) => setExchangeAccountId(e.target.value)}>
      <option value="">Select Exchange</option>
      {accounts.map(acc => (
        <option key={acc.id} value={acc.id}>{acc.exchange_name}</option>
      ))}
    </select>
  </div>
</div>
```

##### 2. Trading Settings:
```tsx
<div style={{ marginBottom: "24px" }}>
  <h3 style={{ color: "#FFAE00", marginBottom: "16px" }}>Trading Settings</h3>
  
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
    <div>
      <label style={{ color: "#ededed", display: "block", marginBottom: "8px" }}>
        Initial Capital (USDT) *
      </label>
      <input
        type="number"
        min="1"
        step="0.01"
        placeholder="1000"
        style={inputStyle}
        value={capital}
        onChange={(e) => setCapital(e.target.value)}
      />
    </div>
    
    <div>
      <label style={{ color: "#ededed", display: "block", marginBottom: "8px" }}>
        Risk Per Trade (%)
      </label>
      <input
        type="number"
        min="0.1"
        max="10"
        step="0.1"
        placeholder="2"
        style={inputStyle}
        value={riskPerTrade}
        onChange={(e) => setRiskPerTrade(e.target.value)}
      />
    </div>
  </div>
  
  <div style={{ marginTop: "16px" }}>
    <label style={{ color: "#ededed", display: "block", marginBottom: "8px" }}>
      Trading Symbols *
    </label>
    <SymbolMultiSelect
      selectedSymbols={symbols}
      onChange={setSymbols}
      availableSymbols={availableSymbols}
    />
  </div>
</div>
```

##### 3. Strategy Selection:
```tsx
<div style={{ marginBottom: "24px" }}>
  <h3 style={{ color: "#FFAE00", marginBottom: "16px" }}>Strategy</h3>
  
  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
    {strategies.map(strategy => (
      <div
        key={strategy.id}
        style={{
          padding: "16px",
          border: selectedStrategy === strategy.id 
            ? "2px solid #FFAE00" 
            : "1px solid rgba(255, 174, 0, 0.2)",
          borderRadius: "8px",
          cursor: "pointer",
          backgroundColor: selectedStrategy === strategy.id ? "rgba(255, 174, 0, 0.1)" : "transparent"
        }}
        onClick={() => setSelectedStrategy(strategy.id)}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h4 style={{ color: "#ededed", marginBottom: "4px" }}>{strategy.name}</h4>
            <p style={{ color: "#888", fontSize: "12px" }}>{strategy.description}</p>
          </div>
          {selectedStrategy === strategy.id && (
            <MdCheckCircle style={{ color: "#FFAE00", fontSize: "24px" }} />
          )}
        </div>
      </div>
    ))}
  </div>
</div>
```

##### 4. Risk Management:
```tsx
<div style={{ marginBottom: "24px" }}>
  <h3 style={{ color: "#FFAE00", marginBottom: "16px" }}>Risk Management</h3>
  
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
    <div>
      <label style={{ color: "#ededed", display: "block", marginBottom: "8px" }}>
        Stop Loss (%)
      </label>
      <input
        type="number"
        min="0.1"
        max="50"
        step="0.1"
        placeholder="2"
        style={inputStyle}
        value={stopLoss}
        onChange={(e) => setStopLoss(e.target.value)}
      />
    </div>
    
    <div>
      <label style={{ color: "#ededed", display: "block", marginBottom: "8px" }}>
        Take Profit (%)
      </label>
      <input
        type="number"
        min="0.1"
        max="200"
        step="0.1"
        placeholder="5"
        style={inputStyle}
        value={takeProfit}
        onChange={(e) => setTakeProfit(e.target.value)}
      />
    </div>
  </div>
  
  <div style={{ marginTop: "16px" }}>
    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={paperTrading}
        onChange={(e) => setPaperTrading(e.target.checked)}
        style={{ width: "18px", height: "18px" }}
      />
      <span style={{ color: "#ededed" }}>Paper Trading (Demo Mode)</span>
    </label>
    <p style={{ color: "#888", fontSize: "12px", marginTop: "4px", marginLeft: "26px" }}>
      Simulate trading without real money
    </p>
  </div>
</div>
```

##### 5. Duration (Optional):
```tsx
<div style={{ marginBottom: "24px" }}>
  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
    <input
      type="checkbox"
      checked={hasDuration}
      onChange={(e) => setHasDuration(e.target.checked)}
    />
    <span style={{ color: "#ededed" }}>Set Duration</span>
  </label>
  
  {hasDuration && (
    <div style={{ marginTop: "12px" }}>
      <input
        type="number"
        min="1"
        placeholder="24"
        style={inputStyle}
        value={durationHours}
        onChange={(e) => setDurationHours(e.target.value)}
      />
      <span style={{ color: "#888", marginLeft: "8px" }}>hours</span>
    </div>
  )}
</div>
```

---

### 5. BotDetailPage

**Route**: `/bots/[id]`  
**Layout**: مشابه Market Page با Left, Center, Right panels

#### Left Panel:
- Bot Info Card
- Quick Actions (Start/Stop/Edit/Delete)
- Configuration Summary

#### Center Panel:
- Performance Charts
- Trade History Table
- Position List

#### Right Panel:
- Real-time Metrics
- Current Positions
- Recent Activity

#### Component Structure:
```tsx
<div style={{
  padding: "24px",
  maxWidth: "1600px",
  margin: "0 auto",
  color: "#ededed"
}}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
    <h1 style={{ color: "#FFAE00" }}>{bot.name}</h1>
    <BotStatusBadge status={bot.status} />
  </div>
  
  <div style={{
    display: "flex",
    gap: "0.5rem",
    alignItems: "flex-start",
    height: "calc(100vh - 200px)",
    minHeight: "600px"
  }}>
    {/* Left Panel */}
    <BotInfoPanel bot={bot} />
    
    {/* Center Panel */}
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
      <BotPerformanceCharts bot={bot} />
      <BotTradeHistoryTable bot={bot} />
      <BotPositionsList bot={bot} />
    </div>
    
    {/* Right Panel */}
    <BotMetricsPanel bot={bot} />
  </div>
</div>
```

---

### 6. BotPerformanceCharts

**Component**: Performance visualization  
**Charts**:
- P&L Over Time (Line Chart)
- Win Rate (Bar Chart)
- Trade Distribution (Pie Chart)
- Capital Over Time (Area Chart)

#### Implementation:
```tsx
<div style={panelStyle}>
  <h3 style={{ color: "#FFAE00", marginBottom: "16px" }}>Performance</h3>
  
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={pnlData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 174, 0, 0.1)" />
        <XAxis dataKey="time" stroke="#888" />
        <YAxis stroke="#888" />
        <Tooltip contentStyle={{ backgroundColor: "#2a2a2a", border: "1px solid rgba(255, 174, 0, 0.2)" }} />
        <Line type="monotone" dataKey="pnl" stroke="#FFAE00" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
    
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={winRateData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 174, 0, 0.1)" />
        <XAxis dataKey="period" stroke="#888" />
        <YAxis stroke="#888" />
        <Tooltip contentStyle={{ backgroundColor: "#2a2a2a", border: "1px solid rgba(255, 174, 0, 0.2)" }} />
        <Bar dataKey="winRate" fill="#22c55e" />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
```

---

### 7. BotTradeHistoryTable

**Component**: Table of all trades  
**Features**:
- Sortable columns
- Filter by status (Open/Closed)
- Real-time updates
- Expandable rows for details

#### Implementation:
```tsx
<div style={panelStyle}>
  <h3 style={{ color: "#FFAE00", marginBottom: "16px" }}>Trade History</h3>
  
  <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
    <button
      style={{
        padding: "6px 12px",
        backgroundColor: filterStatus === "all" ? "#FFAE00" : "transparent",
        border: "1px solid rgba(255, 174, 0, 0.2)",
        borderRadius: "6px",
        color: filterStatus === "all" ? "#1a1a1a" : "#ededed",
        cursor: "pointer"
      }}
      onClick={() => setFilterStatus("all")}
    >
      All
    </button>
    <button
      style={{
        padding: "6px 12px",
        backgroundColor: filterStatus === "open" ? "#FFAE00" : "transparent",
        border: "1px solid rgba(255, 174, 0, 0.2)",
        borderRadius: "6px",
        color: filterStatus === "open" ? "#1a1a1a" : "#ededed",
        cursor: "pointer"
      }}
      onClick={() => setFilterStatus("open")}
    >
      Open
    </button>
    <button
      style={{
        padding: "6px 12px",
        backgroundColor: filterStatus === "closed" ? "#FFAE00" : "transparent",
        border: "1px solid rgba(255, 174, 0, 0.2)",
        borderRadius: "6px",
        color: filterStatus === "closed" ? "#1a1a1a" : "#ededed",
        cursor: "pointer"
      }}
      onClick={() => setFilterStatus("closed")}
    >
      Closed
    </button>
  </div>
  
  <table style={{ width: "100%", borderCollapse: "collapse" }}>
    <thead>
      <tr style={{ borderBottom: "1px solid rgba(255, 174, 0, 0.2)" }}>
        <th style={{ padding: "12px", textAlign: "left", color: "#888" }}>Symbol</th>
        <th style={{ padding: "12px", textAlign: "left", color: "#888" }}>Side</th>
        <th style={{ padding: "12px", textAlign: "right", color: "#888" }}>Entry Price</th>
        <th style={{ padding: "12px", textAlign: "right", color: "#888" }}>Exit Price</th>
        <th style={{ padding: "12px", textAlign: "right", color: "#888" }}>Quantity</th>
        <th style={{ padding: "12px", textAlign: "right", color: "#888" }}>P&L</th>
        <th style={{ padding: "12px", textAlign: "left", color: "#888" }}>Status</th>
        <th style={{ padding: "12px", textAlign: "left", color: "#888" }}>Time</th>
      </tr>
    </thead>
    <tbody>
      {filteredTrades.map(trade => (
        <TradeTableRow key={trade.id} trade={trade} />
      ))}
    </tbody>
  </table>
</div>
```

---

## Real-time Updates

### WebSocket Integration

```tsx
useEffect(() => {
  if (!botId) return;
  
  const ws = new WebSocket(`ws://localhost:8000/ws/bot/${botId}`);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case "bot.status":
        setBotStatus(data.status);
        break;
      case "bot.trade":
        addTrade(data.trade);
        break;
      case "bot.position":
        updatePosition(data.position);
        break;
      case "bot.metrics":
        updateMetrics(data.metrics);
        break;
    }
  };
  
  return () => ws.close();
}, [botId]);
```

### Polling (Fallback)

```tsx
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/bots/${botId}/status`);
    const data = await response.json();
    updateBotData(data);
  }, 5000); // Every 5 seconds
  
  return () => clearInterval(interval);
}, [botId]);
```

---

## Responsive Design

### Breakpoints:
```typescript
const breakpoints = {
  mobile: "768px",
  tablet: "1024px",
  desktop: "1280px",
};
```

### Mobile Layout:
```tsx
<div style={{
  display: "flex",
  flexDirection: window.innerWidth < 768 ? "column" : "row",
  gap: "12px"
}}>
  {/* Panels stack vertically on mobile */}
</div>
```

---

## API Integration

### Endpoints:

#### Bot Management:
- `GET /bots` - لیست Bot‌ها
- `POST /bots/create` - ایجاد Bot جدید
- `GET /bots/{id}` - جزئیات Bot
- `PUT /bots/{id}` - ویرایش Bot
- `DELETE /bots/{id}` - حذف Bot
- `POST /bots/{id}/start` - شروع Bot
- `POST /bots/{id}/stop` - توقف Bot
- `GET /bots/{id}/status` - وضعیت Bot
- `GET /bots/{id}/trades` - لیست Trades

#### Real-time:
- `WS /ws/bot/{id}` - WebSocket connection

---

## Styling Constants

```typescript
// Colors
const colors = {
  background: "#1a1a1a",
  panelBackground: "#2a2a2a",
  border: "rgba(255, 174, 0, 0.2)",
  primary: "#FFAE00",
  text: "#ededed",
  secondaryText: "#888",
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
};

// Common Styles
const panelStyle = {
  backgroundColor: "#2a2a2a",
  border: "1px solid rgba(255, 174, 0, 0.2)",
  borderRadius: "12px",
  padding: "16px",
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  backgroundColor: "#1a1a1a",
  border: "1px solid rgba(255, 174, 0, 0.2)",
  borderRadius: "8px",
  color: "#ededed",
  fontSize: "14px",
};

const buttonStyle = {
  padding: "10px 20px",
  backgroundColor: "#FFAE00",
  border: "none",
  borderRadius: "8px",
  color: "#1a1a1a",
  fontWeight: "600",
  cursor: "pointer",
  transition: "opacity 0.2s",
};

const badgeStyle = {
  padding: "4px 8px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "500",
};
```

---

## Component Checklist

### ✅ Core Components:
- [ ] BotListPage (صفحه اصلی)
- [ ] BotListTable (جدول Bot‌ها)
- [ ] BotFiltersPanel (فیلترها)
- [ ] BotStatsPanel (آمار)
- [ ] CreateBotForm (فرم ایجاد)
- [ ] BotDetailPage (صفحه جزئیات)
- [ ] BotPerformanceCharts (نمودارها)
- [ ] BotTradeHistoryTable (تاریخچه معاملات)
- [ ] BotPositionsList (پوزیشن‌ها)
- [ ] BotMetricsPanel (متریک‌ها)

### ✅ UI Components:
- [ ] StatusBadge (وضعیت)
- [ ] StatusIndicator (نشانگر وضعیت)
- [ ] SymbolBadge (نماد)
- [ ] PnLIndicator (سود/زیان)
- [ ] ProgressBar (نوار پیشرفت)
- [ ] LoadingSpinner (لودینگ)
- [ ] ErrorMessage (خطا)
- [ ] SuccessMessage (موفقیت)

### ✅ Features:
- [ ] Real-time updates
- [ ] WebSocket integration
- [ ] Filtering & Search
- [ ] Sorting
- [ ] Pagination
- [ ] Responsive design
- [ ] Error handling
- [ ] Loading states

---

## نکات مهم

1. **هماهنگی با Market Page**: تمام استایل‌ها باید مشابه Market Page باشند
2. **Inline Styles**: استفاده از inline styles (مشابه Market Page)
3. **Dark Theme**: استفاده از رنگ‌های یکسان
4. **Real-time**: به‌روزرسانی Real-time برای status و metrics
5. **Responsive**: طراحی Responsive برای mobile و tablet
6. **Error Handling**: مدیریت خطاها و نمایش پیام‌های مناسب
7. **Loading States**: نمایش loading states برای async operations

---

## نتیجه‌گیری

این طراحی UI برای صفحه Trading Bot:
- ✅ با Market Page هماهنگ است
- ✅ تمام قابلیت‌های TRADING_BOT_REDESIGN.md را پوشش می‌دهد
- ✅ Real-time updates دارد
- ✅ Responsive است
- ✅ User-friendly است

**گام بعدی**: شروع پیاده‌سازی با BotListPage

