// Filename: server.js
// This script requires Node.js and the 'express' and 'axios' packages.
// Install dependencies: npm install express axios

const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Global variables to store extracted token and other static payload parts
let STATIC_TOKEN = null;
let STATIC_U = null;
let STATIC_V = null;

/**
 * Extracts the token, 'u', and 'v' parameters from the deobfuscated JavaScript content.
 * This function is crucial for getting the necessary authentication/request parameters.
 * @param {string} jsContent - The content of the deobfuscated JavaScript file.
 * @returns {Object|null} An object containing { token, u, v } or null if not found.
 */
function extractStaticPayloadParameters(jsContent) {
  let tokenMatch = jsContent.match(/token:\s*['"]([^'"]+)['"]/);
  let uMatch = jsContent.match(/u:\s*['"]([^'"]+)['"]/);
  let vMatch = jsContent.match(/v:\s*(\d+)/); // Matches a number for 'v'

  if (tokenMatch && uMatch && vMatch) {
    return {
      token: tokenMatch[1],
      u: uMatch[1],
      v: parseInt(vMatch[1], 10),
    };
  }
  return null;
}

/**
 * Reads the deobfuscated JavaScript file and initializes global token/payload variables.
 * This runs once when the server starts.
 */
function initializeStaticPayloadParameters() {
  const deobfuscatedJsPath = path.join(__dirname, "deobfuscated-2025-08-10T16_38_30.249Z.js");
  try {
    const jsContent = fs.readFileSync(deobfuscatedJsPath, "utf8");
    const extracted = extractStaticPayloadParameters(jsContent);
    if (extracted) {
      STATIC_TOKEN = extracted.token;
      STATIC_U = extracted.u;
      STATIC_V = extracted.v;
      console.log("✅ Successfully extracted token and payload parameters from JS file.");
    } else {
      console.error("❌ Could not extract token or payload parameters from deobfuscated JS file.");
    }
  } catch (error) {
    console.error("❌ Error reading deobfuscated JS file:", error.message);
  }
}

/**
 * Sends a POST request to the target URL with the given payload.
 * It includes necessary headers to mimic a browser request.
 * @param {Object} payload - The data payload for the POST request.
 * @param {string} targetUrl - The URL to send the POST request to.
 * @param {string} refererUrl - The Referer header for the request.
 * @returns {Promise<Object>} The response data from the request.
 */
async function sendApiRequest(payload, targetUrl, refererUrl) {
  try {
    const response = await axios.post(targetUrl, payload, {
      headers: {
        'Content-Type': "application/json",
        'Referer': refererUrl, // Important for some servers
        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error making the request for payload type: ${JSON.stringify(payload)}`, error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
}

/**
 * Replaces server and extension paths in the original URL to form the final API endpoint.
 * This function ensures the URL is in the format expected by the backend for link resolution.
 * @param {string} originalUrl - The initial URL from the client.
 * @returns {string} The transformed URL.
 */
function replaceUrl(originalUrl) {
  let finalUrl = originalUrl;

  // Replacements for server paths
  const serverReplacements = [
    ["https://google.com/server5/1:/", "https://drive2.cscloud12.online/server5/"],
    ["https://google.com/server4/1:/", "https://drive2.cscloud12.online/server4/"],
    ["https://google.com/server3/1:/", "https://drive2.cscloud12.online/server3/"],
    ["https://google.com/server21/1:/", "https://drive2.cscloud12.online/server2/"],
    ["https://google.com/server22/1:/", "https://drive2.cscloud12.online/server2/"],
    ["https://google.com/server23/1:/", "https://drive2.cscloud12.online/server2/"],
    ["https://google.com/server11/1:/", "https://drive2.cscloud12.online/server1/"],
    ["https://google.com/server12/1:/", "https://drive2.cscloud12.online/server1/"],
    ["https://google.com/server13/1:/", "https://drive2.cscloud12.online/server1/"]
  ];

  for (const [oldPath, newPath] of serverReplacements) {
    if (finalUrl.includes(oldPath)) {
      finalUrl = finalUrl.replace(oldPath, newPath);
      break; // Only one server replacement should apply
    }
  }

  // Replacements for file extensions and bot parameters
  // Ensure we don't add ?ext=mp4 if ?ext=mp4 already exists
  const extensionReplacements = [
    [".mp4?bot=cscloud2bot&code=", "?ext=mp4&bot=cscloud2bot&code="],
    [".mp4", "?ext=mp4"],
    [".mkv?bot=cscloud2bot&code=", "?ext=mkv&bot=cscloud2bot&code="],
    [".mkv", "?ext=mkv"],
    [".zip", "?ext=zip"]
  ];

  for (const [oldExt, newExt] of extensionReplacements) {
    // Only replace if the new extension string is not already present to avoid duplication
    if (finalUrl.includes(oldExt) && !finalUrl.includes(newExt)) {
      finalUrl = finalUrl.replace(oldExt, newExt);
    }
  }

  return finalUrl;
}

/**
 * Extracts the file name (including extension but without query parameters) from a URL.
 * Example: https://example.com/path/to/file.mp4?query=1 -> file.mp4
 * @param {string} url - The URL to extract the file name from.
 * @returns {string} The extracted file name.
 */
function extractFileNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    // Get the last part of the pathname and remove any query string attached to it
    const fileNameWithQuery = urlObj.pathname.split('/').pop();
    // Remove query parameters like '?ext=mp4'
    const fileName = fileNameWithQuery.split('?')[0];
    return decodeURIComponent(fileName); // Decode URI components to get original file name
  } catch (error) {
    console.error("Error extracting file name from URL:", error.message);
    return "unknown_file"; // Fallback
  }
}

// Initialize parameters from the deobfuscated JS file on server startup
initializeStaticPayloadParameters();

// Express middleware to parse JSON request bodies
app.use(express.json());

// API endpoint to resolve multiple download links
app.get("/api/t", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ status: false, error: "Missing 'url' query parameter." });
  }

  // Ensure static parameters are initialized before proceeding
  if (!STATIC_TOKEN || !STATIC_U || STATIC_V === null) {
    return res.status(500).json({ status: false, error: "Server not initialized: Missing token or other static parameters. Check server logs." });
  }

  try {
    const finalUrl = replaceUrl(url);
    const fileName = extractFileNameFromUrl(url); // Use original URL for file name extraction

    // Define all payloads you want to test, including the extracted static parameters
    const payloadsToTest = {
      direct: { direct: true },
      gdrive: { gdrive: true },
      second: { gdrive: true, second: true }, // As seen in your deobfuscated JS
      pix: { pix: true },
      nc: { pix: true, nc: true }
    };

    // Prepare promises for parallel requests
    const promises = Object.entries(payloadsToTest).map(async ([key, specificPayload]) => {
      // Combine static parameters with the specific request payload
      const fullPayload = {
        v: STATIC_V,
        u: STATIC_U,
        file: fileName, // The file name parameter
        token: STATIC_TOKEN,
        ...specificPayload, // Add specific flags like { direct: true } or { gdrive: true }
      };

      try {
        const data = await sendApiRequest(fullPayload, finalUrl, url);
        // The original API returns { url: "..." } or { mega: "..." }
        const resolvedLink = data.url || data.mega || null;
        return [key, resolvedLink];
      } catch (error) {
        console.warn(`Failed to get link for ${key}:`, error.message);
        return [key, null]; // Return null if a specific request fails
      }
    });

    const resultsArray = await Promise.all(promises);

    // Compose results object
    const results = {};
    for (const [key, resolvedUrl] of resultsArray) {
      results[key] = resolvedUrl;
    }

    res.json({
      status: true,
      requestedUrl: url,
      processedUrl: finalUrl,
      fileName: fileName,
      results: results,
      // You can include the static parameters in the response for debugging if needed
      // debug: { token: STATIC_TOKEN, u: STATIC_U, v: STATIC_V }
    });

  } catch (err) {
    console.error("Fatal error in /api/resolve-links:", err.message);
    res.status(500).json({ status: false, error: err.message });
  }
});

// Start the server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/api/resolve-links?url=YOUR_FILE_URL`);
    console.log("Make sure 'deobfuscated-2025-08-10T16_38_30.249Z.js' is in the same directory.");
  });
}

module.exports = app;
