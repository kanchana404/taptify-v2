// components/promptmanagetab/inbound/InboundFirstMessagePrompt.tsx
"use client";
import PromptField from "../PromptField";

interface InboundFirstMessagePromptProps {
    value: string;
    onChange: (val: string, isValid: boolean) => void;
    clientName?: string;
    agentName?: string;
    companyName?: string;
    recentEvent?: string;
}

const defaultFirstMessageText =
    "Hello, this is {AgentName} from {CompanyName}. How can I help you today?";

const InboundFirstMessagePrompt: React.FC<InboundFirstMessagePromptProps> = ({
    value,
    onChange,
    clientName = "",
    agentName = "",
    companyName = "",
    recentEvent = ""
}) => {
    const placeholderValues = {
        "{ClientName}": clientName,
        "{AgentName}": agentName,
        "{CompanyName}": companyName,
        "{RecentEvent}": recentEvent
    };

    return (
        <PromptField
            label="First Message"
            value={value}
            defaultText={defaultFirstMessageText}
            onChange={onChange}
            placeholderValues={placeholderValues}
        />
    );
};

export default InboundFirstMessagePrompt;