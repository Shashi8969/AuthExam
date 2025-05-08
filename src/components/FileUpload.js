import { useState } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

const FileUpload = ({ label, onUpload, employeeId }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');

  // Validate file size (20KB-100KB)
  const validateFile = (file) => {
    const minSize = 20 * 1024; // 20KB
    const maxSize = 100 * 1024; // 100KB
    
    if (file.size < minSize) {
      setError(`Image too small (minimum ${minSize/1024}KB)`);
      return false;
    }
    
    if (file.size > maxSize) {
      setError(`Image too large (maximum ${maxSize/1024}KB). Compressing...`);
      return true; // We'll compress it
    }
    
    return true;
  };

  // Compress image while maintaining quality
  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Show preview of compressed image
          setPreview(canvas.toDataURL('image/jpeg', 0.7));

          // Convert to blob with quality adjustment
          canvas.toBlob((blob) => {
            // Verify compressed size meets requirements
            if (blob.size > 100 * 1024) {
              // If still too large, reduce quality further
              canvas.toBlob((smallerBlob) => {
                resolve(smallerBlob);
              }, 'image/jpeg', 0.5);
            } else {
              resolve(blob);
            }
          }, 'image/jpeg', 0.7);
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setPreview('');
    
    if (!file.type.match('image.*')) {
      setError('Please select an image file');
      return;
    }

    if (!validateFile(file)) {
      return;
    }

    setUploading(true);
    try {
      let fileToUpload = file;
      
      // Compress if over 100KB or if we want to optimize all images
      if (file.size > 100 * 1024) {
        fileToUpload = await compressImage(file);
      } else {
        // Create preview for smaller images too
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);
      }

      // Check final size
      if (fileToUpload.size < 20 * 1024) {
        setError('After compression, image is too small (minimum 20KB)');
        return;
      }

      const fileRef = storageRef(storage, `images/${employeeId}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, fileToUpload);
      const downloadURL = await getDownloadURL(fileRef);
      onUpload(downloadURL);
    } catch (error) {
      console.error("Upload error:", error);
      setError("Failed to process image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload">
      <label>
        {label}
        <input 
          type="file" 
          onChange={handleFileChange} 
          disabled={uploading}
          accept="image/*"
        />
        {uploading && <span>Processing image...</span>}
        {error && <div className="error" style={{color: 'red'}}>{error}</div>}
      </label>
      
      {preview && (
        <div className="preview-container" style={{marginTop: '10px'}}>
          <p>Preview (compressed):</p>
          <img 
            src={preview} 
            alt="Preview" 
            style={{maxWidth: '200px', maxHeight: '200px', border: '1px solid #ddd'}}
          />
        </div>
      )}
    </div>
  );
};

export default FileUpload;