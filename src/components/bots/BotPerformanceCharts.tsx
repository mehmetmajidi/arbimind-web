"use client";

import { useMemo, ReactElement } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BotTrade, TradingBot } from "./types";
import { colors, panelStyle } from "./constants";

interface BotPerformanceChartsProps {
  bot: TradingBot | null;
  trades: BotTrade[];
  botStatus: {
    total_pnl: number;
    win_rate: number;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    current_capital: number;
    capital: number;
  } | null;
}

// Custom Tooltip for dark theme
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: colors.panelBackground,
        border: `1px solid ${colors.border}`,
        borderRadius: "8px",
        padding: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
      }}>
        <p style={{ color: colors.text, marginBottom: "8px", fontWeight: "600", fontSize: "13px" }}>
          {label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, margin: "4px 0", fontSize: "12px" }}>
            {entry.name}: {entry.value >= 0 ? "+" : ""}{typeof entry.value === "number" ? entry.value.toFixed(2) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom Label for Pie Chart
const renderCustomLabel = (props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
  value?: number;
}): ReactElement | null => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  
  if (cx === undefined || cy === undefined || midAngle === undefined || 
      innerRadius === undefined || outerRadius === undefined || percent === undefined) {
    return null;
  }
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={colors.text}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      style={{ fontSize: "12px", fontWeight: "600" }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function BotPerformanceCharts({ bot, trades, botStatus }: BotPerformanceChartsProps) {
  // Prepare P&L over time data (Line Chart)
  const pnlOverTimeData = useMemo(() => {
    const closedTrades = trades
      .filter(t => t.status === "closed" && t.pnl && t.exit_time)
      .map(t => ({
        time: new Date(t.exit_time!).getTime(),
        pnl: parseFloat(t.pnl),
        date: new Date(t.exit_time!).toLocaleDateString(),
      }))
      .sort((a, b) => a.time - b.time);

    // Group by date and calculate cumulative P&L
    const groupedByDate = closedTrades.reduce((acc, trade) => {
      const date = trade.date;
      if (!acc[date]) {
        acc[date] = { date, trades: [], cumulativePnl: 0 };
      }
      acc[date].trades.push(trade);
      return acc;
    }, {} as Record<string, { date: string; trades: Array<{ pnl: number }>; cumulativePnl: number }>);

    let cumulativePnl = 0;
    return Object.values(groupedByDate).map(group => {
      const dailyPnl = group.trades.reduce((sum, t) => sum + t.pnl, 0);
      cumulativePnl += dailyPnl;
      return {
        date: group.date,
        pnl: dailyPnl,
        cumulativePnl: cumulativePnl,
      };
    });
  }, [trades]);

  // Prepare Win Rate data (Bar Chart) - by period
  const winRateData = useMemo(() => {
    if (!botStatus || botStatus.total_trades === 0) return [];

    const closedTrades = trades.filter(t => t.status === "closed");
    if (closedTrades.length === 0) return [];

    // Group trades by week
    const weeklyData = closedTrades.reduce((acc, trade) => {
      const date = new Date(trade.exit_time || trade.entry_time);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toLocaleDateString();

      if (!acc[weekKey]) {
        acc[weekKey] = { period: weekKey, winning: 0, losing: 0 };
      }

      const pnl = parseFloat(trade.pnl || "0");
      if (pnl > 0) {
        acc[weekKey].winning += 1;
      } else if (pnl < 0) {
        acc[weekKey].losing += 1;
      }

      return acc;
    }, {} as Record<string, { period: string; winning: number; losing: number }>);

    return Object.values(weeklyData)
      .map(week => ({
        period: week.period,
        winRate: week.winning + week.losing > 0 
          ? (week.winning / (week.winning + week.losing)) * 100 
          : 0,
        winning: week.winning,
        losing: week.losing,
      }))
      .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())
      .slice(-8); // Last 8 weeks
  }, [trades, botStatus]);

  // Prepare Trade Distribution data (Pie Chart)
  const tradeDistributionData = useMemo(() => {
    if (!botStatus) return [];

    return [
      { name: "Winning", value: botStatus.winning_trades, color: colors.success },
      { name: "Losing", value: botStatus.losing_trades, color: colors.error },
    ].filter(item => item.value > 0);
  }, [botStatus]);

  // Prepare Capital Over Time data (Area Chart)
  const capitalOverTimeData = useMemo(() => {
    if (!bot || !botStatus) return [];

    const closedTrades = trades
      .filter(t => t.status === "closed" && t.exit_time)
      .map(t => ({
        time: new Date(t.exit_time!).getTime(),
        pnl: parseFloat(t.pnl || "0"),
        date: new Date(t.exit_time!).toLocaleDateString(),
      }))
      .sort((a, b) => a.time - b.time);

    // Calculate capital progression
    let currentCapital = parseFloat(bot.capital);
    const capitalData: Array<{ date: string; capital: number }> = [
      { date: new Date(bot.created_at).toLocaleDateString(), capital: currentCapital },
    ];

    // Group by date
    const groupedByDate = closedTrades.reduce((acc, trade) => {
      const date = trade.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(trade);
      return acc;
    }, {} as Record<string, Array<{ pnl: number }>>);

    Object.entries(groupedByDate).forEach(([date, dayTrades]) => {
      const dailyPnl = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
      currentCapital += dailyPnl;
      capitalData.push({ date, capital: currentCapital });
    });

    // Add current capital if different
    if (capitalData.length > 0) {
      const lastCapital = capitalData[capitalData.length - 1].capital;
      if (Math.abs(lastCapital - botStatus.current_capital) > 0.01) {
        capitalData.push({
          date: "Now",
          capital: botStatus.current_capital,
        });
      }
    }

    return capitalData;
  }, [bot, botStatus, trades]);

  // Chart styling for dark theme
  const chartStyle = {
    backgroundColor: colors.background,
    borderRadius: "8px",
    border: `1px solid ${colors.border}`,
    padding: "12px",
  };

  const axisStyle = {
    stroke: colors.secondaryText,
    fontSize: "12px",
  };

  const gridStyle = {
    stroke: "rgba(255, 174, 0, 0.1)",
    strokeDasharray: "3 3",
  };

  return (
    <div style={panelStyle}>
      <h3 style={{ color: colors.primary, marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
        Performance Charts
      </h3>

      {/* P&L Over Time (Line Chart) */}
      <div style={{ marginBottom: "24px" }}>
        <h4 style={{ color: colors.text, marginBottom: "12px", fontSize: "14px", fontWeight: "500" }}>
          P&L Over Time
        </h4>
        {pnlOverTimeData.length > 0 ? (
          <div style={chartStyle}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={pnlOverTimeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
                <XAxis
                  dataKey="date"
                  stroke={axisStyle.stroke}
                  style={{ fontSize: axisStyle.fontSize }}
                  tick={{ fill: colors.secondaryText }}
                />
                <YAxis
                  stroke={axisStyle.stroke}
                  style={{ fontSize: axisStyle.fontSize }}
                  tick={{ fill: colors.secondaryText }}
                  tickFormatter={(value) => `${value >= 0 ? "+" : ""}${value.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: colors.text, fontSize: "12px" }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="cumulativePnl"
                  name="Cumulative P&L"
                  stroke={colors.primary}
                  strokeWidth={2}
                  dot={{ fill: colors.primary, r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="pnl"
                  name="Daily P&L"
                  stroke={colors.info}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={{ fill: colors.info, r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{
            height: "250px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.secondaryText,
            ...chartStyle,
          }}>
            No data available
          </div>
        )}
      </div>

      {/* Grid: Win Rate (Bar Chart) and Trade Distribution (Pie Chart) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        {/* Win Rate (Bar Chart) */}
        <div>
          <h4 style={{ color: colors.text, marginBottom: "12px", fontSize: "14px", fontWeight: "500" }}>
            Win Rate by Period
          </h4>
          {winRateData.length > 0 ? (
            <div style={chartStyle}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={winRateData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
                  <XAxis
                    dataKey="period"
                    stroke={axisStyle.stroke}
                    style={{ fontSize: "11px" }}
                    tick={{ fill: colors.secondaryText }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke={axisStyle.stroke}
                    style={{ fontSize: axisStyle.fontSize }}
                    tick={{ fill: colors.secondaryText }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ color: colors.text, fontSize: "12px" }}
                  />
                  <Bar dataKey="winRate" name="Win Rate %" fill={colors.success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{
              height: "250px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.secondaryText,
              ...chartStyle,
            }}>
              No data available
            </div>
          )}
        </div>

        {/* Trade Distribution (Pie Chart) */}
        <div>
          <h4 style={{ color: colors.text, marginBottom: "12px", fontSize: "14px", fontWeight: "500" }}>
            Trade Distribution
          </h4>
          {tradeDistributionData.length > 0 ? (
            <div style={chartStyle}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={tradeDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel as (props: unknown) => ReactElement | null}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tradeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomTooltip />}
                    formatter={(value: number) => `${value} trades`}
                  />
                  <Legend
                    wrapperStyle={{ color: colors.text, fontSize: "12px" }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{
              height: "250px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.secondaryText,
              ...chartStyle,
            }}>
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Capital Over Time (Area Chart) */}
      <div>
        <h4 style={{ color: colors.text, marginBottom: "12px", fontSize: "14px", fontWeight: "500" }}>
          Capital Over Time
        </h4>
        {capitalOverTimeData.length > 0 ? (
          <div style={chartStyle}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={capitalOverTimeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
                <XAxis
                  dataKey="date"
                  stroke={axisStyle.stroke}
                  style={{ fontSize: axisStyle.fontSize }}
                  tick={{ fill: colors.secondaryText }}
                />
                <YAxis
                  stroke={axisStyle.stroke}
                  style={{ fontSize: axisStyle.fontSize }}
                  tick={{ fill: colors.secondaryText }}
                  tickFormatter={(value) => `${value.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: colors.text, fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="capital"
                  name="Capital (USDT)"
                  stroke={colors.primary}
                  fillOpacity={1}
                  fill="url(#colorCapital)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{
            height: "250px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.secondaryText,
            ...chartStyle,
          }}>
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
