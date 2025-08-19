// app/api/fetch-sheet-data/route.ts
import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';

export async function POST(request: Request) {
  try {
    const { csvUrl } = await request.json();

    if (!csvUrl) {
      return NextResponse.json({ error: 'CSV URL is required' }, { status: 400 });
    }

    // Validate and transform Google Sheets URL
    const url = new URL(csvUrl);
    
    // Check if it's a valid Google Sheets URL
    if (!url.hostname.includes('docs.google.com') || 
        !url.pathname.includes('/spreadsheets/d/')) {
      return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
    }

    // Extract spreadsheet ID and gid (sheet ID)
    const pathSegments = url.pathname.split('/');
    const dIndex = pathSegments.indexOf('d');
    if (dIndex === -1 || dIndex + 1 >= pathSegments.length) {
      return NextResponse.json({ error: 'Invalid Google Sheets URL structure' }, { status: 400 });
    }
    const spreadsheetId = pathSegments[dIndex + 1];
    const gid = url.searchParams.get('gid') || '0';

    // Construct CSV export URL
    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    // Fetch the CSV data
    const res = await fetch(csvExportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/csv,*/*;q=0.8'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch CSV data. Status: ${res.status}`);
    }

    // Parse the CSV data
    const csvData = await res.text();
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true
    });

    // Validate the columns
    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV is empty' }, { status: 400 });
    }

    const expectedHeaders = ['Name', 'Phone Number', 'last visit date'];
    const actualHeaders = Object.keys(records[0]);

    const isValidFormat = expectedHeaders.length === actualHeaders.length &&
                          expectedHeaders.every((header, index) => header === actualHeaders[index]);

    if (!isValidFormat) {
      return NextResponse.json({ error: `Invalid CSV format. Expected columns: ${expectedHeaders.join(', ')}` }, { status: 400 });
    }

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch sheet data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
