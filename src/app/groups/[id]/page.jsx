"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import Navbar from "../../../components/NavBar";
import ConnectifyLogo from "@/components/ConnectifyLogo";
import Sidebar from "../../../components/Sidebar";
import EditGroupModal from "../../../components/EditGroupModal";
import GroupDiscussion from "../../../components/GroupDiscussion";

export default function GroupDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [error, setError] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [memberActionId, setMemberActionId] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (groupId) {
      fetchGroup();
    }
  }, [status, router, groupId]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-manage-menu]')) {
        setShowManageMenu(false);
      }
      if (!e.target.closest('[data-member-menu]')) {
        setMemberActionId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch requests when switching to requests tab
  useEffect(() => {
    if (activeTab === "requests" && group?.isAdmin) {
      fetchJoinRequests();
    }
  }, [activeTab, group?.isAdmin]);


  const fetchGroup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      if (!res.ok) {
        console.error("API Error:", res.status, data);
        if (res.status === 404) {
          setError("Group not found");
        } else if (res.status === 401) {
          setError("Please log in to view this group");
        } else {
          setError(data.message || "Failed to load group");
        }
        return;
      }
      setGroup(data.group);
    } catch (err) {
      console.error("Error fetching group:", err);
      setError("Failed to load group: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchJoinRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/requests`);
      if (res.ok) {
        const data = await res.json();
        setJoinRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Error fetching join requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleJoinGroup = async () => {
    setIsJoining(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requestPending) {
          alert(data.message || "Join request submitted!");
        }
        fetchGroup();
      } else {
        alert(data.message || "Failed to join group");
      }
    } catch (err) {
      console.error("Error joining group:", err);
      alert("Failed to join group");
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;

    setIsLeaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/groups");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to leave group");
      }
    } catch (err) {
      console.error("Error leaving group:", err);
      alert("Failed to leave group");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleUpdateGroup = async (updatedData) => {
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to update group");
    }
    await fetchGroup();
  };

  const handleDeleteGroup = async () => {
    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/groups");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete group");
      }
    } catch (err) {
      console.error("Error deleting group:", err);
      alert("Failed to delete group");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this group?`)) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchGroup();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to remove member");
      }
    } catch (err) {
      console.error("Error removing member:", err);
      alert("Failed to remove member");
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        fetchGroup();
        setMemberActionId(null);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to change role");
      }
    } catch (err) {
      console.error("Error changing role:", err);
      alert("Failed to change role");
    }
  };

  const handleJoinRequest = async (requestId, action) => {
    setProcessingRequestId(requestId);
    try {
      const res = await fetch(`/api/groups/${groupId}/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        // Remove from list and refresh
        setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
        if (action === "approve") {
          fetchGroup(); // Refresh to update member count
        }
      } else {
        const data = await res.json();
        alert(data.message || `Failed to ${action} request`);
      }
    } catch (err) {
      console.error(`Error ${action}ing request:`, err);
      alert(`Failed to ${action} request`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
        <div className="flex flex-col items-center space-y-4">
          <ConnectifyLogo width={350} height={350} className="animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f0f2f5] dark:bg-slate-900">
        <Navbar session={session} router={router} />
        <main className="flex-1 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-3xl text-red-500"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {error}
            </h3>
            <p className="text-gray-500 dark:text-slate-400 mb-4">
              The group you're looking for might have been removed or you don't have access to it.
            </p>
            <button
              onClick={() => router.push("/groups")}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Back to Groups
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!group) return null;

  const isPrivateAndNotMember = group.isPrivate && !group.isMember;
  const currentUserId = session?.user?.id;
  const canManageRequests = group.isAdmin || group.isModerator;

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5] dark:bg-slate-900">
      <Navbar session={session} router={router} />
      <main className="flex-1">
        <div className="max-w-[1920px] mx-auto flex justify-between px-0 sm:px-4 lg:px-6 py-6 gap-6">
          {/* Left Sidebar */}
          <div className="hidden lg:block w-[280px] xl:w-[320px] flex-shrink-0">
            <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide">
              <Sidebar user={session?.user} />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-[900px] mx-auto w-full min-w-0 px-4 sm:px-0">
            {/* Cover Image & Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm mb-6">
              <div className="h-48 sm:h-64 bg-gray-200 dark:bg-slate-700 relative rounded-t-xl overflow-hidden">
                {group.coverImage ? (
                  <img
                    src={group.coverImage}
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-400 to-indigo-500">
                    <i className="fas fa-users text-6xl text-white/30"></i>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {group.name}
                    </h1>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <i className={`fas fa-${group.privacy === "Private" ? "lock" : "globe"}`}></i>
                        {group.privacy} Group
                      </span>
                      <span>·</span>
                      <span>{group.memberCount?.toLocaleString()} members</span>
                      {group.postCount !== undefined && (
                        <>
                          <span>·</span>
                          <span>{group.postCount} posts</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {group.isMember ? (
                      <>
                        {group.isAdmin && (
                          <div className="relative" data-manage-menu>
                            <button
                              onClick={() => setShowManageMenu(!showManageMenu)}
                              className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                            >
                              <i className="fas fa-cog"></i>
                              Manage
                              <i className="fas fa-chevron-down text-xs"></i>
                            </button>
                            {showManageMenu && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-10">
                                <button
                                  onClick={() => {
                                    setIsEditModalOpen(true);
                                    setShowManageMenu(false);
                                  }}
                                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <i className="fas fa-edit w-4"></i>
                                  Edit Group
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveTab("members");
                                    setShowManageMenu(false);
                                  }}
                                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <i className="fas fa-users-cog w-4"></i>
                                  Manage Members
                                </button>
                                {group.privacy === "Private" && (
                                  <button
                                    onClick={() => {
                                      setActiveTab("requests");
                                      setShowManageMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <i className="fas fa-user-plus w-4"></i>
                                    Join Requests
                                    {group.pendingRequestCount > 0 && (
                                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                        {group.pendingRequestCount}
                                      </span>
                                    )}
                                  </button>
                                )}
                                <hr className="my-1 border-gray-200 dark:border-slate-700" />
                                <button
                                  onClick={() => {
                                    handleDeleteGroup();
                                    setShowManageMenu(false);
                                  }}
                                  disabled={isDeleting}
                                  className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                >
                                  <i className="fas fa-trash w-4"></i>
                                  {isDeleting ? "Deleting..." : "Delete Group"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          onClick={handleLeaveGroup}
                          disabled={isLeaving}
                          className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                        >
                          {isLeaving ? "Leaving..." : "Leave Group"}
                        </button>
                      </>
                    ) : group.hasRequestPending ? (
                      <button
                        disabled
                        className="px-5 py-2 bg-gray-300 dark:bg-slate-600 text-gray-600 dark:text-slate-400 font-semibold rounded-lg cursor-not-allowed"
                      >
                        <i className="fas fa-clock mr-2"></i>
                        Request Pending
                      </button>
                    ) : (
                      <button
                        onClick={handleJoinGroup}
                        disabled={isJoining}
                        className={`px-5 py-2 font-semibold rounded-lg transition-colors ${isJoining
                          ? "bg-blue-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                          } text-white`}
                      >
                        {isJoining ? "Joining..." : group.privacy === "Private" ? "Request to Join" : "Join Group"}
                      </button>
                    )}
                  </div>
                </div>

                {group.description && (
                  <p className="mt-4 text-gray-600 dark:text-slate-400">
                    {group.description}
                  </p>
                )}

                {/* Creator info */}
                {group.creator && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                    <span>Created by</span>
                    <img
                      src={group.creator.image || "/default-avatar.png"}
                      alt={group.creator.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="font-medium text-gray-700 dark:text-slate-300">
                      {group.creator.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {isPrivateAndNotMember ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                  <i className="fas fa-lock text-3xl text-gray-400 dark:text-slate-500"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  This is a Private Group
                </h3>
                <p className="text-gray-500 dark:text-slate-400">
                  {group.hasRequestPending
                    ? "Your request to join is pending approval."
                    : "Request to join this group to see posts and members."}
                </p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                  <button
                    onClick={() => setActiveTab("posts")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "posts"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      }`}
                  >
                    Discussions
                  </button>
                  <button
                    onClick={() => setActiveTab("members")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "members"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      }`}
                  >
                    Members ({group.memberCount})
                  </button>
                  {canManageRequests && group.privacy === "Private" && (
                    <button
                      onClick={() => setActiveTab("requests")}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === "requests"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                        }`}
                    >
                      Requests
                      {group.pendingRequestCount > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "requests"
                          ? "bg-white text-blue-600"
                          : "bg-red-500 text-white"
                          }`}>
                          {group.pendingRequestCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {activeTab === "posts" && (
                  <GroupDiscussion groupId={groupId} groupName={group.name} />
                )}

                {activeTab === "members" && group.members && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                    <div className="space-y-4">
                      {group.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={member.image || "/default-avatar.png"}
                              alt={member.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {member.name}
                                {member.userId === currentUserId && (
                                  <span className="ml-2 text-xs text-gray-500 dark:text-slate-400">(You)</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-slate-400">
                                {member.role === "ADMIN" ? (
                                  <span className="text-blue-600 dark:text-blue-400">Admin</span>
                                ) : member.role === "MODERATOR" ? (
                                  <span className="text-green-600 dark:text-green-400">Moderator</span>
                                ) : (
                                  "Member"
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Admin actions for other members */}
                          {group.isAdmin && member.userId !== currentUserId && (
                            <div className="relative" data-member-menu>
                              <button
                                onClick={() => setMemberActionId(memberActionId === member.id ? null : member.id)}
                                className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                <i className="fas fa-ellipsis-h"></i>
                              </button>

                              {memberActionId === member.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-10">
                                  {member.role !== "ADMIN" && (
                                    <button
                                      onClick={() => handleChangeRole(member.id, "ADMIN")}
                                      className="w-full px-4 py-2 text-left text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                    >
                                      <i className="fas fa-user-shield w-4 text-blue-500"></i>
                                      Make Admin
                                    </button>
                                  )}
                                  {member.role !== "MODERATOR" && (
                                    <button
                                      onClick={() => handleChangeRole(member.id, "MODERATOR")}
                                      className="w-full px-4 py-2 text-left text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                    >
                                      <i className="fas fa-user-check w-4 text-green-500"></i>
                                      Make Moderator
                                    </button>
                                  )}
                                  {member.role !== "MEMBER" && (
                                    <button
                                      onClick={() => handleChangeRole(member.id, "MEMBER")}
                                      className="w-full px-4 py-2 text-left text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                    >
                                      <i className="fas fa-user w-4 text-gray-500 dark:text-slate-400"></i>
                                      Make Member
                                    </button>
                                  )}
                                  <hr className="my-1 border-gray-200 dark:border-slate-700" />
                                  <button
                                    onClick={() => handleRemoveMember(member.id, member.name)}
                                    className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                  >
                                    <i className="fas fa-user-times w-4"></i>
                                    Remove from Group
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "requests" && canManageRequests && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                    {loadingRequests ? (
                      <div className="text-center py-8">
                        <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                        <p className="mt-2 text-gray-500 dark:text-slate-400">Loading requests...</p>
                      </div>
                    ) : joinRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <i className="fas fa-user-check text-2xl text-gray-400 dark:text-slate-500"></i>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                          No Pending Requests
                        </h3>
                        <p className="text-gray-500 dark:text-slate-400">
                          There are no pending join requests for this group.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {joinRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={request.userImage || "/default-avatar.png"}
                                alt={request.userName}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {request.userName}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-slate-400">
                                  Requested {new Date(request.createdAt).toLocaleDateString()}
                                </p>
                                {request.message && (
                                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-1 italic">
                                    "{request.message}"
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleJoinRequest(request.id, "approve")}
                                disabled={processingRequestId === request.id}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                {processingRequestId === request.id ? (
                                  <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                  "Approve"
                                )}
                              </button>
                              <button
                                onClick={() => handleJoinRequest(request.id, "decline")}
                                disabled={processingRequestId === request.id}
                                className="px-4 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-700 dark:text-slate-200 font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar placeholder */}
          <div className="hidden xl:block w-[280px] flex-shrink-0" />
        </div>
      </main>

      {/* Edit Group Modal */}
      <EditGroupModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleUpdateGroup}
        group={group}
      />
    </div>
  );
}
