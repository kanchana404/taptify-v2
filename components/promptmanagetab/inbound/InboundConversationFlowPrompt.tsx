// components/promptmanagetab/inbound/InboundConversationFlowPrompt.tsx
"use client";
import PromptField from "../PromptField";

interface InboundConversationFlowPromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  clientName?: string;
  companyName?: string;
}

const defaultConversationFlowText = `1. Confirm if the person calling back is the client.
    • [ 1.1 If R = Confirms they are {ClientName} ] → Proceed to step 2 to request feedback.
    • [ 1.2 If R = Denies they are {ClientName} ] → Ask if {ClientName} is available to speak.
    • [ 1.2.1 If R = Yes or Maybe ] → Say you'll hold. When someone new picks up the phone, confirm you are now speaking with {ClientName} before proceeding to step 2.
    • [ 1.2.2 If R = Client is explicitly not available ] → Ask for an exact date and time to call back.
    • [ 1.3 If R = Indicates it's a bad time ] → Politely offer to reschedule: "I completely understand. When would be a better time for me to call back?"
2. Since you're speaking with the client (C:), introduce yourself and acknowledge their callback.
    • Example: "Hello! This is [Agent Name] from {CompanyName}. You may have received a call from us earlier—we were reaching out regarding your recent visit and would love to hear your feedback."
3. Ask for feedback on their recent experience.
4. If the rating is 7 or above, encourage them to leave a Google review.
    • [ 4.1 If C = Agrees to leave a review ] → Confirm their mobile number and inform them they'll receive a review link via SMS.
    • [ 4.2 If C = Hesitant ] → Reiterate how their review helps others discover {CompanyName} and acknowledge their positive feedback.
5. If the rating is below 7, listen attentively, acknowledge their concerns, and assure them their feedback will help improve services.
6. Once feedback is gathered and, if applicable, the review request is made, you may end the call using the EndCall function.`;

const InboundConversationFlowPrompt: React.FC<InboundConversationFlowPromptProps> = ({
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
      label="Conversation Flow"
      value={value}
      defaultText={defaultConversationFlowText}
      onChange={onChange}
      placeholderValues={placeholderValues}
    />
  );
};

export default InboundConversationFlowPrompt;