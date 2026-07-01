import 'react-image-crop/dist/ReactCrop.css';

import type { Crop, PixelCrop } from 'react-image-crop';

import ReactCrop from 'react-image-crop';
import React, { useRef, useState, useCallback } from 'react';

import { Close, RotateLeft, RotateRight, Crop as CropIcon } from '@mui/icons-material';
import { Box ,
  Dialog,
  Button,
  Slider,
  IconButton,
  Typography,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material';

interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (croppedImageFile: File) => void;
  fileName: string;
  isUploading?: boolean;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  open,
  onClose,
  imageUrl,
  onSave,
  fileName,
  isUploading = false,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const crop: Crop = {
      unit: '%',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    };
    setCrop(crop);
  }, []);

  const handleRotateLeft = () => {
    setRotation((prev) => prev - 90);
  };

  const handleRotateRight = () => {
    setRotation((prev) => prev + 90);
  };

  const handleRotationChange = (event: Event, newValue: number | number[]) => {
    setRotation(newValue as number);
  };

const getCroppedImg = useCallback(
  // eslint-disable-next-line @typescript-eslint/no-shadow
  async (image: HTMLImageElement, crop: PixelCrop, rotation: number): Promise<File> => {
    const canvas = canvasRef.current;
    if (!canvas || !crop) {
      throw new Error('Canvas or crop not available');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Calculate proper scaling
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to match the cropped area
    canvas.width = Math.floor(crop.width * scaleX);
    canvas.height = Math.floor(crop.height * scaleY);

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set high quality
    ctx.imageSmoothingQuality = 'high';

    // Calculate crop coordinates
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    // Calculate rotation
    const TO_RADIANS = Math.PI / 180;
    const rotateRads = rotation * TO_RADIANS;

    // Save the canvas state
    ctx.save();
    
    // Move to the center of the canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Rotate around the center
    ctx.rotate(rotateRads);
    
    // Draw the image centered and cropped
    ctx.drawImage(
      image,
      cropX, // source x
      cropY, // source y
      cropWidth, // source width
      cropHeight, // source height
      -canvas.width / 2, // destination x (centered)
      -canvas.height / 2, // destination y (centered)
      canvas.width, // destination width
      canvas.height // destination height
    );
    
    // Restore the canvas state
    ctx.restore();

    // Convert canvas to blob and then to File
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        const file = new File([blob], fileName, { type: 'image/webp' });
        resolve(file);
      }, 'image/webp', 0.95);
    });
  },
  [fileName]
);


  const handleSave = useCallback(async () => {
    if (!imgRef.current || !completedCrop) {
      return;
    }

    try {
      const croppedImageFile = await getCroppedImg(imgRef.current, completedCrop, rotation);
      onSave(croppedImageFile);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  }, [completedCrop, rotation, getCroppedImg, onSave]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '600px' } }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <CropIcon sx={{ mr: 1 }} />
            Crop & Rotate Image
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                onClick={handleSave}
                variant="contained"
                disabled={!completedCrop }
                color="primary"
                size="medium"
                sx={{
                  '&:hover': {
                    background: '#163966',
                  },
                }}
              >
                {isUploading ? (
                <CircularProgress size={20} sx={{ color: "#fff" }} />
              ) : (
                "Save"
              )}
              </Button>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
            <Typography variant="body2" sx={{ minWidth: '60px' }}>
              Rotate:
            </Typography>
            <IconButton onClick={handleRotateLeft} size="small">
              <RotateLeft />
            </IconButton>
            <Slider
              value={rotation}
              onChange={handleRotationChange}
              min={-180}
              max={180}
              step={15}
              sx={{ flex: 1, maxWidth: '200px' }}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}°`}
            />
            <IconButton onClick={handleRotateRight} size="small">
              <RotateRight />
            </IconButton>
            <Typography variant="body2" sx={{ minWidth: '40px', textAlign: 'center' }}>
              {rotation}°
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
          >
            <img
              ref={imgRef}
              alt="Crop preview"
              src={imageUrl}
              style={{
                transform: `rotate(${rotation}deg)`,
                maxWidth: '100%',
                maxHeight: '400px',
                objectFit: 'contain',
              }}
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </Box>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropModal;
