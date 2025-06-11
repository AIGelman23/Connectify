"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from '../../components/NavBar';
import ExperienceModal from "../../components/profile/ExperienceModal";
import EducationModal from "../../components/profile/EducationModal";
import SkillModal from "../../components/profile/SkillModal";
import ResumePreviewModal from "../../components/profile/ResumePreviewModal";
import FriendsList from "../../components/profile/FriendsList";

import EditProfileHeader from "../../components/profile/EditProfileHeader";
import EditProfileAbout from "../../components/profile/EditProfileAbout";
import EditProfileExperience from "../../components/profile/EditProfileExperience";
import EditProfileEducation from "../../components/profile/EditProfileEducation";
import EditProfileSkills from "../../components/profile/EditProfileSkills";


// Helper function to format dates
const formatDate = (dateString) => {
	if (!dateString) return '';
	try {
		return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(new Date(dateString));
	} catch (e) {
		console.error("Error formatting date:", dateString, e);
		return dateString; // Return original if invalid
	}
};


export default function EditProfilePage() {
	const { data: session, status, update } = useSession();
	const router = useRouter();
	const [loading, setLoading] = useState(true);


	// profileData stores the officially saved/fetched profile data
	const [profileData, setProfileData] = useState({
		name: '',
		email: '',
		headline: '',
		summary: '',
		location: '',
		profilePicture: '',
		coverPhoto: '',
		resume: '',
		isProfileComplete: false,
		experience: [],
		education: [],
		skills: [],
	});

	// draftProfileData stores the data being actively edited (only populated in 'edit' mode)
	const [draftProfileData, setDraftProfileData] = useState(null);

	// States for new file uploads (raw File objects)
	const [profilePictureFile, setProfilePictureFile] = useState(null);
	const [coverPhotoFile, setCoverPhotoFile] = useState(null);
	const [resumeFile, setResumeFile] = useState(null);

	const [formErrors, setFormErrors] = useState({});
	const [showSuccessMessage, setShowSuccessMessage] = useState(false);

	// State to control overall view mode: 'view' (default) or 'edit'
	const [viewMode, setViewMode] = useState('view');

	// New state for resume preview modal
	const [isResumePreviewOpen, setIsResumePreviewOpen] = useState(false);
	const [currentResumeUrl, setCurrentResumeUrl] = useState('');

	// Constants for form validation
	const MAX_HEADLINE_LENGTH = 100;
	const MAX_SUMMARY_LENGTH = 500;
	const MAX_LOCATION_LENGTH = 100;
	const MAX_SKILL_LENGTH = 50;

	// States for modals (these operate on draftProfileData when in edit mode)
	const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);
	const [editingExperience, setEditingExperience] = useState(null);
	const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
	const [editingEducation, setEditingEducation] = useState(null);
	const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
	const [editingSkill, setEditingSkill] = useState(null);
	const [skillInput, setSkillInput] = useState('');

	// New state for friend search
	const [friendSearchTerm, setFriendSearchTerm] = useState("");

	useEffect(() => {
		if (status === "loading") {
			return;
		}

		if (status === "unauthenticated") {
			router.push("/auth/login");
			return;
		}

		if (status === "authenticated") {
			const fetchProfile = async () => {
				try {
					const res = await fetch('/api/edit-profile');
					if (res.ok) {
						let data;
						try {
							data = await res.json();
						} catch (jsonParseError) {
							const rawResponseText = await res.text();
							console.error("JSON parsing error:", jsonParseError);
							console.error("Raw backend response causing JSON error:", rawResponseText);
							throw new Error(`Failed to parse backend response as JSON: ${jsonParseError.message}. Raw response: "${rawResponseText.substring(0, 200)}..."`);
						}

						console.log("Fetched profile data from backend:", JSON.stringify(data.profile, null, 2));

						setProfileData(prev => ({
							...prev,
							// Backend now sends `name`, `email`, `profilePicture`, `summary`, `experience`, `education`, `skills`
							// directly at the top level of `data.profile` after formatting.
							name: data.profile.name || session.user.name || '',
							email: data.profile.email || session.user.email || '',
							headline: data.profile.headline || '',
							summary: data.profile.summary || '', // Correctly use data.profile.summary
							location: data.profile.location || '',
							// MODIFIED: Prioritize data.profile.profilePictureUrl from backend
							profilePicture: data.profile.profilePictureUrl || session.user.image || '',
							coverPhoto: data.profile.coverPhotoUrl || '',
							resume: data.profile.resumeUrl || '',
							isProfileComplete: data.profile.isProfileComplete || false,
							experience: Array.isArray(data.profile.experience) ? data.profile.experience : [], // Correctly use data.profile.experience
							education: Array.isArray(data.profile.education) ? data.profile.education : [],   // Correctly use data.profile.education
							skills: Array.isArray(data.profile.skills) ? data.profile.skills : [],
						}));
						// ADDED: Log session user image after initial fetch
						console.log("EditProfilePage: session.user.image AFTER initial fetch:", session?.user?.image);
					} else {
						let errorData = { message: `Failed to fetch profile: ${res.statusText}` };
						try {
							const text = await res.text();
							console.error("Backend error raw response (non-ok status):", text);
							errorData = JSON.parse(text);
						} catch (jsonParseError) {
							console.error("Failed to parse non-OK error response as JSON:", jsonParseError);
							errorData.message = errorData.message + (text ? ` Raw: "${text.substring(0, 100)}..."` : '');
						}
						throw new Error(errorData.message || `Failed to fetch profile: ${res.statusText}`);
					}
				} catch (err) {
					console.error("Error fetching profile:", err);
					setFormErrors(prev => ({ ...prev, fetch: err.message || "Failed to load profile data." }));
				} finally {
					setLoading(false);
				}
			};
			fetchProfile();
		}
	}, [status, router, session]);

	// ADDED: useEffect to monitor session.user.image changes in EditProfilePage
	useEffect(() => {
		console.log("EditProfilePage (useEffect): Current session.user.image is:", session?.user?.image);
	}, [session?.user?.image]);


	// Handler for text input changes, updates draftProfileData
	const handleChange = useCallback((e) => {
		const { name, value } = e.target;
		if (draftProfileData) {
			setDraftProfileData(prev => ({ ...prev, [name]: value }));
		}
	}, [draftProfileData]);

	// Handler for file input changes, updates draftProfileData and file states
	const handleFileChange = useCallback((e, fileType) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			if (fileType === 'profilePicture') {
				setProfilePictureFile(file);
				setDraftProfileData(prev => ({ ...prev, profilePicture: URL.createObjectURL(file) }));
			} else if (fileType === 'coverPhoto') {
				setCoverPhotoFile(file);
				setDraftProfileData(prev => ({ ...prev, coverPhoto: URL.createObjectURL(file) }));
			} else if (fileType === 'resume') {
				setResumeFile(file);
				// For resume, update the draft with the file name for display, not a blob URL
				setDraftProfileData(prev => ({ ...prev, resume: file.name }));
			}
		}
	}, []);

	// Helper function to upload files to S3
	const uploadFileToS3 = useCallback(async (file, fileType) => {
		if (!file) return null;

		const formData = new FormData();
		formData.append(fileType, file);

		try {
			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(`Server responded with non-OK status (${response.status}) for ${fileType} upload.`);
				console.error(`Raw server response for ${fileType}:`, errorText);

				let errorMessage = `File upload failed for ${fileType}: ${response.statusText}.`;
				try {
					const errorData = JSON.parse(errorText);
					errorMessage = errorData.message || errorMessage;
				} catch (jsonParseError) {
					console.warn(`Raw response for ${fileType} was not JSON, attempting to extract message:`, jsonParseError);
					errorMessage = errorText;
				}
				throw new Error(errorMessage);
			}

			const data = await response.json();
			return data.urls[`${fileType}Url`];
		} catch (error) {
			console.error(`Error uploading ${fileType}:`, error);
			setFormErrors(prev => ({ ...prev, [`${fileType}Upload`]: `Failed to upload ${fileType}: ${error.message}` }));
			return null;
		}
	}, []);


	const validateForm = useCallback((dataToValidate) => {
		const errors = {};
		if (!dataToValidate.name || dataToValidate.name.trim().length < 2) {
			errors.name = 'Name is required and must be at least 2 characters.';
		}
		if (!dataToValidate.headline || dataToValidate.headline.length > MAX_HEADLINE_LENGTH) {
			errors.headline = `Headline is required and cannot exceed ${MAX_HEADLINE_LENGTH} characters.`;
		}
		if (dataToValidate.summary && dataToValidate.summary.length > MAX_SUMMARY_LENGTH) {
			errors.summary = `Summary cannot exceed ${MAX_SUMMARY_LENGTH} characters.`;
		}
		if (!dataToValidate.location || dataToValidate.location.length > MAX_LOCATION_LENGTH) {
			errors.location = `Location is required and cannot exceed ${MAX_LOCATION_LENGTH} characters.`
		}
		if (dataToValidate.experience.length === 0) {
			errors.experience = 'At least one experience entry is required.';
		}
		if (dataToValidate.education.length === 0) {
			errors.education = 'At least one education entry is required.';
		}
		if (dataToValidate.skills.length === 0) {
			errors.skills = 'At least one skill is required.';
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	}, [MAX_HEADLINE_LENGTH, MAX_SUMMARY_LENGTH, MAX_LOCATION_LENGTH]);


	const handleSubmit = useCallback(async (e) => {
		e.preventDefault();
		if (!draftProfileData) return;

		if (!validateForm(draftProfileData)) {
			setLoading(false);
			return;
		}

		setLoading(true);
		setFormErrors({});
		setShowSuccessMessage(false);

		let finalProfilePictureUrl = draftProfileData.profilePicture;
		let finalCoverPhotoUrl = draftProfileData.coverPhoto;
		let finalResumeUrl = draftProfileData.resume; // Initialize with current draft resume value

		try {
			if (profilePictureFile) {
				finalProfilePictureUrl = await uploadFileToS3(profilePictureFile, 'profilePicture');
				if (finalProfilePictureUrl === null) {
					setLoading(false); return;
				}
			} else if (draftProfileData.profilePicture === '') { // Explicitly cleared by user
				finalProfilePictureUrl = '';
			} else if (!profilePictureFile && profileData.profilePicture) { // No new file, but there was an existing one
				finalProfilePictureUrl = profileData.profilePicture;
			}
			// If no file was ever set and none is uploaded, it remains empty, which is correct.


			if (coverPhotoFile) {
				finalCoverPhotoUrl = await uploadFileToS3(coverPhotoFile, 'coverPhoto');
				if (finalCoverPhotoUrl === null) {
					setLoading(false); return;
				}
			} else if (profileData.coverPhoto && draftProfileData.coverPhoto === '') {
				finalCoverPhotoUrl = '';
			} else if (!coverPhotoFile && profileData.coverPhoto) {
				finalCoverPhotoUrl = profileData.coverPhoto;
			}

			if (resumeFile) { // Only upload if a new file was selected
				finalResumeUrl = await uploadFileToS3(resumeFile, 'resume');
				if (finalResumeUrl === null) {
					setLoading(false); return;
				}
			} else if (profileData.resume && draftProfileData.resume === '') {
				// If resume was removed from draft, ensure final URL is empty
				finalResumeUrl = '';
			} else if (!resumeFile && profileData.resume) {
				// If no new file, but there was an existing one
				finalResumeUrl = profileData.resume;
			}
			// If no resume was ever set and none is uploaded, it remains empty, which is correct.

			const formData = new FormData();
			formData.append('name', draftProfileData.name);
			formData.append('headline', draftProfileData.headline);
			formData.append('summary', draftProfileData.summary);
			formData.append('location', draftProfileData.location);
			formData.append('isProfileComplete', true);


			formData.append('profilePictureUrl', finalProfilePictureUrl || '');
			formData.append('coverPhotoUrl', finalCoverPhotoUrl || '');
			formData.append('resumeUrl', finalResumeUrl || ''); // Use the resolved finalResumeUrl

			const skillsToSend = draftProfileData.skills.map(s => s.name);
			formData.append('skills', JSON.stringify(skillsToSend));
			formData.append('experience', JSON.stringify(draftProfileData.experience));
			formData.append('education', JSON.stringify(draftProfileData.education));


			const res = await fetch('/api/edit-profile', {
				method: 'PUT',
				body: formData,
			});

			if (res.ok) {
				const data = await res.json();
				console.log("Profile saved successfully. Backend response profile:", JSON.stringify(data.profile, null, 2));

				setShowSuccessMessage(true);
				setTimeout(() => setShowSuccessMessage(false), 3000);

				setProfileData(prev => ({
					...prev,
					// Update profileData using the newly formatted data from the backend
					name: data.profile.name || prev.name,
					email: data.profile.email || prev.email,
					headline: data.profile.headline || prev.headline,
					summary: data.profile.summary || prev.summary,
					location: data.profile.location || prev.location,
					profilePicture: data.profile.profilePictureUrl || prev.profilePicture, // Use profilePictureUrl from backend
					coverPhoto: data.profile.coverPhotoUrl || prev.coverPhoto, // Keep coverPhotoUrl mapping
					resume: data.profile.resumeUrl || prev.resume, // Keep resumeUrl mapping
					isProfileComplete: data.profile.isProfileComplete,
					experience: Array.isArray(data.profile.experience) ? data.profile.experience : [],
					education: Array.isArray(data.profile.education) ? data.profile.education : [],
					skills: Array.isArray(data.profile.skills) ? data.profile.skills : [],
				}));

				// MODIFIED: Call update without arguments to force a full session refresh
				console.log("EditProfilePage: Calling full session update.");
				await update();
				// Note: console.log(session?.user?.image) immediately after update() here might not reflect the change yet,
				// as `session` is a state and updates after the component re-renders.
				// The useEffect hook above will capture the change more reliably.


				if (!profileData.isProfileComplete) {
					router.push('/dashboard');
				}
				setDraftProfileData(null);
				setViewMode('view');
			} else {
				const errorData = await res.json();
				console.error("Failed to save profile:", errorData);
				setFormErrors(prev => ({ ...prev, submit: errorData.message || "Failed to save profile." }));
			}
		} catch (err) {
			console.error("Network error saving profile:", err);
			setFormErrors(prev => ({ ...prev, submit: "Network error. Please try again." }));
		} finally {
			setLoading(false);
		}
	}, [
		draftProfileData,
		profilePictureFile,
		coverPhotoFile,
		resumeFile,
		uploadFileToS3,
		validateForm,
		router,
		update,
		profileData.isProfileComplete,
		profileData.resume,
		profileData.profilePicture, // Added to dependencies for clarity
		profileData.coverPhoto, // Added to dependencies for clarity
	]);


	// Logic for entering edit mode
	const enterEditMode = useCallback(() => {
		console.log("Entering edit mode. Current profileData BEFORE setting draft:", profileData);
		setDraftProfileData({
			...profileData,
			// Ensure these are deep copies for editing
			experience: Array.isArray(profileData.experience) ? [...profileData.experience] : [],
			education: Array.isArray(profileData.education) ? [...profileData.education] : [],
			skills: Array.isArray(profileData.skills) ? profileData.skills.map(s => ({ ...s })) : [],
			// Ensure profilePicture, coverPhoto, resume are correctly taken from profileData
			profilePicture: profileData.profilePicture || '',
			coverPhoto: profileData.coverPhoto || '',
			resume: profileData.resume || '',
		});
		setProfilePictureFile(null);
		setCoverPhotoFile(null);
		setResumeFile(null);
		setFormErrors({});
		setViewMode('edit');
		console.log("viewMode set to 'edit'.");
	}, [profileData]);

	// Logic for canceling edit mode (still exists, but no button to trigger it)
	const cancelEditMode = useCallback(() => {
		setDraftProfileData(null);
		setProfilePictureFile(null);
		setCoverPhotoFile(null);
		setResumeFile(null);
		setFormErrors({});
		setViewMode('view');
	}, []);


	// --- Experience Modals ---
	const openExperienceModal = useCallback((exp = null) => {
		setEditingExperience(exp);
		setIsExperienceModalOpen(true);
		setFormErrors(prev => {
			const newErrors = { ...prev };
			delete newErrors.experience;
			return newErrors;
		});
	}, []);

	const closeExperienceModal = useCallback(() => {
		setIsExperienceModalOpen(false);
		setEditingExperience(null);
	}, []);

	const handleSaveExperience = useCallback((exp) => {
		setDraftProfileData(prev => {
			if (!prev) return prev;
			const newExperience = editingExperience
				? prev.experience.map(e => (e.id === exp.id ? exp : e))
				: [...prev.experience, { ...exp, id: crypto.randomUUID() }];
			return { ...prev, experience: newExperience };
		});
		closeExperienceModal();
	}, [editingExperience, closeExperienceModal]);

	const handleDeleteExperience = useCallback((idToDelete) => {
		setDraftProfileData(prev => {
			if (!prev) return prev;
			return {
				...prev,
				experience: prev.experience.filter(exp => exp.id !== idToDelete),
			};
		});
	}, []);

	// --- Education Modals ---
	const openEducationModal = useCallback((edu = null) => {
		setEditingEducation(edu);
		setIsEducationModalOpen(true);
		setFormErrors(prev => {
			const newErrors = { ...prev };
			delete newErrors.education;
			return newErrors;
		});
	}, []);

	const closeEducationModal = useCallback(() => {
		setIsEducationModalOpen(false);
		setEditingEducation(null);
	}, []);

	const handleSaveEducation = useCallback((edu) => {
		setDraftProfileData(prev => {
			if (!prev) return prev;
			const newEducation = editingEducation
				? prev.education.map(e => (e.id === edu.id ? edu : e))
				: [...prev.education, { ...edu, id: crypto.randomUUID() }];
			return { ...prev, education: newEducation };
		});
		closeEducationModal();
	}, [editingEducation, closeEducationModal]);

	const handleDeleteEducation = useCallback((idToDelete) => {
		setDraftProfileData(prev => {
			if (!prev) return prev;
			return {
				...prev,
				education: prev.education.filter(edu => edu.id !== idToDelete),
			};
		});
	}, []);

	// --- Skills Modals/Handling ---
	const openSkillModal = useCallback((skill = null) => {
		setEditingSkill(skill);
		setSkillInput(skill?.name || '');
		setIsSkillModalOpen(true);
		setFormErrors(prev => {
			const newErrors = { ...prev };
			delete newErrors.skills;
			return newErrors;
		});
	}, []);

	const closeSkillModal = useCallback(() => {
		setIsSkillModalOpen(false);
		setEditingSkill(null);
		setSkillInput('');
	}, []);

	const handleAddSkill = useCallback((e) => {
		e.preventDefault();
		const skillToAddName = skillInput.trim();
		if (draftProfileData && skillToAddName) {
			const skillExists = draftProfileData.skills.some(s => s.name === skillToAddName);

			if (!skillExists && skillToAddName.length <= MAX_SKILL_LENGTH) {
				setDraftProfileData(prev => ({
					...prev,
					skills: [...prev.skills, { id: crypto.randomUUID(), name: skillToAddName, profileId: prev.id || null }],
				}));
				setSkillInput('');
				setFormErrors(prev => {
					const newErrors = { ...prev };
					delete newErrors.skillInput;
					return newErrors;
				});
			} else if (skillExists) {
				setFormErrors(prev => ({ ...prev, skillInput: "This skill already exists." }));
			} else if (skillToAddName.length > MAX_SKILL_LENGTH) {
				setFormErrors(prev => ({ ...prev, skillInput: `Skill cannot exceed ${MAX_SKILL_LENGTH} characters.` }));
			}
		}
	}, [skillInput, draftProfileData, MAX_SKILL_LENGTH]);


	const handleDeleteSkill = useCallback((skillToDeleteId) => {
		setDraftProfileData(prev => {
			if (!prev) return prev;
			return {
				...prev,
				skills: prev.skills.filter(s => s.id !== skillToDeleteId),
			};
		});
	}, []);

	const handleUpdateSkill = useCallback((originalSkill, newSkillName) => {
		setDraftProfileData(prev => {
			if (!prev) return prev;
			return {
				...prev,
				skills: prev.skills.map(s => s.id === originalSkill.id ? { ...s, name: newSkillName } : s)
			};
		});
	}, []);


	// Handler to remove profile picture (updates draftProfileData)
	const handleRemoveProfilePicture = useCallback(() => {
		setProfilePictureFile(null);
		setDraftProfileData(prev => ({ ...prev, profilePicture: '' }));
	}, []);

	// Handler to remove cover photo (updates draftProfileData)
	const handleRemoveCoverPhoto = useCallback(() => {
		setCoverPhotoFile(null);
		setDraftProfileData(prev => ({ ...prev, coverPhoto: '' }));
	}, []);

	// Handler to open resume preview modal
	const openResumePreview = useCallback((url) => {
		setCurrentResumeUrl(url);
		setIsResumePreviewOpen(true);
	}, []);

	// Handler to close resume preview modal
	const closeResumePreview = useCallback(() => {
		setIsResumePreviewOpen(false);
		setCurrentResumeUrl('');
	}, []);


	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="flex flex-col items-center">
					<div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
					<p className="mt-4 text-lg text-gray-700">Loading profile...</p>
				</div>
			</div>
		);
	}

	// Determine which data to display/edit based on viewMode
	const currentProfileState = viewMode === 'view' ? profileData : draftProfileData;
	console.log("Before rendering - currentProfileState:", currentProfileState);
	if (!currentProfileState) {
		console.error("currentProfileState is null or undefined at render time, this should not happen.");
		return null;
	}
	console.log("currentProfileState.experience:", currentProfileState.experience);
	console.log("currentProfileState.education:", currentProfileState.education);
	console.log("currentProfileState.skills:", currentProfileState.skills);


	// Replace the dummy fallback with actual connections from the backend:
	const acceptedFriends = profileData.acceptedFriends || [];
	const filteredFriends = acceptedFriends.filter(friend =>
		friend.name.toLowerCase().includes(friendSearchTerm.toLowerCase())
	);


	return (
		<div className="min-h-screen bg-gray-100 font-sans antialiased text-gray-900">
			{/* Uncomment Navbar to display the navigation */}
			<Navbar session={session} router={router} />
			<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
				<EditProfileHeader
					currentProfileState={currentProfileState}
					viewMode={viewMode}
					handleFileChange={handleFileChange}
					handleRemoveProfilePicture={handleRemoveProfilePicture}
					handleRemoveCoverPhoto={handleRemoveCoverPhoto}
					enterEditMode={enterEditMode}
				/>
				{/* NEW: Friends List Section on Profile Page */}
				<div className="mt-8">
					<h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Friends</h2>
					<div className="mb-4">
						<input
							type="text"
							placeholder="Search friends..."
							value={friendSearchTerm}
							onChange={(e) => setFriendSearchTerm(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>
					<div className="flex space-x-4 overflow-x-auto py-2">
						{filteredFriends.length > 0 ? (
							filteredFriends.map(friend => (
								<div key={friend.id} className="flex-shrink-0 bg-white p-4 rounded-lg shadow hover:shadow-lg transition">
									<img
										src={friend.imageUrl}
										alt={friend.name}
										className="w-16 h-16 rounded-full object-cover"
									/>
									<p className="mt-2 text-sm font-semibold text-gray-800 text-center">{friend.name}</p>
								</div>
							))
						) : (
							<div className="text-gray-600">No friends available.</div>
						)}
					</div>
				</div>
				{viewMode === 'view' ? (
					<>
						{/* Removed EditProfileAbout from view mode */}
						<EditProfileExperience
							currentProfileState={currentProfileState}
							openExperienceModal={openExperienceModal}
							handleDeleteExperience={handleDeleteExperience}
							formErrors={formErrors}
							isEditable={false}
						/>
						<EditProfileEducation
							currentProfileState={currentProfileState}
							openEducationModal={openEducationModal}
							handleDeleteEducation={handleDeleteEducation}
							formErrors={formErrors}
							isEditable={false}
						/>
						<EditProfileSkills
							currentProfileState={currentProfileState}
							skillInput={skillInput}
							setSkillInput={setSkillInput}
							handleAddSkill={handleAddSkill}
							handleDeleteSkill={handleDeleteSkill}
							openSkillModal={openSkillModal}
							formErrors={formErrors}
							MAX_SKILL_LENGTH={MAX_SKILL_LENGTH}
							isEditable={false}
						/>
					</>
				) : (
					// --- Edit Mode Display (wrapped in a form) ---
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="bg-gray-50 p-8 rounded-md shadow border border-gray-200">
							{/* Basic Info Edit */}
							<section className="mb-8">
								<h2 className="text-2xl font-semibold text-gray-800 mb-6">Edit Your Basic Info</h2>
								<div className="grid grid-cols-1 gap-4">
									<div>
										<label htmlFor="name" className="block text-sm font-semibold text-gray-700">Name</label>
										<input
											type="text"
											id="name"
											name="name"
											value={currentProfileState.name}
											onChange={handleChange}
											className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
										{formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
									</div>
									<div>
										<label htmlFor="headline" className="block text-sm font-semibold text-gray-700">Headline</label>
										<input
											type="text"
											id="headline"
											name="headline"
											value={currentProfileState.headline}
											onChange={handleChange}
											maxLength={MAX_HEADLINE_LENGTH}
											className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
										{formErrors.headline && <p className="text-red-500 text-xs mt-1">{formErrors.headline}</p>}
									</div>
									<div>
										<label htmlFor="summary" className="block text-sm font-semibold text-gray-700">Summary</label>
										<textarea
											id="summary"
											name="summary"
											value={currentProfileState.summary}
											onChange={handleChange}
											rows="4"
											maxLength={MAX_SUMMARY_LENGTH}
											className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
										></textarea>
										{formErrors.summary && <p className="text-red-500 text-xs mt-1">{formErrors.summary}</p>}
									</div>
									<div>
										<label htmlFor="location" className="block text-sm font-semibold text-gray-700">Location</label>
										<input
											type="text"
											id="location"
											name="location"
											value={currentProfileState.location}
											onChange={handleChange}
											maxLength={MAX_LOCATION_LENGTH}
											className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
										{formErrors.location && <p className="text-red-500 text-xs mt-1">{formErrors.location}</p>}
									</div>
								</div>
							</section>

							{/* Experience Edit */}
							<section className="mb-8">
								<h2 className="text-2xl font-semibold text-gray-800 mb-4">Edit Your Experience</h2>
								<EditProfileExperience
									currentProfileState={currentProfileState}
									openExperienceModal={openExperienceModal}
									handleDeleteExperience={handleDeleteExperience}
									formErrors={formErrors}
									isEditable={true}
								/>
							</section>

							{/* Education Edit */}
							<section className="mb-8">
								<h2 className="text-2xl font-semibold text-gray-800 mb-4">Edit Your Education</h2>
								<EditProfileEducation
									currentProfileState={currentProfileState}
									openEducationModal={openEducationModal}
									handleDeleteEducation={handleDeleteEducation}
									formErrors={formErrors}
									isEditable={true}
								/>
							</section>

							{/* Skills Edit */}
							<section className="mb-8">
								<h2 className="text-2xl font-semibold text-gray-800 mb-4">Edit Your Skills</h2>
								<EditProfileSkills
									currentProfileState={currentProfileState}
									skillInput={skillInput}
									setSkillInput={setSkillInput}
									handleAddSkill={handleAddSkill}
									handleDeleteSkill={handleDeleteSkill}
									openSkillModal={openSkillModal}
									formErrors={formErrors}
									MAX_SKILL_LENGTH={MAX_SKILL_LENGTH}
									isEditable={true}
								/>
							</section>
						</div>
						{/* Sticky container with Cancel and Save Profile buttons */}
						<div className="sticky bottom-0 bg-[#f0f2f5] py-4 shadow-md">
							<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end items-center space-x-4">
								<button
									type="button"
									onClick={cancelEditMode}
									className="bg-gray-200 text-gray-700 font-bold py-2.5 px-6 rounded-full shadow hover:bg-gray-300 transition duration-200 ease-in-out"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="bg-[#1877f2] text-white font-bold py-2.5 px-6 rounded-full shadow-lg hover:bg-[#166fe5] transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#1877f2] focus:ring-opacity-50"
									disabled={loading}
								>
									{loading ? 'Saving...' : 'Save Profile'}
								</button>
							</div>
						</div>
					</form>
				)}
			</div>

			{/* Resume Preview Modal */}
			<ResumePreviewModal
				isOpen={isResumePreviewOpen}
				onClose={closeResumePreview}
				resumeUrl={currentResumeUrl}
			/>
		</div>
	);
}
