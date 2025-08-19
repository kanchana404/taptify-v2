// components/promptmanagetab/AfterCallPrompt.tsx
"use client";
import PromptField from "./PromptField";

interface AfterCallPromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  companyName?: string;
  productService?: string;
}

const defaultAfterCallText = "Thank you for speaking with us today. Your insights help us improve our service. If you have any additional feedback, please let us know.";

const AfterCallPrompt: React.FC<AfterCallPromptProps> = ({
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

export default AfterCallPrompt;