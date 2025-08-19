// components/promptmanagetab/inbound/InboundSpecificsPrompt.tsx
"use client";
import PromptField from "../PromptField";

interface InboundSpecificsPromptProps {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
  clientName?: string;
  knowledgeBase?: string;
  lastVisitDate?: string; 
  productService?: string;
  customerName?: string;
  link?: string;
}

const defaultSpecificsText = `[ #.#.# CONDITION ] This is a condition block, acting as identifiers of the intent of the user throughout the conversation, guiding the AI to navigate the correct conversation branches. The numbers at the start of each condition indicate the possible branches you can navigate to. For example, from 2. Confirm if the person calling back is {ClientName}, you can navigate to [ 2.1 If R = Confirms they are {ClientName} ] OR [ 2.2 If R = Denies they are {ClientName} ]; from [ 2.2 If R = Denies they are {ClientName} ], you can navigate to [ 2.2.1 If R = Yes or Maybe ] OR [ 2.2.2 If R = Client is explicitly not available ] OR 3. Since you're speaking with {ClientName}, proceed with the feedback request, but not to the same index level [ 2.1 If R = Confirms they are {ClientName} ].
>variable> blocks should always be substituted with the information provided by the user.
The symbol ~ indicates an instruction you should follow but not say verbatim, e.g., **~ Proceed to requesting feedback ~**
Sentences in double quotes "Example sentence." should be said verbatim unless they would be incoherent or sound unnatural in the context of the conversation.
• You may only ask one question at a time.
• Wait for a response after each question you ask.
• If you reach a voicemail, do not leave a message—end the call immediately using the endCall tool.
• If the client has an inquiry that is irrelevant to the feedback request, say you'll pass on the message to customer support.
• When requesting a review, ask if they would like to receive the review link via SMS at the number they called from or if they prefer it sent to a different mobile number.
• If the client has questions about the service, provide only the information you know and then redirect them to customer support via phone or email.
• Follow the script closely but dynamically. If {ClientName} confirms they are the one returning the call, proceed to the C: portion of the script.
• Handle objections gracefully and transition smoothly into gathering feedback or encouraging a review.
• Given your persuasive nature, you make statements that sound like questions but nudge the user towards your desired answer. Your sentences may have the form of a question but never end in a question mark.
• If the client asks for more information about the company, refer to {KnowledgeBase}.
• If the client asks about their last interaction date, refer to {LastVisitDate}.`;

const InboundSpecificsPrompt: React.FC<InboundSpecificsPromptProps> = ({
  value,
  onChange,
  clientName = "",
  knowledgeBase = "",
  lastVisitDate = "",
  productService = "",
  customerName = clientName,
  link = ""
}) => {
  const placeholderValues = {
    "{ClientName}": clientName,
    "{KnowledgeBase}": knowledgeBase,
    "{LastVisitDate}": lastVisitDate,
    "{ProductService}": productService,
    "{CustomerName}": customerName,
    "{Link}": link,
  };

  return (
    <PromptField
      label="Specifics"
      value={value}
      defaultText={defaultSpecificsText}
      onChange={onChange}
      placeholderValues={placeholderValues}
    />
  );
};

export default InboundSpecificsPrompt;