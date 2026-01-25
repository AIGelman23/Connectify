"use client";
import { useContext, useEffect, useState } from "react";
import { ThemeContext } from "@/theme/ThemeProvider";
import Navbar from '../../components/NavBar';
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const SECTIONS = [
  { key: "appearance", label: "Appearance", icon: "fas fa-palette", color: "from-purple-500 to-pink-500" },
  { key: "account", label: "Account", icon: "fas fa-user", color: "from-blue-500 to-cyan-500" },
  { key: "privacy", label: "Privacy", icon: "fas fa-lock", color: "from-green-500 to-emerald-500" },
  { key: "notifications", label: "Notifications", icon: "fas fa-bell", color: "from-yellow-500 to-orange-500" },
  { key: "accessibility", label: "Accessibility", icon: "fas fa-universal-access", color: "from-indigo-500 to-purple-500" },
  { key: "language", label: "Language & Region", icon: "fas fa-globe", color: "from-teal-500 to-cyan-500" },
  { key: "data", label: "Data & Storage", icon: "fas fa-database", color: "from-rose-500 to-red-500" },
  { key: "help", label: "Help & Support", icon: "fas fa-question-circle", color: "from-gray-500 to-slate-500" },
];

// Reusable Toggle Switch Component
function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <div className={`w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-600 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
    </label>
  );
}

// Reusable Setting Card Component
function SettingCard({ icon, iconBg, title, description, children, onClick }) {
  const content = (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 hover:shadow-md transition-all border border-gray-100 dark:border-slate-700 ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`} onClick={onClick}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {icon && (
            <div className={`p-2 sm:p-2.5 rounded-lg ${iconBg || 'bg-gray-100 dark:bg-slate-700'} flex-shrink-0`}>
              <i className={`${icon} text-sm sm:text-base`}></i>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">{title}</h3>
            {description && <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{description}</p>}
          </div>
        </div>
        <div className="flex-shrink-0">
          {children}
        </div>
      </div>
    </div>
  );
  return content;
}

// Section Header Component
function SectionHeader({ icon, iconColor, title, description }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-2 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${iconColor} text-white flex items-center justify-center`}>
          <i className={`${icon} text-sm`}></i>
        </div>
        <span className="text-gray-900 dark:text-white">{title}</span>
      </h2>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

function AppearanceSection({ theme, handleToggle, status, settings, updateSetting }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader
        icon="fas fa-palette"
        iconColor="from-purple-500 to-pink-500"
        title="Appearance"
        description="Customize how Connectify looks and feels"
      />

      <div className="space-y-3 sm:space-y-4">
        <SettingCard
          icon={theme === 'dark' ? 'fas fa-moon text-indigo-500' : 'fas fa-sun text-yellow-500'}
          iconBg={theme === 'dark' ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}
          title="Dark Mode"
          description="Reduce eye strain in low light"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <ToggleSwitch checked={theme === "dark"} onChange={handleToggle} />
            {status && (
              <span className="hidden sm:inline-block px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50 rounded-full animate-pulse">
                {status}
              </span>
            )}
          </div>
        </SettingCard>

        <SettingCard
          icon="fas fa-text-height text-blue-500"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          title="Font Size"
          description="Adjust text size throughout the app"
        >
          <select
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={settings.fontSize || 'medium'}
            onChange={(e) => updateSetting('fontSize', e.target.value)}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </SettingCard>

        <SettingCard
          icon="fas fa-expand text-purple-500"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          title="Compact Mode"
          description="Show more content on screen"
        >
          <ToggleSwitch
            checked={settings.compactMode || false}
            onChange={(e) => updateSetting('compactMode', e.target.checked)}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-play-circle text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/30"
          title="Auto-play Videos"
          description="Videos play automatically in feed"
        >
          <ToggleSwitch
            checked={settings.autoPlayVideos ?? true}
            onChange={(e) => updateSetting('autoPlayVideos', e.target.checked)}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-magic text-pink-500"
          iconBg="bg-pink-100 dark:bg-pink-900/30"
          title="Reduce Animations"
          description="Minimize motion and effects"
        >
          <ToggleSwitch
            checked={settings.reduceAnimations || false}
            onChange={(e) => updateSetting('reduceAnimations', e.target.checked)}
          />
        </SettingCard>
      </div>
    </div>
  );
}

function AccountSection({ session, router }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader
        icon="fas fa-user"
        iconColor="from-blue-500 to-cyan-500"
        title="Account"
        description="Manage your account information"
      />

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 border border-gray-100 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <img
            src={session?.user?.image || `https://placehold.co/80x80/1877F2/ffffff?text=${session?.user?.name?.[0]?.toUpperCase() || 'U'}`}
            alt="Profile"
            className="w-20 h-20 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-200 dark:border-slate-600"
          />
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{session?.user?.name || "User"}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</label>
              <p className="text-gray-600 dark:text-gray-300 break-all">{session?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/edit-profile')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors w-full sm:w-auto"
          >
            <i className="fas fa-edit mr-2"></i>Edit Profile
          </button>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <SettingCard
          icon="fas fa-key text-amber-500"
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          title="Change Password"
          description="Update your password regularly"
          onClick={() => router.push('/reset')}
        >
          <i className="fas fa-chevron-right text-gray-400 dark:text-slate-500"></i>
        </SettingCard>

        <SettingCard
          icon="fas fa-shield-alt text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/30"
          title="Two-Factor Authentication"
          description="Add extra security to your account"
        >
          <button className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">
            Enable
          </button>
        </SettingCard>

        <SettingCard
          icon="fas fa-download text-blue-500"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          title="Download Your Data"
          description="Get a copy of all your data"
        >
          <button className="px-3 py-1.5 text-sm border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg font-medium transition-colors">
            Request
          </button>
        </SettingCard>

        <SettingCard
          icon="fas fa-sign-out-alt text-orange-500"
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          title="Sign Out"
          description="Sign out of your account"
        >
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
          >
            Sign Out
          </button>
        </SettingCard>

        {/* Delete Account */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 sm:p-5 border border-red-200 dark:border-red-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-red-700 dark:text-red-400">Delete Account</h3>
              <p className="text-sm text-red-600 dark:text-red-300">Permanently delete your account and all data</p>
            </div>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Delete Account
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                  Confirm Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacySection({ settings, updateSetting }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader
        icon="fas fa-lock"
        iconColor="from-green-500 to-emerald-500"
        title="Privacy"
        description="Control your privacy and visibility"
      />

      <div className="space-y-3 sm:space-y-4">
        <SettingCard
          icon="fas fa-eye text-blue-500"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          title="Profile Visibility"
          description="Who can see your profile"
        >
          <select
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={settings.profileVisibility || 'everyone'}
            onChange={(e) => updateSetting('profileVisibility', e.target.value)}
          >
            <option value="everyone">Everyone</option>
            <option value="connections">Connections only</option>
            <option value="private">Only me</option>
          </select>
        </SettingCard>

        <SettingCard
          icon="fas fa-globe-americas text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/30"
          title="Default Post Visibility"
          description="Default audience for new posts"
        >
          <select
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={settings.defaultPostVisibility || 'PUBLIC'}
            onChange={(e) => updateSetting('defaultPostVisibility', e.target.value)}
          >
            <option value="PUBLIC">🌍 Public</option>
            <option value="FRIENDS">👥 Friends Only</option>
            <option value="PRIVATE">🔒 Only Me</option>
          </select>
        </SettingCard>

        <SettingCard
          icon="fas fa-circle text-emerald-500"
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          title="Activity Status"
          description="Show when you're online"
        >
          <ToggleSwitch
            checked={settings.showActivityStatus ?? true}
            onChange={(e) => updateSetting('showActivityStatus', e.target.checked)}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-search text-purple-500"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          title="Search Engine Indexing"
          description="Allow search engines to find you"
        >
          <ToggleSwitch
            checked={settings.searchIndexing ?? true}
            onChange={(e) => updateSetting('searchIndexing', e.target.checked)}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-user-tag text-pink-500"
          iconBg="bg-pink-100 dark:bg-pink-900/30"
          title="Allow Tagging"
          description="Let others tag you in posts"
        >
          <ToggleSwitch
            checked={settings.allowTagging ?? true}
            onChange={(e) => updateSetting('allowTagging', e.target.checked)}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-comment text-orange-500"
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          title="Who Can Message You"
          description="Control who can send you messages"
        >
          <select
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={settings.whoCanMessage || 'everyone'}
            onChange={(e) => updateSetting('whoCanMessage', e.target.value)}
          >
            <option value="everyone">Everyone</option>
            <option value="connections">Connections only</option>
            <option value="nobody">Nobody</option>
          </select>
        </SettingCard>

        <SettingCard
          icon="fas fa-ban text-red-500"
          iconBg="bg-red-100 dark:bg-red-900/30"
          title="Blocked Users"
          description="Manage blocked accounts"
        >
          <button className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors">
            Manage
          </button>
        </SettingCard>
      </div>
    </div>
  );
}

function NotificationsSection({ settings, updateSetting }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader
        icon="fas fa-bell"
        iconColor="from-yellow-500 to-orange-500"
        title="Notifications"
        description="Choose what you want to be notified about"
      />

      {/* Master Toggle */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-4 sm:p-5 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">All Notifications</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Master toggle for all notifications</p>
          </div>
          <ToggleSwitch
            checked={settings.notificationsEnabled ?? true}
            onChange={(e) => updateSetting('notificationsEnabled', e.target.checked)}
          />
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 px-1">Notification Types</h3>

        <SettingCard
          icon="fas fa-envelope text-blue-500"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          title="Email Notifications"
          description="Receive updates via email"
        >
          <ToggleSwitch
            checked={settings.emailNotifications ?? true}
            onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
            disabled={!settings.notificationsEnabled}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-mobile-alt text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/30"
          title="Push Notifications"
          description="Receive push notifications"
        >
          <ToggleSwitch
            checked={settings.pushNotifications ?? true}
            onChange={(e) => updateSetting('pushNotifications', e.target.checked)}
            disabled={!settings.notificationsEnabled}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-volume-up text-purple-500"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          title="Sound"
          description="Play sound for notifications"
        >
          <ToggleSwitch
            checked={settings.notificationSound ?? true}
            onChange={(e) => updateSetting('notificationSound', e.target.checked)}
            disabled={!settings.notificationsEnabled}
          />
        </SettingCard>

        <h3 className="font-semibold text-gray-700 dark:text-gray-300 px-1 pt-2">Notify Me About</h3>

        <SettingCard
          icon="fas fa-heart text-red-500"
          iconBg="bg-red-100 dark:bg-red-900/30"
          title="Likes"
          description="When someone likes your post"
        >
          <ToggleSwitch
            checked={settings.notifyLikes ?? true}
            onChange={(e) => updateSetting('notifyLikes', e.target.checked)}
            disabled={!settings.notificationsEnabled}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-comment-dots text-blue-500"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          title="Comments"
          description="When someone comments on your post"
        >
          <ToggleSwitch
            checked={settings.notifyComments ?? true}
            onChange={(e) => updateSetting('notifyComments', e.target.checked)}
            disabled={!settings.notificationsEnabled}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-user-plus text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/30"
          title="Connection Requests"
          description="When you receive a connection request"
        >
          <ToggleSwitch
            checked={settings.notifyConnectionRequests ?? true}
            onChange={(e) => updateSetting('notifyConnectionRequests', e.target.checked)}
            disabled={!settings.notificationsEnabled}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-paper-plane text-indigo-500"
          iconBg="bg-indigo-100 dark:bg-indigo-900/30"
          title="Messages"
          description="When you receive a new message"
        >
          <ToggleSwitch
            checked={settings.notifyMessages ?? true}
            onChange={(e) => updateSetting('notifyMessages', e.target.checked)}
            disabled={!settings.notificationsEnabled}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-at text-pink-500"
          iconBg="bg-pink-100 dark:bg-pink-900/30"
          title="Mentions"
          description="When someone mentions you"
        >
          <ToggleSwitch
            checked={settings.notifyMentions ?? true}
            onChange={(e) => updateSetting('notifyMentions', e.target.checked)}
            disabled={!settings.notificationsEnabled}
          />
        </SettingCard>
      </div>
    </div>
  );
}

function AccessibilitySection({ settings, updateSetting }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader
        icon="fas fa-universal-access"
        iconColor="from-indigo-500 to-purple-500"
        title="Accessibility"
        description="Make Connectify easier to use"
      />

      <div className="space-y-3 sm:space-y-4">
        <SettingCard
          icon="fas fa-closed-captioning text-blue-500"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          title="Auto-generate Captions"
          description="Show captions on videos"
        >
          <ToggleSwitch
            checked={settings.autoCaptions ?? false}
            onChange={(e) => updateSetting('autoCaptions', e.target.checked)}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-adjust text-purple-500"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          title="High Contrast Mode"
          description="Increase color contrast"
        >
          <ToggleSwitch
            checked={settings.highContrast ?? false}
            onChange={(e) => updateSetting('highContrast', e.target.checked)}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-keyboard text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/30"
          title="Keyboard Shortcuts"
          description="Enable keyboard navigation"
        >
          <ToggleSwitch
            checked={settings.keyboardShortcuts ?? true}
            onChange={(e) => updateSetting('keyboardShortcuts', e.target.checked)}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-eye-slash text-gray-500 dark:text-slate-400"
          iconBg="bg-gray-100 dark:bg-gray-700"
          title="Reduce Flashing"
          description="Limit flashing content"
        >
          <ToggleSwitch
            checked={settings.reduceFlashing ?? false}
            onChange={(e) => updateSetting('reduceFlashing', e.target.checked)}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-text-width text-orange-500"
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          title="Screen Reader Optimized"
          description="Improve screen reader experience"
        >
          <ToggleSwitch
            checked={settings.screenReaderOptimized ?? false}
            onChange={(e) => updateSetting('screenReaderOptimized', e.target.checked)}
          />
        </SettingCard>
      </div>
    </div>
  );
}

function LanguageSection({ settings, updateSetting }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader
        icon="fas fa-globe"
        iconColor="from-teal-500 to-cyan-500"
        title="Language & Region"
        description="Set your language and regional preferences"
      />

      <div className="space-y-3 sm:space-y-4">
        <SettingCard
          icon="fas fa-language text-blue-500"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          title="Language"
          description="Choose your preferred language"
        >
          <select
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={settings.language || 'en'}
            onChange={(e) => updateSetting('language', e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="pt">Português</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="ar">العربية</option>
            <option value="hi">हिन्दी</option>
          </select>
        </SettingCard>

        <SettingCard
          icon="fas fa-map-marker-alt text-red-500"
          iconBg="bg-red-100 dark:bg-red-900/30"
          title="Region"
          description="Set your regional preferences"
        >
          <select
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={settings.region || 'US'}
            onChange={(e) => updateSetting('region', e.target.value)}
          >
            <option value="US">United States</option>
            <option value="UK">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="JP">Japan</option>
            <option value="IN">India</option>
            <option value="BR">Brazil</option>
          </select>
        </SettingCard>

        <SettingCard
          icon="fas fa-clock text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/30"
          title="Time Zone"
          description="Set your local time zone"
        >
          <select
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none max-w-[140px] sm:max-w-none"
            value={settings.timezone || 'America/New_York'}
            onChange={(e) => updateSetting('timezone', e.target.value)}
          >
            <option value="America/New_York">Eastern (ET)</option>
            <option value="America/Chicago">Central (CT)</option>
            <option value="America/Denver">Mountain (MT)</option>
            <option value="America/Los_Angeles">Pacific (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Asia/Shanghai">Shanghai (CST)</option>
          </select>
        </SettingCard>

        <SettingCard
          icon="fas fa-calendar text-purple-500"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          title="Date Format"
          description="Choose how dates are displayed"
        >
          <select
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={settings.dateFormat || 'MM/DD/YYYY'}
            onChange={(e) => updateSetting('dateFormat', e.target.value)}
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </SettingCard>
      </div>
    </div>
  );
}

function DataStorageSection({ settings, updateSetting }) {
  const [cacheCleared, setCacheCleared] = useState(false);
  const [historyCleared, setHistoryCleared] = useState(false);

  const handleClearCache = async () => {
    try {
      // Clear browser cache for the app
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      // Clear localStorage items except essential ones
      const essentialKeys = ['userSettings', 'theme', 'next-auth.session-token'];
      Object.keys(localStorage).forEach(key => {
        if (!essentialKeys.some(k => key.includes(k))) {
          localStorage.removeItem(key);
        }
      });
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2000);
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  };

  const handleClearSearchHistory = () => {
    localStorage.removeItem('searchHistory');
    localStorage.removeItem('recentSearches');
    setHistoryCleared(true);
    setTimeout(() => setHistoryCleared(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader
        icon="fas fa-database"
        iconColor="from-rose-500 to-red-500"
        title="Data & Storage"
        description="Manage your data and storage preferences"
      />

      <div className="space-y-3 sm:space-y-4">
        <SettingCard
          icon="fas fa-wifi text-blue-500"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          title="Data Saver Mode"
          description="Reduce data usage on mobile"
        >
          <ToggleSwitch
            checked={settings.dataSaver ?? false}
            onChange={(e) => updateSetting('dataSaver', e.target.checked)}
          />
        </SettingCard>

        <SettingCard
          icon="fas fa-image text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/30"
          title="Auto-download Images"
          description="Download images automatically"
        >
          <select
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={settings.autoDownloadImages || 'wifi'}
            onChange={(e) => updateSetting('autoDownloadImages', e.target.value)}
          >
            <option value="always">Always</option>
            <option value="wifi">WiFi only</option>
            <option value="never">Never</option>
          </select>
        </SettingCard>

        <SettingCard
          icon="fas fa-video text-purple-500"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          title="Auto-download Videos"
          description="Download videos automatically"
        >
          <select
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={settings.autoDownloadVideos || 'wifi'}
            onChange={(e) => updateSetting('autoDownloadVideos', e.target.value)}
          >
            <option value="always">Always</option>
            <option value="wifi">WiFi only</option>
            <option value="never">Never</option>
          </select>
        </SettingCard>

        <SettingCard
          icon="fas fa-hdd text-orange-500"
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          title="Clear Cache"
          description="Free up storage space"
        >
          <button
            onClick={handleClearCache}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${cacheCleared
              ? 'bg-green-500 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
          >
            {cacheCleared ? '✓ Cleared!' : 'Clear'}
          </button>
        </SettingCard>

        <SettingCard
          icon="fas fa-history text-gray-500 dark:text-slate-400"
          iconBg="bg-gray-100 dark:bg-gray-700"
          title="Clear Search History"
          description="Delete your search history"
        >
          <button
            onClick={handleClearSearchHistory}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${historyCleared
              ? 'bg-green-500 text-white'
              : 'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
          >
            {historyCleared ? '✓ Cleared!' : 'Clear'}
          </button>
        </SettingCard>
      </div>
    </div>
  );
}

function HelpSupportSection() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader
        icon="fas fa-question-circle"
        iconColor="from-gray-500 to-slate-500"
        title="Help & Support"
        description="Get help and learn more about Connectify"
      />

      <div className="space-y-3 sm:space-y-4">
        <SettingCard
          icon="fas fa-book text-blue-500"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          title="Help Center"
          description="Browse help articles and FAQs"
          onClick={() => window.open('/help', '_blank')}
        >
          <i className="fas fa-external-link-alt text-gray-400 dark:text-slate-500"></i>
        </SettingCard>

        <SettingCard
          icon="fas fa-headset text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/30"
          title="Contact Support"
          description="Get help from our team"
          onClick={() => window.open('mailto:support@connectify.com')}
        >
          <i className="fas fa-chevron-right text-gray-400 dark:text-slate-500"></i>
        </SettingCard>

        <SettingCard
          icon="fas fa-bug text-red-500"
          iconBg="bg-red-100 dark:bg-red-900/30"
          title="Report a Bug"
          description="Help us improve by reporting issues"
        >
          <button className="px-3 py-1.5 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg font-medium transition-colors">
            Report
          </button>
        </SettingCard>

        <SettingCard
          icon="fas fa-lightbulb text-yellow-500"
          iconBg="bg-yellow-100 dark:bg-yellow-900/30"
          title="Suggest a Feature"
          description="Share your ideas with us"
        >
          <button className="px-3 py-1.5 text-sm border border-yellow-400 dark:border-yellow-600 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg font-medium transition-colors">
            Suggest
          </button>
        </SettingCard>

        <SettingCard
          icon="fas fa-file-contract text-purple-500"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          title="Terms of Service"
          description="Read our terms and conditions"
          onClick={() => window.open('/terms', '_blank')}
        >
          <i className="fas fa-external-link-alt text-gray-400 dark:text-slate-500"></i>
        </SettingCard>

        <SettingCard
          icon="fas fa-user-shield text-indigo-500"
          iconBg="bg-indigo-100 dark:bg-indigo-900/30"
          title="Privacy Policy"
          description="Learn how we protect your data"
          onClick={() => window.open('/privacy', '_blank')}
        >
          <i className="fas fa-external-link-alt text-gray-400 dark:text-slate-500"></i>
        </SettingCard>

        {/* App Info */}
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 sm:p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <i className="fas fa-infinity text-blue-500 text-xl"></i>
            <span className="font-bold text-lg text-gray-900 dark:text-white">Connectify</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Version 2.0.1</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">© 2026 Connectify Inc.</p>
        </div>
      </div>
    </div>
  );
}

// Mobile Navigation Component
function MobileNavigation({ activeSection, setActiveSection, setShowMobileMenu }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setShowMobileMenu(false)}>
      <div
        className="absolute left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Settings</h2>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <i className="fas fa-times text-gray-500 dark:text-slate-400"></i>
            </button>
          </div>
        </div>
        <nav className="p-2">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              className={`flex items-center w-full px-4 py-3 rounded-xl mb-1 transition-all ${activeSection === section.key
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              onClick={() => {
                setActiveSection(section.key);
                setShowMobileMenu(false);
              }}
            >
              <div className={`p-2 rounded-lg mr-3 bg-gradient-to-br ${section.color}`}>
                <i className={`${section.icon} text-white text-sm`}></i>
              </div>
              <span className="font-medium">{section.label}</span>
              {activeSection === section.key && (
                <i className="fas fa-check ml-auto text-blue-500"></i>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useContext(ThemeContext);
  const [status, setStatus] = useState("");
  const [activeSection, setActiveSection] = useState("appearance");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [settings, setSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  // Load settings from database first, then fallback to localStorage
  useEffect(() => {
    const loadSettings = async () => {
      // First load from localStorage for instant display
      if (typeof window !== "undefined") {
        const savedSettings = localStorage.getItem("userSettings");
        if (savedSettings) {
          try {
            setSettings(JSON.parse(savedSettings));
          } catch (e) {
            console.error('Failed to parse saved settings:', e);
          }
        }
        setSettingsLoaded(true);
      }

      // Only fetch from database once session is authenticated
      if (sessionStatus === 'authenticated' && session?.user) {
        try {
          const res = await fetch('/api/settings');
          if (res.ok) {
            const data = await res.json();
            if (data.settings && Object.keys(data.settings).length > 0) {
              setSettings(data.settings);
              // Sync to localStorage
              if (typeof window !== "undefined") {
                localStorage.setItem("userSettings", JSON.stringify(data.settings));
              }
            }
          }
          // Silently ignore 401 errors - user just not logged in
        } catch (error) {
          // Silently fail - localStorage is the fallback
        }
      }
    };
    loadSettings();
  }, [session, sessionStatus]);

  // Save settings to both localStorage and database
  const updateSetting = async (key, value) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      if (typeof window !== "undefined") {
        localStorage.setItem("userSettings", JSON.stringify(newSettings));
      }
      return newSettings;
    });

    // Sync to database only if fully authenticated
    if (sessionStatus === 'authenticated' && session?.user) {
      try {
        await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value })
        });
        // Silently ignore errors - localStorage is the fallback
      } catch (error) {
        // Don't log errors for each setting change
      }
    }
  };

  // Persist theme
  useEffect(() => {
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (savedTheme && savedTheme !== theme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
    }
  }, [theme]);

  const handleToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    setStatus("Saved!");
    setTimeout(() => setStatus(""), 1200);
  };

  const renderSection = () => {
    switch (activeSection) {
      case "appearance":
        return <AppearanceSection theme={theme} handleToggle={handleToggle} status={status} settings={settings} updateSetting={updateSetting} />;
      case "account":
        return <AccountSection session={session} router={router} />;
      case "privacy":
        return <PrivacySection settings={settings} updateSetting={updateSetting} />;
      case "notifications":
        return <NotificationsSection settings={settings} updateSetting={updateSetting} />;
      case "accessibility":
        return <AccessibilitySection settings={settings} updateSetting={updateSetting} />;
      case "language":
        return <LanguageSection settings={settings} updateSetting={updateSetting} />;
      case "data":
        return <DataStorageSection settings={settings} updateSetting={updateSetting} />;
      case "help":
        return <HelpSupportSection />;
      default:
        return null;
    }
  };

  const currentSection = SECTIONS.find(s => s.key === activeSection);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <Navbar session={session} router={router} />

      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <i className="fas fa-bars text-gray-600 dark:text-gray-300"></i>
          </button>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${currentSection?.color}`}>
              <i className={`${currentSection?.icon} text-white text-xs`}></i>
            </div>
            <h1 className="font-semibold text-gray-900 dark:text-white">{currentSection?.label}</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {showMobileMenu && (
        <MobileNavigation
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          setShowMobileMenu={setShowMobileMenu}
        />
      )}

      <main className="max-w-6xl mx-auto py-4 sm:py-8 px-4 flex gap-6 lg:gap-8">
        {/* Desktop Sidebar */}
        <aside className="w-64 lg:w-72 hidden md:block flex-shrink-0">
          <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 sticky top-24 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your preferences</p>
            </div>
            <nav>
              <ul className="space-y-1">
                {SECTIONS.map((section) => (
                  <li key={section.key}>
                    <button
                      className={`group flex items-center w-full px-3 py-2.5 rounded-xl transition-all duration-200
												${activeSection === section.key
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        }`}
                      onClick={() => setActiveSection(section.key)}
                    >
                      <div className={`p-2 rounded-lg mr-3 transition-colors bg-gradient-to-br ${section.color}`}>
                        <i className={`${section.icon} text-white text-xs`}></i>
                      </div>
                      <span className="font-medium text-sm">{section.label}</span>
                      {activeSection === section.key && (
                        <i className="fas fa-chevron-right ml-auto text-blue-500 text-xs"></i>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <section className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-4 sm:p-6 lg:p-8">
          {renderSection()}
        </section>
      </main>
    </div>
  );
}
