const nextConfig = {
  // Log any redirects that happen
  redirects() {
    console.log("Checking redirects configuration");
    // Return your existing redirects if any
    return [];
  },

  // Add rewrites to support both the original and new routes
  async rewrites() {
    return [
      {
        source: "/auth/forgot-password",
        destination: "/forgot-password",
      },
    ];
  },
};

module.exports = nextConfig;
