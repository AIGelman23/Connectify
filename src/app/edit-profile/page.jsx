"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from '../../components/NavBar';
import ExperienceModal from "../../components/profile/ExperienceModal";
import EducationModal from "../../components/profile/EducationModal";

import ResumePreviewModal from "../../components/profile/ResumePreviewModal";
import FriendsListContainer from "../../components/profile/FriendsListContainer";

import EditProfileHeader from "../../components/profile/EditProfileHeader";
import EditProfileExperience from "../../components/profile/EditProfileExperience";
import EditProfileEducation from "../../components/profile/EditProfileEducation";
import EditProfileSkills from "../../components/profile/EditProfileSkills";

import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique IDs

export default function EditProfilePage() {
	const { data: session, status, update } = useSession();
	console.log(status);
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [allConnections, setAllConnections] = useState([]);

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
		acceptedFriends: [], // Initialize acceptedFriends here
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
	const [editingExperience, setEditingExperience] = useState(null); // The item being edited
	const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
	const [editingEducation, setEditingEducation] = useState(null); // The item being edited
	const [isSkillModalOpen, setIsSkillModalOpen] = useState(false); // Unused in this example
	const [editingSkill, setEditingSkill] = useState(null); // Unused in this example
	const [skillInput, setSkillInput] = useState('');

	// --- useEffect for initial profile fetch ---
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
					setLoading(true);
					const res = await fetch("/api/edit-profile");
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

						// Debug log - ADD THIS
						console.log("Profile data received from API:", data);
						if (data.profile) {
							console.log("Profile picture URL:", data.profile.profilePictureUrl);
							console.log("Cover photo URL:", data.profile.coverPhotoUrl);
						}

						// Map the API response fields to the expected state fields
						setProfileData(prev => ({
							...prev,
							name: data.profile.name || session?.user?.name || "",
							email: data.profile.email || session?.user?.email || "",
							headline: data.profile.headline || "",
							summary: data.profile.bio || "", // Map bio field to summary
							location: data.profile.location || "",
							// Crucial fixes - MODIFY THESE TWO LINES
							profilePicture: data.profile.profilePictureUrl || session?.user?.image || "",
							coverPhoto: data.profile.coverPhotoUrl || "",
							resume: data.profile.resumeUrl || "",
							isProfileComplete: data.profile.isProfileComplete || false,
							experience: Array.isArray(data.profile.experiences) // Note: experiences (plural) from API
								? data.profile.experiences
								: [],
							education: Array.isArray(data.profile.education)
								? data.profile.education
								: [],
							skills: Array.isArray(data.profile.skills)
								? data.profile.skills
								: [],
						}));
					} else {
						const errorData = await res.json();
						console.error("Failed to fetch profile:", errorData);
						setFormErrors(prev => ({ ...prev, submit: errorData.message || "Failed to load profile." }));
					}
				} catch (err) {
					console.error("Network error fetching profile:", err);
					setFormErrors(prev => ({ ...prev, submit: "Network error. Please try again." }));
				} finally {
					setLoading(false);
				}
			};
			fetchProfile();
		}
	}, [status, router, session]);

	// useEffect to monitor session.user.image changes (already good)
	useEffect(() => {
		console.log("EditProfilePage (useEffect): Current session.user.image is:", session?.user?.image);
	}, [session?.user?.image]);

	useEffect(() => {
		if (status === "authenticated") {
			const fetchFriends = async () => {
				try {
					const res = await fetch('/api/connections');
					if (res.ok) {
						const data = await res.json();
						setAllConnections(data.users); // Store the raw fetched data
						setFormErrors({});
					} else {
						const errorData = await res.json();
						console.error("Failed to fetch connections:", errorData.message);
						setFormErrors(prev => ({ ...prev, friends: errorData.message || "Failed to load connections." }));
					}
				} catch (err) {
					console.error("Network error fetching connections:", err);
					setFormErrors(prev => ({ ...prev, friends: "Network error loading friends list." }));
				}
			};
			fetchFriends();
		} else if (status === "unauthenticated") {
			setAllConnections([]);
			setFormErrors({});
		}
	}, [status]);

	// Use useMemo to create the 'friendsList' prop.
	// It will only re-calculate and return a new array reference
	// if 'allConnections' changes.
	const memoizedFriendsList = useMemo(() => {
		return allConnections.filter(user => user.connectionStatus === 'CONNECTED');
	}, [allConnections]); // Dependency: allConnections


	// Handler for text input changes, updates draftProfileData (already good)
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
			console.log(`File selected for ${fileType}:`, file.name);

			if (fileType === 'profilePicture') {
				setProfilePictureFile(file);
				setDraftProfileData(prev => {
					if (!prev) return prev; // Guard against null draft data

					// Create object URL for preview
					const objectUrl = URL.createObjectURL(file);
					console.log(`Created object URL for preview: ${objectUrl}`);
					return { ...prev, profilePicture: objectUrl };
				});
				// Do NOT update the session here - this was causing the view mode change
			} else if (fileType === 'coverPhoto') {
				setCoverPhotoFile(file);
				setDraftProfileData(prev => {
					if (!prev) return prev;
					return { ...prev, coverPhoto: URL.createObjectURL(file) };
				});
			} else if (fileType === 'resume') {
				setResumeFile(file);
				setDraftProfileData(prev => {
					if (!prev) return prev;
					return { ...prev, resume: file.name };
				});
			}
		}
	}, []);

	// Helper function to upload files to S3 (already good)
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
			if (!data.url) {
				console.error("Upload API response:", data);
				throw new Error(
					(data && data.message) ||
					`Upload failed: missing URL for ${fileType}.`
				);
			}
			return data.url;
		} catch (error) {
			console.error(`Error uploading ${fileType}:`, error);
			setFormErrors(prev => ({
				...prev,
				[`${fileType}Upload`]: `Failed to upload ${fileType}: ${error.message}`,
			}));
		}
	}, []);

	// Form validation (already good)
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

	// handleSubmit function (already good, with slight improvements for clarity)
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
		let finalResumeUrl = draftProfileData.resume;

		try {
			// Handle profile picture upload/removal
			if (profilePictureFile) {
				finalProfilePictureUrl = await uploadFileToS3(profilePictureFile, 'profilePicture');
				if (finalProfilePictureUrl === null) { setLoading(false); return; }
			} else if (profileData.profilePicture && draftProfileData.profilePicture === '') {
				finalProfilePictureUrl = ''; // User explicitly cleared existing image
			} else {
				finalProfilePictureUrl = profileData.profilePicture; // Keep existing if not changed/cleared
			}

			// Handle cover photo upload/removal
			if (coverPhotoFile) {
				finalCoverPhotoUrl = await uploadFileToS3(coverPhotoFile, 'coverPhoto');
				if (finalCoverPhotoUrl === null) { setLoading(false); return; }
			} else if (profileData.coverPhoto && draftProfileData.coverPhoto === '') {
				finalCoverPhotoUrl = ''; // User explicitly cleared existing image
			} else {
				finalCoverPhotoUrl = profileData.coverPhoto; // Keep existing if not changed/cleared
			}

			// Handle resume upload/removal
			if (resumeFile) {
				finalResumeUrl = await uploadFileToS3(resumeFile, 'resume');
				if (finalResumeUrl === null) { setLoading(false); return; }
			} else if (profileData.resume && draftProfileData.resume === '') {
				finalResumeUrl = ''; // User explicitly cleared existing resume
			} else {
				finalResumeUrl = profileData.resume; // Keep existing if not changed/cleared
			}

			const formData = new FormData();
			formData.append('name', draftProfileData.name);
			formData.append('headline', draftProfileData.headline);
			formData.append('bio', draftProfileData.summary); // Map summary to bio for submission
			formData.append('location', draftProfileData.location);
			formData.append('isProfileComplete', true);

			formData.append('profilePictureUrl', finalProfilePictureUrl || '');
			formData.append('coverPhotoUrl', finalCoverPhotoUrl || '');
			formData.append('resumeUrl', finalResumeUrl || '');

			// Stringify arrays before appending to FormData
			formData.append('skills', JSON.stringify(draftProfileData.skills.map(s => s.name)));
			formData.append('experiences', JSON.stringify(draftProfileData.experience)); // Note: experiences (plural)
			formData.append('education', JSON.stringify(draftProfileData.education));

			const res = await fetch('/api/edit-profile', {
				method: 'PUT',
				body: formData,
			});

			if (res.ok) {
				const data = await res.json();
				console.log("Profile saved successfully. Backend response profile:", JSON.stringify(data.profile, null, 2));

				// Map API response fields to state fields
				setProfileData(prev => ({
					...prev,
					name: data.profile.name || prev.name,
					email: data.profile.email || prev.email,
					headline: data.profile.headline || prev.headline,
					summary: data.profile.bio || prev.summary, // Map bio to summary
					location: data.profile.location || prev.location,
					profilePicture: data.profile.profilePictureUrl || prev.profilePicture,
					coverPhoto: data.profile.coverPhotoUrl || prev.coverPhoto,
					resume: data.profile.resumeUrl || prev.resume,
					isProfileComplete: data.profile.isProfileComplete,
					experience: Array.isArray(data.profile.experiences) // Note: experiences (plural)
						? data.profile.experiences
						: [],
					education: Array.isArray(data.profile.education)
						? data.profile.education
						: [],
					skills: Array.isArray(data.profile.skills)
						? data.profile.skills
						: [],
				}));

				console.log("EditProfilePage: Calling full session update.");
				await update(); // Force a full session refresh to update NextAuth.js session

				if (!profileData.isProfileComplete) {
					router.push('/dashboard');
				}
				setDraftProfileData(null); // Clear draft data
				setViewMode('view'); // Exit edit mode
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
		profileData.profilePicture,
		profileData.coverPhoto,
		profileData.acceptedFriends // Added for completeness, though not directly used in submit logic
	]);


	// Logic for entering edit mode (already good)
	const enterEditMode = useCallback(() => {
		if (loading || !profileData || !profileData.name) {
			// Prevent entering edit mode until data is loaded and profileData is populated
			return;
		}
		console.log("Entering edit mode. Current profileData BEFORE setting draft:", profileData);
		setDraftProfileData({
			...profileData,
			experience: Array.isArray(profileData.experience) ? [...profileData.experience] : [],
			education: Array.isArray(profileData.education) ? [...profileData.education] : [],
			skills: Array.isArray(profileData.skills) ? profileData.skills.map(s => ({ ...s })) : [],
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
	}, [profileData, loading]);

	// Logic for canceling edit mode (already good)
	const cancelEditMode = useCallback(() => {
		setDraftProfileData(null);
		setProfilePictureFile(null);
		setCoverPhotoFile(null);
		setResumeFile(null);
		setFormErrors({});
		setViewMode('view');
	}, []);


	// --- Experience Modals ---
	const openExperienceModal = useCallback((expPassedToModal = null) => {
		let objectToSetAsEditing = null;

		if (expPassedToModal) {
			const foundInDraft = draftProfileData.experience.find(item => String(item.id) === String(expPassedToModal.id));
			if (foundInDraft) {
				objectToSetAsEditing = JSON.parse(JSON.stringify(foundInDraft)); // Deep clone
			} else {
				// Fallback, should ideally not be hit if IDs are consistent and draft is up-to-date
				console.warn("Experience item not found in draftProfileData by ID. Using CLONED original argument.");
				objectToSetAsEditing = JSON.parse(JSON.stringify(expPassedToModal));
			}
		} else {
			objectToSetAsEditing = null; // For adding a NEW item
		}

		setEditingExperience(objectToSetAsEditing);
		setIsExperienceModalOpen(true);
		setFormErrors(prev => {
			const newErrors = { ...prev };
			delete newErrors.experience;
			return newErrors;
		});
	}, [draftProfileData]); // Dependency on draftProfileData to find the item in the latest state

	const closeExperienceModal = useCallback(() => {
		setIsExperienceModalOpen(false);
		setEditingExperience(null); // Reset the editing item
	}, []);

	const handleSaveExperience = useCallback((exp) => {
		setDraftProfileData(prev => {
			if (!prev) return prev;

			const newExperience = editingExperience // Check if we were editing (i.e., editingExperience was not null)
				? prev.experience.map(e => (e.id === exp.id ? exp : e)) // Update existing
				: [...prev.experience, { ...exp, id: uuidv4() }]; // Add new with uuid

			return { ...prev, experience: newExperience };
		});
		closeExperienceModal();
	}, [editingExperience, closeExperienceModal]); // Dependency on editingExperience to distinguish add/edit
	// and closeExperienceModal to call it

	const handleDeleteExperience = useCallback((idToDelete) => {
		setDraftProfileData(prev => {
			if (!prev) return prev;
			return {
				...prev,
				experience: prev.experience.filter(exp => exp.id !== idToDelete),
			};
		});
	}, []);

	// --- Education Modals --- (Your openEducationModal is excellent and already handles cloning)
	const openEducationModal = useCallback((eduPassedToModal = null) => {
		console.groupCollapsed("TRACE: openEducationModal Call");
		console.log("1. ARGUMENT: eduPassedToModal (from 'Edit' button click):", eduPassedToModal);
		console.log("   Type of eduPassedToModal.id:", typeof eduPassedToModal?.id, " Value:", eduPassedToModal?.id);
		console.log("   Current draftProfileData.education array:", draftProfileData.education);

		let objectToSetAsEditing = null;

		if (eduPassedToModal) {
			const foundInDraft = draftProfileData.education.find(item => {
				const isMatch = String(item.id) === String(eduPassedToModal.id);
				if (isMatch) {
					console.log("2. FIND RESULT: Found matching item in draftProfileData:", item);
					console.log("   Found item ID type:", typeof item.id, " value:", item.id);
				}
				return isMatch;
			});

			if (foundInDraft) {
				objectToSetAsEditing = JSON.parse(JSON.stringify(foundInDraft)); // Deep clone
				console.log("3. CLONED OBJECT (passed to setEditingEducation):", objectToSetAsEditing);
			} else {
				console.warn("4. WARNING: Item not found in draftProfileData by ID. Using CLONED original argument. This might be a timing issue for newly added items.");
				objectToSetAsEditing = JSON.parse(JSON.stringify(eduPassedToModal)); // Clone the original passed object
			}
		} else {
			objectToSetAsEditing = null; // For adding a NEW item
			console.log("5. OPENING FOR NEW ITEM: objectToSetAsEditing is null.");
		}

		setEditingEducation(objectToSetAsEditing);
		setIsEducationModalOpen(true);
		setFormErrors(prev => {
			const newErrors = { ...prev };
			delete newErrors.education;
			return newErrors;
		});
		console.groupEnd();
	}, [draftProfileData]); // `draftProfileData` dependency is crucial here for `find`


	const closeEducationModal = useCallback(() => {
		setIsEducationModalOpen(false);
		setEditingEducation(null); // Reset the editing item
	}, []);

	const handleSaveEducation = useCallback((edu) => {
		console.log("handleSaveEducation received:", edu); // Debug: Check if institution is present
		setDraftProfileData(prev => {
			if (!prev) return prev;
			const newEducation = editingEducation // Check if we were editing
				? prev.education.map(e => (e.id === edu.id ? edu : e)) // Update existing
				: [...prev.education, { ...edu, id: uuidv4() }]; // Add new with uuid
			console.log("Updated education array:", newEducation); // Debug: Check array after update
			return { ...prev, education: newEducation };
		});
		closeEducationModal();
	}, [editingEducation, closeEducationModal]); // Dependency on editingEducation to distinguish add/edit

	const handleDeleteEducation = useCallback((idToDelete) => {
		setDraftProfileData(prev => {
			if (!prev) return prev;
			return {
				...prev,
				education: prev.education.filter(edu => edu.id !== idToDelete),
			};
		});
	}, []);

	// --- Skills Handlers --- (already good)
	const handleAddSkill = useCallback((skillName) => {
		const trimmedSkillName = skillName.trim();
		if (draftProfileData && trimmedSkillName) {
			const skillExists = draftProfileData.skills.some(s => s.name === trimmedSkillName);

			if (!skillExists && trimmedSkillName.length <= MAX_SKILL_LENGTH) {
				setDraftProfileData(prev => ({
					...prev,
					skills: [...(prev?.skills || []), { id: uuidv4(), name: trimmedSkillName, profileId: prev?.id || null }],
				}));
				setFormErrors(prev => {
					const newErrors = { ...prev };
					delete newErrors.skillInput;
					return newErrors;
				});
			} else if (skillExists) {
				setFormErrors(prev => ({ ...prev, skillInput: "This skill already exists." }));
			} else if (trimmedSkillName.length > MAX_SKILL_LENGTH) {
				setFormErrors(prev => ({ ...prev, skillInput: `Skill cannot exceed ${MAX_SKILL_LENGTH} characters.` }));
			}
		}
	}, [draftProfileData, MAX_SKILL_LENGTH]);

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


	// Handler to remove profile picture (updates draftProfileData) (already good)
	const handleRemoveProfilePicture = useCallback(() => {
		setProfilePictureFile(null);
		setDraftProfileData(prev => ({ ...prev, profilePicture: '' }));
	}, []);

	// Handler to remove cover photo (updates draftProfileData) (already good)
	const handleRemoveCoverPhoto = useCallback(() => {
		setCoverPhotoFile(null);
		setDraftProfileData(prev => ({ ...prev, coverPhoto: '' }));
	}, []);

	// Handler to open resume preview modal (already good)
	const openResumePreview = useCallback((url) => {
		setCurrentResumeUrl(url);
		setIsResumePreviewOpen(true);
	}, []);

	// Handler to close resume preview modal (already good)
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
		return null; // Or render an error state
	}
	console.log("currentProfileState.experience:", currentProfileState.experience);
	console.log("currentProfileState.education:", currentProfileState.education);
	console.log("currentProfileState.skills:", currentProfileState.skills);
	return (
		<>
			<div className="min-h-screen font-sans antialiased text-gray-900 bg-transparent">
				{/* Navbar for navigation */}
				<Navbar session={session} router={router} />
				<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
					<div className="bg-white bg-opacity-95 rounded-lg shadow-lg backdrop-blur-sm p-0 sm:p-0"> {/* Add theme container */}
						<EditProfileHeader
							currentProfileState={currentProfileState}
							viewMode={viewMode}
							handleFileChange={handleFileChange}
							handleRemoveProfilePicture={handleRemoveProfilePicture}
							handleRemoveCoverPhoto={handleRemoveCoverPhoto}
							enterEditMode={enterEditMode}
						/>
						{/* Friends List Section on Profile Page */}
						{status === "loading" && <p>Loading friends...</p>}
						{status === "unauthenticated" && <p>Please log in to see your friends.</p>}
						{status === "authenticated" && (
							<>
								{/* Pass the memoized friendsList */}
								<FriendsListContainer />
							</>
						)}
						{viewMode === 'view' ? (
							<>
								{/* Render sections in view mode */}
								<EditProfileExperience
									currentProfileState={currentProfileState}
									handleDeleteExperience={handleDeleteExperience}
									formErrors={formErrors}
									isEditable={false}
								/>
								<EditProfileEducation
									currentProfileState={currentProfileState}
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
									formErrors={formErrors}
									MAX_SKILL_LENGTH={MAX_SKILL_LENGTH}
									isEditable={false}
								/>
							</>
						) : (
							// --- Edit Mode Display (wrapped in a form) ---
							<form onSubmit={handleSubmit} className="space-y-6">
								<div className="profile-edit-mode-container p-8 rounded-md shadow bg-white bg-opacity-95"> {/* Add theme here */}
									{/* Basic Info Edit (already good, styles are applied via className) */}
									<section className="mb-8">
										<h2 className="text-2xl font-semibold mb-6">Edit Your Basic Info</h2>
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
										<h2 className="text-2xl font-semibold mb-4">Edit Your Experience</h2>
										<EditProfileExperience
											currentProfileState={currentProfileState}
											openExperienceModal={openExperienceModal}
											handleDeleteExperience={handleDeleteExperience}
											formErrors={formErrors}
											isEditable={true}
											// Pass modal-related state to the component for conditional rendering of its button
											isExperienceModalOpen={isExperienceModalOpen}
											closeExperienceModal={closeExperienceModal}
											handleSaveExperience={handleSaveExperience}
											editingExperience={editingExperience} // Pass the editing item
											addButtonClassName="font-bold py-2 px-4 rounded-full shadow text-white bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-all duration-200"
										/>
									</section>

									{/* Education Edit */}
									<section className="mb-8">
										<h2 className="text-2xl font-semibold mb-4">Edit Your Education</h2>
										<EditProfileEducation
											currentProfileState={currentProfileState}
											openEducationModal={openEducationModal}
											handleDeleteEducation={handleDeleteEducation}
											formErrors={formErrors}
											isEditable={true}
											// Pass modal-related state to the component for conditional rendering of its button
											isEducationModalOpen={isEducationModalOpen}
											closeEducationModal={closeEducationModal}
											handleSaveEducation={handleSaveEducation}
											editingEducation={editingEducation} // Pass the editing item
											addButtonClassName="font-bold py-2 px-4 rounded-full shadow text-white bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-all duration-200"
										/>
									</section>

									{/* Skills Edit */}
									<section className="mb-8">
										<h2 className="text-2xl font-semibold mb-4">Edit Your Skills</h2>
										<EditProfileSkills
											currentProfileState={currentProfileState}
											skillInput={skillInput}
											setSkillInput={setSkillInput}
											handleAddSkill={handleAddSkill}
											handleDeleteSkill={handleDeleteSkill}
											formErrors={formErrors}
											MAX_SKILL_LENGTH={MAX_SKILL_LENGTH}
											isEditable={true}
										/>
									</section>
								</div>
								{/* Sticky container with Cancel and Save Profile buttons */}
								<div className="profile-edit-bottom bottom-0 bg-white/80 dark:bg-gray-900/80 py-4 shadow-md backdrop-blur-md transition-colors duration-200">
									<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end items-center space-x-4">
										<button
											type="button"
											onClick={cancelEditMode}
											className="font-bold py-2.5 px-6 rounded-full shadow-lg text-white bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
											style={{
												minHeight: 44,
												letterSpacing: '0.03em',
												WebkitTapHighlightColor: 'transparent',
												WebkitAppearance: 'none'
											}}
										>
											Cancel
										</button>
										<button
											type="submit"
											className="font-bold py-2.5 px-6 rounded-full shadow-lg text-white bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
											disabled={loading}
											style={{
												minHeight: 44,
												letterSpacing: '0.03em',
												WebkitTapHighlightColor: 'transparent',
												WebkitAppearance: 'none'
											}}
										>
											{loading ? 'Saving...' : 'Save Profile'}
										</button>
									</div>
								</div>
							</form>
						)}

						{/* --- Modals (Apply the key prop here) --- */}
						{isExperienceModalOpen && (
							<ExperienceModal
								key={editingExperience ? editingExperience.id : 'new-experience-modal'}
								isOpen={isExperienceModalOpen}
								onClose={closeExperienceModal}
								experienceToEdit={editingExperience}
								onSave={handleSaveExperience}
							/>
						)}

						{isEducationModalOpen && (
							<EducationModal
								key={editingEducation ? editingEducation.id : 'new-education-modal'}
								isOpen={isEducationModalOpen}
								onClose={closeEducationModal}
								educationToEdit={editingEducation}
								onSave={handleSaveEducation}
							/>
						)}
					</div>
				</div>

				{/* Resume Preview Modal (already good) */}
				<ResumePreviewModal
					isOpen={isResumePreviewOpen}
					onClose={closeResumePreview}
					resumeUrl={currentResumeUrl}
				/>
			</div>
		</>
	);
}

// NOTE: All styling is applied via className (using Tailwind CSS with dark: variants)