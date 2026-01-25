import Link from 'next/link';

export default function GroupCard({ group, isMember, onJoin, isJoining }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col h-full transition-transform hover:-translate-y-1 duration-200">
      <div className="h-32 bg-gray-200 dark:bg-slate-700 relative">
        {group.coverImage ? (
          <img src={group.coverImage} alt={group.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-400 to-indigo-500">
            <i className="fas fa-users text-4xl text-white/50"></i>
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 line-clamp-1">{group.name}</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">{group.memberCount.toLocaleString()} members · {group.privacy || 'Public'}</p>

        <div className="mt-auto">
          {isMember ? (
            <Link
              href={`/groups/${group.id}`}
              className="block w-full py-2 text-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              View Group
            </Link>
          ) : (
            <button
              onClick={() => onJoin(group.id)}
              disabled={isJoining}
              className={`block w-full py-2 text-center text-white font-semibold rounded-lg transition-colors ${isJoining ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isJoining ? 'Joining...' : 'Join Group'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}