import { NextResponse } from "next/server";
import { checkUserLimit } from "@/lib/server/user-limit-check";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
    }

    const limitCheck = await checkUserLimit(tenantId);
    
    return NextResponse.json({
      currentCount: limitCheck.currentCount,
      limit: limitCheck.limit,
      allowed: limitCheck.allowed,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
