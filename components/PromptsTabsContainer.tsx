// components/PromptsTabsContainer.tsx
"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CustomizePromptsTab, { InstructionsData } from "@/components/CustomizePromptsTab";

export default function PromptsTabsContainer() {
  const [outboundInstructions, setOutboundInstructions] = useState<InstructionsData>({
    first_message_prompt: "",
    reschedule_first_message_prompt: "",
    role_prompt: "",
    context_prompt: "",
    task_prompt: "",
    specifics_prompt: "",
    conversation_flow_prompt: "",
    sample_dialogue_prompt: "",
    key_points_prompt: "",
    link_prompt: "",
    after_call_prompt: "",
  });
  const [inboundInstructions, setInboundInstructions] = useState<InstructionsData>({
    first_message_prompt: "",
    reschedule_first_message_prompt: "",
    role_prompt: "",
    context_prompt: "",
    task_prompt: "",
    specifics_prompt: "",
    conversation_flow_prompt: "",
    sample_dialogue_prompt: "",
    key_points_prompt: "",
    link_prompt: "",
    after_call_prompt: "",
  });

  return (
    <div className="container mx-auto max-w-6xl">
      <div className="space-y-8">
        {/* Outbound Prompts Section */}
        <Card>
          <CardHeader>
            <CardTitle>Outbound Call Prompts</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomizePromptsTab
              instructions={outboundInstructions}
              setInstructions={setOutboundInstructions}
              isLoading={false}
              clientName="John Doe"
              visitDate="Last week"
              outboundTitle="Outbound Call Prompts"
              outboundDescription="Customize what your customers hear when they receive a call—make it clear, personal, and professional"
            />
          </CardContent>
        </Card>

        {/* Inbound Prompts Section */}
        <Card>
          <CardHeader>
            <CardTitle>Inbound Call Prompts</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomizePromptsTab
              instructions={inboundInstructions}
              setInstructions={setInboundInstructions}
              isLoading={false}
              clientName="Jane Doe"
              visitDate="Today"
              inboundTitle="Inbound Call Prompts"
              inboundDescription="Customize what your customers hear when they call—make it personal and on-brand"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
