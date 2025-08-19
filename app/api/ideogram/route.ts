export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

// Helper to call OpenAI for prompt generation
async function generatePromptWithOpenAI(
  question: string,
  openAIApiKey: string
): Promise<string | null> {
  try {
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are an assistant that creates detailed, visually descriptive prompts for AI image generation based on business questions or post ideas.",
            },
            {
              role: "user",
              content: `Create a visually descriptive prompt for an AI image generator based on this business question or post: ${question}`,
            },
          ],
          max_tokens: 100,
          temperature: 0.7,
        }),
      }
    );
    if (!openaiRes.ok) return null;
    const data = await openaiRes.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    let { prompt, question, useAI, postType, eventDetails, callToAction } = await request.json();

    // Get the API keys from environment variables
    const ideogramApiKey = process.env.IDEOGRAM_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!ideogramApiKey) {
      return NextResponse.json(
        { error: 'Ideogram API key not configured' },
        { status: 500 }
      );
    }

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // If user asked for AI prompt generation and question is provided, use OpenAI to generate a prompt
    if (useAI && question && openaiApiKey) {
      const aiPrompt = await generatePromptWithOpenAI(question, openaiApiKey);
      if (aiPrompt) {
        prompt = aiPrompt;
      }
    }
    // Fallback: If a question is provided but no prompt, use a simple template
    if (!prompt && question) {
      prompt = `An illustrative image for the following business Q&A: ${question}`;
    }
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Prepare form data for Ideogram API
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("aspect_ratio", "1x1");
    formData.append("rendering_speed", "TURBO");
    formData.append("magic_prompt", "ON");

    // Call Ideogram API
    const ideogramRes = await fetch(
      "https://api.ideogram.ai/v1/ideogram-v3/generate",
      {
        method: "POST",
        headers: {
          "Api-Key": ideogramApiKey,
        },
        body: formData,
      }
    );

    if (!ideogramRes.ok) {
      const errorText = await ideogramRes.text();
      return NextResponse.json(
        { error: "Failed to generate image", details: errorText },
        { status: 500 }
      );
    }

    const data = await ideogramRes.json();
    const imageUrl = data?.data?.[0]?.url || null;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL returned from Ideogram" },
        { status: 500 }
      );
    }

    // Return response in format compatible with Google My Business post creation
    const response: any = {
      imageUrl,
      prompt,
      media: [
        {
          mediaFormat: "PHOTO",
          sourceUrl: imageUrl,
        },
      ],
      // Provide complete post structure based on type
      postData: {
        languageCode: "en",
        summary:
          prompt.length > 1500 ? prompt.substring(0, 1500) + "..." : prompt,
        topicType: postType || "STANDARD",
        media: [
          {
            mediaFormat: "PHOTO",
            sourceUrl: imageUrl,
          },
        ],
      },
    };

    // Add call to action if provided
    if (callToAction && callToAction.actionType && callToAction.url) {
      response.postData.callToAction = {
        actionType: callToAction.actionType,
        url: callToAction.url,
      };
    }

    // Only add event field if postType is EVENT and eventDetails are provided
    if (postType === "EVENT" && eventDetails) {
      response.postData.event = eventDetails;
    } else if (postType === "EVENT") {
      // Force to STANDARD if EVENT requested but no event details
      response.postData.topicType = "STANDARD";
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
