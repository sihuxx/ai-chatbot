import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/conversations — 내 대화 목록
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const conversations = await prisma.conversation.findMany({
      where: { userId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        personaType: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, role: true },
        },
      },
      take: 50,
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("GET conversations error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations — 전체 대화 삭제 (소프트 삭제)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await prisma.conversation.updateMany({
      where: { userId, isDeleted: false },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
