// components/promptmanagetab/KeywordBank.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface KeywordBankProps {
  keywords: string[];
  onDragStart?: (keyword: string) => void;
}

const KeywordBank: React.FC<KeywordBankProps> = ({ keywords, onDragStart = () => {} }) => {
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, keyword: string) => {
    e.dataTransfer.setData("text/plain", keyword);
    e.dataTransfer.effectAllowed = "copy";
    
    // Add a visual indicator for drag
    if (e.currentTarget) {
      setTimeout(() => {
        e.currentTarget.classList.add("opacity-50");
      }, 0);
    }
    
    onDragStart(keyword);
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLButtonElement>) => {
    if (e.currentTarget) {
      e.currentTarget.classList.remove("opacity-50");
    }
  };

  return (
    <div className="sticky top-0 z-50 pb-4 bg-background">
      <Card className="border-b shadow-md">
        <CardContent className="p-4 bg-background">
          <h3 className="text-sm font-medium mb-2">Available Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <Button
                key={keyword}
                type="button"
                variant="outline"
                size="sm"
                draggable
                onDragStart={(e) => handleDragStart(e, keyword)}
                onDragEnd={handleDragEnd}
                className="h-7 px-2 text-xs cursor-grab border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors"
              >
                {keyword}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Drag and drop keywords into any text area</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeywordBank;