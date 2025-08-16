// Filename: src/worker.js
// This code is designed to run on the Cloudflare Workers platform.
// It is self-contained and does not use Node.js modules like 'express' or 'fs'.

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// Important: The token is hardcoded here. It was extracted from your
// 'deobfuscated-2025-08-10T16_38_30.249Z.js' file. If the token expires, you'll need to update it here.
const STATIC_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmaWxlIjoiTGVvJTIwKDIwMjMpJTIwVGFtaWwlMjBXRUItREwtJTVCQ2luZVN1YnouY28lNUQtNDgwcC5tcDQiLCJhIjoiaHR0cHM6Ly9naXRodWIuY29tL3JhdmluZHUwMW1hbm9qIiwiaWF0IjoxNzU0ODQzNzA3LCJleHAiOjE3NTQ4NDM4Mjd9.IlngNOvkHS819U9qsbuzlCC-9LSPy_3vg098r5rJ4JQ';
const STATIC_U = 'cinesubz';
const STATIC_V = 3;

/**
 * Extracts the file name from a URL to use in the API payload.
 * @param {string} url - The URL to extract the file name from.
 * @returns {string} The decoded file name.
 */
function extractFileNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const fileNameWithQuery = urlObj.pathname.split('/').pop();
    const fileName = fileNameWithQuery.split('?')[0];
    return decodeURIComponent(fileName);
  } catch (error) {
    console.error("Error extracting file name:", error.message);
    return "unknown_file";
  }
}

/**
 * Handles the incoming API request and returns the resolved download links.
 * @param {Request} request - The incoming HTTP request.
 * @returns {Promise<Response>} The HTTP response with resolved links.
 */
async function handleRequest(request) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response(JSON.stringify({ status: false, error: "Missing 'url' query parameter." }), { status: 400 });
  }

  const fileName = extractFileNameFromUrl(url);

  // Define all payloads to test
  const payloadsToTest = {
    direct: { direct: true },
    gdrive: { gdrive: true },
    second: { gdrive: true, second: true },
    pix: { pix: true },
    nc: { pix: true, nc: true }
  };

  const results = {};
  const promises = Object.entries(payloadsToTest).map(async ([key, specificPayload]) => {
    const fullPayload = {
      v: STATIC_V,
      u: STATIC_U,
      file: fileName,
      token: STATIC_TOKEN,
      ...specificPayload,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': url,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(fullPayload),
      });

      const data = await response.json();
      const resolvedLink = data.url || null; // The original API returns 'url'
      return [key, resolvedLink];
    } catch (error) {
      console.warn(`Failed to get link for ${key}:`, error.message);
      return [key, null];
    }
  });

  const resultsArray = await Promise.all(promises);
  resultsArray.forEach(([key, resolvedUrl]) => {
    results[key] = resolvedUrl;
  });

  return new Response(JSON.stringify({ status: true, requestedUrl: url, fileName, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
