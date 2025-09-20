import { NextRequest, NextResponse } from 'next/server';

const TAPP_API_BASE_URL = 'https://api.tapp.exchange';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    console.log('=== Tapp API Proxy Debug ===');
    console.log('Target URL:', TAPP_API_BASE_URL);
    console.log('Request method: POST');
    console.log('Request body:', body);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));

    const response = await fetch(TAPP_API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fleeditto-Frontend/1.0',
      },
      body: body,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tapp API error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    console.log('Response data:', data);

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Tapp API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Tapp API', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const url = `${TAPP_API_BASE_URL}${queryString ? `?${queryString}` : ''}`;

    console.log('Proxying GET request to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fleeditto-Frontend/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Tapp API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Tapp API' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}