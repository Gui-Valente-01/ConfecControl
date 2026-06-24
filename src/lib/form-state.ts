// Estado padrão retornado por server actions usadas com useActionState.
export type FormState = { error?: string; success?: string };

export const emptyFormState: FormState = {};
