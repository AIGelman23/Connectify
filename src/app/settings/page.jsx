"use client";
import { useContext, useEffect, useState } from "react";
import { ThemeContext } from "@/theme/ThemeProvider";
// import { ThemeContext } from "../../theme/ThemeProvider";
import Navbar from '../../components/NavBar';
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const SECTIONS = [
	{ key: "appearance", label: "Appearance", icon: "fas fa-palette" },
	{ key: "account", label: "Account", icon: "fas fa-user" },
	{ key: "privacy", label: "Privacy", icon: "fas fa-lock" },
	{ key: "notifications", label: "Notifications", icon: "fas fa-bell" },
];

function AppearanceSection({ theme, handleToggle, status }) {
	return (
		<div className="space-y-6">
			<div className="border-b border-gray-200 dark:border-gray-700 pb-4">
				<h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
					<div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center">
						<i className="fas fa-palette text-sm"></i>
					</div>
					Appearance
				</h2>
				<p className="text-gray-600 dark:text-gray-400">
					Customize how Connectify looks and feels to you
				</p>
			</div>

			<div className="appearance-theme-card rounded-xl p-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-full appearance-theme-icon-bg shadow-md">
							<i className={`fas ${theme === 'dark' ? 'fa-moon' : 'fa-sun'} text-lg ${theme === 'dark' ? 'appearance-theme-icon-dark' : 'appearance-theme-icon-light'}`}></i>
						</div>
						<div>
							<h3 className="font-semibold appearance-theme-title">
								Theme Mode
							</h3>
							<p className="text-sm appearance-theme-desc">
								Switch between light and dark themes
							</p>
						</div>
					</div>

					{/* Fix: Prevent layout shift when showing status */}
					<div className="flex items-center gap-3 min-w-[170px] justify-end">
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={theme === "dark"}
								onChange={handleToggle}
							/>
							<div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-600"></div>
						</label>
						<span className="font-medium text-gray-700 dark:text-gray-300 min-w-[45px] text-center">
							{theme === "dark" ? "Dark" : "Light"}
						</span>
						{/* Center the status message */}
						<span className="relative min-w-[70px] flex items-center justify-center">
							{status && (
								<span className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900 rounded-full animate-fade-in">
									{status}
								</span>
							)}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function AccountSection({ session }) {
	return (
		<div className="space-y-6">
			<div className="border-b border-gray-200 dark:border-gray-700 pb-4">
				<h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
					<div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center">
						<i className="fas fa-user text-sm"></i>
					</div>
					Account
				</h2>
				<p className="text-gray-600 dark:text-gray-400">
					Manage your account information and settings
				</p>
			</div>

			<div className="grid gap-4">
				<div className="account-info-card rounded-xl p-6 hover:shadow-md transition-shadow">
					<div className="flex items-start gap-4">
						{/* Show user's profile picture if available */}
						<img
							src={
								session?.user?.profile?.profilePictureUrl ||
								session?.user?.image ||
								`https://placehold.co/64x64/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`
							}
							alt="Profile"
							className="w-16 h-16 rounded-full object-cover border border-gray-300 account-info-avatar"
						/>
						<div className="flex-1 space-y-3">
							<div>
								<label className="account-info-label block text-sm font-medium mb-1">Name</label>
								<p className="account-info-name text-lg font-semibold">{session?.user?.name || "User"}</p>
							</div>
							<div>
								<label className="account-info-label block text-sm font-medium mb-1">Email</label>
								<p className="account-info-email">{session?.user?.email}</p>
							</div>
						</div>
					</div>
				</div>

				<div className="account-security-card rounded-xl p-6">
					<h3 className="account-security-title font-semibold mb-4">Security</h3>
					<button className="account-security-btn px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
						<i className="fas fa-key mr-2"></i>
						Change Password
					</button>
				</div>
			</div>
		</div>
	);
}

function PrivacySection() {
	return (
		<div className="space-y-6">
			<div className="border-b border-gray-200 dark:border-gray-700 pb-4">
				<h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
					<div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center">
						<i className="fas fa-lock text-sm"></i>
					</div>
					Privacy
				</h2>
				<p className="text-gray-600 dark:text-gray-400">
					Control your privacy and data settings
				</p>
			</div>

			<div className="space-y-4">
				<div className="privacy-card rounded-xl p-6 hover:shadow-md transition-shadow">
					<div className="flex items-center justify-between mb-3">
						<div>
							<h3 className="privacy-card-title font-semibold">Profile Visibility</h3>
							<p className="privacy-card-desc text-sm">Choose who can see your profile</p>
						</div>
						<i className="fas fa-eye privacy-card-icon"></i>
					</div>
					<select className="privacy-card-select w-full px-4 py-3 rounded-lg transition-all">
						<option>Everyone</option>
						<option>Connections only</option>
						<option>Only me</option>
					</select>
				</div>

				<div className="privacy-card rounded-xl p-6 hover:shadow-md transition-shadow">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="privacy-card-searchicon p-2 rounded-lg">
								<i className="fas fa-search privacy-card-searchicon-i"></i>
							</div>
							<div>
								<h3 className="privacy-card-title font-semibold">Search Engine Indexing</h3>
								<p className="privacy-card-desc text-sm">Allow search engines to find your profile</p>
							</div>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" className="sr-only peer" defaultChecked />
							<div className="privacy-card-toggle w-11 h-6 rounded-full"></div>
						</label>
					</div>
				</div>
			</div>
		</div>
	);
}

function NotificationsSection() {
	return (
		<div className="space-y-6">
			<div className="border-b border-gray-200 dark:border-gray-700 pb-4">
				<h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
					<div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 text-white flex items-center justify-center">
						<i className="fas fa-bell text-sm"></i>
					</div>
					Notifications
				</h2>
				<p className="text-gray-600 dark:text-gray-400">
					Manage how and when you receive notifications
				</p>
			</div>

			<div className="space-y-4">
				<div className="notification-card rounded-xl p-6 hover:shadow-md transition-shadow">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="notification-card-envelope p-2 rounded-lg">
								<i className="fas fa-envelope notification-card-envelope-i"></i>
							</div>
							<div>
								<h3 className="notification-card-title font-semibold">Email Notifications</h3>
								<p className="notification-card-desc text-sm">Get notified about new messages via email</p>
							</div>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" className="sr-only peer" defaultChecked />
							<div className="notification-card-toggle w-11 h-6 rounded-full"></div>
						</label>
					</div>
				</div>

				<div className="notification-card rounded-xl p-6 hover:shadow-md transition-shadow">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="notification-card-mobile p-2 rounded-lg">
								<i className="fas fa-mobile-alt notification-card-mobile-i"></i>
							</div>
							<div>
								<h3 className="notification-card-title font-semibold">Push Notifications</h3>
								<p className="notification-card-desc text-sm">Receive push notifications for connection requests</p>
							</div>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" className="sr-only peer" defaultChecked />
							<div className="notification-card-toggle w-11 h-6 rounded-full"></div>
						</label>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function SettingsPage() {
	const { theme, setTheme } = useContext(ThemeContext);
	const [status, setStatus] = useState("");
	const [activeSection, setActiveSection] = useState("appearance");
	const router = useRouter();
	const { data: session } = useSession();

	// Persist theme and apply to <html>
	useEffect(() => {
		// Check for saved theme in localStorage
		const savedTheme = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
		if (savedTheme && savedTheme !== theme) {
			setTheme(savedTheme);
		}
	}, []);

	useEffect(() => {
		if (typeof window !== "undefined") {
			// Save theme to localStorage
			localStorage.setItem("theme", theme);
			// Apply theme class to <html>
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

	let sectionContent = null;
	if (activeSection === "appearance") {
		sectionContent = (
			<AppearanceSection
				theme={theme}
				handleToggle={handleToggle}
				status={status}
			/>
		);
	} else if (activeSection === "account") {
		sectionContent = <AccountSection session={session} />;
	} else if (activeSection === "privacy") {
		sectionContent = <PrivacySection />;
	} else if (activeSection === "notifications") {
		sectionContent = <NotificationsSection />;
	}

	return (
		<div className="min-h-screen transition-colors duration-300">
			<Navbar session={session} router={router} />
			<main className="max-w-6xl mx-auto py-8 px-4 flex gap-8">
				{/* Enhanced Sidebar */}
				<aside className="w-72 hidden md:block">
					<div className="sidebar-container p-6 sticky top-24 rounded-2xl shadow-lg">
						<div className="mb-6">
							<h1 className="text-xl font-bold sidebar-title">Settings</h1>
							<p className="text-sm sidebar-desc">Manage your account preferences</p>
						</div>
						<nav className="sidebar-nav">
							<ul className="space-y-2">
								{SECTIONS.map((section) => (
									<li key={section.key}>
										<button
											className={`sidebar-nav-btn group flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200
												${activeSection === section.key
													? "sidebar-nav-btn-active"
													: "sidebar-nav-btn-inactive"
												}`}
											onClick={() => setActiveSection(section.key)}
										>
											<div className={`sidebar-nav-icon p-3 rounded-lg mr-3 transition-colors
												${activeSection === section.key
													? "sidebar-nav-icon-active"
													: "sidebar-nav-icon-inactive group-hover:sidebar-nav-icon-hover"
												}`}>
												<i className={`${section.icon} text-sm ${activeSection === section.key ? 'sidebar-nav-icon-i-active' : 'sidebar-nav-icon-i-inactive'}`}></i>
											</div>
											<span className="font-medium">{section.label}</span>
											{activeSection === section.key && (
												<i className="fas fa-chevron-right ml-auto sidebar-nav-chevron"></i>
											)}
										</button>
									</li>
								))}
							</ul>
						</nav>
					</div>
				</aside>

				{/* Enhanced Main Content */}
				<section className="flex-1 settings-section-bg rounded-2xl shadow-lg p-8 min-h-[600px] transition-colors duration-300">
					{sectionContent}
				</section>
			</main>

			{/* Add custom styles for animations */}
			<style jsx>{`
				@keyframes fade-in {
					from { opacity: 0; transform: translateY(-10px); }
					to { opacity: 1; transform: translateY(0); }
				}
				.animate-fade-in {
					animation: fade-in 0.3s ease-out;
				}
			`}</style>
		</div>
	);
}