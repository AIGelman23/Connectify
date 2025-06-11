"use client";

import React from "react";
import { useSession } from "next-auth/react";

export default function CreatePostCard({ onCreatePost }) {
  const { data: session } = useSession();

  return (
    <div className="bg-gray-50 rounded-lg shadow-md p-4 mb-6 border border-gray-300">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Create Post</h3>
      <div className="flex items-center space-x-3 mb-4">
        <img
          src={
            session?.user?.image ||
            `https://placehold.co/40x40/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'
            }`
          }
          alt="Your avatar"
          className="w-10 h-10 rounded-full object-cover border border-gray-200"
        />
        <textarea
          placeholder="What's on your mind?"
          rows="3"
          className="flex-1 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 placeholder-gray-500 resize-y min-h-[60px]"
          onFocus={onCreatePost}
          readOnly
        ></textarea>
      </div>
      <div className="flex justify-end space-x-3 border-t border-gray-100 pt-3">
        <button
          type="button"
          className="flex items-center space-x-2 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-full transition duration-150"
        >
          <i className="fas fa-image"></i>
          <span>Photo</span>
        </button>
        <button
          type="button"
          className="flex items-center space-x-2 text-green-600 hover:bg-green-50 px-4 py-2 rounded-full transition duration-150"
        >
          <i className="fas fa-video"></i>
          <span>Video</span>
        </button>
        <button className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
          Post
        </button>
      </div>
    </div>
  );
}
