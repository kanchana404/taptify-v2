"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  PlayCircle,
  PauseCircle,
  ChevronLeft,
  ChevronRight,
  Volume2
} from "lucide-react";

// Keywords for filtering
const filterKeywords = [
  { id: "all", label: "All Voices" },
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "young", label: "Young" },
  { id: "middle-aged", label: "Middle-aged" },
  { id: "old", label: "Senior" },
  { id: "american", label: "American" },
  { id: "british", label: "British" },
  { id: "canadian", label: "Canadian" },
  { id: "australian", label: "Australian" },
  { id: "confident", label: "Confident" },
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "conversational", label: "Conversational" },
];

// Featured voices data
const featuredVoices = [
  {
    id: "5ZvI0fBo2w7CxuiM9ObF",
    name: "Abrahim",
    image: "/images/Abrahim.png",
    previewUrl: "/sounds/Abrahim.mp3",
    provider: "Featured",
    bestFor: ["Professional", "Business"]
  },
  {
    id: "H1IZPRKe4sicwJUbx5Ok",
    name: "Mark",
    image: "/images/Mark.png",
    previewUrl: "/sounds/Mark.mp3",
    provider: "Featured",
    bestFor: ["Casual", "Conversational"]
  },
  {
    id: "N1FaluiZRUFhzPturDLR",
    name: "Sarah",
    image: "/images/Sarah.png",
    previewUrl: "/sounds/Sarah.mp3",
    provider: "Featured",
    bestFor: ["Professional", "Friendly"]
  },
  {
    id: "g4LbLXna3aySyQVdGvRW",
    name: "Victoria",
    image: "/images/Victoria.png",
    previewUrl: "/sounds/Victoria.mp3",
    provider: "Featured",
    bestFor: ["Elegant", "Professional"]
  }
];

// Voice interface
interface Voice {
  id: string;
  name: string;
  image?: string;
  previewUrl: string;
  provider: string;
  bestFor?: string[];
  gender?: string;
  age?: string;
  accent?: string;
  useCase?: string;
  descriptive?: string;
  description?: string;
}

export default function VoicesPage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [randomTopVoices, setRandomTopVoices] = useState<Voice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalVoices, setTotalVoices] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState("all");
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Pagination settings
  const voicesPerPage = 12;

  // Fetch voices from the API and load saved voice
  useEffect(() => {
    const fetchVoices = async () => {
      setIsLoading(true);
      try {
        // Fetch voice list using our updated API endpoint
        const response = await fetch("/api/voice?all=true");

        if (!response.ok) {
          throw new Error("Failed to fetch voices");
        }

        const data = await response.json();

        // Set voices from the API response
        setVoices(data.voices);
        setTotalVoices(data.total_count || data.voices.length);

        // Set featured voices instead of random ones
        setRandomTopVoices(featuredVoices);

        // Now fetch the saved voice from our API
        fetchSavedVoice();
      } catch (error) {
        console.error("Error fetching voices:", error);
        setIsLoading(false);
      }
    };

    fetchVoices();
  }, []);

  // Fetch saved voice from database
  const fetchSavedVoice = async () => {
    try {
      console.log("Fetching saved voice from database...");
      const response = await fetch('/api/voice');

      if (response.ok) {
        const data = await response.json();
        console.log("Saved voice data:", data);

        if (data.voice_id) {
          // Set the selected voice from the database
          setSelectedVoice(data.voice_id);
          console.log("Set selected voice to:", data.voice_id);
        } else {
          console.log("No saved voice found");
        }
      } else {
        console.log("No voice settings found for user");
      }
    } catch (error) {
      console.error("Error fetching saved voice:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter voices based on search query and selected keyword
  const filteredVoices = voices.filter((voice: Voice) => {
    const matchesSearch = voice.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Check if voice matches the selected keyword
    let matchesKeyword = true;
    if (selectedKeyword !== "all") {
      matchesKeyword = (voice.gender === selectedKeyword) ||
        (voice.age === selectedKeyword) ||
        (voice.accent === selectedKeyword) ||
        (voice.useCase === selectedKeyword) ||
        (voice.descriptive === selectedKeyword) ||
        (voice.bestFor && voice.bestFor.includes(selectedKeyword)) || false;
    }

    return matchesSearch && matchesKeyword;
  });

  // Sort voices to show selected voice first (if it's not a featured voice)
  const sortedVoices = [...filteredVoices].sort((a: Voice, b: Voice) => {
    // Check if voice a is the selected voice and not a featured voice
    const aIsSelected = a.id === selectedVoice;
    const aIsFeatured = featuredVoices.find((fv: Voice) => fv.id === a.id);
    
    // Check if voice b is the selected voice and not a featured voice
    const bIsSelected = b.id === selectedVoice;
    const bIsFeatured = featuredVoices.find((fv: Voice) => fv.id === b.id);
    
    // If a is selected and not featured, it should come first
    if (aIsSelected && !aIsFeatured) return -1;
    // If b is selected and not featured, it should come first
    if (bIsSelected && !bIsFeatured) return 1;
    // Otherwise, maintain original order
    return 0;
  });

  // Handle pagination
  const indexOfLastVoice = currentPage * voicesPerPage;
  const indexOfFirstVoice = indexOfLastVoice - voicesPerPage;
  const currentVoices = sortedVoices.slice(indexOfFirstVoice, indexOfLastVoice);
  const totalPages = Math.ceil(sortedVoices.length / voicesPerPage);

  // Play voice sample
  const playVoiceSample = (voice: Voice) => {
    if (playingVoice === voice.id) {
      // Stop playing if already playing this voice
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlayingVoice(null);
    } else {
      // Play the new voice
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }

      // Use the working audio method from the new code
      const newAudio = new Audio(voice.previewUrl);
      newAudio.onended = () => setPlayingVoice(null);
      newAudio.play().catch(err => {
        console.error("Error playing audio:", err);
        // Still show the animation for demo purposes
        setPlayingVoice(voice.id);
        // Auto-stop after 5 seconds as fallback
        setTimeout(() => setPlayingVoice(null), 5000);
      });

      setAudio(newAudio);
      setPlayingVoice(voice.id);
    }
  };

  // Select voice function with database save
  const selectVoice = (voiceId: string) => {
    setSelectedVoice(voiceId);

    // Find the selected voice in the voices array or featured voices
    const selectedVoiceObj = voices.find((voice: Voice) => voice.id === voiceId) || 
                            featuredVoices.find((voice: Voice) => voice.id === voiceId);

    if (selectedVoiceObj) {
      // Save the selected voice to the database
      saveVoiceToDB(selectedVoiceObj);
    }
  };

  // Save voice to database
  const saveVoiceToDB = async (voice: Voice) => {
    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_id: voice.id,
          voice_name: voice.name,
          // Add any additional voice properties you want to store
          provider: voice.provider,
          bestFor: voice.bestFor
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save voice settings');
      }

      const data = await response.json();
      console.log('Voice settings saved:', data);
    } catch (error) {
      console.error('Error saving voice settings:', error);
    }
  };

  // Use voice function
  const useVoice = (voiceId: string) => {
    // Find the voice in either the main voices array or featured voices
    const voiceToUse = voices.find((voice: Voice) => voice.id === voiceId) || 
                      featuredVoices.find((voice: Voice) => voice.id === voiceId);
    
    if (voiceToUse) {
      console.log(`Using voice: ${voiceToUse.name} (${voiceToUse.id})`);
      // Implementation for using the selected voice
    }
  };

  // Change page
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Custom theme colors
  const customStyles = {
    "--primary": "270 70% 50%",
    "--ring": "270 70% 50%",
  };

  // Featured Voice card component with simplified animation
  const FeaturedVoiceCard = ({ voice }: { voice: Voice }) => {
    const isSelected = selectedVoice === voice.id;
    const isPlaying = playingVoice === voice.id;

    return (
      <Card className="group relative overflow-hidden rounded-xl border border-purple-100 dark:border-purple-900/20 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-gray-900/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {/* Voice Avatar */}
          <div className="relative aspect-square overflow-hidden rounded-t-xl bg-gradient-to-br from-purple-100 to-purple-300 dark:from-purple-900/40 dark:to-purple-700/40">
            {/* Provider Badge */}
            <div className="absolute left-3 top-3 z-10">
              <Badge
                className="rounded-full px-2 py-0.5 text-xs font-medium bg-white/90 text-purple-700 dark:bg-gray-900/80 dark:text-purple-300 shadow-sm"
              >
                {voice.provider}
              </Badge>
            </div>

            {/* Select Button */}
            <div className="absolute right-3 top-3 z-10">
              <Button
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`h-8 px-3 rounded-lg text-xs min-w-[80px] ${isSelected ? 'bg-purple-600 text-white shadow-md hover:bg-purple-600 hover:text-white' : 'bg-purple-100/80 text-purple-700'}`}
                onClick={() => selectVoice(voice.id)}
              >
                {isSelected ? 'Selected' : 'Select'}
              </Button>
            </div>

            {/* Placeholder image */}
            <div
              className="h-full w-full bg-cover bg-center opacity-75"
              style={{
                backgroundImage: `url(${voice.image !== "undefined" ? voice.image : "/api/placeholder/280/280"})`
              }}
            />

            {/* Audio Player Controls on the side */}
            <div className="absolute right-3 bottom-3 z-10">
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-full ${isPlaying ? 'bg-purple-700' : 'bg-purple-600/90'} text-white transition-all duration-300 shadow-md`}
                onClick={() => playVoiceSample(voice)}
              >
                {isPlaying ? (
                  <PauseCircle className="h-5 w-5" />
                ) : (
                  <PlayCircle className="h-5 w-5" />
                )}
                <span className="sr-only">{isPlaying ? 'Pause' : 'Play'} sample</span>
              </Button>
            </div>
          </div>

          {/* Voice Info */}
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">{voice.name}</h3>
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              {voice.description && (
                <p className="line-clamp-2">{voice.description}</p>
              )}
            </div>
            {voice.bestFor && voice.bestFor.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {voice.bestFor.map((tag: string, i: number) => tag && (
                  <Badge
                    key={`${voice.id}-${tag}-${i}`}
                    variant="outline"
                    className="text-xs bg-purple-50 text-gray-600 dark:bg-purple-900/20 dark:text-gray-400 border-purple-200"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Single animated audio waveform line - only visible when playing */}
            {isPlaying && (
              <div className="mt-3 h-4 w-full bg-purple-100 dark:bg-purple-900/30 overflow-hidden rounded-md flex items-center">
                <div className="w-full px-2 flex items-center justify-between">
                  <div className="audio-wave-container w-full flex items-center">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={`wave-${voice.id}-${i}`}
                        className="audio-wave-bar bg-gradient-to-b from-purple-400 to-purple-600 dark:from-purple-500 dark:to-purple-700"
                        style={{
                          height: `${Math.max(3, Math.min(15, Math.floor(Math.random() * 16)))}px`,
                          width: '3px',
                          margin: '0 2px',
                          borderRadius: '1px',
                          animation: `audio-wave 0.5s ease infinite alternate ${i * 0.05}s`
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="mx-2">
                  <Volume2 className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Regular Voice card component with simplified animation
  const RegularVoiceCard = ({ voice }: { voice: Voice }) => {
    const isSelected = selectedVoice === voice.id;
    const isPlaying = playingVoice === voice.id;

    return (
      <Card className="group relative overflow-hidden border border-purple-100 dark:border-purple-900/20 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:border-purple-200 dark:bg-gray-900/60 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Avatar and Play Button */}
            <div className="relative flex-shrink-0">
              <div
                className="h-12 w-12 rounded-full bg-cover bg-center ring-2 ring-purple-100 dark:ring-purple-900/30"
                style={{ backgroundImage: `url(${voice.image !== "undefined" ? voice.image : "/api/placeholder/48/48"})` }}
              />

              {/* Play Button on side */}
              <Button
                variant="ghost"
                size="icon"
                className={`absolute -right-1 -bottom-1 h-6 w-6 rounded-full ${isPlaying ? 'bg-purple-700' : 'bg-purple-600'} text-white shadow-sm transition-all duration-200 hover:scale-110`}
                onClick={() => playVoiceSample(voice)}
              >
                {isPlaying ? (
                  <PauseCircle className="h-3 w-3" />
                ) : (
                  <PlayCircle className="h-3 w-3" />
                )}
                <span className="sr-only">{isPlaying ? 'Pause' : 'Play'} sample</span>
              </Button>
            </div>

            {/* Voice Info */}
            <div className="flex-grow min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{voice.name}</h3>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex flex-wrap gap-1">
                {voice.bestFor && voice.bestFor.length > 0 && voice.bestFor[0] && (
                  <Badge
                    variant="outline"
                    className="text-xs px-1 py-0 h-4 bg-purple-50 text-gray-600 dark:bg-purple-900/20 dark:text-gray-400 border-purple-200"
                  >
                    {voice.bestFor[0]}
                  </Badge>
                )}
              </div>

              {/* Use/Selected Button */}
              <div className="mt-2">
                <Button
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  className={`h-7 px-3 rounded-lg text-xs min-w-[75px] ${isSelected ? 'bg-purple-600 text-white hover:bg-purple-600 hover:text-white' : 'border-purple-200 text-purple-700'}`}
                  onClick={() => {
                    selectVoice(voice.id);
                    useVoice(voice.id);
                  }}
                >
                  {isSelected ? 'Selected' : 'Use'}
                </Button>
              </div>
            </div>
          </div>

          {/* Animated audio waveform line - only visible when playing */}
          {isPlaying && (
            <div className="mt-2 h-3 w-full bg-purple-100 dark:bg-purple-900/30 overflow-hidden rounded-md flex items-center">
              <div className="w-full px-1 flex items-center justify-between">
                <div className="audio-wave-container w-full flex items-center justify-between">
                  {[...Array(15)].map((_, i) => (
                    <div
                      key={`wave-${voice.id}-${i}`}
                      className="audio-wave-bar bg-gradient-to-b from-purple-400 to-purple-600 dark:from-purple-500 dark:to-purple-700"
                      style={{
                        height: `${Math.max(2, Math.min(8, Math.floor(Math.random() * 9)))}px`,
                        width: '2px',
                        borderRadius: '1px',
                        animation: `audio-wave 0.5s ease infinite alternate ${i * 0.06}s`
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="mx-1">
                <Volume2 className="h-2 w-2 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
        ...customStyles
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col purple-fade-in">
          <div className="@container/main flex flex-1 flex-col">
            <div className="flex flex-col gap-10 py-8 px-8">
              {/* Header with modern design */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold text-foreground">Voice Library</h1>
                  <Badge className="purple-badge">
                    {totalVoices} voices
                  </Badge>
                </div>
                <p className="text-muted-foreground">Browse and manage synthetic voices for your prompts</p>
              </div>

              {/* Random Top Voices */}
              {randomTopVoices.length > 0 && (
                <div>
                  <h2 className="text-xl font-medium text-foreground mb-5">Featured Voices</h2>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
                    {randomTopVoices.map(voice => (
                      <FeaturedVoiceCard key={voice.id} voice={voice} />
                    ))}
                  </div>
                </div>
              )}

              {/* Explore All Voices */}
              <div>
                <h2 className="text-xl font-medium text-foreground mb-5">Explore all voices</h2>

                {/* Search and Filters */}
                <div className="mb-6 flex flex-col md:flex-row gap-4">
                  <div className="relative w-full md:w-1/3">
                    <Input
                      placeholder="Search voices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 rounded-lg pl-8 w-full purple-input"
                    />
                    <div className="absolute left-2.5 top-2.5 purple-accent-text">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                  </div>

                  {/* Keyword Filter Pills */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {filterKeywords.map(keyword => (
                      <Button
                        key={keyword.id}
                        variant={selectedKeyword === keyword.id ? "default" : "outline"}
                        size="sm"
                        className={`rounded-full text-xs ${selectedKeyword === keyword.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-transparent text-purple-700 border-purple-200 dark:text-purple-300 dark:border-purple-800'
                          }`}
                        onClick={() => {
                          setSelectedKeyword(keyword.id);
                          setCurrentPage(1); // Reset to first page when filter changes
                        }}
                      >
                        {keyword.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Loading State */}
                {isLoading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Voice Grid */}
                    {currentVoices.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {currentVoices.map(voice => (
                          <RegularVoiceCard key={voice.id} voice={voice} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex justify-center items-center py-10">
                        <p className="text-gray-600 dark:text-gray-400">No voices found matching your criteria</p>
                      </div>
                    )}

                    {/* Pagination */}
                    {sortedVoices.length > voicesPerPage && (
                      <div className="flex justify-center items-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0 rounded-full"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Display pagination numbers with current page in the middle
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else {
                              const middle = Math.min(Math.max(3, currentPage), totalPages - 2);
                              pageNum = middle - 2 + i;
                            }

                            if (pageNum > 0 && pageNum <= totalPages) {
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => paginate(pageNum)}
                                  className={`h-8 w-8 p-0 ${currentPage === pageNum
                                      ? 'bg-purple-600 text-white'
                                      : 'text-purple-700 dark:text-purple-300'
                                    }`}
                                >
                                  {pageNum}
                                </Button>
                              );
                            }
                            return null;
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0 rounded-full"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
