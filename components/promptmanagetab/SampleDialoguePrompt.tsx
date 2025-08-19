// components/promptmanagetab/SampleDialoguePrompt.tsx
"use client";
import PromptField from "./PromptField";

interface SampleDialoguePromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  clientName?: string;
  agentName?: string;
  companyName?: string;
}

const defaultSampleDialogueText = "Q = {AgentName} (You); R = The person who picks up, who may or may not be {ClientName}; C = {ClientName}\nR: 'Hello?' Q: 'Hi! Am I speaking with {ClientName}?'\nR: Pay attention to the response [ 1.1 If R = Confirms they are {ClientName} ] -> Proceed to request feedback: Great! My name is {AgentName} from {CompanyName}. I'm calling to check in on your recent experience with us. On a scale of 1 to 10, how would you rate your visit? [ 1.2 If R = Denies they are {ClientName} ] -> Q: 'Oh sorry, must have been a wrong number, Thanks for your time.'\nC: 'It was great, I'd say a 9.' Q: 'That's wonderful to hear! Would you like to share your experience with others by leaving a Google review? I can send you a quick link.'\nC: 'Sure, that would be great!'";

const SampleDialoguePrompt: React.FC<SampleDialoguePromptProps> = ({
  value,
  onChange,
  clientName = "",
  agentName = "",
  companyName = ""
}) => {
  const placeholderValues = {
    "{ClientName}": clientName,
    "{AgentName}": agentName,
    "{CompanyName}": companyName
  };

  return (
    <PromptField
      label="Sample Dialogue"
      value={value}
      defaultText={defaultSampleDialogueText}
      onChange={onChange}
      placeholderValues={placeholderValues}
    />
  );
};

export default SampleDialoguePrompt;