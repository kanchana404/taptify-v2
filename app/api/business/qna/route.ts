import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Q&A API GET called');
    
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      console.log('No user ID found in session');
      return NextResponse.json(
        { error: 'User not authenticated. Please login.' },
        { status: 401 }
      );
    }

    // Get valid access token from database
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log('No valid access token found for user:', userId);
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const locationName = searchParams.get('locationName');
    const questionName = searchParams.get('questionName');
    const pageSize = searchParams.get('pageSize') || '10';
    const pageToken = searchParams.get('pageToken') || '';
    const answersPerQuestion = searchParams.get('answersPerQuestion') || '10';
    const filter = searchParams.get('filter') || '';
    const orderBy = searchParams.get('orderBy') || 'updateTime desc';

    console.log('Q&A Request:', { type, locationName, questionName, pageSize, filter, orderBy });

    switch (type) {
      case 'questions':
        if (!locationName) {
          return NextResponse.json(
            { error: 'locationName is required for questions' },
            { status: 400 }
          );
        }

        console.log('Fetching questions for location:', locationName);
        
        // Construct query parameters
        const queryParams = new URLSearchParams({
          pageSize,
          answersPerQuestion,
          orderBy
        });
        
        if (pageToken) queryParams.append('pageToken', pageToken);
        if (filter) queryParams.append('filter', filter);
        
        const questionsUrl = `https://mybusinessqanda.googleapis.com/v1/${locationName}/questions?${queryParams.toString()}`;
        
        console.log('Questions URL:', questionsUrl);
        
        const questionsResponse = await fetch(questionsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Questions API response status:', questionsResponse.status);

        if (!questionsResponse.ok) {
          const errorText = await questionsResponse.text();
          console.error('Questions API error:', errorText);
          
          if (questionsResponse.status === 404) {
            return NextResponse.json({ 
              questions: [],
              total: 0,
              message: 'No questions found for this location'
            });
          }
          
          if (questionsResponse.status === 403) {
            return NextResponse.json({ 
              questions: [],
              total: 0,
              message: 'Questions access is restricted for this location'
            });
          }
          
          return NextResponse.json(
            { error: `Failed to fetch questions: ${questionsResponse.status} - ${errorText}` },
            { status: questionsResponse.status }
          );
        }

        const questionsData = await questionsResponse.json();
        console.log('Questions data:', questionsData);
        
        return NextResponse.json({ 
          questions: questionsData.questions || [],
          total: questionsData.questions?.length || 0,
          nextPageToken: questionsData.nextPageToken
        });

      case 'answers':
        if (!questionName) {
          return NextResponse.json(
            { error: 'questionName is required for answers' },
            { status: 400 }
          );
        }

        console.log('Fetching answers for question:', questionName);
        
        const answersQueryParams = new URLSearchParams({
          pageSize,
          orderBy
        });
        
        if (pageToken) answersQueryParams.append('pageToken', pageToken);
        
        const answersUrl = `https://mybusinessqanda.googleapis.com/v1/${questionName}/answers?${answersQueryParams.toString()}`;
        
        console.log('Answers URL:', answersUrl);
        
        const answersResponse = await fetch(answersUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Answers API response status:', answersResponse.status);

        if (!answersResponse.ok) {
          const errorText = await answersResponse.text();
          console.error('Answers API error:', errorText);
          
          if (answersResponse.status === 404) {
            return NextResponse.json({ 
              answers: [],
              total: 0,
              message: 'No answers found for this question'
            });
          }
          
          return NextResponse.json(
            { error: `Failed to fetch answers: ${answersResponse.status} - ${errorText}` },
            { status: answersResponse.status }
          );
        }

        const answersData = await answersResponse.json();
        console.log('Answers data:', answersData);
        
        return NextResponse.json({ 
          answers: answersData.answers || [],
          total: answersData.answers?.length || 0,
          nextPageToken: answersData.nextPageToken
        });

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: questions or answers' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Q&A API GET Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Q&A data', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Q&A API POST called');
    
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      console.log('No user ID found in session');
      return NextResponse.json(
        { error: 'User not authenticated. Please login.' },
        { status: 401 }
      );
    }

    // Get valid access token from database
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log('No valid access token found for user:', userId);
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, locationName, questionName, questionText, answerText, questions } = body;

    console.log('Q&A POST Request:', { type, locationName, questionName, hasQuestionText: !!questionText, hasAnswerText: !!answerText });

    switch (type) {
      case 'create-question':
        if (!locationName || !questionText) {
          return NextResponse.json(
            { error: 'locationName and questionText are required' },
            { status: 400 }
          );
        }

        if (questionText.trim().length < 15) {
          return NextResponse.json(
            { error: 'Question text must be at least 15 characters long' },
            { status: 400 }
          );
        }

        console.log('Creating question for location:', locationName);
        
        const questionData = {
          text: questionText
        };

        const createQuestionUrl = `https://mybusinessqanda.googleapis.com/v1/${locationName}/questions`;
        
        console.log('Create question URL:', createQuestionUrl);
        console.log('Question data:', questionData);

        const createQuestionResponse = await fetch(createQuestionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(questionData),
        });

        console.log('Create question response status:', createQuestionResponse.status);

        if (!createQuestionResponse.ok) {
          const errorData = await createQuestionResponse.json();
          console.error('Create question error:', errorData);
          
          if (createQuestionResponse.status === 400 && errorData.error?.details?.[0]?.reason === 'QUESTION_TEXT_TOO_SHORT') {
            return NextResponse.json(
              { error: 'Question is too short. Please use at least 15 characters.' },
              { status: 400 }
            );
          } else if (createQuestionResponse.status === 401) {
            return NextResponse.json(
              { error: 'Authentication failed. Please reconnect your Google account.' },
              { status: 401 }
            );
          } else if (createQuestionResponse.status === 403) {
            return NextResponse.json(
              { error: 'Insufficient permissions to create questions.' },
              { status: 403 }
            );
          } else {
            return NextResponse.json(
              { error: errorData.error?.message || 'Failed to create question' },
              { status: createQuestionResponse.status }
            );
          }
        }

        const createdQuestion = await createQuestionResponse.json();
        console.log('Question created successfully:', createdQuestion);

        return NextResponse.json({
          success: true,
          question: createdQuestion,
          message: 'Question created successfully'
        });

      case 'upsert-answer':
        if (!questionName || !answerText) {
          return NextResponse.json(
            { error: 'questionName and answerText are required' },
            { status: 400 }
          );
        }

        console.log('Upserting answer for question:', questionName);
        
        const answerData = {
          answer: {
            text: answerText
          }
        };

        const upsertAnswerUrl = `https://mybusinessqanda.googleapis.com/v1/${questionName}/answers:upsert`;
        
        console.log('Upsert answer URL:', upsertAnswerUrl);
        console.log('Answer data:', answerData);

        const upsertAnswerResponse = await fetch(upsertAnswerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(answerData),
        });

        console.log('Upsert answer response status:', upsertAnswerResponse.status);

        if (!upsertAnswerResponse.ok) {
          const errorText = await upsertAnswerResponse.text();
          console.error('Upsert answer error:', errorText);
          
          if (upsertAnswerResponse.status === 401) {
            return NextResponse.json(
              { error: 'Authentication failed. Please reconnect your Google account.' },
              { status: 401 }
            );
          } else if (upsertAnswerResponse.status === 403) {
            return NextResponse.json(
              { error: 'Insufficient permissions to answer questions.' },
              { status: 403 }
            );
          } else {
            return NextResponse.json(
              { error: `Failed to create/update answer: ${upsertAnswerResponse.status} - ${errorText}` },
              { status: upsertAnswerResponse.status }
            );
          }
        }

        const upsertedAnswer = await upsertAnswerResponse.json();
        console.log('Answer upserted successfully:', upsertedAnswer);

        return NextResponse.json({
          success: true,
          answer: upsertedAnswer,
          message: 'Answer created/updated successfully'
        });

      case 'bulk-create':
        if (!locationName || !Array.isArray(questions) || questions.length === 0) {
          return NextResponse.json(
            { error: 'locationName and questions array are required' },
            { status: 400 }
          );
        }
        const results = [];
        for (const qna of questions) {
          const { question, answer } = qna;
          if (!question || question.trim().length < 15) {
            results.push({ success: false, error: 'Question must be at least 15 characters long', question });
            continue;
          }
          // Create question
          const createQuestionUrl = `https://mybusinessqanda.googleapis.com/v1/${locationName}/questions`;
          const questionData = { text: question.trim() };
          const createQuestionResponse = await fetch(createQuestionUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(questionData),
          });
          if (!createQuestionResponse.ok) {
            const errorData = await createQuestionResponse.json();
            results.push({ success: false, error: errorData.error?.message || 'Failed to create question', question });
            continue;
          }
          const createdQuestion = await createQuestionResponse.json();
          let answerResult = null;
          if (answer && answer.trim().length >= 5) {
            // Upsert answer
            const upsertAnswerUrl = `https://mybusinessqanda.googleapis.com/v1/${createdQuestion.name}/answers:upsert`;
            const answerData = { answer: { text: answer.trim() } };
            const upsertAnswerResponse = await fetch(upsertAnswerUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(answerData),
            });
            if (!upsertAnswerResponse.ok) {
              const errorText = await upsertAnswerResponse.text();
              answerResult = { success: false, error: errorText };
            } else {
              const upsertedAnswer = await upsertAnswerResponse.json();
              answerResult = { success: true, answer: upsertedAnswer };
            }
          }
          results.push({ success: true, question: createdQuestion, answerResult });
        }
        return NextResponse.json({ success: true, results });
      default:
        return NextResponse.json(
          { error: 'Invalid type parameter for POST. Use: create-question or upsert-answer' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Q&A API POST Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process Q&A request', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('Q&A API DELETE called');
    
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      console.log('No user ID found in session');
      return NextResponse.json(
        { error: 'User not authenticated. Please login.' },
        { status: 401 }
      );
    }

    // Get valid access token from database
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log('No valid access token found for user:', userId);
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const questionName = searchParams.get('questionName');

    console.log('Q&A DELETE Request:', { type, questionName });

    switch (type) {
      case 'question':
        if (!questionName) {
          return NextResponse.json(
            { error: 'questionName is required' },
            { status: 400 }
          );
        }

        console.log('Deleting question:', questionName);

        const deleteQuestionUrl = `https://mybusinessqanda.googleapis.com/v1/${questionName}`;
        
        const deleteQuestionResponse = await fetch(deleteQuestionUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Delete question response status:', deleteQuestionResponse.status);

        if (!deleteQuestionResponse.ok) {
          const errorText = await deleteQuestionResponse.text();
          console.error('Delete question error:', errorText);
          
          if (deleteQuestionResponse.status === 404) {
            return NextResponse.json(
              { error: 'Question not found or already deleted.' },
              { status: 404 }
            );
          } else {
            return NextResponse.json(
              { error: `Failed to delete question: ${deleteQuestionResponse.status} - ${errorText}` },
              { status: deleteQuestionResponse.status }
            );
          }
        }

        console.log('Question deleted successfully');

        return NextResponse.json({
          success: true,
          message: 'Question deleted successfully'
        });

      case 'answer':
        if (!questionName) {
          return NextResponse.json(
            { error: 'questionName is required' },
            { status: 400 }
          );
        }

        console.log('Deleting answer for question:', questionName);

        const deleteAnswerUrl = `https://mybusinessqanda.googleapis.com/v1/${questionName}/answers:delete`;
        
        const deleteAnswerResponse = await fetch(deleteAnswerUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Delete answer response status:', deleteAnswerResponse.status);

        if (!deleteAnswerResponse.ok) {
          const errorText = await deleteAnswerResponse.text();
          console.error('Delete answer error:', errorText);
          
          if (deleteAnswerResponse.status === 404) {
            return NextResponse.json(
              { error: 'Answer not found or already deleted.' },
              { status: 404 }
            );
          } else {
            return NextResponse.json(
              { error: `Failed to delete answer: ${deleteAnswerResponse.status} - ${errorText}` },
              { status: deleteAnswerResponse.status }
            );
          }
        }

        console.log('Answer deleted successfully');

        return NextResponse.json({
          success: true,
          message: 'Answer deleted successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter for DELETE. Use: question or answer' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Q&A API DELETE Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete Q&A item', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    console.log('Q&A API PATCH called');
    
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      console.log('No user ID found in session');
      return NextResponse.json(
        { error: 'User not authenticated. Please login.' },
        { status: 401 }
      );
    }

    // Get valid access token from database
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log('No valid access token found for user:', userId);
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const questionName = searchParams.get('questionName');
    const updateMask = searchParams.get('updateMask') || 'text';

    const body = await request.json();
    const { text } = body;

    if (!questionName || !text) {
      return NextResponse.json(
        { error: 'questionName and text are required' },
        { status: 400 }
      );
    }

    console.log('Updating question:', questionName);

    const updateData = {
      name: questionName,
      text: text
    };

    const updateQuestionUrl = `https://mybusinessqanda.googleapis.com/v1/${questionName}?updateMask=${updateMask}`;
    
    const updateQuestionResponse = await fetch(updateQuestionUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    console.log('Update question response status:', updateQuestionResponse.status);

    if (!updateQuestionResponse.ok) {
      const errorText = await updateQuestionResponse.text();
      console.error('Update question error:', errorText);
      
      return NextResponse.json(
        { error: `Failed to update question: ${updateQuestionResponse.status} - ${errorText}` },
        { status: updateQuestionResponse.status }
      );
    }

    const updatedQuestion = await updateQuestionResponse.json();
    console.log('Question updated successfully');

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
      message: 'Question updated successfully'
    });

  } catch (error) {
    console.error('Q&A API PATCH Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update question', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}