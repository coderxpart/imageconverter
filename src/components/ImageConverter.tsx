import React, { useState, useRef } from 'react';
import { Upload, Download, Image as ImageIcon, X, Check } from 'lucide-react';
import heic2any from 'heic2any';

interface ConversionResult {
  url: string;
  format: string;
  size: string;
}

const supportedFormats = ['png', 'jpeg', 'webp'];
const supportedInputFormats = [...supportedFormats, 'heic'];

export default function ImageConverter() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [convertedImage, setConvertedImage] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetFormat, setTargetFormat] = useState('jpeg');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedImage(file);
    setConvertedImage(null);

    // Handle HEIC files for preview
    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
        }) as Blob;
        setPreviewUrl(URL.createObjectURL(convertedBlob));
      } catch (error) {
        console.error('Error converting HEIC for preview:', error);
      }
    } else {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const convertImage = async () => {
    if (!selectedImage) return;
    
    setLoading(true);
    try {
      let imageToConvert = selectedImage;

      // Handle HEIC conversion first if needed
      if (selectedImage.type === 'image/heic' || selectedImage.name.toLowerCase().endsWith('.heic')) {
        const convertedBlob = await heic2any({
          blob: selectedImage,
          toType: `image/${targetFormat}`,
        }) as Blob;
        imageToConvert = new File([convertedBlob], `converted.${targetFormat}`, {
          type: `image/${targetFormat}`
        });
      }

      // Create an image element to load the file
      const img = new Image();
      img.src = URL.createObjectURL(imageToConvert);
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Create a canvas to draw and convert the image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.drawImage(img, 0, 0);
      
      // Convert to the target format
      const convertedUrl = canvas.toDataURL(`image/${targetFormat}`, 1.0);
      
      // Calculate size
      const base64str = convertedUrl.split(',')[1];
      const decoded = atob(base64str);
      const size = (decoded.length / (1024 * 1024)).toFixed(2);

      setConvertedImage({
        url: convertedUrl,
        format: targetFormat.toUpperCase(),
        size: `${size} MB`
      });
    } catch (error) {
      console.error('Error converting image:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!convertedImage) return;
    
    const link = document.createElement('a');
    link.href = convertedImage.url;
    link.download = `converted-image.${targetFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearSelection = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setConvertedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Image Converter</h1>
        <p className="text-gray-600">Convert your images between formats including HEIC, while maintaining quality</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="space-y-6">
          {/* Image Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept={supportedInputFormats.map(format => 
                format === 'jpeg' ? 'image/jpeg,image/jpg' : `image/${format}`
              ).join(',')}
              className="hidden"
              id="image-input"
            />
            {!selectedImage ? (
              <label
                htmlFor="image-input"
                className="cursor-pointer flex flex-col items-center space-y-4"
              >
                <Upload className="w-12 h-12 text-gray-400" />
                <span className="text-gray-600">Click to upload or drag and drop</span>
                <span className="text-sm text-gray-500">Supports PNG, JPEG, WebP, and HEIC</span>
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative max-w-xs mx-auto">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg"
                  />
                  <button
                    onClick={clearSelection}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  {selectedImage.name} ({(selectedImage.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              </div>
            )}
          </div>

          {/* Conversion Options */}
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <label className="text-gray-700">Convert to:</label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  className="border rounded-md px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {supportedFormats.map(format => (
                    <option key={format} value={format}>
                      {format.toUpperCase()}
                    </option>
                  ))}
                </select>
                <button
                  onClick={convertImage}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{loading ? 'Converting...' : 'Convert'}</span>
                </button>
              </div>

              {/* Conversion Result */}
              {convertedImage && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700">Conversion Complete!</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Format: {convertedImage.format} | Size: {convertedImage.size}
                      </div>
                    </div>
                    <button
                      onClick={downloadImage}
                      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}