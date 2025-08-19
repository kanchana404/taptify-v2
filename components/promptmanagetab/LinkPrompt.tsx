// components/promptmanagetab/LinkPrompt.tsx
"use client";
import PromptField from "./PromptField";

interface LinkPromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  customerName?: string;
  link?: string;
}

const defaultLinkPromptText = "We value your feedback, {CustomerName}. Please click the link below to share your experience with us:{Link}";

const LinkPrompt: React.FC<LinkPromptProps> = ({
  value,
  onChange,
  customerName = "",
  link = ""
}) => {
  const placeholderValues = {
    "{CustomerName}": customerName,
    "{Link}": link
  };

  return (
    <PromptField
      label="SMS Prompt"
      value={value}
      defaultText={defaultLinkPromptText}
      onChange={onChange}
      placeholderValues={placeholderValues}
    />
  );
};

export default LinkPrompt;