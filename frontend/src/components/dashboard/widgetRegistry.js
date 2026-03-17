// Registre de tous les widgets disponibles

import dynamic from 'next/dynamic'

// Import dynamique pour éviter les problèmes SSR
const KpiClustersWidget = dynamic(() => import('./widgets/KpiClustersWidget'), { ssr: false })
const KpiVmsWidget = dynamic(() => import('./widgets/KpiVmsWidget'), { ssr: false })
const KpiLxcWidget = dynamic(() => import('./widgets/KpiLxcWidget'), { ssr: false })
const KpiBackupsWidget = dynamic(() => import('./widgets/KpiBackupsWidget'), { ssr: false })
const KpiAlertsWidget = dynamic(() => import('./widgets/KpiAlertsWidget'), { ssr: false })
const ResourcesGaugesWidget = dynamic(() => import('./widgets/ResourcesGaugesWidget'), { ssr: false })
const TopConsumersWidget = dynamic(() => import('./widgets/TopConsumersWidget'), { ssr: false })
const NodesTableWidget = dynamic(() => import('./widgets/NodesTableWidget'), { ssr: false })
const PbsOverviewWidget = dynamic(() => import('./widgets/PbsOverviewWidget'), { ssr: false })
const ClustersListWidget = dynamic(() => import('./widgets/ClustersListWidget'), { ssr: false })
const GuestsSummaryWidget = dynamic(() => import('./widgets/GuestsSummaryWidget'), { ssr: false })
const AlertsListWidget = dynamic(() => import('./widgets/AlertsListWidget'), { ssr: false })
const CephStatusWidget = dynamic(() => import('./widgets/CephStatusWidget'), { ssr: false })

// Nouveaux widgets
const ActivityFeedWidget = dynamic(() => import('./widgets/ActivityFeedWidget'), { ssr: false })
const StoragePoolsWidget = dynamic(() => import('./widgets/StoragePoolsWidget'), { ssr: false })
const UptimeNodesWidget = dynamic(() => import('./widgets/UptimeNodesWidget'), { ssr: false })
const BackupRecentWidget = dynamic(() => import('./widgets/BackupRecentWidget'), { ssr: false })
const QuickStatsWidget = dynamic(() => import('./widgets/QuickStatsWidget'), { ssr: false })

// Widgets Zero Trust / Security (optimized - minimal HTTP calls)
const ZeroTrustScoreWidget = dynamic(() => import('./widgets/ZeroTrustScoreWidget'), { ssr: false })
const ZeroTrustSecurityGroupsWidget = dynamic(() => import('./widgets/ZeroTrustSecurityGroupsWidget'), { ssr: false })

// VM Status Waffle Chart
const VmStatusWaffleWidget = dynamic(() => import('./widgets/VmStatusWaffleWidget'), { ssr: false })

// Resource Trends Chart
const ResourceTrendsWidget = dynamic(() => import('./widgets/ResourceTrendsWidget'), { ssr: false })

// Infrastructure Global Chart (per-node CPU/RAM)
const InfraGlobalChartWidget = dynamic(() => import('./widgets/InfraGlobalChartWidget'), { ssr: false })

// VM Heatmap (CPU/RAM utilization grid)
const VmHeatmapWidget = dynamic(() => import('./widgets/VmHeatmapWidget'), { ssr: false })

// Enterprise: DRS & Site Recovery
const DrsStatusWidget = dynamic(() => import('./widgets/DrsStatusWidget'), { ssr: false })
const SiteRecoveryWidget = dynamic(() => import('./widgets/SiteRecoveryWidget'), { ssr: false })

export const WIDGET_REGISTRY = {
  'kpi-clusters': {
    type: 'kpi-clusters',
    name: 'Clusters / Nodes',
    description: 'Number of clusters and nodes',
    icon: 'ri-server-line',
    category: 'infrastructure',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    component: KpiClustersWidget,
  },
  'kpi-vms': {
    type: 'kpi-vms',
    name: 'VMs Running',
    description: 'Number of running VMs',
    icon: 'ri-computer-line',
    category: 'infrastructure',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    component: KpiVmsWidget,
  },
  'kpi-lxc': {
    type: 'kpi-lxc',
    name: 'LXC Running',
    description: 'Number of running LXC containers',
    icon: 'ri-instance-line',
    category: 'infrastructure',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    component: KpiLxcWidget,
  },
  'kpi-backups': {
    type: 'kpi-backups',
    name: 'Backups 24h',
    description: 'PBS backup stats',
    icon: 'ri-shield-check-line',
    category: 'backup',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    component: KpiBackupsWidget,
  },
  'kpi-alerts': {
    type: 'kpi-alerts',
    name: 'Alerts',
    description: 'Number of alerts',
    icon: 'ri-alarm-warning-line',
    category: 'monitoring',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    component: KpiAlertsWidget,
  },
  'quick-stats': {
    type: 'quick-stats',
    name: 'Quick Stats',
    description: 'Overview in one line',
    icon: 'ri-dashboard-line',
    category: 'infrastructure',
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 6, h: 2 },
    maxSize: { w: 12, h: 2 },
    component: QuickStatsWidget,
  },
  'resources-gauges': {
    type: 'resources-gauges',
    name: 'Resources',
    description: 'CPU, RAM and Storage gauges',
    icon: 'ri-pie-chart-line',
    category: 'resources',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 12, h: 6 },
    component: ResourcesGaugesWidget,
  },
  'top-consumers': {
    type: 'top-consumers',
    name: 'Top Consumers',
    description: 'Most resource-intensive guests',
    icon: 'ri-bar-chart-line',
    category: 'resources',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 8 },
    component: TopConsumersWidget,
  },
  'nodes-table': {
    type: 'nodes-table',
    name: 'Nodes Status',
    description: 'Nodes table with CPU/RAM',
    icon: 'ri-server-line',
    category: 'infrastructure',
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 10 },
    component: NodesTableWidget,
  },
  'uptime-nodes': {
    type: 'uptime-nodes',
    name: 'Uptime Nodes',
    description: 'Nodes uptime',
    icon: 'ri-time-line',
    category: 'infrastructure',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 8 },
    component: UptimeNodesWidget,
  },
  'pbs-overview': {
    type: 'pbs-overview',
    name: 'PBS Overview',
    description: 'Proxmox Backup Server overview',
    icon: 'ri-shield-check-line',
    category: 'backup',
    defaultSize: { w: 5, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 8, h: 8 },
    component: PbsOverviewWidget,
  },
  'backup-recent': {
    type: 'backup-recent',
    name: 'Recent Backups',
    description: 'Recent backups and errors',
    icon: 'ri-history-line',
    category: 'backup',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    component: BackupRecentWidget,
  },
  'clusters-list': {
    type: 'clusters-list',
    name: 'Clusters',
    description: 'Clusters list with status',
    icon: 'ri-cloud-line',
    category: 'infrastructure',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 6 },
    component: ClustersListWidget,
  },
  'guests-summary': {
    type: 'guests-summary',
    name: 'Guests',
    description: 'VMs and LXC summary',
    icon: 'ri-instance-line',
    category: 'infrastructure',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 4 },
    component: GuestsSummaryWidget,
  },
  'alerts-list': {
    type: 'alerts-list',
    name: 'Alerts List',
    description: 'Active alerts list',
    icon: 'ri-alarm-warning-line',
    category: 'monitoring',
    defaultSize: { w: 5, h: 5 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 8, h: 10 },
    component: AlertsListWidget,
  },
  'activity-feed': {
    type: 'activity-feed',
    name: 'Recent Activity',
    description: 'Recent tasks and events',
    icon: 'ri-history-line',
    category: 'monitoring',
    defaultSize: { w: 5, h: 5 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 8, h: 10 },
    component: ActivityFeedWidget,
  },
  'storage-pools': {
    type: 'storage-pools',
    name: 'Storages',
    description: 'PVE storages list',
    icon: 'ri-hard-drive-2-line',
    category: 'storage',
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 8 },
    component: StoragePoolsWidget,
  },
  'ceph-status': {
    type: 'ceph-status',
    name: 'Ceph Status',
    description: 'Ceph cluster status',
    icon: 'ri-database-2-line',
    category: 'storage',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    component: CephStatusWidget,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WIDGETS ZERO TRUST / SECURITY (optimized - 1 HTTP call per cluster max)
  // ═══════════════════════════════════════════════════════════════════════════
  'zerotrust-score': {
    type: 'zerotrust-score',
    name: 'Zero Trust Overview',
    description: 'Security score by cluster',
    icon: 'ri-shield-keyhole-line',
    category: 'security',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    component: ZeroTrustScoreWidget,
  },
  'zerotrust-securitygroups': {
    type: 'zerotrust-securitygroups',
    name: 'Security Groups',
    description: 'Security groups list by cluster',
    icon: 'ri-shield-line',
    category: 'security',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    component: ZeroTrustSecurityGroupsWidget,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VM STATUS WAFFLE CHART
  // ═══════════════════════════════════════════════════════════════════════════
  'vm-status-waffle': {
    type: 'vm-status-waffle',
    name: 'Guest Status (Waffle)',
    description: 'Waffle view of guests by cluster and status',
    icon: 'ri-grid-fill',
    category: 'infrastructure',
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 8 },
    component: VmStatusWaffleWidget,
  },
  'resource-trends': {
    type: 'resource-trends',
    name: 'Resource Trends',
    description: 'CPU/RAM evolution over 1h, 24h or 7d',
    icon: 'ri-line-chart-line',
    category: 'resources',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 6 },
    component: ResourceTrendsWidget,
  },
  'infra-global-chart': {
    type: 'infra-global-chart',
    name: 'Infra CPU/RAM',
    description: 'Per-node CPU/RAM across all infrastructure',
    icon: 'ri-line-chart-fill',
    category: 'resources',
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 8 },
    component: InfraGlobalChartWidget,
  },
  'vm-heatmap': {
    type: 'vm-heatmap',
    name: 'Guest Heatmap',
    description: 'CPU/RAM heatmap of all guests',
    icon: 'ri-fire-fill',
    category: 'resources',
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 12, h: 8 },
    component: VmHeatmapWidget,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTERPRISE: AUTOMATION & ORCHESTRATION
  // ═══════════════════════════════════════════════════════════════════════════
  'drs-status': {
    type: 'drs-status',
    name: 'DRS Status',
    description: 'DRS status, active migrations and recommendations',
    icon: 'ri-swap-line',
    category: 'automation',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    component: DrsStatusWidget,
  },
  'site-recovery': {
    type: 'site-recovery',
    name: 'Site Recovery',
    description: 'VM protection, RPO compliance and replication status',
    icon: 'ri-shield-star-line',
    category: 'automation',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    component: SiteRecoveryWidget,
  },
}

export const WIDGET_CATEGORIES = [
  { id: 'infrastructure', name: 'Infrastructure', icon: 'ri-server-line' },
  { id: 'resources', name: 'Resources', icon: 'ri-pie-chart-line' },
  { id: 'security', name: 'Security / Zero Trust', icon: 'ri-shield-keyhole-line' },
  { id: 'backup', name: 'Backups', icon: 'ri-shield-check-line' },
  { id: 'storage', name: 'Storage', icon: 'ri-hard-drive-2-line' },
  { id: 'monitoring', name: 'Monitoring', icon: 'ri-alarm-warning-line' },
  { id: 'automation', name: 'Automation', icon: 'ri-robot-2-line' },
]

export function getWidgetsByCategory(category) {
  return Object.values(WIDGET_REGISTRY).filter(w => w.category === category)
}
