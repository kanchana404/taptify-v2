import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    console.log('Places API called with type:', type);

    switch (type) {
      case 'search':
        // Search places by text query
        const query = searchParams.get('q');
        const location = searchParams.get('location');
        const radius = searchParams.get('radius');

        if (!query) {
          return NextResponse.json(
            { error: 'Search query (q) is required' },
            { status: 400 }
          );
        }

        console.log('Searching places for:', query);

        let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${process.env.GOOGLE_API_KEY}`;
        
        if (location) {
          url += `&location=${location}`;
        }
        if (radius) {
          url += `&radius=${radius}`;
        }

        const searchResponse = await fetch(url);
        
        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error('Places search error:', errorText);
          return NextResponse.json(
            { error: `Places API error: ${searchResponse.status}` },
            { status: searchResponse.status }
          );
        }

        const searchData = await searchResponse.json();
        console.log(`Found ${searchData.results?.length || 0} places`);
        
        return NextResponse.json({ 
          results: searchData.results || [],
          status: searchData.status,
          total: searchData.results?.length || 0
        });

      case 'details':
        // Get place details
        const placeId = searchParams.get('placeId');
        const fields = searchParams.get('fields');

        if (!placeId) {
          return NextResponse.json(
            { error: 'placeId is required for details' },
            { status: 400 }
          );
        }

        console.log('Getting place details for:', placeId);

        const fieldsParam = fields || 'place_id,name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,photos,geometry,types,price_level,user_ratings_total';
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fieldsParam}&key=${process.env.GOOGLE_API_KEY}`;

        const detailsResponse = await fetch(detailsUrl);
        
        if (!detailsResponse.ok) {
          const errorText = await detailsResponse.text();
          console.error('Place details error:', errorText);
          return NextResponse.json(
            { error: `Place details API error: ${detailsResponse.status}` },
            { status: detailsResponse.status }
          );
        }

        const detailsData = await detailsResponse.json();
        console.log('Place details retrieved for:', detailsData.result?.name);
        
        return NextResponse.json({ 
          place: detailsData.result,
          status: detailsData.status
        });

      case 'nearby':
        // Find nearby places
        const nearbyLocation = searchParams.get('location');
        const nearbyRadius = searchParams.get('radius') || '1500';
        const placeType = searchParams.get('placeType');
        const keyword = searchParams.get('keyword');

        if (!nearbyLocation) {
          return NextResponse.json(
            { error: 'location is required for nearby search' },
            { status: 400 }
          );
        }

        console.log('Finding nearby places at:', nearbyLocation);

        let nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${nearbyLocation}&radius=${nearbyRadius}&key=${process.env.GOOGLE_API_KEY}`;
        
        if (placeType) {
          nearbyUrl += `&type=${placeType}`;
        }
        if (keyword) {
          nearbyUrl += `&keyword=${encodeURIComponent(keyword)}`;
        }

        const nearbyResponse = await fetch(nearbyUrl);
        
        if (!nearbyResponse.ok) {
          const errorText = await nearbyResponse.text();
          console.error('Nearby places error:', errorText);
          return NextResponse.json(
            { error: `Nearby places API error: ${nearbyResponse.status}` },
            { status: nearbyResponse.status }
          );
        }

        const nearbyData = await nearbyResponse.json();
        console.log(`Found ${nearbyData.results?.length || 0} nearby places`);
        
        return NextResponse.json({ 
          results: nearbyData.results || [],
          status: nearbyData.status,
          total: nearbyData.results?.length || 0
        });

      case 'autocomplete':
        // Autocomplete places
        const input = searchParams.get('input');
        const autoLocation = searchParams.get('location');
        const autoRadius = searchParams.get('radius') || '50000';
        const types = searchParams.get('types');

        if (!input) {
          return NextResponse.json(
            { error: 'input is required for autocomplete' },
            { status: 400 }
          );
        }

        console.log('Autocompleting places for:', input);

        let autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${process.env.GOOGLE_API_KEY}`;
        
        if (autoLocation) {
          autocompleteUrl += `&location=${autoLocation}&radius=${autoRadius}`;
        }
        if (types) {
          autocompleteUrl += `&types=${types}`;
        }

        const autocompleteResponse = await fetch(autocompleteUrl);
        
        if (!autocompleteResponse.ok) {
          const errorText = await autocompleteResponse.text();
          console.error('Autocomplete error:', errorText);
          return NextResponse.json(
            { error: `Autocomplete API error: ${autocompleteResponse.status}` },
            { status: autocompleteResponse.status }
          );
        }

        const autocompleteData = await autocompleteResponse.json();
        console.log(`Found ${autocompleteData.predictions?.length || 0} autocomplete suggestions`);
        
        return NextResponse.json({ 
          predictions: autocompleteData.predictions || [],
          status: autocompleteData.status,
          total: autocompleteData.predictions?.length || 0
        });

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: search, details, nearby, or autocomplete' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Places API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process places request', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}