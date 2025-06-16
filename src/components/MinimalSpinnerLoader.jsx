import React from 'react';

// This component represents a single "skeleton" post
const SkeletonPost = () => (
	<div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white shadow-sm animate-pulse">
		<div className="flex items-center mb-4">
			<div className="h-10 w-10 rounded-full bg-gray-200"></div> {/* Avatar placeholder */}
			<div className="ml-3">
				<div className="h-4 w-32 bg-gray-200 rounded"></div> {/* Name placeholder */}
				<div className="h-3 w-20 bg-gray-200 rounded mt-2"></div> {/* Time/meta placeholder */}
			</div>
		</div>
		<div className="h-4 w-full bg-gray-200 rounded mb-2"></div> {/* Content line 1 */}
		<div className="h-4 w-5/6 bg-gray-200 rounded mb-2"></div> {/* Content line 2 */}
		<div className="h-4 w-4/6 bg-gray-200 rounded"></div> {/* Content line 3 */}
	</div>
);

// Corrected SkeletonLoader to accept loaderRef as a prop
const SkeletonLoader = ({ isFetchingNextPage, loaderRef }) => {
	return (
		<div ref={loaderRef} className="py-4 px-4">
			{isFetchingNextPage ? (
				<>
					<SkeletonPost />
					<SkeletonPost />
					<SkeletonPost />
				</>
			) : (
				<div className="text-gray-400 text-sm text-center">SCROLL ME TO LOAD MORE (DEBUG MODE)!</div>
			)}
		</div>
	);
};

export default SkeletonLoader;