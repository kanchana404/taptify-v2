/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PromptField from "@/components/promptmanagetab/PromptField";
import KeywordBank from "@/components/promptmanagetab/KeywordBank";

/* ---------------- inbound prompt components ---------------- */
import InboundFirstMessagePrompt from "@/components/promptmanagetab/inbound/InboundFirstMessagePrompt";
import InboundRolePrompt from "@/components/promptmanagetab/inbound/InboundRolePrompt";
import InboundContextPrompt from "@/components/promptmanagetab/inbound/InboundContextPrompt";
import InboundTaskPrompt from "@/components/promptmanagetab/inbound/InboundTaskPrompt";
import InboundSpecificsPrompt from "@/components/promptmanagetab/inbound/InboundSpecificsPrompt";
import InboundConversationFlowPrompt from "@/components/promptmanagetab/inbound/InboundConversationFlowPrompt";
import InboundSampleDialoguePrompt from "@/components/promptmanagetab/inbound/InboundSampleDialoguePrompt";
import InboundKeyPointsPrompt from "@/components/promptmanagetab/inbound/InboundKeyPointsPrompt";
import InboundLinkPrompt from "@/components/promptmanagetab/inbound/InboundLinkPrompt";
import InboundAfterCallPrompt from "@/components/promptmanagetab/inbound/InboundAfterCallPrompt";

/* ---------------- outbound prompt components --------------- */
import ContextPrompt from "./promptmanagetab/ContextPrompt";
import RolePrompt from "./promptmanagetab/RolePrompt";
import RescheduleFirstMSG from "./promptmanagetab/RescheduleFirstMSG";
import FirstMessagePrompt from "./promptmanagetab/FirstMessagePrompt";

/* -------------------------------------------------------------------------------------------------
 *  TYPES
 * ------------------------------------------------------------------------------------------------*/
export interface InstructionsData {
  company_name?: string;
  agent_name?: string;
  role?: string;
  company_contact_number?: string;
  company_contact_email?: string;
  company_contact_address?: string;
  product_or_service?: string;
  link?: string;

  first_message_prompt: string;
  reschedule_first_message_prompt: string;
  role_prompt: string;
  context_prompt: string;
  task_prompt: string;
  specifics_prompt: string;
  conversation_flow_prompt: string;
  sample_dialogue_prompt: string;
  key_points_prompt: string;
  link_prompt: string;
  after_call_prompt: string;

  knowledge_base?: string;
  professional_questions?: string;
  profession?: string;
  any_additional_requests?: string;
  experience_last_visit?: string;
  user_timezone?: string;
}

interface Props {
  instructions: InstructionsData;
  setInstructions: React.Dispatch<React.SetStateAction<InstructionsData>>;
  isLoading: boolean;
  clientName?: string;
  visitDate?: string;

  /* ---- NEW OPTIONAL COPY PROPS ---- */
  companyInfoTitle?: string;
  companyInfoDescription?: string;
  inboundTitle?: string;
  inboundDescription?: string;
  outboundTitle?: string;
  outboundDescription?: string;
  
  /* ---- FORCE TYPE PROP ---- */
  forceType?: "inbound" | "outbound";
}

/* -------------------------------------------------------------------------------------------------
 *  CONSTANTS
 * ------------------------------------------------------------------------------------------------*/
const timezones: string[] =
  typeof Intl !== "undefined" && (Intl as any).supportedValuesOf
    ? ((Intl as any).supportedValuesOf("timeZone") as string[])
    : [];

const commonTz = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Colombo",
];

const defaultTexts = {
  first_message: "Hi! Am I speaking with {ClientName}?",
  reschedule_first_message:
    "Hi! This is a reminder for your rescheduled appointment with {ClientName}.",
  role:
    "You are {AgentName}, a Voice-AI expert in customer engagement and reputation management for {CompanyName}, an organization dedicated to enhancing businesses' online presence and customer satisfaction.",
  context:
    "You are making an outbound call to {ClientName}, a recent customer of {CompanyName}, to gather valuable feedback and encourage them to leave a Google review. {CompanyName} values client insights to improve services and boost online visibility. Your role is to create a seamless and engaging experience for {ClientName}, ensuring they feel heard and appreciated.",
  task:
    "Your primary task is to request feedback about {ClientName}'s recent experience with {CompanyName} and, if the feedback is positive (7 or above on a scale of 1 to 10), encourage them to leave a Google review. If their rating is below 7, you should listen attentively, gather constructive feedback, and assure them their input will help improve services.",
  specifics:
    "[ #.#.# CONDITION ] This is a condition block, acting as identifiers of the intent of the user throughout the conversation, guiding the AI to navigate the correct conversation branches. The numbers at the start of each condition indicate the possible branches you can navigate to.",
  conversation_flow:
    "1. Confirm if the person who answered is the client.\n[ 1.1 If R = Confirms they are {ClientName} ] -> Proceed to step 2 to request feedback.\n[ 1.2 If R = Denies they are {ClientName} ] -> Ask to speak with {ClientName} directly.",
  sample_dialogue:
    "Q = {AgentName}\nR = whoever answers; C = {ClientName}\nR: \"Hello?\"\nQ: \"Hi! Am I speaking with {ClientName}?\"",
  key_points: '[ If C = "I don\'t have time." ] -> reply politely.',
  link_prompt:
    "We value your feedback, {ClientName}. Please click the link below to share your experience with us: {Link}",
  after_call:
    "Thank you for your time today. Your insights help us improve our service.",
};

const allKeywords = [
  "{ClientName}",
  "{AgentName}",
  "{CompanyName}",
  "{ProductService}",
  "{Link}",
  "{RecentEvent}",
  "{KnowledgeBase}",
  "{LastVisitDate}",
  "{UserTimezone}",
];

/* -------------------------------------------------------------------------------------------------
 *  HELPER COMPONENTS
 * ------------------------------------------------------------------------------------------------*/
const FormField = ({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  options = [],
}: {
  label: string;
  name: string;
  value: string;
  onChange:
  | ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void)
  | ((e: React.ChangeEvent<HTMLSelectElement>) => void);
  error: boolean;
  placeholder: string;
  type?: string;
  options?: string[];
}) => (
  <div className="mb-4">
    <Label htmlFor={name} className="mb-2 block text-sm">
      {label}
    </Label>
    {type === "textarea" ? (
      <Textarea
        id={name}
        value={value || ""}
        onChange={onChange as any}
        placeholder={placeholder}
        className={`focus-visible:ring-purple-500 ${error ? "border-destructive" : ""
          }`}
      />
    ) : type === "select" ? (
      <Select
        value={value || ""}
        onValueChange={(val) =>
          (onChange as any)({
            target: { value: val },
          } as React.ChangeEvent<HTMLSelectElement>)
        }
      >
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <Input
        id={name}
        value={value || ""}
        onChange={onChange as any}
        placeholder={placeholder}
        className={`focus-visible:ring-purple-500 ${error ? "border-destructive" : ""
          }`}
      />
    )}
    {error && (
      <p className="mt-1 text-xs text-destructive">This field is required</p>
    )}
  </div>
);

const TimezoneSelector = ({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<string[]>([]);

  useEffect(() => {
    setFiltered(
      search
        ? timezones.filter((tz) =>
          tz.toLowerCase().includes(search.toLowerCase())
        )
        : [
          ...commonTz,
          ...timezones.filter((tz) => !commonTz.includes(tz)),
        ]
    );
  }, [search]);

  const selectTz = (tz: string) => {
    onChange({ target: { value: tz } } as React.ChangeEvent<HTMLInputElement>);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative mb-4">
      <Label className="mb-2 block text-sm">User Timezone</Label>
      <Button
        variant="outline"
        role="combobox"
        className={`w-full justify-between focus-visible:ring-purple-500 ${error ? "border-destructive" : ""
          }`}
        onClick={() => setOpen((o) => !o)}
      >
        {value || "Select timezone"}
        <span className="ml-2 opacity-50">{open ? "▲" : "▼"}</span>
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          <div className="sticky top-0 border-b bg-popover p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-purple-500" />
              <Input
                placeholder="Search timezones…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 focus-visible:ring-purple-500"
                autoFocus
              />
            </div>
          </div>
          {filtered.map((tz) => (
            <div
              key={tz}
              onClick={() => selectTz(tz)}
              className={`cursor-pointer p-2 text-sm hover:bg-purple-50 ${tz === value ? "bg-purple-100 text-purple-800" : ""
                }`}
            >
              {tz}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="p-2 text-sm text-muted-foreground">
              No timezones found
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------------------------------
 *  MAIN COMPONENT
 * ------------------------------------------------------------------------------------------------*/
export default function CustomizePromptsTab({
  instructions,
  setInstructions,
  isLoading,
  clientName = "John Doe",
  visitDate = "Last week",
  /* ------- COPY DEFAULTS (overrideable from parent) ------- */
  companyInfoTitle = "Company Details",
  companyInfoDescription =
  "Provide details about your business so our AI can personalize review requests.",
  inboundTitle = "Inbound Call Prompt",
  inboundDescription =
  "Customize what your customers hear when they call—make it personal and on-brand",
  outboundTitle = "Outbound Call Prompt",
  outboundDescription =
  "Customize what your customers hear when they receive a call—make it clear, personal, and professional",
  forceType,
}: Props) {
  /* -------- URL params & locking flags -------- */
  const params = useSearchParams();
  const sectionParam = params.get("section"); // company | prompts | null
  const typeParam = params.get("type"); // inbound | outbound | null

  const inboundOnly = forceType === "inbound" || typeParam === "inbound";
  const outboundOnly = forceType === "outbound" || typeParam === "outbound";
  const lockCompany =
    sectionParam === "company" && !inboundOnly && !outboundOnly;
  const lockPrompts =
    sectionParam === "prompts" || inboundOnly || outboundOnly;

  /* ------------- state: inner section & prompt-type ------------- */
  const [activeSection, setActiveSection] = useState<"company" | "prompts">(
    lockPrompts ? "prompts" : "company"
  );
  const [activePromptType, setActivePromptType] = useState<"inbound" | "outbound">(
    forceType || (inboundOnly ? "inbound" : "outbound")
  );

  useEffect(() => {
    if (lockPrompts) setActiveSection("prompts");
    if (lockCompany) setActiveSection("company");
    if (forceType) {
      setActivePromptType(forceType);
    } else if (inboundOnly) {
      setActivePromptType("inbound");
    } else if (outboundOnly) {
      setActivePromptType("outbound");
    }
  }, [params, lockPrompts, lockCompany, inboundOnly, outboundOnly, forceType]);

  /* ---------------- toast + save helpers ---------------- */

  const [isSaving, setIsSaving] = useState(false);
  const [companyErrors, setCompanyErrors] = useState<Record<string, boolean>>(
    {}
  );
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);

  const [inboundInstructions, setInboundInstructions] = useState({
    first_message_prompt: "",
    role_prompt: "",
    context_prompt: "",
    task_prompt: "",
    specifics_prompt: "",
    conversation_flow_prompt: "",
    sample_dialogue_prompt: "",
    key_points_prompt: "",
    link_prompt: "",
    after_call_prompt: "",
  });

  const placeholders = {
    "{ClientName}": clientName,
    "{AgentName}": instructions.agent_name || "",
    "{CompanyName}": instructions.company_name || "",
    "{ProductService}": instructions.product_or_service || "",
    "{CustomerName}": clientName,
    "{Link}": instructions.link || "",
    "{RecentEvent}": instructions.experience_last_visit || "",
    "{KnowledgeBase}": instructions.knowledge_base || "",
    "{LastVisitDate}": visitDate || "",
    "{UserTimezone}": instructions.user_timezone || "",
  };

  const handleKeywordDragStart = (keyword: string) => {
    setActiveKeyword(keyword);
  };

  const saveWrapper = async (
    url: string,
    body: any,
    success: string,
    error: string
  ) => {
    setIsSaving(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success(success);
      return true;
    } catch (err) {
      console.error("Error saving:", err);
      toast.error(error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    const errs: Record<string, boolean> = {};
    if (!instructions.company_name) errs.company_name = true;
    if (!instructions.agent_name) errs.agent_name = true;
    if (!instructions.role) errs.role = true;
    if (!instructions.company_contact_number) errs.company_contact_number = true;
    if (!instructions.company_contact_email) errs.company_contact_email = true;
    if (!instructions.company_contact_address) errs.company_contact_address = true;
    if (!instructions.product_or_service) errs.product_or_service = true;
    if (!instructions.experience_last_visit) errs.experience_last_visit = true;

    setCompanyErrors(errs);
    if (Object.keys(errs).length) return;

    const success = await saveWrapper(
      "/api/instructions",
      instructions,
      "Company details saved successfully!",
      "Could not save company details. Please try again."
    );

    if (success && !lockCompany) {
      setActiveSection("prompts");
    }
  };

  const saveOutbound = async () => {
    if (
      instructions.link_prompt &&
      !instructions.link_prompt.includes("{Link}")
    ) {
      toast.error("The SMS prompt must include the {Link} keyword");
      return;
    }

    setIsSaving(true);
    try {
      console.log("Saving outbound instructions:", {
        first_message_prompt: instructions.first_message_prompt || "",
        reschedule_first_message_prompt: instructions.reschedule_first_message_prompt || "",
        role_prompt: instructions.role_prompt || "",
        context_prompt: instructions.context_prompt || "",
        task_prompt: instructions.task_prompt || "",
        specifics_prompt: instructions.specifics_prompt || "",
        conversation_flow_prompt: instructions.conversation_flow_prompt || "",
        sample_dialogue_prompt: instructions.sample_dialogue_prompt || "",
        key_points_prompt: instructions.key_points_prompt || "",
        link_prompt: instructions.link_prompt || "",
        after_call_prompt: instructions.after_call_prompt || "",
        type: "outbound"
      });

      const res = await fetch("/api/instructions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          first_message_prompt: instructions.first_message_prompt || "",
          reschedule_first_message_prompt: instructions.reschedule_first_message_prompt || "",
          role_prompt: instructions.role_prompt || "",
          context_prompt: instructions.context_prompt || "",
          task_prompt: instructions.task_prompt || "",
          specifics_prompt: instructions.specifics_prompt || "",
          conversation_flow_prompt: instructions.conversation_flow_prompt || "",
          sample_dialogue_prompt: instructions.sample_dialogue_prompt || "",
          key_points_prompt: instructions.key_points_prompt || "",
          link_prompt: instructions.link_prompt || "",
          after_call_prompt: instructions.after_call_prompt || "",
          type: "outbound"
        }),
      });

      console.log("API response status:", res.status);
      const data = await res.json();
      console.log("API response data:", data);

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Please sign in to save prompts");
        }
        throw new Error(data.error || "Failed to save outbound prompts");
      }

      toast.success(data.message || "Outbound prompts saved successfully!");
    } catch (err) {
      console.error("Error saving:", err);
      toast.error(err instanceof Error ? err.message : "Could not save outbound prompts. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveInbound = async () => {
    console.log("Starting saveInbound function");
    
    if (
      inboundInstructions.link_prompt &&
      !inboundInstructions.link_prompt.includes("{Link}")
    ) {
      toast.error("The SMS prompt must include the {Link} keyword");
      return;
    }

    setIsSaving(true);
    try {
      console.log("Making API call to save inbound instructions");
      const res = await fetch("/api/instructions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          first_message_prompt: inboundInstructions.first_message_prompt || "",
          role_prompt: inboundInstructions.role_prompt || "",
          context_prompt: inboundInstructions.context_prompt || "",
          task_prompt: inboundInstructions.task_prompt || "",
          specifics_prompt: inboundInstructions.specifics_prompt || "",
          conversation_flow_prompt: inboundInstructions.conversation_flow_prompt || "",
          sample_dialogue_prompt: inboundInstructions.sample_dialogue_prompt || "",
          key_points_prompt: inboundInstructions.key_points_prompt || "",
          link_prompt: inboundInstructions.link_prompt || "",
          after_call_prompt: inboundInstructions.after_call_prompt || "",
          type: "inbound" // Add type to identify inbound prompts
        }),
      });

      console.log("API response status:", res.status);
      const data = await res.json();
      console.log("API response data:", data);

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Please sign in to save prompts");
        }
        throw new Error(data.error || "Failed to save inbound prompts");
      }

      toast.success(data.message || "Inbound prompts saved successfully!");
    } catch (err) {
      console.error("Error saving:", err);
      toast.error(err instanceof Error ? err.message : "Could not save inbound prompts. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Update the fetch function to use the same endpoint
  useEffect(() => {
    const fetchInboundInstructions = async () => {
      try {
        const res = await fetch("/api/instructions?type=inbound", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setInboundInstructions({
              first_message_prompt: data.first_message_prompt || "",
              role_prompt: data.role_prompt || "",
              context_prompt: data.context_prompt || "",
              task_prompt: data.task_prompt || "",
              specifics_prompt: data.specifics_prompt || "",
              conversation_flow_prompt: data.conversation_flow_prompt || "",
              sample_dialogue_prompt: data.sample_dialogue_prompt || "",
              key_points_prompt: data.key_points_prompt || "",
              link_prompt: data.link_prompt || "",
              after_call_prompt: data.after_call_prompt || "",
            });
          }
        } else if (res.status === 401) {
          console.log("User not authenticated");
        }
      } catch (error) {
        console.error("Error fetching inbound instructions:", error);
      }
    };

    if (activePromptType === "inbound") {
      fetchInboundInstructions();
    }
  }, [activePromptType]);

  /* --------------------------------- RENDER -------------------------------- */
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <Card>
              {/* ---------------------------------------------------------------------- */}
              {/* Dynamic title / description based on section + prompt type             */}
              {/* ---------------------------------------------------------------------- */}
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-purple-800 dark:text-purple-300">
                      {activeSection === "company"
                        ? companyInfoTitle
                        : activePromptType === "inbound"
                          ? inboundTitle
                          : outboundTitle}
                    </CardTitle>
                    <CardDescription>
                      {activeSection === "company"
                        ? companyInfoDescription
                        : activePromptType === "inbound"
                          ? inboundDescription
                          : outboundDescription}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              {/* ---------------------------------------------------------------------- */}
              {/* Card Content                                                            */}
              {/* ---------------------------------------------------------------------- */}
              <CardContent>
                {activeSection === "company" ? (
                  /* ============================ COMPANY DETAILS ============================ */
                  <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* ---------- left column ---------- */}
                      <div>
                        <FormField
                          label="Company Name"
                          name="company_name"
                          value={instructions.company_name ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                            setInstructions((p) => ({
                              ...p,
                              company_name: e.target.value,
                            }))
                          }
                          error={!!companyErrors.company_name}
                          placeholder="Enter company name"
                        />
                        <FormField
                          label="Role"
                          name="role"
                          value={instructions.role ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                            setInstructions((p) => ({
                              ...p,
                              role: e.target.value,
                            }))
                          }
                          error={!!companyErrors.role}
                          placeholder="Enter role"
                        />
                        <FormField
                          label="Contact Email"
                          name="company_contact_email"
                          value={instructions.company_contact_email ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                            setInstructions((p) => ({
                              ...p,
                              company_contact_email: e.target.value,
                            }))
                          }
                          error={!!companyErrors.company_contact_email}
                          placeholder="Enter contact email"
                          type="email"
                        />
                        <FormField
                          label="Product / Service"
                          name="product_or_service"
                          value={instructions.product_or_service ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                            setInstructions((p) => ({
                              ...p,
                              product_or_service: e.target.value,
                            }))
                          }
                          error={!!companyErrors.product_or_service}
                          placeholder="Enter product or service"
                        />
                        <FormField
                          label="Review SMS Link"
                          name="link"
                          value={instructions.link ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                            setInstructions((p) => ({
                              ...p,
                              link: e.target.value,
                            }))
                          }
                          error={false}
                          placeholder="Enter review SMS link"
                        />
                      </div>

                      {/* ---------- right column ---------- */}
                      <div>
                        <FormField
                          label="Agent Name"
                          name="agent_name"
                          value={instructions.agent_name ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                            setInstructions((p) => ({
                              ...p,
                              agent_name: e.target.value,
                            }))
                          }
                          error={!!companyErrors.agent_name}
                          placeholder="Enter agent name"
                        />
                        <FormField
                          label="Contact Number"
                          name="company_contact_number"
                          value={instructions.company_contact_number ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                            setInstructions((p) => ({
                              ...p,
                              company_contact_number: e.target.value,
                            }))
                          }
                          error={!!companyErrors.company_contact_number}
                          placeholder="Enter contact number"
                        />
                        <FormField
                          label="Company Address"
                          name="company_contact_address"
                          value={instructions.company_contact_address ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setInstructions((p) => ({
                              ...p,
                              company_contact_address: e.target.value,
                            }))
                          }
                          error={!!companyErrors.company_contact_address}
                          placeholder="Enter company address"
                          type="textarea"
                        />
                        <FormField
                          label="Recent Event"
                          name="experience_last_visit"
                          value={instructions.experience_last_visit ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                            setInstructions((p) => ({
                              ...p,
                              experience_last_visit: e.target.value,
                            }))
                          }
                          error={!!companyErrors.experience_last_visit}
                          placeholder="Enter recent event"
                        />
                        <TimezoneSelector
                          value={instructions.user_timezone ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setInstructions((p) => ({
                              ...p,
                              user_timezone: e.target.value,
                            }))
                          }
                          error={false}
                        />
                      </div>
                    </div>

                    <div className="grid gap-6">
                      <FormField
                        label="Knowledge Base"
                        name="knowledge_base"
                        value={instructions.knowledge_base ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setInstructions((p) => ({
                            ...p,
                            knowledge_base: e.target.value,
                          }))
                        }
                        error={false}
                        placeholder="Enter knowledge base"
                        type="textarea"
                      />
                    </div>

                    <div className="mt-6 flex justify-end space-x-4">
                      {!lockCompany && (
                        <Button
                          variant="outline"
                          className="text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 dark:hover:text-purple-300"
                          onClick={() => setActiveSection("prompts")}
                        >
                          Next
                        </Button>
                      )}
                      <Button
                        onClick={handleSaveCompany}
                        disabled={isSaving}
                        className="bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600"
                      >
                        {isSaving ? "Saving…" : "Save Details"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* ========================= PROMPT CONFIGURATION ========================= */
                  <div className="space-y-6">
                    {/* ---------- keyword drag bank ---------- */}
                    <KeywordBank
                      keywords={allKeywords}
                      onDragStart={handleKeywordDragStart}
                    />

                    {/* ---------- outer tabs (inbound / outbound) ---------- */}
                    <Tabs
                      value={activePromptType}
                      onValueChange={(v) =>
                        setActivePromptType(v as "inbound" | "outbound")
                      }
                      className="w-full"
                    >
                      <TabsList
                        className={`mb-6 grid w-full ${inboundOnly || outboundOnly
                            ? "hidden"
                            : "grid-cols-2"
                          } bg-purple-100 dark:bg-purple-900/20`}
                      >
                        <TabsTrigger value="outbound">
                          Outbound Prompts
                        </TabsTrigger>
                        <TabsTrigger value="inbound">
                          Inbound Prompts
                        </TabsTrigger>
                      </TabsList>

                      {/* -------------------------- OUTBOUND PROMPTS -------------------------- */}
                      {!inboundOnly && (
                        <TabsContent value="outbound" className="mt-0">
                          <div className="space-y-6">
                            {/* First Message Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <FirstMessagePrompt
                                  value={instructions.first_message_prompt || ""}
                                  onChange={(val) =>
                                    setInstructions((p) => ({
                                      ...p,
                                      first_message_prompt: val,
                                    }))
                                  }
                                  clientName={clientName}
                                  agentName={instructions.agent_name ?? ""}
                                  companyName={instructions.company_name ?? ""}
                                  recentEvent={
                                    instructions.experience_last_visit ?? ""
                                  }
                                />
                              </CardContent>
                            </Card>

                            {/* Reschedule First Message Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <RescheduleFirstMSG
                                  value={
                                    instructions.reschedule_first_message_prompt ||
                                    ""
                                  }
                                  onChange={(val) =>
                                    setInstructions((p) => ({
                                      ...p,
                                      reschedule_first_message_prompt: val,
                                    }))
                                  }
                                  clientName={clientName}
                                  agentName={instructions.agent_name ?? ""}
                                  companyName={instructions.company_name ?? ""}
                                />
                              </CardContent>
                            </Card>

                            {/* Role Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <RolePrompt
                                  value={instructions.role_prompt || ""}
                                  onChange={(val) =>
                                    setInstructions((p) => ({
                                      ...p,
                                      role_prompt: val,
                                    }))
                                  }
                                  agentName={instructions.agent_name ?? ""}
                                  companyName={instructions.company_name ?? ""}
                                />
                              </CardContent>
                            </Card>

                            {/* Context Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <ContextPrompt
                                  value={instructions.context_prompt || ""}
                                  onChange={(val) =>
                                    setInstructions((p) => ({
                                      ...p,
                                      context_prompt: val,
                                    }))
                                  }
                                  clientName={clientName}
                                  companyName={instructions.company_name ?? ""}
                                />
                              </CardContent>
                            </Card>

                            {/* Task Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <PromptField
                                  label="Task Prompt"
                                  value={instructions.task_prompt || ""}
                                  defaultText={defaultTexts.task}
                                  onChange={(val) =>
                                    setInstructions((p) => ({
                                      ...p,
                                      task_prompt: val,
                                    }))
                                  }
                                  placeholderValues={placeholders}
                                />
                              </CardContent>
                            </Card>

                            {/* Specifics Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <PromptField
                                  label="Specifics Prompt"
                                  value={instructions.specifics_prompt || ""}
                                  defaultText={defaultTexts.specifics}
                                  onChange={(val) =>
                                    setInstructions((p) => ({
                                      ...p,
                                      specifics_prompt: val,
                                    }))
                                  }
                                  placeholderValues={placeholders}
                                />
                              </CardContent>
                            </Card>

                            {/* Conversation Flow */}
                            <Card>
                              <CardContent className="p-4">
                                <PromptField
                                  label="Conversation Flow"
                                  value={
                                    instructions.conversation_flow_prompt || ""
                                  }
                                  defaultText={defaultTexts.conversation_flow}
                                  onChange={(val) =>
                                    setInstructions((p) => ({
                                      ...p,
                                      conversation_flow_prompt: val,
                                    }))
                                  }
                                  placeholderValues={placeholders}
                                />
                              </CardContent>
                            </Card>

                            {/* Sample Dialogue */}
                            <Card>
                              <CardContent className="p-4">
                                <PromptField
                                  label="Sample Dialogue"
                                  value={instructions.sample_dialogue_prompt || ""}
                                  defaultText={defaultTexts.sample_dialogue}
                                  onChange={(val) =>
                                    setInstructions((p) => ({
                                      ...p,
                                      sample_dialogue_prompt: val,
                                    }))
                                  }
                                  placeholderValues={placeholders}
                                />
                              </CardContent>
                            </Card>

                            {/* Key Points */}
                            <Card>
                              <CardContent className="p-4">
                                <PromptField
                                  label="Key Points"
                                  value={instructions.key_points_prompt || ""}
                                  defaultText={defaultTexts.key_points}
                                  onChange={(val) =>
                                    setInstructions((p) => ({
                                      ...p,
                                      key_points_prompt: val,
                                    }))
                                  }
                                  placeholderValues={placeholders}
                                />
                              </CardContent>
                            </Card>

                            {/* SMS Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <PromptField
                                  label="SMS Prompt"
                                  value={instructions.link_prompt || ""}
                                  defaultText={defaultTexts.link_prompt}
                                  onChange={(val) => {
                                    if (!val.includes("{Link}")) {
                                      toast({
                                        title: "Missing Link Keyword",
                                        description:
                                          "The SMS prompt must include the {Link} keyword",
                                        variant: "destructive",
                                        duration: 3000,
                                      });
                                      return;
                                    }
                                    setInstructions((p) => ({
                                      ...p,
                                      link_prompt: val,
                                    }));
                                  }}
                                  placeholderValues={placeholders}
                                />
                              </CardContent>
                            </Card>

                            {/* After Call Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <PromptField
                                  label="After Call"
                                  value={instructions.after_call_prompt || ""}
                                  defaultText={defaultTexts.after_call}
                                  onChange={(val) =>
                                    setInstructions((p) => ({
                                      ...p,
                                      after_call_prompt: val,
                                    }))
                                  }
                                  placeholderValues={placeholders}
                                />
                              </CardContent>
                            </Card>
                          </div>

                          {/* ---------- outbound actions ---------- */}
                          <div className="mt-6 flex justify-between">
                            {!lockPrompts && (
                              <Button
                                variant="outline"
                                className="text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 dark:hover:text-purple-300"
                                onClick={() => setActiveSection("company")}
                              >
                                Back
                              </Button>
                            )}
                            <Button
                              onClick={saveOutbound}
                              disabled={isSaving || isLoading}
                              className="bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                "Save Prompts"
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                      )}

                      {/* -------------------------- INBOUND PROMPTS -------------------------- */}
                      {!outboundOnly && (
                        <TabsContent value="inbound" className="mt-0">
                          <div className="space-y-6">
                            {/* First Message Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <InboundFirstMessagePrompt
                                  value={
                                    inboundInstructions.first_message_prompt ||
                                    ""
                                  }
                                  onChange={(val) => {
                                    console.log("Updating first message prompt:", val);
                                    setInboundInstructions((p) => ({
                                      ...p,
                                      first_message_prompt: val,
                                    }));
                                  }}
                                  clientName={clientName}
                                  agentName={instructions.agent_name ?? ""}
                                  companyName={instructions.company_name ?? ""}
                                  recentEvent={
                                    instructions.experience_last_visit ?? ""
                                  }
                                />
                              </CardContent>
                            </Card>

                            {/* Role Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <InboundRolePrompt
                                  value={inboundInstructions.role_prompt || ""}
                                  onChange={(val) =>
                                    setInboundInstructions((p) => ({
                                      ...p,
                                      role_prompt: val,
                                    }))
                                  }
                                  agentName={instructions.agent_name ?? ""}
                                  companyName={instructions.company_name ?? ""}
                                />
                              </CardContent>
                            </Card>

                            {/* Context Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <InboundContextPrompt
                                  value={
                                    inboundInstructions.context_prompt || ""
                                  }
                                  onChange={(val) =>
                                    setInboundInstructions((p) => ({
                                      ...p,
                                      context_prompt: val,
                                    }))
                                  }
                                  clientName={clientName}
                                  companyName={instructions.company_name ?? ""}
                                />
                              </CardContent>
                            </Card>

                            {/* Task Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <InboundTaskPrompt
                                  value={inboundInstructions.task_prompt || ""}
                                  onChange={(val) =>
                                    setInboundInstructions((p) => ({
                                      ...p,
                                      task_prompt: val,
                                    }))
                                  }
                                  clientName={clientName}
                                  companyName={instructions.company_name ?? ""}
                                />
                              </CardContent>
                            </Card>

                            {/* Specifics Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <InboundSpecificsPrompt
                                  value={
                                    inboundInstructions.specifics_prompt || ""
                                  }
                                  onChange={(val) =>
                                    setInboundInstructions((p) => ({
                                      ...p,
                                      specifics_prompt: val,
                                    }))
                                  }
                                  clientName={clientName}
                                  knowledgeBase={
                                    instructions.knowledge_base ?? ""
                                  }
                                  lastVisitDate={visitDate}
                                />
                              </CardContent>
                            </Card>

                            {/* Conversation Flow */}
                            <Card>
                              <CardContent className="p-4">
                                <InboundConversationFlowPrompt
                                  value={
                                    inboundInstructions.conversation_flow_prompt ||
                                    ""
                                  }
                                  onChange={(val) =>
                                    setInboundInstructions((p) => ({
                                      ...p,
                                      conversation_flow_prompt: val,
                                    }))
                                  }
                                  clientName={clientName}
                                  companyName={instructions.company_name ?? ""}
                                />
                              </CardContent>
                            </Card>

                            {/* Sample Dialogue */}
                            <Card>
                              <CardContent className="p-4">
                                <InboundSampleDialoguePrompt
                                  value={
                                    inboundInstructions.sample_dialogue_prompt ||
                                    ""
                                  }
                                  onChange={(val) =>
                                    setInboundInstructions((p) => ({
                                      ...p,
                                      sample_dialogue_prompt: val,
                                    }))
                                  }
                                  clientName={clientName}
                                  agentName={instructions.agent_name ?? ""}
                                  companyName={instructions.company_name ?? ""}
                                />
                              </CardContent>
                            </Card>

                            {/* Key Points */}
                            <Card>
                              <CardContent className="p-4">
                                <InboundKeyPointsPrompt
                                  value={
                                    inboundInstructions.key_points_prompt || ""
                                  }
                                  onChange={(val) =>
                                    setInboundInstructions((p) => ({
                                      ...p,
                                      key_points_prompt: val,
                                    }))
                                  }
                                />
                              </CardContent>
                            </Card>

                            {/* SMS Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <InboundLinkPrompt
                                  value={inboundInstructions.link_prompt || ""}
                                  onChange={(val) =>
                                    setInboundInstructions((p) => ({
                                      ...p,
                                      link_prompt: val,
                                    }))
                                  }
                                  clientName={clientName}
                                  link={instructions.link ?? ""}
                                />
                              </CardContent>
                            </Card>

                            {/* After Call Prompt */}
                            <Card>
                              <CardContent className="p-4">
                                <InboundAfterCallPrompt
                                  value={
                                    inboundInstructions.after_call_prompt || ""
                                  }
                                  onChange={(val) =>
                                    setInboundInstructions((p) => ({
                                      ...p,
                                      after_call_prompt: val,
                                    }))
                                  }
                                  companyName={instructions.company_name ?? ""}
                                  productService={
                                    instructions.product_or_service ?? ""
                                  }
                                />
                              </CardContent>
                            </Card>
                          </div>

                          {/* ---------- inbound actions ---------- */}
                          <div className="mt-6 flex justify-between">
                            {!lockPrompts && (
                              <Button
                                variant="outline"
                                className="text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 dark:hover:text-purple-300"
                                onClick={() => setActiveSection("company")}
                              >
                                Back
                              </Button>
                            )}
                            <Button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("Save inbound button clicked");
                                console.log("Current inbound instructions:", inboundInstructions);
                                saveInbound();
                              }}
                              disabled={isSaving || isLoading}
                              className="bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                "Save Prompts"
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                      )}
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
