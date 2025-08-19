import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Save, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TimePeriod {
  openDay: string;
  openTime: { hours: number; minutes?: number };
  closeDay: string;
  closeTime: { hours: number; minutes?: number };
}

interface RegularHours {
  periods: TimePeriod[];
}

interface EditHoursDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentHours: RegularHours | null;
  locationId: string;
  onHoursUpdated: () => void;
}

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: i === 0 ? '12 AM' : i === 12 ? '12 PM' : i > 12 ? `${i - 12} PM` : `${i} AM` }));
const MINUTES = [
  { value: 0, label: '00' },
  { value: 15, label: '15' },
  { value: 30, label: '30' },
  { value: 45, label: '45' },
];

const EditHoursDialog: React.FC<EditHoursDialogProps> = ({
  isOpen,
  onOpenChange,
  currentHours,
  locationId,
  onHoursUpdated,
}) => {
  const [hours, setHours] = useState<RegularHours>({ periods: [] });
  const [saving, setSaving] = useState(false);

  // Initialize with current hours when dialog opens
  useEffect(() => {
    if (isOpen && currentHours) {
      setHours(currentHours);
    } else if (isOpen && !currentHours) {
      // Set default hours if none exist
      setHours({
        periods: DAYS_OF_WEEK.map(day => ({
          openDay: day.value,
          openTime: { hours: 9, minutes: 0 },
          closeDay: day.value,
          closeTime: { hours: 17, minutes: 0 },
        }))
      });
    }
  }, [isOpen, currentHours]);

  const updatePeriod = (index: number, field: keyof TimePeriod, value: any) => {
    setHours(prev => ({
      ...prev,
      periods: prev.periods.map((period, i) => 
        i === index ? { ...period, [field]: value } : period
      )
    }));
  };

  const addPeriod = () => {
    setHours(prev => ({
      ...prev,
      periods: [...prev.periods, {
        openDay: 'MONDAY',
        openTime: { hours: 9, minutes: 0 },
        closeDay: 'MONDAY',
        closeTime: { hours: 17, minutes: 0 },
      }]
    }));
  };

  const removePeriod = (index: number) => {
    setHours(prev => ({
      ...prev,
      periods: prev.periods.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!locationId) {
      toast.error('Location ID is required');
      return;
    }

    if (hours.periods.length === 0) {
      toast.error('At least one time period is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/business/update-hours', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId,
          regularHours: hours,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Opening hours updated successfully');
        onHoursUpdated();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update opening hours');
      }
    } catch (error) {
      console.error('Error updating hours:', error);
      toast.error('Failed to update opening hours');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (time: { hours: number; minutes?: number }) => {
    if (!time || typeof time.hours !== 'number') {
      return 'Invalid time';
    }
    const period = time.hours >= 12 ? 'PM' : 'AM';
    const displayHours = time.hours > 12 ? time.hours - 12 : time.hours === 0 ? 12 : time.hours;
    const minutes = time.minutes || 0;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Edit Opening Hours
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Set your business opening hours for each day of the week
            </p>
            <Button onClick={addPeriod} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Period
            </Button>
          </div>

          <div className="space-y-4">
            {hours.periods.map((period, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Time Period {index + 1}</CardTitle>
                    <Button
                      onClick={() => removePeriod(index)}
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Day Selection */}
                    <div className="space-y-2">
                      <Label>Day</Label>
                      <Select
                        value={period.openDay}
                        onValueChange={(value) => {
                          updatePeriod(index, 'openDay', value);
                          updatePeriod(index, 'closeDay', value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map(day => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Open Time */}
                    <div className="space-y-2">
                      <Label>Open Time</Label>
                      <div className="flex gap-2">
                        <Select
                          value={period.openTime?.hours?.toString() || '9'}
                          onValueChange={(value) => 
                            updatePeriod(index, 'openTime', { 
                              ...period.openTime, 
                              hours: parseInt(value) 
                            })
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HOURS.map(hour => (
                              <SelectItem key={hour.value} value={hour.value.toString()}>
                                {hour.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={period.openTime?.minutes?.toString() || '0'}
                          onValueChange={(value) => 
                            updatePeriod(index, 'openTime', { 
                              ...period.openTime, 
                              minutes: parseInt(value) 
                            })
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MINUTES.map(minute => (
                              <SelectItem key={minute.value} value={minute.value.toString()}>
                                {minute.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Close Time */}
                    <div className="space-y-2">
                      <Label>Close Time</Label>
                      <div className="flex gap-2">
                        <Select
                          value={period.closeTime?.hours?.toString() || '17'}
                          onValueChange={(value) => 
                            updatePeriod(index, 'closeTime', { 
                              ...period.closeTime, 
                              hours: parseInt(value) 
                            })
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HOURS.map(hour => (
                              <SelectItem key={hour.value} value={hour.value.toString()}>
                                {hour.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={period.closeTime?.minutes?.toString() || '0'}
                          onValueChange={(value) => 
                            updatePeriod(index, 'closeTime', { 
                              ...period.closeTime, 
                              minutes: parseInt(value) 
                            })
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MINUTES.map(minute => (
                              <SelectItem key={minute.value} value={minute.value.toString()}>
                                {minute.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="space-y-2">
                      <Label>Summary</Label>
                      <p className="text-sm text-muted-foreground">
                        {DAYS_OF_WEEK.find(d => d.value === period.openDay)?.label}: {formatTime(period.openTime)} - {formatTime(period.closeTime)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {hours.periods.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No time periods configured</p>
              <p className="text-sm">Click "Add Period" to get started</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || hours.periods.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Hours'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditHoursDialog;