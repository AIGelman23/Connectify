"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Navbar from '../../components/NavBar';
import ConnectifyLogo from "@/components/ConnectifyLogo";
import Sidebar from "../../components/Sidebar";
import GroupCard from "../../components/GroupCard";
import CreateGroupModal from "../../components/CreateGroupModal";
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';

export default function GroupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState(null);
  const [activeTab, setActiveTab] = useState('discover');

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    fetchGroups();
  }, [status, router]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        setMyGroups(data.myGroups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (groupData) => {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupData),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to create group');
    }

    await fetchGroups();
  };

  const handleJoinGroup = async (groupId) => {
    setJoiningGroupId(groupId);
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchGroups();
      }
    } catch (error) {
      console.error('Error joining group:', error);
    } finally {
      setJoiningGroupId(null);
    }
  };

  const isMember = (groupId) => {
    return myGroups.some(g => g.id === groupId);
  };

  if (status === "loading" || (loading && groups.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
        <div className="flex flex-col items-center space-y-4">
          <ConnectifyLogo width={350} height={350} className="animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5] dark:bg-slate-900">
      <Navbar session={session} router={router} />
      <main className="flex-1">
        <div className="max-w-[1920px] mx-auto flex justify-between px-0 sm:px-4 lg:px-6 py-6 gap-6">

          {/* Left Sidebar (Navigation) - Desktop Only */}
          <div className="hidden lg:block w-[280px] xl:w-[320px] flex-shrink-0">
            <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide">
              <Sidebar user={session?.user} />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 max-w-[900px] mx-auto w-full min-w-0 px-4 sm:px-0">
            {/* Page Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Groups</h1>
                  <p className="text-gray-600 dark:text-slate-400">
                    Connect with communities that share your interests
                  </p>
                </div>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Create Group
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="discover">Discover</TabsTrigger>
                <TabsTrigger value="my-groups">My Groups ({myGroups.length})</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Groups Grid */}
            {activeTab === 'discover' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.length > 0 ? (
                  groups.map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      isMember={isMember(group.id)}
                      onJoin={handleJoinGroup}
                      isJoining={joiningGroupId === group.id}
                    />
                  ))
                ) : (
                  <div className="col-span-full bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                      <i className="fas fa-users text-3xl text-gray-400 dark:text-slate-500"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Groups Yet
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 mb-4">
                      Be the first to create a group and start building your community!
                    </p>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                      Create First Group
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'my-groups' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myGroups.length > 0 ? (
                  myGroups.map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      isMember={true}
                      onJoin={handleJoinGroup}
                      isJoining={false}
                    />
                  ))
                ) : (
                  <div className="col-span-full bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                      <i className="fas fa-user-friends text-3xl text-gray-400 dark:text-slate-500"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      You haven't joined any groups
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 mb-4">
                      Discover groups to connect with like-minded people.
                    </p>
                    <Button onClick={() => setActiveTab('discover')}>
                      Discover Groups
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar placeholder for balance */}
          <div className="hidden xl:block w-[280px] flex-shrink-0" />
        </div>
      </main>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateGroup}
      />
    </div>
  );
}
