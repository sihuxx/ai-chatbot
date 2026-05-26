import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { personas, PersonaType, getSystemPrompt } from "@/lib/personas";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { message, conversationId, personaType, sessionToken } =
      await req.json();

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "메시지를 입력해주세요." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const resolvedPersona: PersonaType =
      personaType && personas[personaType as PersonaType]
        ? (personaType as PersonaType)
        : "learning";

    const systemPrompt = getSystemPrompt(resolvedPersona);
    const userId = (session?.user as any)?.id || null;

    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          isDeleted: false,
          ...(userId ? { userId } : { sessionToken }),
        },
        include: {
          messages: { orderBy: { createdAt: "asc" }, take: 20 },
        },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          sessionToken: userId ? null : sessionToken || null,
          personaType: resolvedPersona,
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    const contextMessages = (conversation.messages || [])
      .slice(-20)
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    contextMessages.push({ role: "user", content: message });

    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "meta", conversationId: conversation!.id })}\n\n`
          )
        );

        try {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: process.env.CHATBOT_MODEL || "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: systemPrompt },
                ...contextMessages,
              ],
              max_tokens: Number(process.env.CHATBOT_MAX_TOKENS) || 2048,
              temperature: 0.7,
            }),
          });

          if (!groqRes.ok) {
            const errBody = await groqRes.text();
            console.error("Groq API error:", groqRes.status, errBody);
            throw new Error(`Groq API ${groqRes.status}`);
          }

          const data = await groqRes.json();
          fullResponse = data.choices?.[0]?.message?.content || "";

          if (fullResponse) {
            const chunkSize = 15;
            for (let i = 0; i < fullResponse.length; i += chunkSize) {
              const chunk = fullResponse.slice(i, i + chunkSize);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`
                )
              );
            }
          }
        } catch (err: any) {
          console.error("API error:", err?.message || err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                content: "AI 응답 생성에 실패했습니다. API 키를 확인해주세요.",
              })}\n\n`
            )
          );
        }

        if (fullResponse) {
          await prisma.message.create({
            data: {
              conversationId: conversation!.id,
              role: "assistant",
              content: fullResponse,
            },
          });
          await prisma.conversation.update({
            where: { id: conversation!.id },
            data: { updatedAt: new Date() },
          });
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error?.message || error);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}