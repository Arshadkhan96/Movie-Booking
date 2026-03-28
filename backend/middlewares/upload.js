import { upload } from '../config/cloudinary.js';

// Export the single file upload middleware for poster
export const uploadPoster = upload.single('poster');

// Export the upload instance for other uses if needed
export { upload };

export default upload;
