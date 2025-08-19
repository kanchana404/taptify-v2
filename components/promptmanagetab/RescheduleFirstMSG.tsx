// components/promptmanagetab/RescheduleFirstMSG.tsx
"use client";
import PromptField from "./PromptField";

interface RescheduleFirstMSGProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  clientName?: string;
  agentName?: string;
  companyName?: string;
}

const defaultRescheduleFirstMessageText = "Hi! This is a reminder for your rescheduled appointment, {ClientName}.";

const RescheduleFirstMSG: React.FC<RescheduleFirstMSGProps> = ({
  value,
  onChange,
  clientName = "",
  agentName = "",
  companyName = ""
}) => {
  const placeholderValues = {
    "{ClientName}": clientName,
    "{AgentName}": agentName,
    "{CompanyName}": companyName
  };

  return (
    <PromptField
      label="Reschedule First Message"
      value={value}
      defaultText={defaultRescheduleFirstMessageText}
      onChange={onChange}
      placeholderValues={placeholderValues}
    />
  );
};

export default RescheduleFirstMSG;