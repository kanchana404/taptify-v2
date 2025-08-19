// components/promptmanagetab/KeyPointsPrompt.tsx
"use client";
import PromptField from "./PromptField";

interface KeyPointsPromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
}

const defaultKeyPointsText = "[ If C = 'I don't have time.' ] -> Q: 'I completely understand. When would be a better time for me to call back?'\n[ If C = 'Not interested in leaving a review.' ] -> Q: 'No worries, I appreciate your time and feedback. If you ever change your mind, we'd love to hear your thoughts.'\n[ If C = 'Had a bad experience.'] -> Q: 'I'm so sorry to hear that. Your feedback is really important, and I'll make sure our team reviews it carefully.'";

const KeyPointsPrompt: React.FC<KeyPointsPromptProps> = ({
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

export default KeyPointsPrompt;