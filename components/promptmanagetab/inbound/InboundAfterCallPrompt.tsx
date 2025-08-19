// components/promptmanagetab/inbound/InboundAfterCallPrompt.tsx
"use client";
import PromptField from "../PromptField";

interface InboundAfterCallPromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  companyName?: string;
  productService?: string;
}

const defaultAfterCallText =
  "Thank you for calling us today. We appreciate your time and hope to assist you further. If you have any additional feedback, please let us know.";

const InboundAfterCallPrompt: React.FC<InboundAfterCallPromptProps> = ({
  value,
  onChange,
  companyName = "",
  productService = ""
}) => {
  const placeholderValues = {
    "{CompanyName}": companyName,
    "{ProductService}": productService
  };

  return (
    <PromptField
      label="After Call"
      value={value}
      defaultText={defaultAfterCallText}
      onChange={onChange}
      placeholderValues={placeholderValues}
    />
  );
};

export default InboundAfterCallPrompt;