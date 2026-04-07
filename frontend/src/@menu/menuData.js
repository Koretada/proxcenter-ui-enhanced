// Menu data with translation support
// Pass the t function from useTranslations() to get translated labels
// requiredFeature: feature ID from license that is required to access this menu item
export const menuData = (t = (key) => key) => [
  {
    label: t('navigation.dashboard'),
    icon: 'ri-dashboard-line',
    href: '/home',

    // Accessible à tous les utilisateurs authentifiés
  },

  {
    isSection: true,
    label: t('navigation.infrastructure'),
    icon: 'ri-server-line',
    children: [
      {
        label: t('navigation.inventory'),
        icon: 'ri-database-fill',
        href: '/infrastructure/inventory',
        permissions: ['vm.view', 'node.view'] // Au moins une de ces permissions
      },
      {
        label: t('navigation.topology'),
        icon: 'ri-mind-map',
        href: '/infrastructure/topology',
        permissions: ['vm.view', 'node.view']
      },
      {
        label: t('navigation.ipam'),
        icon: 'ri-hashtag',
        href: '/infrastructure/ipam',
        permissions: ['vm.view']
      },
      {
        label: t('navigation.storage'),
        icon: 'ri-database-2-fill',
        href: '/storage/overview',
        permissions: ['storage.admin']
      },
      {
        label: t('navigation.ceph'),
        icon: 'ri-stack-line',
        href: '/storage/ceph',
        permissions: ['storage.admin']
      },
      {
        label: t('navigation.backups'),
        icon: 'ri-file-copy-fill',
        href: '/operations/backups',
        permissions: ['backup.view', 'backup.job.view']
      },
      {
        label: t('navigation.templates'),
        icon: 'ri-cloud-line',
        href: '/automation/templates',
        permissions: ['vm.create', 'vm.clone']
      }
    ]
  },

  {
    isSection: true,
    label: t('navigation.operations'),
    icon: 'ri-pulse-line',
    children: [
      {
        label: t('navigation.events'),
        icon: 'ri-calendar-event-line',
        href: '/operations/events',
        permissions: ['events.view']
      },
      {
        label: t('navigation.taskCenter'),
        icon: 'ri-play-list-2-line',
        href: '/operations/task-center',
        permissions: ['tasks.view']
      }
    ]
  },

  {
    isSection: true,
    label: t('navigation.securityAccess'),
    icon: 'ri-shield-keyhole-line',
    permissions: ['admin.users', 'admin.rbac', 'admin.audit', 'admin.compliance'], // Section admin
    children: [
      {
        label: t('navigation.users'),
        icon: 'ri-user-line',
        href: '/security/users',
        permissions: ['admin.users']
      },
      {
        label: t('navigation.auditLogs'),
        icon: 'ri-file-search-line',
        href: '/security/audit',
        permissions: ['admin.audit']
      }
    ]
  },

  {
    isSection: true,
    label: t('navigation.settings'),
    icon: 'ri-settings-4-line',
    permissions: ['admin.settings', 'connection.manage'],
    children: [
      {
        label: t('navigation.settings'),
        icon: 'ri-settings-3-line',
        href: '/settings',
        permissions: ['connection.manage', 'admin.settings']
      }
    ]
  }
]
