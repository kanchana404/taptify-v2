// components/promptmanagetab/PromptField.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EyeIcon, EyeOffIcon } from "lucide-react";

interface PromptFieldProps {
  label: string;
  value: string;
  defaultText: string;
  onChange: (val: string, isValid: boolean) => void;
  placeholderValues?: Record<string, string>;
}

const PromptField: React.FC<PromptFieldProps> = ({
  label,
  value,
  defaultText,
  onChange,
  placeholderValues = {},
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Initialize with default text if value is empty (only on mount)
  useEffect(() => {
    if (!value.trim()) {
      onChange(defaultText, true);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value, true);
  };

  const handleCursorChange = () => {
    if (textAreaRef.current) {
      setCursorPos(textAreaRef.current.selectionStart);
    }
  };

  const getPreview = () => {
    let previewText = value?.trim() ? value : defaultText;
    Object.entries(placeholderValues).forEach(([placeholder, placeholderValue]) => {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      previewText = previewText.replace(regex, placeholderValue || placeholder);
    });
    return previewText;
  };

  const handleDragEnter = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    const keyword = e.dataTransfer.getData("text/plain");
    if (keyword && textAreaRef.current) {
      // Get current cursor position
      const currentPos = textAreaRef.current.selectionStart;
      
      // Insert the keyword at cursor position
      const newText =
        value.substring(0, currentPos) + keyword + value.substring(currentPos);
      
      onChange(newText, true);
      
      // Set focus and cursor position after the inserted keyword
      setTimeout(() => {
        if (textAreaRef.current) {
          const newPos = currentPos + keyword.length;
          textAreaRef.current.focus();
          textAreaRef.current.setSelectionRange(newPos, newPos);
          setCursorPos(newPos);
        }
      }, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
  };

  const displayValue = value?.trim() ? value : defaultText;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview((prev) => !prev)}
          className="h-8 gap-1 text-xs"
        >
          {showPreview ? (
            <>
              <EyeOffIcon className="h-3.5 w-3.5" />
              <span>Hide Preview</span>
            </>
          ) : (
            <>
              <EyeIcon className="h-3.5 w-3.5" />
              <span>Show Preview</span>
            </>
          )}
        </Button>
      </div>
      
      <div className={`relative ${isDraggingOver ? 'ring-2 ring-primary rounded-md' : ''}`}>
        <Textarea
          ref={textAreaRef}
          value={displayValue}
          onChange={handleChange}
          onClick={handleCursorChange}
          onKeyUp={handleCursorChange}
          onSelect={handleCursorChange}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          placeholder={`Enter ${label.toLowerCase()} prompt...`}
          className={`min-h-[120px] resize-y ${isDraggingOver ? 'border-primary' : ''}`}
        />
        {isDraggingOver && (
          <div className="absolute inset-0 bg-primary/5 pointer-events-none border-2 border-dashed border-primary rounded-md"></div>
        )}
      </div>
      
      {showPreview && (
        <Card className="mt-3">
          <CardContent className="p-3 pt-3">
            <p className="text-xs text-muted-foreground mb-1">Preview:</p>
            <div className="p-3 rounded-md bg-muted/50 text-sm whitespace-pre-wrap">
              {getPreview()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PromptField;