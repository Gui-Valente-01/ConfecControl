"use server";

import { problemaDaSenha } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const problemaSenha = problemaDaSenha(next);
  if (problemaSenha) return { error: problemaSenha };
  if (next !== confirm) return { error: "A confirmacao não confere com a nova senha." };

  const session = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { password: true } });
  if (!user || !verifyPassword(current, user.password)) {
    return { error: "Senha atual incorreta." };
  }

  await prisma.user.update({ where: { id: session.id }, data: { password: hashPassword(next) } });

  revalidatePath("/conta");
  return { success: "Senha alterada com sucesso." };
}
