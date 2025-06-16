// src/app/api/comments/route.js

export async function GET(req) {
  return new Response(JSON.stringify({ message: "Not implemented." }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req) {
  return new Response(JSON.stringify({ message: "Not implemented." }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}
