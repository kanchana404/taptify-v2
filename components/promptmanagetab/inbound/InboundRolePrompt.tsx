// components/promptmanagetab/inbound/InboundRolePrompt.tsx
"use client";
import PromptField from "../PromptField";

interface InboundRolePromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  agentName?: string;
  companyName?: string;
}

const defaultRoleText =
  "You are {AgentName}, a Voice AI expert in customer engagement and reputation management for {CompanyName}, an organization dedicated to enhancing businesses' online presence and customer satisfaction.";

const InboundRolePrompt: React.FC<InboundRolePromptProps> = ({
  value,
  onChange,
  agentName = "",
  companyName = ""
}) => {
  const placeholderValues = {
    "{AgentName}": agentName,
    "{CompanyName}": companyName
  };

  return (
    <PromptField
      label="Role"
      value={value}
      defaultText={defaultRoleText}
      onChange={onChange}
      placeholderValues={placeholderValues}
    />
  );
};

export default InboundRolePrompt;
