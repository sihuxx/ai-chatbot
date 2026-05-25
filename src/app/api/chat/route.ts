import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { personas, PersonaType, getSystemPrompt } from "@/lib/personas";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    // ── 대화 세션 조회 또는 생성 ──
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
          title:
            message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    // ── 사용자 메시지 저장 ──
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // ── 대화 컨텍스트 구성 (최근 20개 메시지) ──
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
        // conversationId 먼저 전송
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "meta",
              conversationId: conversation!.id,
            })}\n\n`
          )
        );

        try {
          const stream = await anthropic.messages.stream({
            model:
              process.env.CHATBOT_MODEL || "claude-sonnet-4-20250514",
            max_tokens:
              Number(process.env.CHATBOT_MAX_TOKENS) || 2048,
            system: systemPrompt,
            messages: contextMessages,
          });

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "text",
                    content: text,
                  })}\n\n`
                )
              );
            }
          }
        } catch (err) {
          console.error("Streaming error:", err);
          // fallback: non-streaming
          try {
            const fallback = await anthropic.messages.create({
              model:
                process.env.CHATBOT_MODEL || "claude-sonnet-4-20250514",
              max_tokens:
                Number(process.env.CHATBOT_MAX_TOKENS) || 2048,
              system: systemPrompt,
              messages: contextMessages,
            });
            fullResponse =
              fallback.content[0]?.type === "text"
                ? fallback.content[0].text
                : "";
            if (fullResponse) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "text",
                    content: fullResponse,
                  })}\n\n`
                )
              );
            }
          } catch (fallbackErr) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  content: "AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
                })}\n\n`
              )
            );
          }
        }

        // ── 어시스턴트 메시지 DB 저장 ──
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
          encoder.encode(
            `data: ${JSON.stringify({ type: "done" })}\n\n`
          )
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
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
