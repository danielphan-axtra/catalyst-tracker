import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const SETUP_TOKEN = "catalyst-setup-2024";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("token") !== SETUP_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: "daniel.phan@axtralabs.com" },
  });
  if (existing) {
    await prisma.user.update({
      where: { email: "daniel.phan@axtralabs.com" },
      data: { hasPaidAccess: true },
    });
    return NextResponse.json({ message: "Admin already exists, paid access granted" });
  }

  const hash = await bcrypt.hash("Admin@2024!", 10);
  await prisma.user.create({
    data: {
      email: "daniel.phan@axtralabs.com",
      name: "Daniel Phan",
      passwordHash: hash,
      hasPaidAccess: true,
    },
  });

  return NextResponse.json({ message: "Admin created successfully" });
}
