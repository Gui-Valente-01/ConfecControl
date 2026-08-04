// Estado padrão retornado por server actions usadas com useActionState.
//
// `field` é o name do campo que causou o erro, quando dá para apontar um. Com
// ele a tela leva a pessoa até o campo errado, em vez de só mostrar um aviso
// no canto que some em quatro segundos — o que num formulário de oito campos
// não diz nada sobre onde está o problema.
export type FormState = { error?: string; success?: string; field?: string };

export const emptyFormState: FormState = {};
