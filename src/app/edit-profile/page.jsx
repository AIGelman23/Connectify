"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import Navbar from "@/components/NavBar";
import EditProfileHeader from "@/components/profile/EditProfileHeader";
import EditProfileAbout from "@/components/profile/EditProfileAbout";
import EditProfileExperience from "@/components/profile/EditProfileExperience";
import EditProfileEducation from "@/components/profile/EditProfileEducation";
import EditProfileSkills from "@/components/profile/EditProfileSkills";
import ExperienceModal from "@/components/profile/ExperienceModal";
import EducationModal from "@/components/profile/EducationModal";
import ConnectifyLogo from "@/components/ConnectifyLogo";
import { Button } from "@/components/ui";
import Cropper from "react-easy-crop";

// Constants
const MAX_HEADLINE_LENGTH = 120;
const MAX_SUMMARY_LENGTH = 2000;
const MAX_LOCATION_LENGTH = 100;
const MAX_SKILL_LENGTH = 50;

// Helper function to create cropped image
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/jpeg", 0.95);
  });
};

export default function EditProfilePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropType, setCropType] = useState(null); // 'profilePicture' or 'coverPhoto'
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [profileState, setProfileState] = useState({
    name: "",
    email: "",
    headline: "",
    summary: "",
    location: "",
    profilePicture: "",
    coverPhoto: "",
    resume: "",
    isProfileComplete: false,
    experience: [],
    education: [],
    skills: [],
  });

  const [formErrors, setFormErrors] = useState({});
  const [pendingFiles, setPendingFiles] = useState({
    profilePicture: null,
    coverPhoto: null,
  });

  // Experience modal state
  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);

  // Education modal state
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState(null);

  // Skills state
  const [skillInput, setSkillInput] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (status !== "authenticated") return;

      try {
        setLoading(true);
        const res = await fetch("/api/edit-profile");

        if (!res.ok) {
          if (res.status === 404) {
            // No profile yet, use defaults
            setProfileState((prev) => ({
              ...prev,
              name: session?.user?.name || "",
              email: session?.user?.email || "",
            }));
            setLoading(false);
            return;
          }
          throw new Error("Failed to fetch profile");
        }

        const data = await res.json();
        const profile = data.profile;

        setProfileState({
          name: profile.name || session?.user?.name || "",
          email: profile.email || session?.user?.email || "",
          headline: profile.headline || "",
          summary: profile.bio || "",
          location: profile.location || "",
          profilePicture: profile.profilePictureUrl || "",
          coverPhoto: profile.coverPhotoUrl || "",
          resume: profile.resumeUrl || "",
          isProfileComplete: profile.isProfileComplete || false,
          experience: profile.experiences || [],
          education: profile.education || [],
          skills: profile.skills || [],
        });
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [status, session]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setFormErrors((prev) => ({
        ...prev,
        [type]: "Please upload a valid image (JPEG, PNG, or WebP)",
      }));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        [type]: "Image must be less than 5MB",
      }));
      return;
    }

    // Clear any previous errors
    setFormErrors((prev) => ({ ...prev, [type]: null }));

    // Create object URL for cropper
    const imageUrl = URL.createObjectURL(file);
    
    // For profile picture, show cropper
    if (type === "profilePicture") {
      setCropImage(imageUrl);
      setCropType(type);
      setShowCropper(true);
      // Store original file temporarily
      setPendingFiles((prev) => ({ ...prev, [type]: file }));
    } else {
      // For cover photo, upload directly (or you can add cropper for it too)
      setCropImage(imageUrl);
      setCropType(type);
      setShowCropper(true);
      setPendingFiles((prev) => ({ ...prev, [type]: file }));
    }
  };

  const handleCropSave = async () => {
    try {
      if (!croppedAreaPixels || !cropImage) return;

      const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], `${cropType}.jpg`, {
        type: "image/jpeg",
      });

      // Upload the cropped image
      const formData = new FormData();
      formData.append("file", croppedFile);
      formData.append("type", cropType);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image");
      }

      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.url;

      // Update profile state
      if (cropType === "profilePicture") {
        setProfileState((prev) => ({ ...prev, profilePicture: imageUrl }));
      } else if (cropType === "coverPhoto") {
        setProfileState((prev) => ({ ...prev, coverPhoto: imageUrl }));
      }

      // Close cropper
      setShowCropper(false);
      setCropImage(null);
      setCropType(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (err) {
      console.error("Error cropping image:", err);
      setFormErrors((prev) => ({
        ...prev,
        [cropType]: "Failed to process image",
      }));
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropImage(null);
    setCropType(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleRemoveProfilePicture = () => {
    setProfileState((prev) => ({ ...prev, profilePicture: "" }));
    setPendingFiles((prev) => ({ ...prev, profilePicture: null }));
  };

  const handleRemoveCoverPhoto = () => {
    setProfileState((prev) => ({ ...prev, coverPhoto: "" }));
    setPendingFiles((prev) => ({ ...prev, coverPhoto: null }));
  };

  const handleProfileChange = (field, value) => {
    setProfileState((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Handler for input onChange events (used by EditProfileAbout)
  const handleChange = (e) => {
    const { name, value } = e.target;
    handleProfileChange(name, value);
  };

  // Experience handlers
  const openExperienceModal = (experience = null) => {
    setEditingExperience(experience);
    setIsExperienceModalOpen(true);
  };

  const closeExperienceModal = () => {
    setIsExperienceModalOpen(false);
    setEditingExperience(null);
  };

  const handleSaveExperience = (experienceData) => {
    setProfileState((prev) => {
      const experiences = [...prev.experience];
      if (experienceData.id) {
        // Edit existing
        const index = experiences.findIndex((e) => e.id === experienceData.id);
        if (index !== -1) {
          experiences[index] = experienceData;
        }
      } else {
        // Add new
        experiences.push({ ...experienceData, id: uuidv4() });
      }
      return { ...prev, experience: experiences };
    });
    closeExperienceModal();
  };

  const handleDeleteExperience = (id) => {
    setProfileState((prev) => ({
      ...prev,
      experience: prev.experience.filter((e) => e.id !== id),
    }));
  };

  // Education handlers
  const openEducationModal = (education = null) => {
    setEditingEducation(education);
    setIsEducationModalOpen(true);
  };

  const closeEducationModal = () => {
    setIsEducationModalOpen(false);
    setEditingEducation(null);
  };

  const handleSaveEducation = (educationData) => {
    setProfileState((prev) => {
      const educationList = [...prev.education];
      if (educationData.id) {
        // Edit existing
        const index = educationList.findIndex((e) => e.id === educationData.id);
        if (index !== -1) {
          educationList[index] = educationData;
        }
      } else {
        // Add new
        educationList.push({ ...educationData, id: uuidv4() });
      }
      return { ...prev, education: educationList };
    });
    closeEducationModal();
  };

  const handleDeleteEducation = (id) => {
    setProfileState((prev) => ({
      ...prev,
      education: prev.education.filter((e) => e.id !== id),
    }));
  };

  // Skill handlers
  const handleAddSkill = (skillName) => {
    const trimmedSkill = skillName.trim();
    if (!trimmedSkill) return;
    if (trimmedSkill.length > MAX_SKILL_LENGTH) {
      setFormErrors((prev) => ({
        ...prev,
        skillInput: `Skill cannot exceed ${MAX_SKILL_LENGTH} characters.`,
      }));
      return;
    }
    // Check for duplicates
    const isDuplicate = profileState.skills.some(
      (s) => s.name.toLowerCase() === trimmedSkill.toLowerCase()
    );
    if (isDuplicate) {
      setFormErrors((prev) => ({
        ...prev,
        skillInput: "This skill already exists.",
      }));
      return;
    }
    setProfileState((prev) => ({
      ...prev,
      skills: [...prev.skills, { id: uuidv4(), name: trimmedSkill }],
    }));
    setSkillInput("");
    setFormErrors((prev) => ({ ...prev, skillInput: null }));
  };

  const handleDeleteSkill = (id) => {
    setProfileState((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s.id !== id),
    }));
  };

  const handleUpdateSkill = (skill, newName) => {
    setProfileState((prev) => ({
      ...prev,
      skills: prev.skills.map((s) =>
        s.id === skill.id ? { ...s, name: newName } : s
      ),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append("name", profileState.name);
      formData.append("headline", profileState.headline);
      formData.append("bio", profileState.summary);
      formData.append("location", profileState.location);
      formData.append("profilePictureUrl", profileState.profilePicture);
      formData.append("coverPhotoUrl", profileState.coverPhoto);
      formData.append("resumeUrl", profileState.resume);
      formData.append("isProfileComplete", "true");
      formData.append("skills", JSON.stringify(profileState.skills));
      formData.append("experiences", JSON.stringify(profileState.experience));
      formData.append("education", JSON.stringify(profileState.education));

      const res = await fetch("/api/edit-profile", {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save profile");
      }

      // Update the NextAuth session with the new profile picture and name
      // This will trigger the jwt callback with trigger="update"
      await update({
        user: {
          name: profileState.name,
          image: profileState.profilePicture,
        },
      });

      setSuccessMessage("Profile saved successfully!");
      
      // Redirect back to profile after short delay
      setTimeout(() => {
        router.push(`/profile/${session?.user?.id}`);
      }, 1500);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <ConnectifyLogo width={350} height={350} className="animate-pulse" />
      </div>
    );
  }

  if (error && !profileState.name) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="p-8 rounded-lg shadow-md bg-white dark:bg-slate-800 max-w-md">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
            Error
          </h2>
          <p className="text-gray-700 dark:text-slate-300">{error}</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-6">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans antialiased text-gray-900 dark:text-slate-100 bg-gray-100 dark:bg-slate-900">
      <Navbar session={session} router={router} />
      
      {/* Image Cropper Modal */}
      {showCropper && cropImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Crop {cropType === "profilePicture" ? "Profile Picture" : "Cover Photo"}
            </h3>
            
            <div className="relative w-full h-80 bg-gray-900 rounded-lg overflow-hidden">
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={cropType === "profilePicture" ? 1 : 16 / 9}
                cropShape={cropType === "profilePicture" ? "round" : "rect"}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Zoom
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleCropCancel}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCropSave}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400">
            <i className="fas fa-check-circle mr-2"></i>
            {successMessage}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        <EditProfileHeader
          currentProfileState={{
            name: profileState.name,
            headline: profileState.headline,
            location: profileState.location,
            profilePicture: profileState.profilePicture,
            coverPhoto: profileState.coverPhoto,
          }}
          viewMode="edit"
          handleFileChange={handleFileChange}
          handleRemoveProfilePicture={handleRemoveProfilePicture}
          handleRemoveCoverPhoto={handleRemoveCoverPhoto}
          enterEditMode={() => {}}
          isOwnProfile={true}
        />

        <EditProfileAbout
          currentProfileState={profileState}
          handleChange={handleChange}
          formErrors={formErrors}
          MAX_HEADLINE_LENGTH={MAX_HEADLINE_LENGTH}
          MAX_SUMMARY_LENGTH={MAX_SUMMARY_LENGTH}
          MAX_LOCATION_LENGTH={MAX_LOCATION_LENGTH}
          isEditable={true}
        />

        <EditProfileExperience
          currentProfileState={profileState}
          openExperienceModal={openExperienceModal}
          handleDeleteExperience={handleDeleteExperience}
          formErrors={formErrors}
          isEditable={true}
        />

        <EditProfileEducation
          currentProfileState={profileState}
          openEducationModal={openEducationModal}
          handleDeleteEducation={handleDeleteEducation}
          formErrors={formErrors}
          isEditable={true}
          isEducationModalOpen={isEducationModalOpen}
          closeEducationModal={closeEducationModal}
          handleSaveEducation={handleSaveEducation}
          editingEducation={editingEducation}
        />

        <EditProfileSkills
          currentProfileState={profileState}
          skillInput={skillInput}
          setSkillInput={setSkillInput}
          handleAddSkill={handleAddSkill}
          handleDeleteSkill={handleDeleteSkill}
          handleUpdateSkill={handleUpdateSkill}
          formErrors={formErrors}
          MAX_SKILL_LENGTH={MAX_SKILL_LENGTH}
          isEditable={true}
        />

        {/* Experience Modal */}
        {isExperienceModalOpen && (
          <ExperienceModal
            isOpen={isExperienceModalOpen}
            onClose={closeExperienceModal}
            onSave={handleSaveExperience}
            experienceToEdit={editingExperience}
          />
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-4 pt-4 pb-8">
          <Button
            variant="outline"
            onClick={() => router.push(`/profile/${session?.user?.id}`)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Save Profile
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
