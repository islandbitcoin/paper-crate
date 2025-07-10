import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatSats } from '@/lib/campaign-utils';
import type { PerformanceReport } from '@/stores/campaignStore';

interface PerformanceChartProps {
  reports: PerformanceReport[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

export function PerformanceChart({ reports }: PerformanceChartProps) {
  // Group reports by platform
  const platformData = reports.reduce((acc, report) => {
    if (!acc[report.platform]) {
      acc[report.platform] = {
        platform: report.platform,
        posts: 0,
        totalEngagement: 0,
        totalSpent: 0,
      };
    }

    acc[report.platform].posts++;
    acc[report.platform].totalEngagement += Object.values(report.metrics).reduce((sum, count) => sum + count, 0);
    acc[report.platform].totalSpent += report.amountClaimed;

    return acc;
  }, {} as Record<string, { platform: string; posts: number; totalEngagement: number; totalSpent: number }>);

  const chartData = Object.values(platformData);

  // Prepare pie chart data
  const pieData = chartData.map((item, index) => ({
    name: item.platform,
    value: item.totalSpent,
    color: COLORS[index % COLORS.length],
  }));

  if (reports.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No performance data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bar Chart - Engagement by Platform */}
      <div>
        <h4 className="text-sm font-medium mb-4">Engagement by Platform</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="platform" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                name === 'totalSpent' ? formatSats(value as number) : value,
                name === 'totalSpent' ? 'Spent' : 'Engagement'
              ]}
            />
            <Bar dataKey="totalEngagement" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart - Spending Distribution */}
      <div>
        <h4 className="text-sm font-medium mb-4">Spending Distribution</h4>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatSats(value as number)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}