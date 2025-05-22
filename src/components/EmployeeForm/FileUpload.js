import { useState, useRef } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
const FileUpload = ({ label, onUpload, employeeId, cropType = 'profile' }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Dimensions in pixels (assuming 300 DPI for print quality)
  const DPI = 300;
  const cropDimensions = {
    profile: {
      width: (30 / 25.4) * DPI,   // 30mm to inches then to pixels
      height: (40 / 25.4) * DPI,   // 40mm to inches then to pixels
      aspect: 3/4
    },
    aadhar: {
      width: 3.3 * DPI,           // 3.3 inches to pixels
      height: 2.1 * DPI,           // 2.1 inches to pixels
      aspect: 3.3/2.1
    }
  };

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (jpeg, png, gif)');
        return;
      }
      setError('');
      const reader = new FileReader();
      reader.addEventListener('load', () => setSrc(reader.result));
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (img) => {
    imgRef.current = img;
    console.log("Crop Type:", cropType); // Add this line
    console.log("Crop Dimensions:", cropDimensions[cropType]); // Add this line
    const { width, height, aspect } = cropDimensions[cropType];
    const initialCropWidth = Math.min(width, img.width);
    const initialCropHeight = Math.min(height, img.height);
  
    const initialCrop = {
      unit: 'px',
      width: initialCropWidth,
      height: initialCropHeight,
      x: (img.width - initialCropWidth) / 2,
      y: (img.height - initialCropHeight) / 2,
      aspect
    };
    console.log("Initial Crop:", initialCrop); // Add this line
    setCrop(initialCrop);
  };

  const getCroppedImg = () => {
    const canvas = previewCanvasRef.current;
    const image = imgRef.current;
    const crop = completedCrop;

    if (!image || !crop || !canvas) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');
    const pixelRatio = window.devicePixelRatio;

    canvas.width = crop.width * pixelRatio;
    canvas.height = crop.height * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );
  };

  const handleUpload = async () => {
    if (!completedCrop || !imgRef.current) {
      setError('Please crop the image first');
      return;
    }

    setUploading(true);
    try {
      previewCanvasRef.current.toBlob(async (blob) => {
        const fileRef = storageRef(
          storage,
          `images/${employeeId}/${cropType}_${Date.now()}.jpg`
        );
        await uploadBytes(fileRef, blob);
        const downloadURL = await getDownloadURL(fileRef);
        onUpload(downloadURL);
        setUploading(false);
        setSrc(null); // Reset after upload
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload image');
      setUploading(false);
    }
  };

  return (
    <div className="file-upload">
      <label>
        {label}
        <input
          type="file"
          onChange={onSelectFile}
          accept="image/*"
          disabled={uploading}
        />
      </label>

      {error && <div className="error">{error}</div>}

      {src && (
        <div className="crop-container">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => {
              setCompletedCrop(c);
              getCroppedImg();
            }}
            aspect={cropDimensions[cropType].aspect}
            minWidth={50}
            minHeight={50}
          >
            <img
              ref={imgRef}
              src={src}
              onLoad={(e) => onImageLoad(e.currentTarget)}
              alt="Crop preview"
              style={{ maxWidth: '100%', maxHeight: '70vh' }}
            />
          </ReactCrop>

          <div className="preview-section">
            <h4>Cropped Preview</h4>
            <canvas
              ref={previewCanvasRef}
              style={{
                width: '100%',
                maxWidth: '300px',
                border: '1px solid #ddd'
              }}
            />
            <p>
              Required size: {cropType === 'profile'
                ? '30mm × 40mm (3:4 ratio)'
                : '3.3" × 2.1" (Aadhar card size)'}
            </p>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="upload-btn"
            >
              {uploading ? 'Uploading...' : 'Upload Cropped Image'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;