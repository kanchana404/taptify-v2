// components/promptmanagetab/FirstMessagePrompt.tsx
"use client";
import PromptField from "./PromptField";

interface FirstMessagePromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  clientName?: string;
  agentName?: string;
  companyName?: string;
  recentEvent?: string;
}

const defaultFirstMessageText = "Hi! Am I speaking with {ClientName}?";

const FirstMessagePrompt: React.FC<FirstMessagePromptProps> = ({
  value,
  onChange,
  clientName = "",
  agentName = "",
  companyName = "",
  recentEvent = ""
}) => {
  const placeholderValues = {
    "{ClientName}": clientName,
    "{AgentName}": agentName,
    "{CompanyName}": companyName,
    "{RecentEvent}": recentEvent
  };

  return (
    <PromptField
      label="First Message"
      value={value}
      defaultText={defaultFirstMessageText}
      onChange={onChange}
      placeholderValues={placeholderValues}
    />
  );
};

export default FirstMessagePrompt;