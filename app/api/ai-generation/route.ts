import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { type, prompt, businessInfo, questionText, count } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'questions') {
      const questionCount = Math.max(1, Math.min(Number(count) || 5, 10));
      if (questionCount === 1) {
        systemPrompt = `You are an AI assistant helping to generate a single question that a customer might commonly ask about a business. Generate one realistic, relevant question that a potential customer would have. The question should be specific, clear, and helpful for business owners to prepare answers for.

Business Information:
${businessInfo ? JSON.stringify(businessInfo, null, 2) : 'No specific business information provided'}

Return the response as a JSON object with the following structure:
{
  "questions": [
    "What are your business hours?"
  ]
}

Generate exactly 1 relevant question only (no answer).`;
      } else {
        systemPrompt = `You are an AI assistant helping to generate questions that customers might commonly ask about a business. Generate realistic, relevant questions that potential customers would have. The questions should be specific, clear, and helpful for business owners to prepare answers for.

Business Information:
${businessInfo ? JSON.stringify(businessInfo, null, 2) : 'No specific business information provided'}

Return the response as a JSON object with the following structure:
{
  "questions": [
    "What are your business hours?",
    "Do you offer delivery services?",
    "What payment methods do you accept?"
  ]
}

Generate exactly ${questionCount} relevant questions only (no answers).`;
      }
      userPrompt = prompt || 'Generate common questions customers might ask about this business';
    } else if (type === 'answer') {
      systemPrompt = `You are an AI assistant helping to generate professional, helpful answers to customer questions for a business. The answer should be informative, accurate, and represent the business professionally. Use the business information provided to give specific details when possible.

Business Information:
${businessInfo ? JSON.stringify(businessInfo, null, 2) : 'No specific business information provided'}

Question to answer: "${questionText}"

Return the response as a JSON object with the following structure:
{
  "answer": "We are open Monday through Friday from 9 AM to 6 PM, and weekends from 10 AM to 4 PM. Please feel free to visit us during these hours or call ahead if you have any questions."
}

Generate a professional, helpful answer to the question.`;

      userPrompt = prompt || `Generate a professional answer to this question: "${questionText}"`;
    } else if (type === 'qna') {
      // Use count for exact number of Q&A pairs
      const qnaCount = Math.max(1, Math.min(Number(count) || 3, 10));
      systemPrompt = `You are an AI assistant helping to generate Q&A content for a business. Generate realistic questions and answers that customers might have about this business. The questions should be commonly asked by potential customers, and the answers should be helpful, informative, and professional.

Business Information:
${businessInfo ? JSON.stringify(businessInfo, null, 2) : 'No specific business information provided'}

Return the response as a JSON object with the following structure:
{
  "questions": [
    {
      "question": "What are your business hours?",
      "answer": "We are open Monday through Friday from 9 AM to 6 PM, and weekends from 10 AM to 4 PM."
    }
  ]
}

Generate exactly ${qnaCount} relevant Q&A pairs.`;

      userPrompt = prompt || 'Generate common questions and answers for this business';
    } else if (type === 'post') {
      const postCount = Math.max(1, Math.min(Number(count) || 2, 10));
      systemPrompt = `You are an AI assistant helping to create engaging business posts for Google Business Profile. Create posts that are professional, engaging, and drive customer action. Posts should be concise but informative.

Business Information:
${businessInfo ? JSON.stringify(businessInfo, null, 2) : 'No specific business information provided'}

Return the response as a JSON object with the following structure:
{
  "posts": [
    {
      "summary": "Join us this weekend for our special summer sale! Enjoy 20% off all items and free refreshments while you shop.",
      "topicType": "OFFER",
      "actionType": "SHOP",
      "actionUrl": ""
    }
  ]
}

Topic types can be: STANDARD, EVENT, OFFER, ALERT
Action types can be: LEARN_MORE, BOOK, ORDER, SHOP, SIGN_UP

Generate exactly ${postCount} engaging posts.`;

      userPrompt = prompt || 'Generate engaging business posts for our Google Business Profile';
    } else {
      return NextResponse.json(
        { error: 'Invalid generation type. Must be "questions", "answer", "qna", or "post"' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content generated');
    }

    // Try to parse the JSON response
    let generatedContent;
    try {
      generatedContent = JSON.parse(content);
    } catch (parseError) {
      // If JSON parsing fails, return the raw content
      return NextResponse.json({
        error: 'Failed to parse AI response',
        rawContent: content
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: generatedContent,
      usage: completion.usage
    });

  } catch (error) {
    console.error('AI Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content with AI' },
      { status: 500 }
    );
  }
}
