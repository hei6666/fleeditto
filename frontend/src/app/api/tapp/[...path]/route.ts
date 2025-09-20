import { NextRequest, NextResponse } from 'next/server';

const TAPP_API_BASE_URL = 'https://api.tapp.exchange';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    const url = `${TAPP_API_BASE_URL}/${path}${queryString ? `?${queryString}` : ''}`;

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const body = await request.text();

    // If no path, default to root endpoint for SDK initialization
    const targetPath = path || '';
    const url = targetPath ? `${TAPP_API_BASE_URL}/${targetPath}` : TAPP_API_BASE_URL;

    console.log('Proxying POST request to:', url);
    console.log('Request body:', body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fleeditto-Frontend/1.0',
      },
      body: body,
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