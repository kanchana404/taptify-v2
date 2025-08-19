import React, { ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, RefreshCw } from 'lucide-react';
import { validPhotoCategories } from '../utils';

interface PhotoUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  photoFile: File | null;
  photoCategory: string;
  uploadingPhoto: boolean;
  onPhotoFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onPhotoCategoryChange: (category: string) => void;
  onUpload: () => void;
}

const PhotoUploadDialog: React.FC<PhotoUploadDialogProps> = ({
  isOpen,
  onOpenChange,
  photoFile,
  photoCategory,
  uploadingPhoto,
  onPhotoFileChange,
  onPhotoCategoryChange,
  onUpload,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Business Photo</DialogTitle>
          <DialogDescription>
            Add a new photo to your Google Business Profile
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="photo-upload">Select Photo</Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={onPhotoFileChange}
              className="mt-1"
            />
            {photoFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {photoFile.name}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="photo-category">Category</Label>
            <Select value={photoCategory} onValueChange={onPhotoCategoryChange}>
              <SelectTrigger id="photo-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COVER">Cover</SelectItem>
                <SelectItem value="PROFILE">Profile</SelectItem>
                <SelectItem value="INTERIOR">Interior</SelectItem>
                <SelectItem value="EXTERIOR">Exterior</SelectItem>
                <SelectItem value="PRODUCT">Product</SelectItem>
                <SelectItem value="TEAM">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onUpload} disabled={!photoFile || uploadingPhoto}>
            {uploadingPhoto ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Photo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoUploadDialog;
