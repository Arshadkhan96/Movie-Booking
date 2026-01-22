// Using dynamic import to handle Cloudinary's CommonJS module
export let cloudinary;
export let storage;

export const initCloudinary = async () => {
  try {
    // Dynamically import the Cloudinary package
    const cloudinaryModule = await import('cloudinary');
    cloudinary = cloudinaryModule.v2;
    
    // Configure Cloudinary with your credentials
    cloudinary.config({
      cloud_name: 'movie-booking',
      api_key: '746119142224151',
      api_secret: 'ETCKDbk7b367Use3CgPA3TUEjPQeeU',
      secure: true
    });

    // Dynamically import multer-storage-cloudinary
    const { CloudinaryStorage } = await import('multer-storage-cloudinary');
    
    // Create storage engine for Multer
    storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'movie-booking',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 500, height: 750, crop: 'fill' }],
        resource_type: 'auto'
      },
    });

    return { cloudinary, storage };
  } catch (error) {
    console.error('Error initializing Cloudinary:', error);
    throw error;
  }
};

// Initialize Cloudinary immediately when this module is imported
initCloudinary().catch(console.error);
