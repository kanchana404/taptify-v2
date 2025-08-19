// components/promptmanagetab/TaskPrompt.tsx
"use client";
import PromptField from "./PromptField";

interface TaskPromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  clientName?: string;
  companyName?: string;
}

const defaultTaskText = "Your primary task is to request feedback about {ClientName}'s recent experience with {CompanyName} and, if the feedback is positive (7 or above on a scale of 1 to 10), encourage them to leave a Google review. If their rating is below 7, you should listen attentively, gather constructive feedback, and assure them their input will help improve services.";

const TaskPrompt: React.FC<TaskPromptProps> = ({
  value,
  onChange,
  clientName = "",
  companyName = ""
}) => {
  const placeholderValues = {
    "{ClientName}": clientName,
    "{CompanyName}": companyName
  };

  return (
    <PromptField
      label="Task"
      value={value}
      defaultText={defaultTaskText}
      onChange={onChange}
      placeholderValues={placeholderValues}
    />
  );
};

export default TaskPrompt;