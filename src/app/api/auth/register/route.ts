import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    const passwordHash = await hash(password, 12);
    await prisma.user.create({
      data: {
        email: trimmedEmail,
        name: typeof name === "string" ? name.trim() || null : null,
        passwordHash,
        hasPaidAccess: false,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
