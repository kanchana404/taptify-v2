"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Volume2, Play, Pause, Search, Star, Sparkles, Mic, Loader2 } from "lucide-react";

interface Voice {
  id: string;
  name: string;
  gender: string;
  age: string;
  accent: string;
  useCase: string;
  descriptive: string;
  bestFor: string[];
  previewUrl: string;
  provider: string;
}

interface VoiceStepProps {
  onComplete: (data: Voice) => void;
  initialData?: Voice | null;
}

const featuredVoices = [
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    gender: "Male",
    age: "Young",
    accent: "American",
    useCase: "Professional",
    descriptive: "Professional and confident",
    bestFor: ["Business", "Professional", "Confident"],
    previewUrl: "/sounds/Abrahim.mp3",
    provider: "Featured",
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Sarah",
    gender: "Female",
    age: "Young",
    accent: "American",
    useCase: "Friendly",
    descriptive: "Warm and approachable",
    bestFor: ["Customer Service", "Friendly", "Approachable"],
    previewUrl: "/sounds/Sarah.mp3",
    provider: "Featured",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Mark",
    gender: "Male",
    age: "Adult",
    accent: "British",
    useCase: "Professional",
    descriptive: "Clear and authoritative",
    bestFor: ["Professional", "Clear", "Authoritative"],
    previewUrl: "/sounds/Mark.mp3",
    provider: "Featured",
  },
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Victoria",
    gender: "Female",
    age: "Adult",
    accent: "American",
    useCase: "Professional",
    descriptive: "Elegant and professional",
    bestFor: ["Elegant", "Professional"],
    previewUrl: "/sounds/Victoria.mp3",
    provider: "Featured",
  }
];

export default function VoiceStep({ onComplete, initialData }: VoiceStepProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(initialData || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const voicesPerPage = 8;

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      const response = await fetch("/api/voice?all=true");
      if (response.ok) {
        const data = await response.json();
        setVoices(data.voices || []);
      }
    } catch (error) {
      console.error("Error fetching voices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const playVoiceSample = (voice: Voice) => {
    if (playingVoice === voice.id) {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlayingVoice(null);
    } else {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }

      const newAudio = new Audio(voice.previewUrl);
      newAudio.onended = () => setPlayingVoice(null);
      newAudio.onerror = () => {
        console.error("Error playing audio");
        setPlayingVoice(null);
      };

      setAudio(newAudio);
      setPlayingVoice(voice.id);
      newAudio.play();
    }
  };

  const selectVoice = (voice: Voice) => {
    setSelectedVoice(voice);
  };

  const handleContinue = async () => {
    if (selectedVoice) {
      setIsSaving(true);
      try {
        const response = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voice_id: selectedVoice.id,
            voice_name: selectedVoice.name,
            provider: selectedVoice.provider,
            bestFor: selectedVoice.bestFor
          }),
        });

        if (response.ok) {
          onComplete(selectedVoice);
        }
      } catch (error) {
        console.error('Error saving voice selection:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const filteredVoices = [...featuredVoices, ...voices].filter(voice =>
    voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    voice.descriptive.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate featured voices from all voices for pagination
  const allVoices = filteredVoices.filter(voice => !featuredVoices.find(fv => fv.id === voice.id));
  const totalPages = Math.ceil(allVoices.length / voicesPerPage);
  const startIndex = (currentPage - 1) * voicesPerPage;
  const endIndex = startIndex + voicesPerPage;
  const currentVoices = allVoices.slice(startIndex, endIndex);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="text-center space-y-4">
          <Skeleton className="w-16 h-16 rounded-2xl mx-auto" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-4 w-80 mx-auto" />
          </div>
        </div>

        {/* Search Skeleton */}
        <div className="max-w-md mx-auto">
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Featured Voices Skeleton */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-lg" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-18" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* All Voices Skeleton */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-lg" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-18" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
          <Mic className="w-8 h-8 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Choose Your AI Voice
          </h2>
          <p className="text-muted-foreground">
            Select a voice that best represents your brand and personality
          </p>
        </div>
        {selectedVoice && (
          <Badge variant="secondary" className="gap-2">
            <Volume2 className="w-3 h-3" />
            {selectedVoice.name} selected
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search voices by name or style..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-muted/50 border focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>

      {/* Featured Voices */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
            <Star className="w-3 h-3 text-primary-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Featured Voices</h3>
          <Badge variant="outline" className="text-xs">
            Recommended
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featuredVoices.map((voice) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              isSelected={selectedVoice?.id === voice.id}
              isPlaying={playingVoice === voice.id}
              onSelect={() => selectVoice(voice)}
              onPlay={() => playVoiceSample(voice)}
              featured={true}
            />
          ))}
        </div>
      </div>

      {/* All Voices */}
      {voices.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-secondary rounded-lg flex items-center justify-center">
              <Volume2 className="w-3 h-3 text-secondary-foreground" />
            </div>
            <h3 className="text-lg font-semibold">All Voices</h3>
            <Badge variant="outline" className="text-xs">
              {allVoices.length} available
            </Badge>
          </div>
          
          {allVoices.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentVoices.map((voice) => (
                  <VoiceCard
                    key={voice.id}
                    voice={voice}
                    isSelected={selectedVoice?.id === voice.id}
                    isPlaying={playingVoice === voice.id}
                    onSelect={() => selectVoice(voice)}
                    onPlay={() => playVoiceSample(voice)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="gap-2"
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="gap-2"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No voices found matching your search.</p>
            </div>
          )}
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-center pt-6">
        <Button
          onClick={handleContinue}
          disabled={!selectedVoice || isSaving}
          size="lg"
          className="min-w-[140px] gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <Sparkles className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface VoiceCardProps {
  voice: Voice;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onPlay: () => void;
  featured?: boolean;
}

function VoiceCard({ voice, isSelected, isPlaying, onSelect, onPlay, featured = false }: VoiceCardProps) {
  return (
    <Card
      className={`group cursor-pointer transition-all duration-300 hover:shadow-lg border ${
        isSelected
          ? "ring-2 ring-primary shadow-lg bg-primary/5"
          : "hover:shadow-md"
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-lg">{voice.name}</h4>
              {featured && (
                <Badge className="bg-primary text-primary-foreground text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
              {isSelected && (
                <Badge className="bg-primary text-primary-foreground text-xs">
                  Selected
                </Badge>
              )}
            </div>
            
            <p className="text-muted-foreground leading-relaxed">
              {voice.descriptive}
            </p>
            
            <div className="flex flex-wrap gap-2">
              {voice.bestFor.slice(0, 3).map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="text-xs bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                👤 {voice.gender}
              </span>
              <span className="flex items-center gap-1">
                🌍 {voice.accent}
              </span>
              <span className="flex items-center gap-1">
                ⭐ {voice.age}
              </span>
            </div>
          </div>
          
          <Button
            size="sm"
            variant={isPlaying ? "default" : "ghost"}
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className={`ml-4 transition-all duration-200 ${
              isPlaying 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {isSelected && (
          <div className="mt-4 pt-4 border-t border-primary/20">
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              This voice will represent your brand
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}