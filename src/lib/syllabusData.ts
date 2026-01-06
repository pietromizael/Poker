export type SyllabusModule = {
    id: string;
    title: string;
    description: string;
    concepts: string[];
};

export type SyllabusLevel = {
    level: number;
    title: string;
    description: string;
    modules: SyllabusModule[];
};

export const SYLLABUS_DATA: SyllabusLevel[] = [
    {
        level: 1,
        title: "Micro Stakes Grinder",
        description: "Fundamentos sólidos para bater os limites mais baixos. Poker ABC.",
        modules: [
            {
                id: "m1-ranges",
                title: "Ranges Pré-Flop (RFI)",
                description: "Quais mãos jogar de cada posição. A base de tudo.",
                concepts: ["Open Raise", "Posição", "Fold para 3-bet"]
            },
            {
                id: "m1-value",
                title: "Apostando por Valor",
                description: "Extraindo o máximo de mãos piores. Sem blefes complexos.",
                concepts: ["Value Betting", "Tamanho de Aposta", "Não blefar Fish"]
            },
            {
                id: "m1-cbet",
                title: "C-Bet Básico",
                description: "Quando continuar apostando no flop após aumentar pré-flop.",
                concepts: ["Textura do Board", "Vantagem de Range", "Check-Back"]
            }
        ]
    },
    {
        level: 2,
        title: "Low Stakes Crusher",
        description: "Introduzindo agressividade controlada e leitura de mãos.",
        modules: [
            {
                id: "m2-3bet",
                title: "3-Bet Light",
                description: "Re-aumentando pré-flop com mãos especulativas e bloqueadores.",
                concepts: ["Polarized Ranges", "Fold Equity", "Sizing de 3-bet"]
            },
            {
                id: "m2-bluff",
                title: "Semi-Blefes",
                description: "Apostando com projetos (draws) para ganhar o pote de duas formas.",
                concepts: ["Flush Draws", "Straight Draws", "Equity"]
            },
            {
                id: "m2-blind",
                title: "Defesa de Blinds",
                description: "Como parar de sangrar dinheiro no Small e Big Blind.",
                concepts: ["Pot Odds", "Defend vs Steal", "Jogando Fora de Posição"]
            }
        ]
    },
    {
        level: 3,
        title: "Mid Stakes Pro",
        description: "Conceitos avançados, balanceamento e exploração.",
        modules: [
            {
                id: "m3-gto",
                title: "Introdução ao GTO",
                description: "Jogando de forma inexplorável quando necessário.",
                concepts: ["Game Theory Optimal", "Frequências", "Indiferença"]
            },
            {
                id: "m3-blockers",
                title: "Blockers e Remoção",
                description: "Usando suas cartas para deduzir o range do vilão.",
                concepts: ["Card Removal", "Hero Calls", "Bluff Catching"]
            },
            {
                id: "m3-icm",
                title: "ICM (Torneios)",
                description: "Como o valor das fichas muda perto da premiação.",
                concepts: ["Independent Chip Model", "Bubble Play", "Push/Fold"]
            }
        ]
    }
];
