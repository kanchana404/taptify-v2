// components/promptmanagetab/ContextPrompt.tsx
"use client";
import PromptField from "./PromptField";

interface ContextPromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  companyName?: string;
  clientName?: string;
}

const defaultContextText = "You are making an outbound call to {ClientName}, a recent customer of {CompanyName}, to gather valuable feedback and encourage them to leave a Google review. {CompanyName} values client insights to improve services and boost online visibility. Your role is to create a seamless and engaging experience for {ClientName}, ensuring they feel heard and appreciated.";

const ContextPrompt: React.FC<ContextPromptProps> = ({
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

export default ContextPrompt;