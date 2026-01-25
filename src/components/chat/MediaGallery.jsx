"use client";

import { useState, useMemo } from "react";

export default function MediaGallery({
  messages = [],
  isOpen,
  onClose,
  onMediaClick,
}) {
  const [activeTab, setActiveTab] = useState("media"); // media, files, links

  // Extract media from messages
  const { images, videos, files, links } = useMemo(() => {
    const images = [];
    const videos = [];
    const files = [];
    const links = [];

    messages.forEach((msg) => {
      // Extract images
      if (msg.type === "image" && msg.mediaUrls?.length) {
        msg.mediaUrls.forEach((url) => {
          images.push({
            url,
            messageId: msg.id,
            sender: msg.sender,
            createdAt: msg.createdAt,
          });
        });
      }

      // Extract videos
      if (msg.type === "video" && msg.mediaUrls?.length) {
        msg.mediaUrls.forEach((url) => {
          videos.push({
            url,
            messageId: msg.id,
            sender: msg.sender,
            createdAt: msg.createdAt,
            thumbnailUrl: msg.thumbnailUrl,
          });
        });
      }

      // Extract files
      if (msg.type === "file" && msg.mediaUrls?.length) {
        files.push({
          url: msg.mediaUrls[0],
          fileName: msg.fileName,
          fileSize: msg.fileSize,
          messageId: msg.id,
          sender: msg.sender,
          createdAt: msg.createdAt,
        });
      }

      // Extract links from text messages
      if (msg.type === "text" && msg.content) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const foundLinks = msg.content.match(urlRegex);
        if (foundLinks) {
          foundLinks.forEach((url) => {
            links.push({
              url,
              messageId: msg.id,
              sender: msg.sender,
              createdAt: msg.createdAt,
              context: msg.content.slice(0, 100),
            });
          });
        }
      }
    });

    return {
      images: images.reverse(),
      videos: videos.reverse(),
      files: files.reverse(),
      links: links.reverse(),
    };
  }, [messages]);

  const allMedia = [...images, ...videos].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            Shared Media
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("media")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "media"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Media ({allMedia.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "files"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Files ({files.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("links")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "links"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Links ({links.length})
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "media" && (
            <div className="grid grid-cols-3 gap-1">
              {allMedia.length === 0 ? (
                <div className="col-span-3 flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">No media shared yet</p>
                </div>
              ) : (
                allMedia.map((item, index) => (
                  <button
                    key={`${item.messageId}-${index}`}
                    onClick={() => onMediaClick?.(item)}
                    className="aspect-square relative group overflow-hidden rounded-md hover:opacity-90 transition-opacity"
                  >
                    {item.thumbnailUrl || item.url?.includes("video") ? (
                      <div className="relative w-full h-full bg-black">
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))
              )}
            </div>
          )}

          {activeTab === "files" && (
            <div className="space-y-2">
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">No files shared yet</p>
                </div>
              ) : (
                files.map((file, index) => (
                  <a
                    key={`${file.messageId}-${index}`}
                    href={file.url}
                    download={file.fileName}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                        {file.fileName || "File"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {file.fileSize ? formatFileSize(file.fileSize) : ""} - {file.sender?.name}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                ))
              )}
            </div>
          )}

          {activeTab === "links" && (
            <div className="space-y-2">
              {links.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <p className="text-sm">No links shared yet</p>
                </div>
              ) : (
                links.map((link, index) => (
                  <a
                    key={`${link.messageId}-${index}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                      {link.url}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Shared by {link.sender?.name} - {new Date(link.createdAt).toLocaleDateString()}
                    </p>
                  </a>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
