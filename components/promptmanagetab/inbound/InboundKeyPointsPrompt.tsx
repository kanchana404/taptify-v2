// components/promptmanagetab/inbound/InboundKeyPointsPrompt.tsx
"use client";
import PromptField from "../PromptField";

interface InboundKeyPointsPromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
}

const defaultKeyPointsText =
  "[ If caller says 'I need help urgently' ] -> Q: 'I understand, can you please provide more details?'\n[ If caller is confused ] -> Q: 'Let me assist you with that, could you please explain the issue?'\n[ If caller mentions a specific problem ] -> Q: 'Thank you for letting us know. We will address this promptly.'";

const InboundKeyPointsPrompt: React.FC<InboundKeyPointsPromptProps> = ({
  value,
  onChange
}) => {
  return (
    <PromptField
      label="Key Points"
      value={value}
      defaultText={defaultKeyPointsText}
      onChange={onChange}
      placeholderValues={{}}
    />
  );
};

export default InboundKeyPointsPrompt;