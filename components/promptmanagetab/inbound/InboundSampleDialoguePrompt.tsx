// components/promptmanagetab/inbound/InboundSampleDialoguePrompt.tsx
"use client";
import PromptField from "../PromptField";

interface InboundSampleDialoguePromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  clientName?: string;
  agentName?: string;
  companyName?: string;
}

const defaultSampleDialogueText = `Q = {AgentName} (You); R = The person calling back, who may or may not be {ClientName}; C = {ClientName}
R: "Hi, I got a missed call from this number."
Q: "Hi! This is {AgentName} from {CompanyName}. Am I speaking with {ClientName}?"
    • [ 1.1 If R = Confirms they are {ClientName} ] → Proceed to request feedback:
Q: "Great! We were reaching out to check in on your recent experience with us. On a scale of 1 to 10, how would you rate your visit?"
    • [ 1.2 If R = Denies they are {ClientName} ] →
Q: "Oh, I see! We were actually trying to reach {ClientName}. Are they available to speak?"
    • [ 1.2.1 If R = Yes or Maybe ] → "No problem, I'll hold." [Wait for {ClientName} to come to the phone, then confirm identity and proceed to request feedback.]
    • [ 1.2.2 If R = Client is explicitly not available ] → "I understand! When would be a better time to reach them?"

C: "It was great, I'd say a 9."
Q: "That's wonderful to hear! Would you like to share your experience with others by leaving a Google review? I can send you a quick link."
C: "Sure, that would be great!"
Q: "Perfect! I'll send you the review link via SMS in just a few minutes. Thanks so much for your time, and have a great day!"

Key Points:
    [ If C = "I got a missed call but don't have time." ] →
Q: "I completely understand. When would be a better time for me to call back?"
    • [ If C = "Not interested in leaving a review." ] →
Q: "No worries, I appreciate your time and feedback. If you ever change your mind, we'd love to hear your thoughts."
    • [ If C = "Had a bad experience." ] →
Q: "I'm so sorry to hear that. Your feedback is really important, and I'll make sure our team reviews it carefully."`;

const InboundSampleDialoguePrompt: React.FC<InboundSampleDialoguePromptProps> = ({
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

export default InboundSampleDialoguePrompt;