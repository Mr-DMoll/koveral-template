export interface NavItem {
  label: string;
  href:  string;
  icon:  string;
}




export const NAV_CONFIG: Record<string, NavItem[]> = {
  SUPER_ADMIN: [
    { label: "Overview",      href: "/super-admin",        icon: "LayoutDashboard" },
    { label: "Admins",        href: "/super-admin/admins", icon: "Users"           },
    { label: "System Health", href: "/super-admin/system", icon: "Activity"        },
  ],

  ADMIN: [
    { label: "Overview",  href: "/admin",          icon: "LayoutDashboard" },
    { label: "Projects",  href: "/admin/projects", icon: "FolderKanban"    },
    { label: "Team",      href: "/admin/team",     icon: "Users"           },
    { label: "Clients",   href: "/admin/clients",  icon: "UsersRound"      },
    { label: "Invoices",  href: "/admin/invoices", icon: "Receipt"         },
    { label: "Activity",  href: "/admin/activity", icon: "Activity"        },
  ],

  MANAGER: [
    { label: "Overview",  href: "/manager",          icon: "LayoutDashboard" },
    { label: "Projects",  href: "/manager/projects", icon: "FolderKanban"    },
    { label: "Team",      href: "/manager/team",     icon: "UsersRound"      },
    { label: "Activity",  href: "/manager/activity", icon: "Activity"        },
  ],

  DEVELOPER: [
    { label: "Overview",  href: "/developer",          icon: "LayoutDashboard" },
    { label: "Projects",  href: "/developer/projects", icon: "FolderKanban"    },
    { label: "Tasks",     href: "/developer/tasks",    icon: "CheckSquare"     },
  ],

  CLIENT: [
    { label: "Overview",   href: "/client",           icon: "LayoutDashboard" },
    { label: "My Project", href: "/client/projects",  icon: "FolderKanban"    },
    { label: "Designs",    href: "/client/designs",   icon: "Palette"         },
    { label: "Documents",  href: "/client/documents", icon: "FileText"        },
    { label: "Invoices",   href: "/client/invoices",  icon: "Receipt"         },
  ],
};