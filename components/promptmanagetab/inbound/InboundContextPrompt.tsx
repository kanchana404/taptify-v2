// components/promptmanagetab/inbound/InboundContextPrompt.tsx
"use client";
import PromptField from "../PromptField";

interface InboundContextPromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  companyName?: string;
  clientName?: string;
}

const defaultContextText =
  "You are handling an inbound call from {ClientName}, a recent customer of {CompanyName}, who is returning a missed call. Your goal is to create a seamless and engaging experience, ensuring {ClientName} feels heard and appreciated. Let them know you're calling to gather valuable feedback on their recent experience and encourage them to leave a Google review. {CompanyName} values client insights to improve services and boost online visibility.";

const InboundContextPrompt: React.FC<InboundContextPromptProps> = ({
  value,
  onChange,
  companyName = "",
  clientName = ""
}) => {
  const placeholderValues = {
    "{CompanyName}": companyName,
    "{ClientName}": clientName
  };

  return (
    <PromptField
      label="Context"
      value={value}
      defaultText={defaultContextText}
      onChange={onChange}
      placeholderValues={placeholderValues}
    />
  );
};

export default InboundContextPrompt;