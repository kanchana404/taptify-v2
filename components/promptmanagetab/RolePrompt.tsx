// components/promptmanagetab/RolePrompt.tsx
"use client";
import PromptField from "./PromptField";

interface RolePromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  agentName?: string;
  companyName?: string;
}

const defaultRoleText = "You are {AgentName}, a Voice AI expert in customer engagement and reputation management for {CompanyName}, an organization dedicated to enhancing businesses' online presence and customer satisfaction.";

const RolePrompt: React.FC<RolePromptProps> = ({
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

export default RolePrompt;