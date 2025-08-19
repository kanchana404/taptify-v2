// components/promptmanagetab/inbound/InboundLinkPrompt.tsx
"use client";
import PromptField from "../PromptField";

interface InboundLinkPromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  customerName?: string;
  link?: string;
}

const defaultLinkPromptText =
  "Thank you, {CustomerName}. For more information, please visit: {Link}";

const InboundLinkPrompt: React.FC<InboundLinkPromptProps> = ({
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
      label="Link Prompt"
      value={value}
      defaultText={defaultLinkPromptText}
      onChange={onChange}
      placeholderValues={placeholderValues}
    />
  );
};

export default InboundLinkPrompt;