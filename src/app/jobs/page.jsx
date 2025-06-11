// src/app/jobs/page.jsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from '../../components/NavBar';

export default function JobsPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [jobListings, setJobListings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (status === "loading") {
			return; // Still loading session, do nothing
		}

		if (status === "unauthenticated") {
			router.push("/auth/login"); // Redirect if not logged in
			return;
		}

		if (status === "authenticated") {
			const fetchJobs = async () => {
				try {
					setLoading(true);
					// In a real application, you would fetch from your backend, e.g.:
					// const res = await fetch('/api/jobs');
					// const data = await res.json();
					// setJobListings(data.jobs);

					// Simulated data:
					const simulatedJobs = [
						{
							id: 'job1',
							title: 'Senior Software Engineer',
							company: 'Tech Solutions Inc.',
							location: 'Remote',
							description: 'We are seeking a highly skilled Senior Software Engineer to join our dynamic team...',
							posted: '2 days ago',
							salary: '$120,000 - $150,000',
							logo: 'https://placehold.co/60x60/4A90E2/FFFFFF?text=TS',
						},
						{
							id: 'job2',
							title: 'Product Manager',
							company: 'Innovate Innovations',
							location: 'New York, NY',
							description: 'Innovate Innovations is looking for a driven Product Manager to lead our new product line...',
							posted: '5 days ago',
							salary: '$100,000 - $130,000',
							logo: 'https://placehold.co/60x60/50C878/FFFFFF?text=II',
						},
						{
							id: 'job3',
							title: 'Data Scientist',
							company: 'Analytics Hub',
							location: 'San Francisco, CA',
							description: 'Join Analytics Hub as a Data Scientist to work on cutting-edge data analysis projects...',
							posted: '1 week ago',
							salary: '$110,000 - $140,000',
							logo: 'https://placehold.co/60x60/DA70D6/FFFFFF?text=AH',
						},
						{
							id: 'job4',
							title: 'UX Designer',
							company: 'Creative Studio',
							location: 'Remote',
							description: 'We need a talented UX Designer to craft intuitive and engaging user experiences...',
							posted: '3 days ago',
							salary: '$90,000 - $110,000',
							logo: 'https://placehold.co/60x60/FF7F50/FFFFFF?text=CS',
						},
						{
							id: 'job5',
							title: 'Marketing Specialist',
							company: 'Growth Strategies Ltd.',
							location: 'London, UK',
							description: 'Seeking an innovative Marketing Specialist to develop and execute marketing campaigns...',
							posted: '4 days ago',
							salary: '£40,000 - £55,000',
							logo: 'https://placehold.co/60x60/6A5ACD/FFFFFF?text=GS',
						},
					];
					setJobListings(simulatedJobs);

				} catch (err) {
					console.error("Failed to fetch jobs:", err);
					setError("Failed to load job listings. Please try again.");
				} finally {
					setLoading(false);
				}
			};
			fetchJobs();
		}
	}, [status, router]); // Depend on session status and router

	if (status === "loading" || loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
				<div className="flex items-center space-x-2 text-indigo-600">
					<svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
						<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Loading job listings...
				</div>
			</div>
		);
	}

	if (status === "unauthenticated") {
		// This case is already handled by the redirect in useEffect
		return null;
	}

	return (
		<>
			<Navbar session={session} router={router} />
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 pt-4"> {/* Added pt-4 to adjust for fixed navbar */}
				<div className="max-w-4xl mx-auto">
					<h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center">
						<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
							Job Listings
						</span>
					</h1>

					{error && (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 text-sm flex items-center shadow-sm">
							<svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586l-1.293-1.293z" clipRule="evenodd" />
							</svg>
							<span className="block">{error}</span>
						</div>
					)}

					{jobListings.length === 0 && !loading && !error && (
						<div className="text-center py-10 bg-white shadow-xl rounded-2xl border border-gray-200">
							<p className="text-gray-600 text-lg">No job listings found at the moment.</p>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{jobListings.map((job) => (
							<div key={job.id} className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200 flex flex-col">
								<div className="flex items-center mb-4">
									<img
										src={job.logo}
										alt={`${job.company} Logo`}
										className="w-12 h-12 rounded-lg object-cover mr-4 border border-gray-200"
									/>
									<div>
										<h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
										<p className="text-md text-gray-700">{job.company}</p>
									</div>
								</div>
								<p className="text-sm text-gray-600 mb-2 flex items-center">
									<svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
									</svg>
									{job.location}
								</p>
								{job.salary && (
									<p className="text-sm text-gray-600 mb-4 flex items-center">
										<svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2V8z"></path>
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 13h10a3 3 0 003-3V6a3 3 0 00-3-3H7a3 3 0 00-3 3v4a3 3 0 003 3z"></path>
										</svg>
										{job.salary}
									</p>
								)}
								<p className="text-gray-700 text-sm mb-4 line-clamp-3">{job.description}</p>
								<div className="mt-auto flex justify-between items-center text-xs text-gray-500">
									<span>Posted: {job.posted}</span>
									<button className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 ease-in-out shadow-md transform hover:scale-105">
										Apply Now
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</>
	);
}
