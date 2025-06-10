// Main Profile Page Component (now acting as the primary signup/onboarding profile page)
export default function ProfilePage() {
  const { data: session, status } = useSession(); // Use actual session hook
  const router = useRouter();

  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Profile data states - initialized to empty strings, will be filled by fetch
  const [bio, setBio] = useState('');
  const [headline, setHeadline] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [education, setEducation] = useState('');
  const [resumeExistingUrl, setResumeExistingUrl] = useState('');

  // File upload states
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);

  // Display URLs - initialized to empty, will be filled by fetch or session
  const [currentProfilePictureUrl, setCurrentProfilePictureUrl] = useState('');
  const [currentCoverPhotoUrl, setCurrentCoverPhotoUrl] = useState('');

  // File input refs
  const profilePictureInputRef = useRef(null);
  const coverPhotoInputRef = useRef(null);

  // State to track if profile is complete based on fetched data
  const [isProfileAlreadyComplete, setIsProfileAlreadyComplete] = useState(false);

  // Helper function to generate placeholder image URL with user initial
  const generateProfilePicturePlaceholder = (name) => {
    const initial = name ? name[0].toUpperCase() : 'U';
    return `https://placehold.co/150x150/A78BFA/ffffff?text=${initial}`;
  };

  // Default cover photo URL
  const defaultCoverPhotoUrl = 'https://placehold.co/800x300/E0E7FF/6366F1?text=Connectify%20Banner';


  // --- Fetch Profile Data on Mount ---
  useEffect(() => {
    if (status === 'loading') return; // Wait for session to load

    if (status === 'unauthenticated') {
      router.push('/auth/login'); // Redirect if not logged in
      return;
    }

    const fetchProfileData = async () => {
      try {
        setLoadingInitialData(true);
        const res = await fetch('/file');

        // Determine default profile picture URL based on session user's name
        const defaultProfilePic = generateProfilePicturePlaceholder(session?.user?.name);

        if (!res.ok) {
          if (res.status === 404) {
            console.warn('No profile found for this user. Starting with empty profile data for creation.');
            // Initialize states with empty values, ready for user input.
            setBio('');
            setHeadline('');
            setSkillsInput('');
            setEducation('');
            setCurrentProfilePictureUrl(session?.user?.image || defaultProfilePic); // Use session image or generated placeholder
            setCurrentCoverPhotoUrl(defaultCoverPhotoUrl); // Use default cover photo
            setResumeExistingUrl('');
            setIsProfileAlreadyComplete(false); // Mark as not complete for initial setup
            setError(null);
          } else {
            const errorData = await res.json();
            throw new Error(errorData.message || `Failed to fetch profile: ${res.statusText}`);
          }
        } else {
          // Profile found (200 OK) - Populate state with fetched data
          const data = await res.json();
          if (data.profile) {
            // If profile already exists and is complete, redirect to dashboard
            if (data.profile.isProfileComplete) {
              router.push('/dashboard');
              return; // Stop further rendering/logic for this page
            }
            // If profile exists but is NOT complete, load data for completion
            setBio(data.profile.bio || '');
            setHeadline(data.profile.headline || '');
            setSkillsInput(Array.isArray(data.profile.skills) ? data.profile.skills.join(', ') : '');
            setEducation(data.profile.education || '');
            setCurrentProfilePictureUrl(data.profile.profilePictureUrl || session?.user?.image || defaultProfilePic);
            setCurrentCoverPhotoUrl(data.profile.coverPhotoUrl || defaultCoverPhotoUrl);
            setResumeExistingUrl(data.profile.resumeUrl || '');
            setIsProfileAlreadyComplete(data.profile.isProfileComplete); // Should be false here
          }
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data. Please try again.');
      } finally {
        setLoadingInitialData(false);
      }
    };

    if (status === 'authenticated') {
      fetchProfileData();
    }
  }, [session, status, router, generateProfilePicturePlaceholder, defaultCoverPhotoUrl]);


  // --- Handlers for File Inputs ---
  const handleProfilePictureChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePictureFile(e.target.files[0]);
      setCurrentProfilePictureUrl(URL.createObjectURL(e.target.files[0]));
    } else {
      // If file selection is cleared, revert to default
      setCurrentProfilePictureUrl(session?.user?.image || generateProfilePicturePlaceholder(session?.user?.name));
      setProfilePictureFile(null);
    }
  };

  const handleCoverPhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCoverPhotoFile(e.target.files[0]);
      setCurrentCoverPhotoUrl(URL.createObjectURL(e.target.files[0]));
    } else {
      // If file selection is cleared, revert to default
      setCurrentCoverPhotoUrl(defaultCoverPhotoUrl);
      setCoverPhotoFile(null);
    }
  };

  const handleResumeChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
      setResumeExistingUrl(''); // Clear existing URL if a new file is chosen
    } else {
      setResumeFile(null);
      // Do not clear resumeExistingUrl here, it means the user just deselected the new file,
      // but the old one still exists if they had one.
      // If you want to remove it entirely, need a separate "Remove Resume" button.
    }
  };

  const handleProfilePictureClick = () => {
    profilePictureInputRef.current?.click();
  };

  const handleCoverPhotoClick = () => {
    coverPhotoInputRef.current?.click();
  };

  // Main profile form submission
  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    setSuccessMessage(null);

    if (!session?.user?.id) {
      setError("You must be logged in to save your profile.");
      setSavingProfile(false);
      return;
    }

    try {
      let newProfilePictureUrl = currentProfilePictureUrl;
      let newCoverPhotoUrl = currentCoverPhotoUrl;
      let newResumeUrl = resumeExistingUrl;

      // 1. Upload new profile picture if selected
      if (profilePictureFile) {
        newProfilePictureUrl = await uploadFile(profilePictureFile, 'profilePicture');
      }

      // 2. Upload new cover photo if selected
      if (coverPhotoFile) {
        newCoverPhotoUrl = await uploadFile(coverPhotoFile, 'coverPhoto');
      }

      // 3. Upload new resume if selected
      if (resumeFile) {
        newResumeUrl = await uploadFile(resumeFile, 'resume');
      }

      // 4. Prepare profile data for backend
      const profileData = {
        bio,
        headline,
        skills: skillsInput.split(',').map(s => s.trim()).filter(s => s.length > 0),
        education,
        profilePictureUrl: newProfilePictureUrl,
        coverPhotoUrl: newCoverPhotoUrl,
        resumeUrl: newResumeUrl,
      };

      // Check if all necessary basic fields are filled to mark profile as complete
      const isBasicProfileComplete = Boolean(
        profileData.bio &&
        profileData.headline &&
        profileData.skills.length > 0 && // Ensure skills are not empty after split/filter
        profileData.education &&
        (profileData.profilePictureUrl && profileData.profilePictureUrl !== generateProfilePicturePlaceholder(session?.user?.name)) // Requires an actual uploaded profile pic, not just placeholder
      );
      profileData.isProfileComplete = isBasicProfileComplete; // Set this flag before sending

      // Send data to backend (POST/PUT based on whether profile exists, backend handles upsert)
      const res = await fetch('/api/edit-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save profile.');
      }

      setSuccessMessage('Profile saved successfully!');

      // If the basic profile is now complete, redirect to dashboard
      if (isBasicProfileComplete) {
        router.push('/dashboard');
      } else {
        // If not complete, stay on page and show a message
        setError('Please fill out all required fields and upload a profile picture to complete your profile.');
      }

    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.message || 'An error occurred while saving your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // --- Loading and Authentication States ---
  if (status === 'loading' || loadingInitialData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="flex items-center space-x-2 text-indigo-600">
          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading profile...
        </div>
      </div>
    );
  }

  // Fallback if not authenticated after initial loading
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-center text-gray-700">Please log in to complete your profile.</div>
      </div>
    );
  }

  // If profile is already complete, we should have redirected in useEffect.
  // This render will only happen if the profile is NOT complete, serving as the signup completion page.
  return (
    <div className="min-h-screen bg-gray-100">
      {/* LinkedIn-style Header for Signup */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          {/* Centered title */}
          <div className="flex items-center justify-center w-full">
            <h1 className="text-xl font-semibold text-gray-900">Complete Your Profile</h1>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586l-1.293-1.293z" clipRule="evenodd" />
            </svg>
            <span className="block">{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {successMessage}
          </div>
        )}
        {/* Profile Header Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
          {/* Cover Photo */}
          <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600 group" onClick={handleCoverPhotoClick}>
            {/* Conditional rendering for image to avoid src="" */}
            {currentCoverPhotoUrl ? (
              <img
                src={currentCoverPhotoUrl}
                alt="Cover"
                className="w-full h-full object-cover"
                onError={(e) => { // Fallback for broken image URLs
                  e.target.onerror = null;
                  e.target.src = defaultCoverPhotoUrl;
                }}
              />
            ) : (
              // Placeholder text when no cover photo is set
              <div className="w-full h-full flex items-center justify-center text-white text-lg font-semibold bg-gray-300 text-gray-700">
                Click to upload cover photo
              </div>
            )}
            {/* Always allow changing cover photo on this signup page */}
            <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center cursor-pointer">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverPhotoChange}
              ref={coverPhotoInputRef}
              className="hidden"
            />
          </div>
          {/* Profile Info */}
          <div className="px-6 pb-6">
            {/* Profile Picture */}
            <div className="relative -mt-16 mb-4">
              <div className="relative w-32 h-32 group" onClick={handleProfilePictureClick}>
                {/* Conditional rendering for image to avoid src="" */}
                {currentProfilePictureUrl ? (
                  <img
                    src={currentProfilePictureUrl}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full border-4 border-white shadow-lg"
                    onError={(e) => { // Fallback for broken image URLs
                      e.target.onerror = null;
                      e.target.src = generateProfilePicturePlaceholder(session?.user?.name);
                    }}
                  />
                ) : (
                  // Fallback for when currentProfilePictureUrl is explicitly empty or null
                  <div className="w-full h-full rounded-full border-4 border-white shadow-lg bg-gray-300 flex items-center justify-center text-gray-700 text-3xl font-bold">
                    {session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}
                  </div>
                )}
                {/* Always allow changing profile picture on this signup page */}
                <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-40 transition-all duration-300 rounded-full flex items-center justify-center cursor-pointer">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  ref={profilePictureInputRef}
                  className="hidden"
                />
              </div>
            </div>
            {/* User Name - Display Only */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">{session?.user?.name || 'New User'}</h1>
              {/* Headline and Bio inputs are now ONLY in the Basic Information section below */}
            </div>
          </div>
        </div>

        {/* Main Profile Submission Form - Contains only basic profile-level data */}
        <form onSubmit={handleSubmitProfile} className="space-y-8">
          {/* Basic Information Section (Always visible and editable for signup) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-1">Headline*</label>
                <input
                  type="text"
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g., Aspiring Software Developer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required // Make headline required
                />
              </div>
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio*</label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows="4"
                  placeholder="Tell us about yourself..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y"
                  required // Make bio required
                />
              </div>
              <div>
                <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)*</label>
                <input
                  type="text"
                  id="skills"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="e.g., React, Node.js, SQL, AWS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required // Make skills required
                />
              </div>
              <div>
                <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">Education*</label>
                <input
                  type="text"
                  id="education"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="e.g., Bachelor of Science, University Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required // Make education required
                />
              </div>
            </div>
          </div>

          {/* Resume Section (Always visible and editable for signup) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resume</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload your resume (PDF only)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleResumeChange}
              className="block w-full text-sm text-gray-900
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-100 file:text-blue-700
                hover:file:bg-blue-200"
            />
            {resumeExistingUrl && (
              <p className="mt-2 text-sm text-gray-600">
                Current Resume: <a href={resumeExistingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate inline-block max-w-xs">{resumeExistingUrl}</a>
              </p>
            )}
            {resumeFile && (
              <p className="mt-2 text-sm text-gray-600">New File Selected: <span className="font-medium">{resumeFile.name}</span></p>
            )}
          </div>

          {/* Save/Cancel Buttons for Basic Profile */}
          <div className="flex justify-end space-x-3 py-4">
            <button
              type="button"
              onClick={() => router.push('/auth/login')} // Redirect to login on cancel
              className="px-6 py-3 text-lg font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={savingProfile}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {savingProfile ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>

        {/* PROFESSIONAL EXPERIENCE SECTION & ADVANCED EDUCATION SECTION - Removed from this signup page */}
        {/* These sections are now intended for a separate, full 'profile editing' page after initial signup. */}
      </div>
    </div>
  );
}
