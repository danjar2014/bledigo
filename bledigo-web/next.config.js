/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'bledigo-media.s3.eu-west-3.amazonaws.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

module.exports = nextConfig;
