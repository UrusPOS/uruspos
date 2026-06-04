import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(
    new URL("/", process.env.NEXT_PUBLIC_APP_URL || "https://uruspos.vercel.app")
  );
  
  // Clear session cookie
  response.cookies.delete("uruspos_session");
  
  return response;
}