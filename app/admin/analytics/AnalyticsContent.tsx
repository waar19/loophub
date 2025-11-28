'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useTranslations } from '@/components/TranslationsProvider';

interface DailyMetric {
  date: string;
  total_users: number;
  new_users: number;
  active_users: number;
  total_threads: number;
  new_threads: number;
  total_comments: number;
  new_comments: number;
  total_views: number;
  total_votes: number;
}

interface TopThread {
  id: string;
  title: string;
  view_count: number;
  upvote_count: number;
  comment_count: number;
  profile: { username: string } | null;
  created_at: string;
}

interface TopUser {
  id: string;
  username: string;
  avatar_url: string | null;
  reputation: number;
  thread_count: number;
  comment_count: number;
}

interface AnalyticsData {
  currentMetrics: {
    totalUsers: number;
    totalThreads: number;
    totalComments: number;
    totalVotes: number;
    newUsersToday: number;
    newThreadsToday: number;
    newCommentsToday: number;
    activeUsersWeek: number;
  };
  dailyMetrics: DailyMetric[];
  topThreads: TopThread[];
  topUsers: TopUser[];
  recentActivity: {
    type: 'thread' | 'comment' | 'user';
    title: string;
    username: string;
    created_at: string;
  }[];
}

export default function AnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'threads' | 'users' | 'growth'>('overview');
  const supabase = createClient();
  const { t } = useTranslations();

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Fetch current totals
    const [
      { count: totalUsers },
      { count: totalThreads },
      { count: totalComments },
      { count: totalVotes },
      { count: newUsersToday },
      { count: newThreadsToday },
      { count: newCommentsToday },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('threads').select('*', { count: 'exact', head: true }).eq('is_hidden', false),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
      supabase.from('votes').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),
      supabase.from('threads').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),
      supabase.from('comments').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),
    ]);

    // Fetch daily metrics
    const { data: dailyMetrics } = await supabase
      .from('daily_metrics')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Fetch top threads
    const { data: topThreads } = await supabase
      .from('threads')
      .select('id, title, view_count, upvote_count, created_at, profile:profiles(username)')
      .eq('is_hidden', false)
      .order('view_count', { ascending: false })
      .limit(10);

    // Fetch comment counts for threads
    const threadsWithComments = await Promise.all(
      (topThreads || []).map(async (thread) => {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', thread.id);
        return { ...thread, comment_count: count || 0 };
      })
    );

    // Fetch top users by reputation
    const { data: topUsersData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, reputation')
      .order('reputation', { ascending: false })
      .limit(10);

    // Get thread and comment counts for top users
    const topUsers = await Promise.all(
      (topUsersData || []).map(async (user) => {
        const [{ count: threadCount }, { count: commentCount }] = await Promise.all([
          supabase.from('threads').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);
        return {
          ...user,
          thread_count: threadCount || 0,
          comment_count: commentCount || 0,
        };
      })
    );

    // Fetch recent activity
    const [{ data: recentThreads }, { data: recentComments }, { data: recentUsers }] = await Promise.all([
      supabase
        .from('threads')
        .select('id, title, created_at, profile:profiles(username)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('comments')
        .select('id, content, created_at, profile:profiles(username)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('profiles')
        .select('id, username, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const recentActivity = [
      ...(recentThreads || []).map((t) => ({
        type: 'thread' as const,
        title: t.title,
        username: (t.profile as unknown as { username: string } | null)?.username || 'Unknown',
        created_at: t.created_at,
      })),
      ...(recentComments || []).map((c) => ({
        type: 'comment' as const,
        title: c.content.substring(0, 50) + '...',
        username: (c.profile as unknown as { username: string } | null)?.username || 'Unknown',
        created_at: c.created_at,
      })),
      ...(recentUsers || []).map((u) => ({
        type: 'user' as const,
        title: `${u.username} joined`,
        username: u.username,
        created_at: u.created_at,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

    // Calculate active users in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: activeThreadUsers } = await supabase
      .from('threads')
      .select('user_id')
      .gte('created_at', weekAgo.toISOString());
    
    const { data: activeCommentUsers } = await supabase
      .from('comments')
      .select('user_id')
      .gte('created_at', weekAgo.toISOString());

    const activeUserIds = new Set([
      ...(activeThreadUsers || []).map(t => t.user_id),
      ...(activeCommentUsers || []).map(c => c.user_id),
    ].filter(Boolean));

    setData({
      currentMetrics: {
        totalUsers: totalUsers || 0,
        totalThreads: totalThreads || 0,
        totalComments: totalComments || 0,
        totalVotes: totalVotes || 0,
        newUsersToday: newUsersToday || 0,
        newThreadsToday: newThreadsToday || 0,
        newCommentsToday: newCommentsToday || 0,
        activeUsersWeek: activeUserIds.size,
      },
      dailyMetrics: dailyMetrics || [],
      topThreads: threadsWithComments as unknown as TopThread[],
      topUsers,
      recentActivity,
    });
    
    setLoading(false);
  }, [supabase, dateRange]);

  useEffect(() => {
    // Use a flag to prevent state updates on unmounted component
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await fetchAnalytics();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [fetchAnalytics]);

  const exportCSV = () => {
    if (!data) return;
    
    const headers = ['Date', 'Total Users', 'New Users', 'Active Users', 'Total Threads', 'New Threads', 'Total Comments', 'New Comments', 'Views', 'Votes'];
    const rows = data.dailyMetrics.map(m => [
      m.date,
      m.total_users,
      m.new_users,
      m.active_users,
      m.total_threads,
      m.new_threads,
      m.total_comments,
      m.new_comments,
      m.total_views,
      m.total_votes,
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="lg:ml-(--sidebar-width) min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
          {/* Header skeleton */}
          <div className="flex justify-between items-center">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex gap-2">
              <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
          {/* Content skeleton */}
          <div className="card h-80 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { currentMetrics, dailyMetrics, topThreads, topUsers, recentActivity } = data;

  const lastMetric = dailyMetrics[dailyMetrics.length - 1];
  const prevMetric = dailyMetrics[dailyMetrics.length - 8] || dailyMetrics[0];

  return (
    <div className="lg:ml-(--sidebar-width) min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">📊 Analytics Dashboard</h1>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="btn"
            style={{
              background: 'var(--card-bg)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
          >
            ← {t('admin.backToAdmin')}
          </Link>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
            className="input text-sm"
            style={{ width: 'auto' }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button onClick={exportCSV} className="btn btn-secondary text-sm">
            📥 Export CSV
          </button>
          <button onClick={fetchAnalytics} className="btn btn-secondary text-sm">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={currentMetrics.totalUsers}
          change={`+${currentMetrics.newUsersToday} today`}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Total Threads"
          value={currentMetrics.totalThreads}
          change={`+${currentMetrics.newThreadsToday} today`}
          icon="📝"
          color="green"
        />
        <StatCard
          title="Total Comments"
          value={currentMetrics.totalComments}
          change={`+${currentMetrics.newCommentsToday} today`}
          icon="💬"
          color="purple"
        />
        <StatCard
          title="Active Users (7d)"
          value={currentMetrics.activeUsersWeek}
          change={`${((currentMetrics.activeUsersWeek / currentMetrics.totalUsers) * 100).toFixed(1)}% of total`}
          icon="🔥"
          color="orange"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['overview', 'threads', 'users', 'growth'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 text-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              borderColor: activeTab === tab ? 'var(--accent)' : 'transparent',
            }}
          >
            {tab === 'overview' && '📊 Overview'}
            {tab === 'threads' && '📝 Threads'}
            {tab === 'users' && '👥 Users'}
            {tab === 'growth' && '📈 Growth'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Growth Chart */}
          <div className="card p-6">
            <h3 className="font-bold mb-4">📈 Activity Overview</h3>
            <div className="h-64">
              <MiniChart data={dailyMetrics} />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card p-6">
            <h3 className="font-bold mb-4">🕐 Recent Activity</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivity.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded"
                  style={{ background: 'var(--hover-bg)' }}
                >
                  <span className="text-lg">
                    {activity.type === 'thread' && '📝'}
                    {activity.type === 'comment' && '💬'}
                    {activity.type === 'user' && '👤'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      by {activity.username} • {formatTimeAgo(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'threads' && (
        <div className="card p-6">
          <h3 className="font-bold mb-4">🏆 Top Threads</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">Title</th>
                  <th className="text-left py-2 px-2">Author</th>
                  <th className="text-right py-2 px-2">👁️ Views</th>
                  <th className="text-right py-2 px-2">⬆️ Votes</th>
                  <th className="text-right py-2 px-2">💬 Comments</th>
                </tr>
              </thead>
              <tbody>
                {topThreads.map((thread, i) => (
                  <tr
                    key={thread.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="py-2 px-2 font-bold" style={{ color: 'var(--muted)' }}>
                      {i + 1}
                    </td>
                    <td className="py-2 px-2">
                      <a
                        href={`/thread/${thread.id}`}
                        className="hover:underline font-medium truncate block max-w-xs"
                      >
                        {thread.title}
                      </a>
                    </td>
                    <td className="py-2 px-2" style={{ color: 'var(--muted)' }}>
                      {thread.profile?.username || 'Unknown'}
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {(thread.view_count || 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {(thread.upvote_count || 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {thread.comment_count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card p-6">
          <h3 className="font-bold mb-4">🏆 Top Users by Reputation</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">User</th>
                  <th className="text-right py-2 px-2">⭐ Reputation</th>
                  <th className="text-right py-2 px-2">📝 Threads</th>
                  <th className="text-right py-2 px-2">💬 Comments</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((user, i) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="py-2 px-2 font-bold" style={{ color: 'var(--muted)' }}>
                      {i + 1}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.username}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: 'var(--accent)', color: 'white' }}
                          >
                            {user.username[0].toUpperCase()}
                          </div>
                        )}
                        <a href={`/u/${user.username}`} className="hover:underline font-medium">
                          {user.username}
                        </a>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-yellow-600">
                      {user.reputation.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {user.thread_count.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {user.comment_count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'growth' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Growth Metrics */}
          <div className="card p-6">
            <h3 className="font-bold mb-4">📈 Growth Comparison</h3>
            <div className="space-y-4">
              <GrowthMetric
                label="Users"
                current={lastMetric?.total_users || currentMetrics.totalUsers}
                previous={prevMetric?.total_users || 0}
              />
              <GrowthMetric
                label="Threads"
                current={lastMetric?.total_threads || currentMetrics.totalThreads}
                previous={prevMetric?.total_threads || 0}
              />
              <GrowthMetric
                label="Comments"
                current={lastMetric?.total_comments || currentMetrics.totalComments}
                previous={prevMetric?.total_comments || 0}
              />
              <GrowthMetric
                label="Active Users"
                current={lastMetric?.active_users || currentMetrics.activeUsersWeek}
                previous={prevMetric?.active_users || 0}
              />
            </div>
          </div>

          {/* Daily New Content */}
          <div className="card p-6">
            <h3 className="font-bold mb-4">📊 Daily Activity</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {[...dailyMetrics].reverse().slice(0, 14).map((metric) => (
                <div
                  key={metric.date}
                  className="flex items-center justify-between p-2 rounded text-sm"
                  style={{ background: 'var(--hover-bg)' }}
                >
                  <span className="font-medium">{formatDate(metric.date)}</span>
                  <div className="flex gap-4 text-xs">
                    <span>👤 +{metric.new_users}</span>
                    <span>📝 +{metric.new_threads}</span>
                    <span>💬 +{metric.new_comments}</span>
                    <span>👁️ {metric.total_views}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  title,
  value,
  change,
  icon,
  color,
}: {
  title: string;
  value: number;
  change: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    blue: 'rgba(59, 130, 246, 0.1)',
    green: 'rgba(16, 185, 129, 0.1)',
    purple: 'rgba(139, 92, 246, 0.1)',
    orange: 'rgba(249, 115, 22, 0.1)',
  };

  return (
    <div className="card p-4" style={{ background: colors[color] }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--card-bg)' }}>
          {change}
        </span>
      </div>
      <h3 className="text-2xl font-bold">{value.toLocaleString()}</h3>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        {title}
      </p>
    </div>
  );
}

function MiniChart({ data }: { data: DailyMetric[] }) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>
        No data available
      </div>
    );
  }

  const maxViews = Math.max(...data.map((d) => d.total_views || 1), 1);
  const maxThreads = Math.max(...data.map((d) => d.new_threads || 1), 1);

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-4 mb-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#3b82f6' }} />
          Views
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#10b981' }} />
          New Threads
        </span>
      </div>
      <div className="flex-1 flex items-end gap-1">
        {data.slice(-30).map((metric, i) => (
          <div key={i} className="flex-1 flex flex-col gap-1 items-center">
            <div
              className="w-full rounded-t"
              style={{
                background: '#3b82f6',
                height: `${((metric.total_views || 0) / maxViews) * 100}%`,
                minHeight: '2px',
              }}
              title={`${metric.date}: ${metric.total_views} views`}
            />
            <div
              className="w-full rounded-t"
              style={{
                background: '#10b981',
                height: `${((metric.new_threads || 0) / maxThreads) * 50}%`,
                minHeight: '2px',
              }}
              title={`${metric.date}: ${metric.new_threads} new threads`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--muted)' }}>
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function GrowthMetric({
  label,
  current,
  previous,
}: {
  label: string;
  current: number;
  previous: number;
}) {
  const growth = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
  const isPositive = growth >= 0;

  return (
    <div className="flex items-center justify-between p-3 rounded" style={{ background: 'var(--hover-bg)' }}>
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono">{current.toLocaleString()}</span>
        <span
          className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}
        >
          {isPositive ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
