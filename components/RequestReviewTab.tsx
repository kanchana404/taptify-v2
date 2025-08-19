import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, User, Phone, Calendar, X, Plus } from "lucide-react";
import { toast } from 'sonner';

interface RecordData {
  [key: string]: string;
}

interface SingleUser {
  id: number;
  aaname: string;
  phone: string;
  lastvisitdate: string;
}

const RequestReviewTab = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sheetData, setSheetData] = useState<RecordData[]>([]);
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [csvUrl, setCsvUrl] = useState('');
  const [formatValid, setFormatValid] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [singleUsers, setSingleUsers] = useState<SingleUser[]>([
    { id: 1, aaname: '', phone: '', lastvisitdate: '' },
  ]);
  const [previewData, setPreviewData] = useState<RecordData[]>([]);
  const [errors, setErrors] = useState<{ [key: number]: Partial<SingleUser> }>({});
  const [csvFileName, setCsvFileName] = useState<string>('');
  
  // Get today's date in ISO format (YYYY-MM-DD) for the max date attribute
  const today = new Date().toISOString().split('T')[0];

  const fetchSheetData = async () => {
    if (!csvUrl) {
      toast.error("Please enter a Google Sheets CSV URL");
      return;
    }

    try {
      setIsSheetLoading(true);
      const response = await fetch('/api/fetch-sheet-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvUrl })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch sheet data');
      setSheetData(data.records);
      setFormatValid(true);
      updatePreview(data.records, singleUsers);
      toast.success("Sheet data loaded successfully");
    } catch (error) {
      setSheetData([]);
      setFormatValid(false);
      setPreviewData([]);
      toast.error((error as Error).message || "Could not load sheet data");
    } finally {
      setIsSheetLoading(false);
    }
  };

  const handleAddCustomers = async () => {
    try {
      setIsLoading(true);
      const recordsToAdd: RecordData[] = [];

      // Validate only required fields (Name and Phone)
      for (const user of singleUsers) {
        if (!user.aaname.trim() || !user.phone.trim()) {
          toast.error(`Please fill out the required fields (Name and Phone) for Customer ${user.id}`);
          setIsLoading(false);
          return;
        }

        recordsToAdd.push({
          Name: user.aaname.trim(),
          "Phone Number": user.phone.trim(),
          "last visit date": user.lastvisitdate
            ? new Date(user.lastvisitdate).toISOString().split('T')[0]
            : '',
        });
      }

      if (sheetData.length > 0) {
        for (const record of sheetData) {
          if (!record.Name || !record["Phone Number"]) {
            toast.error("All records from the sheet must have Name and Phone Number");
            setIsLoading(false);
            return;
          }
          recordsToAdd.push({
            ...record,
            "last visit date": record["last visit date"]
              ? new Date(record["last visit date"]).toISOString().split('T')[0]
              : '',
          });
        }
      }

      if (recordsToAdd.length === 0) {
        toast.error("No customers to add");
        return;
      }

      const response = await fetch('/api/fetch-sheet-data/addto-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: recordsToAdd })
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Handle different error types with specific messages
        if (response.status === 403) {
          toast.error(`Insufficient Credits: You need ${data.requiredCredits} credits but only have ${data.availableCredits || 0}. Please add more credits to continue.`);
        } else if (response.status === 404) {
          toast.error("Company Data Not Found: Please complete your company profile setup first.");
        } else if (response.status === 401) {
          toast.error("Unauthorized: Please log in again to continue.");
        } else if (response.status === 400) {
          toast.error(data.error || "Invalid Data: Please check your data format and try again.");
        } else {
          toast.error(data.error || "Failed to add customers to database. Please try again.");
        }
        return;
      }

      const result = await response.json();
      
      // Show success message with details
      const addedCount = result.results?.filter((r: any) => r.status === "added").length || 0;
      const existingCount = result.results?.filter((r: any) => r.status === "already exists").length || 0;
      
      let successMessage = "Customers processed successfully!";
      if (addedCount > 0 && existingCount > 0) {
        successMessage = `${addedCount} new customers added, ${existingCount} existing customers updated.`;
      } else if (addedCount > 0) {
        successMessage = `${addedCount} new customers added successfully!`;
      } else if (existingCount > 0) {
        successMessage = `${existingCount} existing customers updated successfully!`;
      }

      // Show success toast
      toast.success(successMessage);

      // Show webhook status if failed
      if (result.webhookStatus === "failed") {
        toast.error("Data was saved but there was an issue with external integrations. Please contact support if this persists.");
      }
      resetForm();
    } catch (error) {
      console.error("Error adding customers:", error);
      toast.error("Failed to connect to server. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSheetData([]);
    setFormatValid(false);
    setConsentChecked(false);
    setSingleUsers([{ id: 1, aaname: '', phone: '', lastvisitdate: '' }]);
    setPreviewData([]);
    setCsvUrl('');
    setCsvFileName('');
    setErrors({});
  };

  const updatePreview = (newSheetData: RecordData[], singleUsersData: SingleUser[]) => {
    const combinedRecords: RecordData[] = [];
    singleUsersData.forEach(user => {
      if (user.aaname.trim() && user.phone.trim()) {
        combinedRecords.push({
          Name: user.aaname.trim(),
          "Phone Number": user.phone.trim(),
          "last visit date": user.lastvisitdate
            ? new Date(user.lastvisitdate).toISOString().split('T')[0]
            : '',
        });
      }
    });

    if (newSheetData.length > 0) {
      combinedRecords.push(...newSheetData.map(record => ({
        ...record,
        "last visit date": record["last visit date"]
          ? new Date(record["last visit date"]).toISOString().split('T')[0]
          : '',
      })));
    }
    setPreviewData(combinedRecords);
  };

  useEffect(() => {
    updatePreview(sheetData, singleUsers);
  }, [sheetData, singleUsers]);

  const handleSingleUserChange = (id: number, field: keyof Omit<SingleUser, 'id'>, value: string) => {
    setSingleUsers(prev => prev.map(user => user.id === id ? { ...user, [field]: value } : user));

    // For name and phone, set error if missing; date is now optional.
    if (field !== 'lastvisitdate') {
      setErrors(prev => ({
        ...prev,
        [id]: { ...prev[id], [field]: value ? undefined : 'Required' }
      }));
    } else {
      setErrors(prev => ({
        ...prev,
        [id]: { ...prev[id], [field]: undefined }
      }));
    }

    if (value) {
      setCsvUrl('');
      setSheetData([]);
      setFormatValid(false);
    }
  };

  const handleCsvUrlChange = (value: string) => {
    setCsvUrl(value);
    if (value) setSingleUsers([{ id: 1, aaname: '', phone: '', lastvisitdate: '' }]);
  };

  const addNewSingleUser = () => {
    setSingleUsers(prev => [...prev, { id: prev.length + 1, aaname: '', phone: '', lastvisitdate: '' }]);
  };

  const removeUser = (id: number) => {
    setSingleUsers(prev => prev.filter(user => user.id !== id));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  };

  const allFieldsFilled = () => {
    // Check only required fields for single users (date is optional)
    for (const user of singleUsers) {
      if (!user.aaname.trim() || !user.phone.trim()) {
        return false;
      }
    }

    // For sheetData, only Name and Phone Number are required
    if (sheetData.length > 0) {
      for (const record of sheetData) {
        if (!record.Name || !record["Phone Number"]) {
          return false;
        }
      }
    }

    return true;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setCsvFileName(file.name);
    
    try {
      const formData = new FormData();
      formData.append("csvFile", file);
      
      toast.info("Uploading and processing CSV file...");
      
      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process CSV file');
      
      setSheetData(data.records);
      setFormatValid(true);
      updatePreview(data.records, singleUsers);
      toast.success("CSV data loaded successfully");
    } catch (error) {
      toast.error((error as Error).message || "Could not process CSV file");
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 flex flex-wrap items-center justify-between gap-4 lg:px-6">
            <h2 className="text-xl font-semibold ">Add Customers</h2>
          </div>
          
          {/* Main Content Area */}
          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle >Customer Information</CardTitle>
                <CardDescription>Add customers individually or import from a file</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Single User Inputs */}
                  {singleUsers.map((user, index) => (
                    <div key={user.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-muted-foreground">Customer {index + 1}</span>
                        {singleUsers.length > 1 && (
                          <Button
                            onClick={() => removeUser(user.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20"
                            aria-label="Remove customer"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`name-${user.id}`} className="text-sm mb-2 block">
                            Customer Name
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-500 dark:text-purple-400" />
                            <Input
                              id={`name-${user.id}`}
                              value={user.aaname}
                              onChange={(e) => handleSingleUserChange(user.id, 'aaname', e.target.value)}
                              placeholder="Customer Name"
                              className={`pl-10 focus-visible:ring-purple-500 ${errors[user.id]?.aaname ? 'border-destructive' : ''}`}
                              disabled={csvUrl !== ''}
                            />
                            {errors[user.id]?.aaname && (
                              <span className="text-destructive text-sm mt-1 block">Name is required</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`phone-${user.id}`} className="text-sm mb-2 block">
                            Phone Number
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-500 dark:text-purple-400" />
                            <div className="absolute left-10 top-1/2 transform -translate-y-1/2">+</div>
                            <Input
                              id={`phone-${user.id}`}
                              value={user.phone}
                              onChange={(e) => handleSingleUserChange(user.id, 'phone', e.target.value)}
                              className={`pl-16 focus-visible:ring-purple-500 ${errors[user.id]?.phone ? 'border-destructive' : ''}`}
                              placeholder="1234567890"
                              disabled={csvUrl !== ''}
                            />
                            {errors[user.id]?.phone && (
                              <span className="text-destructive text-sm mt-1 block">Phone number is required</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`date-${user.id}`} className="text-sm mb-2 block">
                            Recent Interaction Date (Optional)
                          </Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-500 dark:text-purple-400 pointer-events-none" />
                            <Input
                              id={`date-${user.id}`}
                              type="date"
                              value={user.lastvisitdate}
                              onChange={(e) => handleSingleUserChange(user.id, 'lastvisitdate', e.target.value)}
                              onClick={(e) => {
                                (e.target as HTMLInputElement).showPicker();
                              }}
                              max={today}
                              className="pl-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:ml-auto focus-visible:ring-purple-500"
                              disabled={csvUrl !== ''}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add New Customer Button */}
                  {csvUrl === '' && (
                    <Button
                      onClick={addNewSingleUser}
                      className="flex items-center gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20"
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add Customer
                    </Button>
                  )}

                  {/* CSV Import Section */}
                  {!singleUsers.some(user => user.aaname || user.phone) && (
                    <div className="space-y-4 mt-6 border-t pt-6">
                      <h3 className="text-sm font-medium mb-2 ">Import Multiple Customers</h3>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                          <Input
                            value={csvUrl}
                            onChange={(e) => handleCsvUrlChange(e.target.value)}
                            placeholder="Enter Google Sheets CSV URL"
                            className="pr-24 focus-visible:ring-purple-500"
                          />
                          <Button
                            onClick={fetchSheetData}
                            disabled={isSheetLoading || !csvUrl}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600"
                            size="sm"
                          >
                            {isSheetLoading ? 'Loading...' : 'Load'}
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="relative inline-block">
                          <Label htmlFor="csv-upload" className="cursor-pointer">
                            <div className="flex items-center gap-2 px-4 py-2 border rounded-md bg-background hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm transition-colors">
                              <Upload className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                              {csvFileName || 'Upload CSV'}
                            </div>
                          </Label>
                          <input
                            type="file"
                            id="csv-upload"
                            className="hidden"
                            accept=".csv"
                            onChange={handleFileUpload}
                          />
                        </div>
                        <Button
                          variant="link"
                          className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                          size="sm"
                        >
                          <a href="https://docs.google.com/spreadsheets/d/10jTuvBf5Q5LOvb6o9KuN5pm_HoGFn5VLyX9DOpVD_YE/export?format=csv" target="_blank" rel="noopener noreferrer">
                            Download Template
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          {previewData.length > 0 && (
            <div className="px-4 lg:px-6 mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-purple-800 dark:text-purple-300">Preview Customers</CardTitle>
                    <CardDescription>
                      {previewData.length} {previewData.length === 1 ? 'Record' : 'Records'} ready to import
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                      <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b bg-purple-50 dark:bg-purple-900/20">
                          <tr className="border-b transition-colors hover:bg-purple-100/50 dark:hover:bg-purple-800/20">
                            {Object.keys(previewData[0]).map((header, index) => (
                              <th key={index} className="h-12 px-4 text-left align-middle font-medium text-purple-700 dark:text-purple-400">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                          {previewData.map((record, rowIndex) => (
                            <tr key={rowIndex} className="border-b transition-colors hover:bg-purple-50/50 dark:hover:bg-purple-900/10">
                              {Object.values(record).map((cell, cellIndex) => (
                                <td key={cellIndex} className="p-4 align-middle">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Consent and Submit Section */}
          {(singleUsers.every(user => user.aaname.trim() && user.phone.trim()) || sheetData.length > 0) && (
            <div className="px-4 lg:px-6 mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3 mb-6">
                    <Checkbox
                      id="consent"
                      checked={consentChecked}
                      onCheckedChange={(checked: boolean) => setConsentChecked(checked)}
                      className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 dark:data-[state=checked]:bg-purple-500 dark:data-[state=checked]:border-purple-500"
                    />
                    <Label htmlFor="consent" className="text-sm cursor-pointer">
                      I confirm that I have received consent to contact these customers
                    </Label>
                  </div>
                  
                  <Button
                    onClick={handleAddCustomers}
                    disabled={!consentChecked || isLoading || !allFieldsFilled()}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600"
                    size="lg"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding Customers...
                      </span>
                    ) : (
                      'Start Calling'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestReviewTab;