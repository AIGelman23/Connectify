"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar({ user }) {
  const pathname = usePathname();

  const items = [
    { label: user?.name || 'Profile', icon: 'fas fa-user-circle', href: '/profile', color: 'text-blue-600' },
    { label: 'Friends', icon: 'fas fa-user-friends', href: '/network', color: 'text-blue-500' },
    { label: 'Groups', icon: 'fas fa-users', href: '/groups', color: 'text-blue-500' },
    { label: 'Marketplace', icon: 'fas fa-store', href: '/marketplace', color: 'text-blue-500' },
    { label: 'Watch', icon: 'fas fa-tv', href: '/watch', color: 'text-blue-500' },
    { label: 'Memories', icon: 'fas fa-history', href: '/memories', color: 'text-blue-500' },
    { label: 'Saved', icon: 'fas fa-bookmark', href: '/saved', color: 'text-purple-500' },
    { label: 'Events', icon: 'fas fa-calendar-alt', href: '/dashboard/events', color: 'text-red-500' },
  ];

  return (
    <div className="space-y-1 pr-2">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${pathname === item.href
            ? 'bg-blue-50 dark:bg-slate-800'
            : 'hover:bg-gray-200 dark:hover:bg-slate-800'
            }`}
        >
          <i className={`${item.icon} text-2xl w-8 text-center ${item.color}`}></i>
          <span className="font-medium text-gray-700 dark:text-slate-200 text-[15px]">{item.label}</span>
        </Link>
      ))}

      <div className="border-t border-gray-300 dark:border-slate-700 my-2 mx-2"></div>

      <div className="px-3 py-2">
        <h3 className="text-gray-500 dark:text-slate-400 font-semibold text-[13px] mb-2">Your Shortcuts</h3>
        <p className="text-xs text-gray-400">No shortcuts available</p>
      </div>
    </div>
  );
}